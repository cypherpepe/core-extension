import { hexToBuffer } from '@avalabs/avalanchejs-v2';
import { ChainId, Network, NetworkVMType } from '@avalabs/chains-sdk';
import { strip0x } from '@avalabs/utils-sdk';
import {
  Avalanche,
  BlockCypherProvider,
  getEvmAddressFromPubKey,
  createPsbt,
} from '@avalabs/wallets-sdk';
import * as cs from '@cubist-labs/cubesigner-sdk';
import { networks } from 'bitcoinjs-lib';
import { JsonRpcProvider, getBytes, hashMessage } from 'ethers';

import { NetworkService } from '../network/NetworkService';

import {
  validKeySet,
  avaKey,
  evmKey,
  avaTestKey,
  anotherValidKeySet,
  invalidKeySet,
  anotherValidEvmKey,
  anotherValidAvaKey,
  validKeySetWithTwoAccounts,
  avaKey2,
  evmKey2,
  btcKey,
} from './fixtures/rawKeys';
import { SeedlessTokenStorage } from './SeedlessTokenStorage';
import { SeedlessWallet } from './SeedlessWallet';
import { MessageType } from '../messages/models';
import {
  SignTypedDataVersion,
  TypedDataUtils,
  typedSignatureHash,
} from '@metamask/eth-sig-util';
import { SeedlessBtcSigner } from './SeedlessBtcSigner';

jest.mock('@cubist-labs/cubesigner-sdk');
jest.mock('@avalabs/wallets-sdk');
jest.mock('../network/NetworkService');
jest.mock('./SeedlessBtcSigner');

describe('src/background/services/seedless/SeedlessWallet', () => {
  const sessionStorage = jest.mocked<SeedlessTokenStorage>(
    new SeedlessTokenStorage({} as any)
  );
  const networkService = jest.mocked<NetworkService>(
    new NetworkService({} as any)
  );

  let wallet: SeedlessWallet;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('when session cannot be established', () => {
    const connectionError = new Error('Connection failed');

    beforeEach(() => {
      jest
        .mocked(cs.CubeSigner.loadSignerSession)
        .mockRejectedValue(connectionError);

      wallet = new SeedlessWallet(networkService, sessionStorage);
    });

    it('fails the requests', async () => {
      await expect(wallet.getPublicKeys()).rejects.toThrowError(
        connectionError
      );
    });
  });

  describe('.getPublicKeys()', () => {
    describe('when accounts are not created yet', () => {
      beforeEach(() => {
        jest.mocked(cs.CubeSigner.loadSignerSession).mockResolvedValueOnce({
          keys: jest.fn().mockResolvedValue([]),
        } as any);

        wallet = new SeedlessWallet(networkService, sessionStorage);
      });

      it('raises an error', async () => {
        await expect(wallet.getPublicKeys()).rejects.toThrowError(
          'Accounts not created'
        );
      });
    });

    describe('when ETH or Avalanche key is not returned', () => {
      beforeEach(() => {
        jest.mocked(cs.CubeSigner.loadSignerSession).mockResolvedValueOnce({
          keys: jest.fn().mockResolvedValue([evmKey]),
        } as any);

        wallet = new SeedlessWallet(networkService, sessionStorage);
      });

      it('raises an error', async () => {
        await expect(wallet.getPublicKeys()).rejects.toThrowError(
          'Accounts keys missing'
        );
      });
    });

    describe('when required keys are returned', () => {
      beforeEach(() => {
        jest.mocked(cs.CubeSigner.loadSignerSession).mockResolvedValueOnce({
          keys: jest.fn().mockResolvedValue(validKeySet),
        } as any);

        wallet = new SeedlessWallet(networkService, sessionStorage);
      });

      it('correctly extracts the public keys', async () => {
        expect(await wallet.getPublicKeys()).toEqual([
          {
            evm: strip0x(evmKey.publicKey),
            xp: avaKey.publicKey,
          },
        ]);
      });
    });

    describe('when a key set contains keys for multiple accounts', () => {
      beforeEach(() => {
        jest.mocked(cs.CubeSigner.loadSignerSession).mockResolvedValueOnce({
          keys: jest.fn().mockResolvedValue(validKeySetWithTwoAccounts),
        } as any);

        wallet = new SeedlessWallet(networkService, sessionStorage);
      });

      it(`sorts them by derivation path's account index`, async () => {
        expect(await wallet.getPublicKeys()).toEqual([
          {
            evm: strip0x(evmKey.publicKey),
            xp: avaKey.publicKey,
          },
          {
            evm: evmKey2.publicKey,
            xp: avaKey2.publicKey,
          },
        ]);
      });
    });

    describe('when multiple key sets are returned', () => {
      beforeEach(() => {
        jest.mocked(cs.CubeSigner.loadSignerSession).mockResolvedValueOnce({
          keys: jest
            .fn()
            .mockResolvedValue([
              ...anotherValidKeySet,
              ...invalidKeySet,
              ...validKeySet,
            ]),
        } as any);

        wallet = new SeedlessWallet(networkService, sessionStorage);
      });

      it('extracts the public keys from the first valid set', async () => {
        expect(await wallet.getPublicKeys()).toEqual([
          {
            evm: anotherValidEvmKey.publicKey,
            xp: anotherValidAvaKey.publicKey,
          },
        ]);
      });
    });
  });

  describe('.signTransaction()', () => {
    beforeEach(() => {
      jest.mocked(cs.CubeSigner.loadSignerSession).mockResolvedValueOnce({
        keys: jest.fn().mockResolvedValue(validKeySet),
      } as any);
    });

    describe('when public key is not provided', () => {
      beforeEach(() => {
        wallet = new SeedlessWallet(networkService, sessionStorage);
      });

      it('raises an error', async () => {
        await expect(wallet.signTransaction({} as any)).rejects.toThrowError(
          'Public key not available'
        );
      });
    });

    describe('when target network is not provided', () => {
      beforeEach(() => {
        wallet = new SeedlessWallet(networkService, sessionStorage, {
          evm: 'la la la',
        });
      });

      it('raises an error', async () => {
        await expect(wallet.signTransaction({} as any)).rejects.toThrowError(
          'Unknown network'
        );
      });
    });

    describe('when incompatible provider is obtained for provided network', () => {
      beforeEach(() => {
        networkService.getProviderForNetwork.mockReturnValue({} as any);
        wallet = new SeedlessWallet(
          networkService,
          sessionStorage,
          {
            evm: 'la la la',
          },
          {} as any
        );
      });

      it('raises an error', async () => {
        await expect(wallet.signTransaction({} as any)).rejects.toThrowError(
          'Wrong provider obtained for EVM transaction'
        );
      });
    });

    describe('when all required data is provided', () => {
      const expectedResult = '0xSignedTx';
      let signer;
      let signerConstructorSpy;

      beforeEach(() => {
        networkService.getProviderForNetwork.mockReturnValue(
          new JsonRpcProvider() as any
        );

        signer = {
          signTransaction: jest.fn().mockReturnValue(expectedResult),
        };
        signerConstructorSpy = jest.fn().mockReturnValueOnce(signer);
        jest.mocked(cs.ethers.Signer).mockImplementation(signerConstructorSpy);

        wallet = new SeedlessWallet(
          networkService,
          sessionStorage,
          {
            evm: evmKey.publicKey,
          },
          { vmName: NetworkVMType.EVM } as any
        );
      });

      it(`constructs the Signer class`, async () => {
        await wallet.signTransaction({} as any);

        expect(signerConstructorSpy).toHaveBeenCalledWith(
          getEvmAddressFromPubKey(Buffer.from(evmKey.publicKey, 'hex')),
          expect.anything(),
          expect.anything()
        );
      });

      it(`uses obtained signer to sign the transaction`, async () => {
        const tx = {} as any;
        const result = await wallet.signTransaction(tx);

        expect(signer.signTransaction).toHaveBeenCalledWith(tx);
        expect(result).toEqual(expectedResult);
      });

      describe('when signing fails', () => {
        beforeEach(() => {
          signer = {
            signTransaction: jest
              .fn()
              .mockRejectedValue(new Error('Some API error')),
          };
          signerConstructorSpy = jest.fn().mockReturnValueOnce(signer);
          jest
            .mocked(cs.ethers.Signer)
            .mockImplementation(signerConstructorSpy);
        });

        it('raises an error', async () => {
          await expect(wallet.signTransaction({} as any)).rejects.toThrowError(
            new Error('Some API error')
          );
        });
      });
    });
  });

  describe('.signAvalancheTx()', () => {
    const signature = '0xA1B2C3D4';
    let session: jest.Mocked<cs.SignerSession>;

    beforeEach(() => {
      session = {
        keys: jest.fn().mockResolvedValue(validKeySet),
        signBlob: jest.fn().mockResolvedValue({
          data: jest.fn().mockReturnValue({ signature }),
        }),
      } as any;
      jest.mocked(cs.CubeSigner.loadSignerSession).mockResolvedValue(session);
    });

    describe('when public key is not provided', () => {
      beforeEach(() => {
        wallet = new SeedlessWallet(networkService, sessionStorage);
      });

      it('raises an error', async () => {
        await expect(wallet.signAvalancheTx({} as any)).rejects.toThrowError(
          'Public key not available'
        );
      });
    });

    describe('for EVM transactions', () => {
      const txRequest = {
        tx: {
          toBytes() {
            return new Uint8Array([0, 1, 2, 3, 4]);
          },
          getVM() {
            return 'EVM';
          },
          addSignature: jest.fn(),
        },
      };

      beforeEach(() => {
        wallet = new SeedlessWallet(
          networkService,
          sessionStorage,
          {
            evm: strip0x(evmKey.publicKey),
            xp: 'xp xp xp',
          },
          {} as any
        );
      });

      it('uses the EVM public key', async () => {
        await wallet.signAvalancheTx(txRequest as any);

        expect(session.signBlob).toHaveBeenCalledWith(
          evmKey.key_id,
          expect.anything()
        );
      });

      it('calls signBlob() method with proper payload', async () => {
        await wallet.signAvalancheTx(txRequest as any);

        expect(session.signBlob).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            message_base64: 'CLteXW6qwQSe3giT0w7QIrGk2bW0jbQUhx9Rycs1KD0=',
          })
        );
      });

      it('adds obtained signature', async () => {
        await wallet.signAvalancheTx(txRequest as any);

        expect(txRequest.tx.addSignature).toHaveBeenCalledWith(
          hexToBuffer(signature)
        );
      });

      it('returns the signed transaction', async () => {
        expect(await wallet.signAvalancheTx(txRequest as any)).toEqual(
          txRequest.tx
        );
      });
    });

    describe('when signing X/P transaction', () => {
      const txRequest = {
        tx: {
          toBytes() {
            return new Uint8Array([0, 1, 2, 3, 4]);
          },
          getVM() {
            return 'PVM';
          },
          addSignature: jest.fn(),
        },
      };

      beforeEach(() => {
        wallet = new SeedlessWallet(
          networkService,
          sessionStorage,
          {
            evm: strip0x(evmKey.publicKey),
            xp: strip0x(avaKey.publicKey),
          },
          {} as any
        );
      });

      describe('in testnet mode', () => {
        beforeEach(() => {
          networkService.isMainnet.mockReturnValue(false);
        });
        it('uses the testnet Avalanche keys', async () => {
          await wallet.signAvalancheTx(txRequest as any);

          expect(session.signBlob).toHaveBeenCalledWith(
            avaTestKey.key_id,
            expect.anything()
          );
        });
      });

      describe('in mainnet mode', () => {
        beforeEach(() => {
          networkService.isMainnet.mockReturnValue(true);
        });
        it('uses the mainnet Avalanche keys', async () => {
          await wallet.signAvalancheTx(txRequest as any);

          expect(session.signBlob).toHaveBeenCalledWith(
            avaKey.key_id,
            expect.anything()
          );
        });
      });

      it('calls signBlob() method with proper payload', async () => {
        await wallet.signAvalancheTx(txRequest as any);

        expect(session.signBlob).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            message_base64: 'CLteXW6qwQSe3giT0w7QIrGk2bW0jbQUhx9Rycs1KD0=',
          })
        );
      });

      it('adds obtained signature', async () => {
        await wallet.signAvalancheTx(txRequest as any);

        expect(txRequest.tx.addSignature).toHaveBeenCalledWith(
          hexToBuffer(signature)
        );
      });

      it('returns the signed transaction', async () => {
        expect(await wallet.signAvalancheTx(txRequest as any)).toEqual(
          txRequest.tx
        );
      });
    });
  });

  describe('.signMessage()', () => {
    const signature = '0xA1B2C3D4';
    let session: jest.Mocked<cs.SignerSession>;

    const getMessage = (payload = {}) =>
      ({
        from: '',
        data: {},
        ...payload,
      } as any);

    beforeEach(() => {
      session = {
        keys: jest.fn().mockResolvedValue(validKeySet),
        signBlob: jest.fn().mockResolvedValue({
          data: jest.fn().mockReturnValue({ signature }),
        }),
      } as any;
      jest.mocked(cs.CubeSigner.loadSignerSession).mockResolvedValue(session);
    });

    describe('when public key is not provided', () => {
      beforeEach(() => {
        wallet = new SeedlessWallet(networkService, sessionStorage);
      });

      it('raises an error', async () => {
        await expect(
          wallet.signMessage(MessageType.ETH_SIGN, getMessage())
        ).rejects.toThrowError('Public key not available');
      });
    });

    describe('when network is not provided', () => {
      beforeEach(() => {
        wallet = new SeedlessWallet(networkService, sessionStorage, {} as any);
      });

      it('raises an error', async () => {
        await expect(
          wallet.signMessage(MessageType.ETH_SIGN, getMessage())
        ).rejects.toThrowError('Network not available');
      });
    });

    describe('with EVM messages', () => {
      beforeEach(() => {
        wallet = new SeedlessWallet(
          networkService,
          sessionStorage,
          {
            evm: strip0x(evmKey.publicKey),
          },
          {} as any
        );

        jest.mocked(getEvmAddressFromPubKey).mockReturnValue(evmKey.materialId);
      });

      const base64encode = (payload) =>
        Buffer.from(getBytes(payload)).toString('base64');

      const ethSignMsg = getMessage({ data: '0x4243' });
      const typedDataV1Msg = getMessage({
        data: [{ name: 'Foo', type: 'bool', value: true }],
      });
      const typedDataV3Msg = getMessage({
        data: {
          primaryType: 'Mail',
          types: {
            EIP712Domain: [],
            Mail: [{ name: 'name', type: 'string' }],
          },
          message: { name: 'asdasd' },
          domain: {
            name: 'test site',
            chainId: 1,
          },
        },
      });

      it.each([
        {
          type: MessageType.ETH_SIGN,
          msg: ethSignMsg,
          payload: base64encode(
            hashMessage(Uint8Array.from(Buffer.from('4243', 'hex')))
          ),
        },
        {
          type: MessageType.PERSONAL_SIGN,
          msg: ethSignMsg,
          payload: base64encode(
            hashMessage(Uint8Array.from(Buffer.from('4243', 'hex')))
          ),
        },
        {
          type: MessageType.SIGN_TYPED_DATA,
          msg: typedDataV1Msg,
          payload: base64encode(typedSignatureHash(typedDataV1Msg.data)),
        },
        {
          type: MessageType.SIGN_TYPED_DATA_V1,
          msg: typedDataV1Msg,
          payload: base64encode(typedSignatureHash(typedDataV1Msg.data)),
        },
        {
          type: MessageType.SIGN_TYPED_DATA_V3,
          msg: typedDataV3Msg,
          payload: base64encode(
            Uint8Array.from(
              TypedDataUtils.eip712Hash(
                typedDataV3Msg.data,
                SignTypedDataVersion.V3
              )
            )
          ),
        },
        {
          type: MessageType.SIGN_TYPED_DATA_V4,
          msg: typedDataV3Msg,
          payload: base64encode(
            Uint8Array.from(
              TypedDataUtils.eip712Hash(
                typedDataV3Msg.data,
                SignTypedDataVersion.V4
              )
            )
          ),
        },
      ])(
        'calls .signBlob() with proper payload for $type',
        async ({ type, msg, payload }) => {
          await wallet.signMessage(type, msg);

          expect(session.signBlob).toHaveBeenCalledWith(evmKey.key_id, {
            message_base64: payload,
          });
        }
      );

      it('raises an error for unknown message types', async () => {
        await expect(
          wallet.signMessage('Some unknown type' as MessageType, {} as any)
        ).rejects.toThrowError('Unknown message type');
      });
    });

    describe('with Avalanche messages', () => {
      beforeEach(() => {
        networkService.getAvalanceProviderXP.mockResolvedValue({
          getAddress: () => `X-${avaKey.materialId}`,
        } as any);

        wallet = new SeedlessWallet(
          networkService,
          sessionStorage,
          {
            evm: strip0x(evmKey.publicKey),
            xp: 'xp xp xp',
          },
          {} as any
        );
      });

      it('validates presence of X/P public key', async () => {
        wallet = new SeedlessWallet(
          networkService,
          sessionStorage,
          {
            evm: strip0x(evmKey.publicKey),
          },
          {} as any
        );

        await expect(
          wallet.signMessage(MessageType.AVALANCHE_SIGN, getMessage())
        ).rejects.toThrowError('X/P public key not available');
      });

      it('calls signBlob() method with proper payload', async () => {
        const data = 'yaaaaay!';
        const msg = getMessage({
          data,
        });
        const encodedData = Buffer.from(`AVA-Signed:${data}`, 'utf-8');

        jest.mocked(Avalanche.digestMessage).mockReturnValue(encodedData);

        await wallet.signMessage(MessageType.AVALANCHE_SIGN, msg);

        expect(session.signBlob).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            message_base64: encodedData.toString('base64'),
          })
        );
      });
    });

    it('returns the obtained signature', async () => {
      wallet = new SeedlessWallet(
        networkService,
        sessionStorage,
        {
          evm: strip0x(evmKey.publicKey),
        },
        {} as any
      );

      jest.mocked(getEvmAddressFromPubKey).mockReturnValue(evmKey.materialId);

      session.signBlob.mockResolvedValue({
        data: () => ({
          signature: 'dummy-signature',
        }),
      } as any);

      expect(
        await wallet.signMessage(
          MessageType.ETH_SIGN,
          getMessage({ data: '0x1234' })
        )
      ).toEqual('dummy-signature');
    });
  });

  describe('.addAccount()', () => {
    let session: jest.Mocked<cs.SignerSession>;

    beforeEach(() => {
      session = {
        keys: jest.fn().mockResolvedValue(validKeySet),
        proveIdentity: jest.fn(),
      } as any;
      jest.mocked(cs.CubeSigner.loadSignerSession).mockResolvedValue(session);

      wallet = new SeedlessWallet(networkService, sessionStorage, {
        evm: strip0x(evmKey.publicKey),
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
      });
    });

    it('raises an error for invalid account index', async () => {
      await expect(wallet.addAccount(-1)).rejects.toThrowError(
        /Account index must be greater than or equal to 1/
      );
    });

    describe('when seedless api is unreachable', () => {
      beforeEach(() => {
        global.fetch = jest.fn().mockRejectedValue(new Error('Timeout'));
      });

      it('raises an error', async () => {
        await expect(wallet.addAccount(1)).rejects.toThrowError(
          /Core Seedless API is unreachable/
        );
      });
    });

    describe('when the mnemonic id cannot be established', () => {
      beforeEach(() => {
        global.fetch = jest.fn().mockRejectedValue(new Error('Timeout'));
        wallet = new SeedlessWallet(networkService, sessionStorage, {
          evm: 'unpaired-public-key',
        });
      });

      it('raises an error', async () => {
        await expect(wallet.addAccount(1)).rejects.toThrowError(
          /Cannot establish the mnemonic id/
        );
      });
    });

    it('calls the seedless api with proper payload', async () => {
      const identityProof = { email: 'test@core.app' };
      const mnemonicId = evmKey.derivation_info.mnemonic_id;
      const accountIndex = 1;

      session.proveIdentity.mockResolvedValue(identityProof as any);
      await wallet.addAccount(accountIndex);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/addAccount$/),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ accountIndex, identityProof, mnemonicId }),
        })
      );
    });

    describe('when API responds with a non-OK status', () => {
      beforeEach(() => {
        global.fetch = jest.fn().mockResolvedValue({
          ok: false,
        });
      });

      it('raises an error', async () => {
        session.proveIdentity.mockResolvedValue({} as any);
        await expect(wallet.addAccount(1)).rejects.toThrowError(
          /Adding new account failed/
        );
      });
    });
  });

  describe('.signTx()', () => {
    const signature = '0xA1B2C3D4';
    let session: jest.Mocked<cs.SignerSession>;

    const mockPbst = (overrides = {}) => {
      const psbt: any = {
        signInputAsync: jest.fn(),
        validateSignaturesOfAllInputs: jest.fn(),
        finalizeAllInputs: jest.fn(),
        extractTransaction: jest.fn(),
        ...overrides,
      };

      jest.mocked(createPsbt).mockImplementation((ins, outs) =>
        Object.assign(psbt, {
          txInputs: ins,
          txOutputs: outs,
        })
      );

      return psbt;
    };

    beforeEach(() => {
      session = {
        keys: jest.fn().mockResolvedValue(validKeySet),
        signBtc: jest.fn().mockResolvedValue({
          data: jest.fn().mockReturnValue({ signature }),
        }),
      } as any;
      jest.mocked(cs.CubeSigner.loadSignerSession).mockResolvedValue(session);
    });

    describe('when no network is provided', () => {
      beforeEach(() => {
        wallet = new SeedlessWallet(networkService, sessionStorage, undefined);
      });

      it('raises an error', async () => {
        await expect(wallet.signTx([], [])).rejects.toThrowError(
          'Invalid network: Attempting to sign BTC transaction on non Bitcoin network'
        );
      });
    });

    describe('when non-Bitcoin network is provided', () => {
      beforeEach(() => {
        wallet = new SeedlessWallet(networkService, sessionStorage, undefined, {
          chainId: ChainId.ETHEREUM_HOMESTEAD,
        } as Network);
      });

      it('raises an error', async () => {
        await expect(wallet.signTx([], [])).rejects.toThrowError(
          'Invalid network: Attempting to sign BTC transaction on non Bitcoin network'
        );
      });
    });

    describe('when incompatible provider is obtained for provided network', () => {
      beforeEach(() => {
        networkService.getProviderForNetwork.mockReturnValue({} as any);
        wallet = new SeedlessWallet(
          networkService,
          sessionStorage,
          {
            evm: 'la la la',
          },
          { chainId: ChainId.BITCOIN } as any
        );
      });

      it('raises an error', async () => {
        await expect(wallet.signTx([], [])).rejects.toThrowError(
          'Wrong provider obtained for BTC transaction'
        );
      });
    });

    describe('when public key is not provided', () => {
      beforeEach(() => {
        mockPbst();
        networkService.getProviderForNetwork.mockReturnValue(
          new BlockCypherProvider()
        );
        wallet = new SeedlessWallet(networkService, sessionStorage, undefined, {
          chainId: ChainId.BITCOIN,
        } as Network);
      });

      it('raises an error', async () => {
        await expect(wallet.signTx([1] as any, [])).rejects.toThrowError(
          'Public key not available'
        );
      });
    });

    describe('when all requirements are met', () => {
      const pubKey = { evm: btcKey.publicKey };
      const network: any = {
        chainId: ChainId.BITCOIN,
      };

      beforeEach(() => {
        const blockcypherProvider = new BlockCypherProvider();
        jest
          .spyOn(blockcypherProvider, 'getNetwork')
          .mockReturnValue(networks.bitcoin);
        networkService.getProviderForNetwork.mockReturnValue(
          blockcypherProvider
        );
        wallet = new SeedlessWallet(
          networkService,
          sessionStorage,
          pubKey,
          network
        );
      });

      it('constructs a separate signer for each of tx inputs', async () => {
        const psbt = mockPbst();
        const inputs = [1, 2, 3];

        await wallet.signTx(inputs as any, []);

        expect(SeedlessBtcSigner).toHaveBeenCalledTimes(inputs.length);

        inputs.forEach((_, i) => {
          expect(SeedlessBtcSigner).toHaveBeenNthCalledWith(
            i + 1,
            pubKey.evm,
            psbt,
            i,
            inputs,
            networks.bitcoin,
            session
          );
        });
      });

      it('uses the constructed signers to sign the transaction inputs', async () => {
        const psbt = mockPbst();

        const inputs = [1, 2, 3];
        await wallet.signTx(inputs as any, []);

        expect(psbt.signInputAsync).toHaveBeenCalledTimes(inputs.length);
        inputs.forEach((_, i) => {
          expect(psbt.signInputAsync).toHaveBeenNthCalledWith(
            i + 1,
            i,
            expect.any(SeedlessBtcSigner)
          );
        });
      });

      it('validates signatures', async () => {
        const psbt = mockPbst();

        await wallet.signTx([1] as any, []);

        expect(psbt.validateSignaturesOfAllInputs).toHaveBeenCalled();
      });

      it('finalizes all inputs', async () => {
        const psbt = mockPbst();

        await wallet.signTx([1] as any, []);

        expect(psbt.finalizeAllInputs).toHaveBeenCalled();
      });

      it('returns the extracted transaction', async () => {
        const pstb = mockPbst();
        const mockedResult = { nice: 'transaction' };
        pstb.extractTransaction.mockReturnValue(mockedResult);

        expect(await wallet.signTx([1] as any, [])).toEqual(mockedResult);
      });
    });
  });
});