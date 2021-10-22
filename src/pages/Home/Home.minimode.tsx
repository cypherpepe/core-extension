import {
  BridgeIcon,
  ChecklistIcon,
  HorizontalFlex,
  HouseIcon,
  LightningIcon,
  SwapArrowsIcon,
  TextButton,
  Typography,
  VerticalFlex,
} from '@avalabs/react-components';
import React from 'react';
import { useHistory } from 'react-router';
import { useTheme } from 'styled-components';
import { WalletPortfolio } from '../Wallet/WalletPortfolio';

export function HomeMiniMode() {
  const history = useHistory();
  const theme = useTheme();

  function setColorWhenActive(url: string) {
    return history.location.pathname === url
      ? theme.colors.primary1
      : theme.palette.grey['300'];
  }

  return (
    <VerticalFlex width={'100%'}>
      <VerticalFlex flex={1}>
        <WalletPortfolio />
      </VerticalFlex>

      <HorizontalFlex
        justify={'space-between'}
        flex={1}
        align={'flex-end'}
        margin={'0 0 10px 0'}
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '40px',
          right: '40px',
          backgroundColor: `${theme.colors.bg1}`,
          height: '65px',
          padding: '0 15px',
        }}
      >
        <TextButton style={{ width: '40px' }}>
          <VerticalFlex>
            <HouseIcon height={'26px'} color={setColorWhenActive('/home')} />
            <br />
            <Typography color={setColorWhenActive('/home')}>
              Portfolio
            </Typography>
          </VerticalFlex>
        </TextButton>

        <TextButton style={{ width: '40px' }}>
          <VerticalFlex>
            <ChecklistIcon
              height={'26px'}
              color={setColorWhenActive('/watchlist')}
            />
            <br />
            <Typography color={setColorWhenActive('/watchlist')}>
              Watchlist
            </Typography>
          </VerticalFlex>
        </TextButton>

        <TextButton style={{ width: '40px' }}>
          <VerticalFlex>
            <LightningIcon
              height={'26px'}
              color={setColorWhenActive('/activity')}
            />
            <br />
            <Typography color={setColorWhenActive('/activity')}>
              Activity
            </Typography>
          </VerticalFlex>
        </TextButton>

        <TextButton style={{ width: '40px' }}>
          <VerticalFlex>
            <SwapArrowsIcon
              height={'26px'}
              color={setColorWhenActive('/swap')}
            />
            <br />
            <Typography color={setColorWhenActive('/swap')}>Swap</Typography>
          </VerticalFlex>
        </TextButton>

        <TextButton style={{ width: '40px' }}>
          <VerticalFlex>
            <BridgeIcon height={'26px'} color={setColorWhenActive('/bridge')} />
            <br />
            <Typography color={setColorWhenActive('/bridge')}>
              Bridge
            </Typography>
          </VerticalFlex>
        </TextButton>
      </HorizontalFlex>
    </VerticalFlex>
  );
}
