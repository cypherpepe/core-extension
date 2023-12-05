import { useCallback, useEffect, useMemo, useState } from 'react';
import { SignerSessionData } from '@cubist-labs/cubesigner-sdk';
import { Button, Stack } from '@avalabs/k2-components';
import { useTranslation } from 'react-i18next';

import {
  AuthErrorCode,
  AuthStep,
  useSeedlessAuth,
} from '@src/hooks/useSeedlessAuth';
import { useConnectionContext } from '@src/contexts/ConnectionProvider';
import { UpdateSignerTokenHandler } from '@src/background/services/seedless/handlers/updateSignerToken';
import { ExtensionRequest } from '@src/background/connections/extensionConnection/models';
import { getOidcTokenProvider } from '@src/utils/seedless/getOidcTokenProvider';
import { useWalletContext } from '@src/contexts/WalletProvider';

import { TOTPChallenge } from './components/TOTPChallenge';
import { WaitingForAuthentication } from './components/WaitingForAuthentication';
import { AuthenticationError } from './components/AuthenticationError';
import { FIDOChallenge } from './components/FIDOChallenge';

const FATAL_ERRORS = [
  AuthErrorCode.NoMfaDetails,
  AuthErrorCode.UnknownError,
  AuthErrorCode.UnsupportedProvider,
  AuthErrorCode.MismatchingEmail,
  AuthErrorCode.FailedToFetchOidcToken,
  AuthErrorCode.NoMfaMethodsConfigured,
  AuthErrorCode.UnsupportedMfaMethod,
];

export const SeedlessAuthPopup = () => {
  const { request } = useConnectionContext();
  const { walletDetails } = useWalletContext();
  const { t } = useTranslation();

  const [isLoading, setIsLoading] = useState(false);

  const onSignerTokenObtained = useCallback(
    async (token: SignerSessionData, email: string) => {
      setIsLoading(true);

      request<UpdateSignerTokenHandler>({
        method: ExtensionRequest.SEEDLESS_UPDATE_SIGNER_TOKEN,
        params: [token, email],
      })
        .then(() => {
          window.close();
        })
        .finally(() => {
          setIsLoading(false);
        });
    },
    [request]
  );

  const getOidcToken = useMemo(
    () => getOidcTokenProvider(walletDetails?.authProvider),
    [walletDetails]
  );

  const {
    authenticate,
    verifyTotpCode,
    completeFidoChallenge,
    error,
    step,
    mfaDeviceName,
  } = useSeedlessAuth({
    setIsLoading,
    onSignerTokenObtained,
    getOidcToken,
  });

  useEffect(() => {
    // Initiate authentication once we know what email address to expect
    if (walletDetails?.userEmail && step === AuthStep.NotInitialized) {
      authenticate(walletDetails.userEmail);
    }
  }, [authenticate, walletDetails?.userEmail, step]);

  const isFatalError = error && FATAL_ERRORS.includes(error);

  return (
    <>
      {!isFatalError && step === AuthStep.TotpChallenge && (
        <TOTPChallenge
          error={error}
          isLoading={isLoading}
          onSubmit={verifyTotpCode}
        />
      )}
      {!isFatalError && step === AuthStep.FidoChallenge && (
        <FIDOChallenge
          error={error}
          isLoading={isLoading}
          deviceName={mfaDeviceName}
          completeFidoChallenge={completeFidoChallenge}
        />
      )}
      {!isFatalError && step === AuthStep.Initialized && (
        <WaitingForAuthentication provider={walletDetails?.authProvider} />
      )}
      {isFatalError && (
        <Stack
          sx={{
            height: 1,
            width: 1,
            px: 2,
            py: 2,
          }}
        >
          <Stack
            sx={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
          >
            <AuthenticationError error={error} />
          </Stack>
          <Button color="primary" size="large" onClick={window.close} fullWidth>
            {t('Close')}
          </Button>
        </Stack>
      )}
    </>
  );
};
