import {
  InfoCircleIcon,
  Stack,
  Tooltip,
  Typography,
} from '@avalabs/k2-components';
import { truncateAddress } from '@src/utils/truncateAddress';

type TruncatedIdentifierProps = {
  identifier: string;
  size?: number;
};

export const TruncatedIdentifier = ({
  identifier,
  size = 10,
}: TruncatedIdentifierProps) => (
  <Stack
    direction="row"
    sx={{ gap: 1, alignItems: 'center', justifyContent: 'space-between' }}
  >
    <Typography variant="caption">
      {truncateAddress(identifier, size)}
    </Typography>
    <Tooltip title={identifier}>
      <InfoCircleIcon size={14} sx={{ color: 'text.secondary' }} />
    </Tooltip>
  </Stack>
);