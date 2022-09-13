import {
  HorizontalFlex,
  TextButton,
  Typography,
} from '@avalabs/react-components';
import {
  TokenType,
  TokenWithBalance,
} from '@src/background/services/balances/models';
import { TokenIcon } from '@src/components/common/TokenImage';
import { useAnalyticsContext } from '@src/contexts/AnalyticsProvider';
import { useSettingsContext } from '@src/contexts/SettingsProvider';
import { useSetSendDataInParams } from '@src/hooks/useSetSendDataInParams';
import { useTokensWithBalances } from '@src/hooks/useTokensWithBalances';
import { useHistory } from 'react-router-dom';
import styled, { useTheme, keyframes } from 'styled-components';

interface AssetListProps {
  assetList: TokenWithBalance[];
}

const ShowAnimation = keyframes`
0% {
  opacity: 0;
}
100% {
  opacity: 1;
}
`;

const HideAnimation = keyframes`
0% {
  opacity: 1;
}
100% {
  opacity: 0;
}
`;

const BalanceUSDField = styled(Typography)``;
const BalanceField = styled(Typography)`
  display: none;
`;

const AssetlistRow = styled(HorizontalFlex)`
  &:hover {
    background-color: ${({ theme }) => `${theme.palette.white}40`};
    > ${BalanceField} {
      display: block;
      animation: 0.3s ease-in-out ${ShowAnimation};
    }
    > ${BalanceUSDField} {
      display: none;
      animation: 0.3s ease-in-out ${HideAnimation};
    }
  }
`;

export function Assetlist({ assetList }: AssetListProps) {
  const { capture } = useAnalyticsContext();
  const tokensWithBalances = useTokensWithBalances();
  const { currencyFormatter } = useSettingsContext();
  const theme = useTheme();
  const maxAssetCount = 4;

  const restAssetCount = tokensWithBalances.length - maxAssetCount;
  const setSendDataInParams = useSetSendDataInParams();
  const history = useHistory();

  return (
    <>
      {assetList.slice(0, maxAssetCount).map((token) => {
        return (
          <AssetlistRow
            data-testid={`${token.symbol.toLowerCase()}-token-list-row`}
            align="center"
            justify="space-between"
            margin="0 -16px"
            padding="4px 16px"
            key={token.symbol}
            onClick={(e) => {
              e.stopPropagation();
              capture('PortfolioTokenSelected', {
                selectedToken:
                  token.type === TokenType.ERC20 ? token.address : token.symbol,
              });
              setSendDataInParams({
                token: token,
                options: { path: '/token' },
              });
            }}
          >
            <HorizontalFlex align="center">
              <TokenIcon
                width="16px"
                height="16px"
                src={token.logoUri}
                name={token.name}
              />
              <Typography
                data-testid="token-row-name"
                margin="0 0 0 8px"
                color={theme.colors.text1}
                size={12}
              >
                {token.name}
              </Typography>
              <Typography
                margin="0 0 0 4px"
                color={theme.colors.text2}
                size={12}
              >
                {token.symbol}
              </Typography>
            </HorizontalFlex>
            {!!token.balanceUSD && (
              <>
                <BalanceUSDField
                  data-testid="token-row-currency-balance"
                  color={theme.colors.text1}
                  size={12}
                >
                  {currencyFormatter(token.balanceUSD)}
                </BalanceUSDField>
                <BalanceField
                  data-testid="token-row-token-balance"
                  color={theme.colors.text1}
                  size={12}
                >
                  {token.balanceDisplayValue} {token.symbol}
                </BalanceField>
              </>
            )}
            {token.balanceUSD === 0 && (
              <Typography color={theme.colors.text1} size={12}>
                {token.balanceDisplayValue} {token.symbol}
              </Typography>
            )}
          </AssetlistRow>
        );
      })}
      <HorizontalFlex justify="flex-end">
        {restAssetCount > 0 && (
          <TextButton
            onClick={() => history.push('/tokenlist')}
            margin="8px 0 0 0"
          >
            + {restAssetCount} more
          </TextButton>
        )}
      </HorizontalFlex>
    </>
  );
}