import { FeatureGates } from '@avalabs/posthog-sdk';
import { useTranslation } from 'react-i18next';
import { CircularProgress, Stack } from '@avalabs/k2-components';

import { useDefiContext } from '@src/contexts/DefiProvider';
import { useFeatureFlagContext } from '@src/contexts/FeatureFlagsProvider';
import { FunctionIsOffline } from '@src/components/common/FunctionIsOffline';

import { DefiProtocolListItem } from './components/DefiProtocolListItem';
import { DefiZeroState } from './components/DefiZeroState';
import { DefiErrorState } from './components/DefiErrorState';

export function DeFi() {
  const { t } = useTranslation();
  const { portfolio, hasError, isLoading } = useDefiContext();
  const { featureFlags } = useFeatureFlagContext();

  if (!featureFlags[FeatureGates.DEFI]) {
    return <FunctionIsOffline hidePageTitle functionName={t('DeFi')} />;
  }

  const hasProtocols = portfolio.protocols.length > 0;
  const isProperlyLoaded = !isLoading && !hasError;
  const isZeroState = isProperlyLoaded && !hasProtocols;

  return (
    <Stack
      sx={{
        pt: 2,
        pb: 2,
        px: 2,
        flexGrow: 1,
        width: '100%',
        alignItems: 'center',
      }}
    >
      {isLoading && !hasProtocols && (
        // Only show the full loading screen if we have no data at all
        <CircularProgress sx={{ mt: 9 }} size={100} />
      )}
      {isZeroState && <DefiZeroState />}
      {hasError && <DefiErrorState />}
      {!hasError && hasProtocols && (
        <Stack sx={{ gap: 1, width: '100%' }}>
          {portfolio.protocols.map((protocol) => (
            <DefiProtocolListItem key={protocol.id} protocol={protocol} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}