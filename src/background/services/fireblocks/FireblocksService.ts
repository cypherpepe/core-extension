import { sha256, toUtf8Bytes } from 'ethers';
import {
  PagedVaultAccountsResponse,
  PeerType,
  VaultAccountResponse,
} from 'fireblocks-sdk';
import type {
  DepositAddressResponse,
  ExternalWalletAsset,
  InternalWalletAsset,
  WalletContainerResponse,
} from 'fireblocks-sdk';
import { SignJWT } from 'jose';
import { inject, singleton } from 'tsyringe';

import type { FireblocksSecretsProvider } from './models';
import {
  FireblocksError,
  KnownAddressDictionary,
  NetworkError,
} from './models';

// Create registry for FireblocksSecretsProviders to be injected.
// FireblocksSecretsProvider is an interface that can have multiple implementation,
// the registry defines which one to be injected automatically
import './registry';

/**
 * Fireblocks API client.
 *
 * API reference:
 * Responses & Error Codes:
 *   - https://developers.fireblocks.com/reference/api-responses
 *
 * Transaction statuses:
 *   - Primary statuses: https://developers.fireblocks.com/reference/primary-transaction-statuses
 *   - Substatuses: https://developers.fireblocks.com/reference/transaction-substatuses
 */
@singleton()
export class FireblocksService {
  constructor(
    @inject('FireblocksSecretsProvider')
    private secretsProvider: FireblocksSecretsProvider
  ) {}

  async fetchVaultAccountByWalletAddress(address: string, assetIds: string[]) {
    for (const assetId of assetIds) {
      const addressMap = await this.fetchVaultAccountsForAsset(assetId);

      if (addressMap.has(address)) {
        return addressMap.get(address) as string;
      }
    }

    return null;
  }

  async getBtcAddressByAccountId(accountId: string, isMainnet: boolean) {
    const assetId = isMainnet ? 'BTC' : 'BTC_TEST';
    const addresses = await this.request<DepositAddressResponse[]>({
      path: `/vault/accounts/${accountId}/${assetId}/addresses`,
    });

    const permanent = addresses.find((address) => {
      return address.type === 'Permanent' && address.addressFormat === 'SEGWIT';
    });

    return permanent?.address;
  }

  async getVaultAccountById(id: string) {
    return this.request<VaultAccountResponse>({
      path: `/vault/accounts/${id}`,
    });
  }

  async fetchVaultAccountsForAsset(assetId: string) {
    const vaultAccounts = await this.request<PagedVaultAccountsResponse>({
      path: `/vault/accounts_paged?assetId=${assetId}`,
    });

    /**
     * Once we know the vault accounts, we can look up the asset addresses
     * for each of them.
     *
     * TODO:
     * There is a new endpoint incoming that will make it easier and not
     * require so many API calls. At the moment of writing this, it's only
     * available for selected customers, though:
     * https://developers.fireblocks.com/reference/get_vault-asset-wallets
     */
    const vaultAccountsForAsset = await Promise.allSettled<{
      vaultId: string;
      addresses: DepositAddressResponse[];
    }>(
      vaultAccounts.accounts.map(async ({ id }) => ({
        vaultId: id,
        addresses: await this.request({
          path: `/vault/accounts/${id}/${assetId}/addresses`,
        }),
      }))
    );

    const addressToVaultMap = new Map<string, string>();

    vaultAccountsForAsset.forEach((result) => {
      if (result.status === 'rejected') {
        return;
      }

      const { vaultId, addresses } = result.value;

      addresses.forEach(({ address }) => {
        addressToVaultMap.set(address, vaultId);
      });
    });

    return addressToVaultMap;
  }

  /**
   * TODO: cache this data in storage, with some kind of TTL.
   */
  async getAllKnownAddressesForAsset(
    assetId: string
  ): Promise<KnownAddressDictionary> {
    const addressDictionary: KnownAddressDictionary = new Map();

    // Send these requests in parallel
    const [externalWalletsReq, internalWalletsReq, vaultAccountsReq] =
      await Promise.allSettled([
        this.request<WalletContainerResponse<ExternalWalletAsset>[]>({
          path: '/external_wallets',
        }),
        this.request<WalletContainerResponse<InternalWalletAsset>[]>({
          path: '/internal_wallets',
        }),
        this.fetchVaultAccountsForAsset(assetId),
      ]);

    if (vaultAccountsReq.status === 'fulfilled') {
      const vaultAccounts = vaultAccountsReq.value;

      vaultAccounts.forEach((vaultId, address) => {
        addressDictionary.set(address, {
          type: PeerType.VAULT_ACCOUNT,
          id: vaultId,
        });
      });
    }

    if (internalWalletsReq.status === 'fulfilled') {
      internalWalletsReq.value.forEach(({ id: walletId, assets }) => {
        assets.forEach((asset) => {
          if (asset.address && assetId === asset.id) {
            addressDictionary.set(asset.address, {
              type: PeerType.INTERNAL_WALLET,
              id: walletId,
            });
          }
        });
      });
    }

    if (externalWalletsReq.status === 'fulfilled') {
      externalWalletsReq.value.forEach(({ id: walletId, assets }) => {
        assets.forEach((asset) => {
          if (asset.address && assetId === asset.id) {
            addressDictionary.set(asset.address, {
              type: PeerType.EXTERNAL_WALLET,
              id: walletId,
            });
          }
        });
      });
    }

    return addressDictionary;
  }

  async #buildRequestHeaders({
    path,
    body,
  }: {
    path: string;
    body?: object;
  }): Promise<Record<string, string>> {
    const { apiKey, privateKey } = await this.secretsProvider.getSecrets();

    // Hash the request body using SHA-256 and get rid of the 0x at the start.
    const bodyHash = sha256(toUtf8Bytes(JSON.stringify(body ?? {}))).slice(2);

    // Sign the request according to Fireblocks docs to retrieve the authorization token.
    // @see https://developers.fireblocks.com/reference/signing-a-request-jwt-structure
    const token = await new SignJWT({
      uri: path,
      nonce: crypto.randomUUID(),
      sub: apiKey,
      bodyHash,
    })
      .setIssuedAt() // current time
      .setExpirationTime('30s')
      .setProtectedHeader({
        alg: 'RS256',
        typ: 'JWT',
      })
      .sign(privateKey);

    return {
      'X-API-Key': apiKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  #prefixPath(path: string): string {
    return `/v1${path}`;
  }

  async request<T = any>({
    path,
    method = 'GET',
    body,
  }: {
    path: string;
    method?: string;
    body?: object;
  }): Promise<T | never> {
    const prefixedPath = this.#prefixPath(path);

    try {
      // TODO: move base API url to env var
      const response = await fetch(`https://api.fireblocks.io${prefixedPath}`, {
        method,
        body: JSON.stringify(body),
        headers: await this.#buildRequestHeaders({
          path: prefixedPath,
          body,
        }),
      });

      if (response.ok) {
        return response.json();
      }

      return this.#handleErrorResponse(response);
    } catch (err) {
      // If error was recognized & wrapped, just rethrow it.
      if (err instanceof FireblocksError) {
        throw err;
      }

      // At this point, the only errors we should get here are network problems,
      // like timeouts, aborted requests, etc.
      // We wrap them in a NetworkError class, so they can be easily recognized
      // and used by potential retry mechanism in the future.
      if (err instanceof Error) {
        throw new NetworkError(err);
      }

      throw err;
    }
  }

  async #handleErrorResponse(response: Response): Promise<never> {
    let parsedError;

    try {
      parsedError = await response.json();
    } catch {
      parsedError = new Error('Unable to parse the API response');
    }

    throw new FireblocksError(
      `Request failed: [${response.status}] ${response.statusText}`,
      parsedError
    );
  }
}