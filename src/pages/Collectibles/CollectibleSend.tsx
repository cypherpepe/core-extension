import { useCallback, useEffect, useState } from 'react';
import {
  toast,
  ComponentSize,
  PrimaryButton,
  Tooltip,
  Typography,
  VerticalFlex,
  TransactionToastType,
  TransactionToast,
  LoadingSpinnerIcon,
  WarningIcon,
  Card,
  HorizontalFlex,
} from '@avalabs/react-components';
import type { Contact } from '@avalabs/types';
import { Redirect, Route, Switch, useHistory } from 'react-router-dom';
import { PageTitle } from '@src/components/common/PageTitle';
import { useTheme } from 'styled-components';
import { useWalletContext } from '@src/contexts/WalletProvider';
import { CustomFees, GasFeeModifier } from '@src/components/common/CustomFees';
import { useCollectibleFromParams } from './hooks/useCollectibleFromParams';
import { ContactInput } from '../Send/components/ContactInput';
import { useSetCollectibleParams } from './hooks/useSetCollectibleParams';
import { CollectibleMedia } from './components/CollectibleMedia';
import { useContactFromParams } from '../Send/hooks/useContactFromParams';
import { TxInProgress } from '@src/components/common/TxInProgress';
import { CollectibleSendConfirm } from './components/CollectibleSendConfirm';
import { BigNumber } from 'ethers';
import {
  TokenType,
  NftTokenWithBalance,
} from '@src/background/services/balances/models';
import { useSend } from '../Send/hooks/useSend';
import { TransactionFeeTooltip } from '@src/components/common/TransactionFeeTooltip';
import { useNetworkContext } from '@src/contexts/NetworkProvider';
import { getExplorerAddressByNetwork } from '@src/utils/getExplorerAddress';
import { mapTokenFromNFT } from '@src/background/services/send/utils/mapTokenFromNFT';
import { WalletType } from '@src/background/services/wallet/models';
import { bnToLocaleString } from '@avalabs/utils-sdk';
import { BN } from 'bn.js';
import { useTokensWithBalances } from '@src/hooks/useTokensWithBalances';

export function CollectibleSend() {
  const theme = useTheme();
  const { walletType } = useWalletContext();
  const { nft, tokenId } = useCollectibleFromParams();
  const contactInput = useContactFromParams();
  const setCollectibleParams = useSetCollectibleParams();
  const { sendState, resetSendState, submitSendState, updateSendState } =
    useSend<NftTokenWithBalance>();
  const history = useHistory();
  const { network } = useNetworkContext();
  const tokensWithBalances = useTokensWithBalances(true);

  const [isContactsOpen, setIsContactsOpen] = useState(false);
  const [selectedGasFee, setSelectedGasFee] = useState<GasFeeModifier>(
    GasFeeModifier.INSTANT
  );
  const [showTxInProgress, setShowTxInProgress] = useState(false);

  const nftItem = nft?.nftData.find((item) => item.tokenId === tokenId);

  useEffect(() => {
    if (nft && nftItem && !sendState.token) {
      updateSendState({
        token: mapTokenFromNFT(nft, nftItem),
      });
    }
  }, [nft, nftItem, sendState.token, updateSendState]);

  const onContactChanged = (contact: Contact) => {
    setCollectibleParams({
      nft: nft,
      tokenId,
      address: contact.address,
      options: { replace: true },
    });
    updateSendState({
      address: contact.address,
    });
  };

  const maxGasPrice =
    tokensWithBalances
      ?.find((t) => t.type === TokenType.NATIVE)
      ?.balance.toString() || '0';

  const onGasChanged = useCallback(
    (gasLimit: number, gasPrice: BigNumber, feeType: GasFeeModifier) => {
      updateSendState({
        gasLimit,
        gasPrice,
      });
      setSelectedGasFee(feeType);
    },
    [updateSendState]
  );

  function getURL(hash: string | undefined): string {
    if (hash && network) {
      return getExplorerAddressByNetwork(network, hash);
    }
    return '';
  }

  const onSubmit = () => {
    setShowTxInProgress(true);
    if (!sendState.canSubmit) return;

    let toastId: string;
    if (walletType !== WalletType.LEDGER) {
      history.push('/home');
      toastId = toast.custom(
        <TransactionToast
          type={TransactionToastType.PENDING}
          text="Transaction pending..."
          startIcon={
            <LoadingSpinnerIcon height="16px" color={theme.colors.icon1} />
          }
        />
      );
    }

    submitSendState()
      .then((txId) => {
        resetSendState();
        toast.custom(
          <TransactionToast
            status="Transaction Successful"
            type={TransactionToastType.SUCCESS}
            text="View in Explorer"
            href={getURL(txId)}
          />,
          { id: toastId }
        );
        history.push('/home');
      })
      .catch(() => {
        toast.custom(
          <TransactionToast
            type={TransactionToastType.ERROR}
            text="Transaction Failed"
            startIcon={<WarningIcon height="20px" color={theme.colors.icon1} />}
          />,
          { id: toastId, duration: Infinity }
        );
      })
      .finally(() => {
        setShowTxInProgress(false);
        if (walletType === WalletType.LEDGER) history.push('/home');
      });
  };

  if (!nft || !tokenId || !nftItem) {
    return <Redirect to={'/'} />;
  }

  return (
    <Switch>
      <Route path="/collectible/send/confirm">
        <>
          {showTxInProgress && (
            <TxInProgress
              address={sendState?.token?.address}
              nftName={nftItem.externalData?.name}
              fee={bnToLocaleString(
                sendState?.sendFee || new BN(0),
                network?.networkToken.decimals ?? 18
              )}
              feeSymbol={network?.networkToken.symbol}
            />
          )}
          <CollectibleSendConfirm
            sendState={sendState}
            contact={contactInput as Contact}
            nft={nft}
            tokenId={tokenId}
            onSubmit={onSubmit}
          />
        </>
      </Route>
      <Route path="/collectible/send">
        <VerticalFlex height="100%" width="100%">
          <PageTitle>Send</PageTitle>
          <VerticalFlex grow="1" align="center" width="100%" paddingTop="8px">
            <ContactInput
              contact={contactInput}
              onChange={onContactChanged}
              isContactsOpen={isContactsOpen}
              toggleContactsDropdown={(to?: boolean) =>
                setIsContactsOpen(to ?? !isContactsOpen)
              }
              setIsOpen={setIsContactsOpen}
            />
            <VerticalFlex width="100%" margin="24px 0 0" padding="0 16px">
              <Typography size={12} height="15px">
                Collectible
              </Typography>
              <Card padding="16px" margin="8px 0 0" height="auto">
                <HorizontalFlex>
                  <CollectibleMedia
                    width="auto"
                    maxWidth="80px"
                    height="80px"
                    url={
                      nftItem?.externalData?.imageSmall ||
                      nftItem?.externalData?.image
                    }
                    hover={false}
                  />
                  <Typography size={14} height="17px" margin="0 0 0 16px">
                    {nftItem.externalData?.name}
                  </Typography>
                </HorizontalFlex>
              </Card>
            </VerticalFlex>

            <VerticalFlex width="100%" margin="24px 0 0" padding="0 16px">
              <HorizontalFlex margin="16px 0 8px" width="100%" align="center">
                <Typography size={12} height="15px" margin="0 8px 0 0">
                  Network Fee
                </Typography>
                <TransactionFeeTooltip
                  gasPrice={sendState?.gasPrice || BigNumber.from(0)}
                  gasLimit={sendState?.gasLimit}
                />
              </HorizontalFlex>
              <VerticalFlex width="100%">
                <CustomFees
                  gasPrice={sendState?.gasPrice || BigNumber.from(0)}
                  limit={sendState?.gasLimit || 0}
                  onChange={onGasChanged}
                  maxGasPrice={maxGasPrice}
                  selectedGasFeeModifier={selectedGasFee}
                />
              </VerticalFlex>
            </VerticalFlex>

            <VerticalFlex
              align="center"
              justify="flex-end"
              width="100%"
              padding="0 16px 24px"
              grow="1"
            >
              <Tooltip
                content={
                  <Typography size={14}>{sendState.error?.message}</Typography>
                }
                disabled={!sendState.error?.error}
              >
                <PrimaryButton
                  size={ComponentSize.LARGE}
                  width="343px"
                  onClick={() => {
                    setCollectibleParams({
                      nft,
                      tokenId,
                      address: contactInput?.address,
                      options: { path: '/collectible/send/confirm' },
                    });
                  }}
                  disabled={!sendState.canSubmit}
                >
                  Next
                </PrimaryButton>
              </Tooltip>
            </VerticalFlex>
          </VerticalFlex>
        </VerticalFlex>
      </Route>
    </Switch>
  );
}