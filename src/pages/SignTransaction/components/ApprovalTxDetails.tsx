import {
  Typography,
  Button,
  LinkIcon,
  AlertTriangleIcon,
  ExternalLinkIcon,
  Link,
  Tooltip,
} from '@avalabs/k2-components';
import { Network } from '@avalabs/chains-sdk';
import { useTranslation } from 'react-i18next';
import { truncateAddress } from '@src/utils/truncateAddress';
import { getExplorerAddressByNetwork } from '@src/utils/getExplorerAddress';
import { useAccountsContext } from '@src/contexts/AccountsProvider';
import { openNewTab } from '@src/utils/extensionUtils';
import { DomainMetadata } from '@src/background/models';
import { useNetworkContext } from '@src/contexts/NetworkProvider';
import { TxDetailsRow } from './TxDetailsRow';

type ContractDetailsProps = {
  contractAddress: string;
  network?: Network;
};
export const ContractDetails = ({
  contractAddress,
  network,
}: ContractDetailsProps) => {
  const { t } = useTranslation();

  return (
    <TxDetailsRow label={t('Contract')}>
      <Button
        sx={{
          p: 0,
          minWidth: 'auto',
          display: 'inline-flex',
        }}
        variant="text"
        color="primary"
        onClick={() =>
          network &&
          openNewTab({
            url: getExplorerAddressByNetwork(
              network,
              contractAddress,
              'address'
            ),
          })
        }
      >
        <ExternalLinkIcon size={14} />
      </Button>
      <Tooltip placement="top" title={contractAddress}>
        <Typography variant="body3">
          {truncateAddress(contractAddress)}
        </Typography>
      </Tooltip>
    </TxDetailsRow>
  );
};

type AccountDetailsProps = {
  address: string;
};
export const AccountDetails = ({ address }: AccountDetailsProps) => {
  const { t } = useTranslation();
  const { getAccount } = useAccountsContext();
  const account = getAccount(address);

  return (
    <TxDetailsRow label={t('Account')}>
      <Typography variant="body3">
        {account?.name ?? truncateAddress(address)}
      </Typography>
    </TxDetailsRow>
  );
};

type WebsiteDetailsProps = {
  site: DomainMetadata;
};
export const WebsiteDetails = ({ site }: WebsiteDetailsProps) => {
  const { t } = useTranslation();

  return (
    <TxDetailsRow label={t('Website')}>
      <Link
        href={`https://${site.domain}`}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ display: 'inline-flex', color: 'text.primary' }}
      >
        <LinkIcon size={14} />
      </Link>
      <Typography variant="body3" sx={{ color: 'text.primary' }}>
        {site.domain}
      </Typography>
    </TxDetailsRow>
  );
};

type NetworkDetailsProps = {
  network: Network;
};
export const NetworkDetails = ({ network }: NetworkDetailsProps) => {
  const { t } = useTranslation();
  const { network: activeNetwork } = useNetworkContext();

  const showDifferentNetworkWarning =
    activeNetwork?.chainId !== network.chainId;

  return (
    <TxDetailsRow label={t('Network')}>
      {showDifferentNetworkWarning && (
        <Tooltip
          placement="bottom"
          title={t('Current network is different from this network')}
        >
          <AlertTriangleIcon
            sx={{ color: 'warning.main', cursor: 'pointer' }}
          />
        </Tooltip>
      )}
      <Typography variant="body3" sx={{ color: 'text.primary' }}>
        {network.chainName}
      </Typography>
    </TxDetailsRow>
  );
};