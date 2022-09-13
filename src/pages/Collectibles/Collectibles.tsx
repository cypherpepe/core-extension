import {
  GridIcon,
  HorizontalFlex,
  ListIcon,
  LoadingSpinnerIcon,
  PrimaryButton,
  Typography,
  VerticalFlex,
} from '@avalabs/react-components';

import { Scrollbars } from '@src/components/common/scrollbars/Scrollbars';
import { useEffect, useState } from 'react';
import styled, { useTheme } from 'styled-components';
import { CollectibleGrid } from './components/CollectibleGrid';
import { CollectibleList } from './components/CollectibleList';
import { CollectibleListEmpty } from './components/CollectibleListEmpty';
import { useSetCollectibleParams } from './hooks/useSetCollectibleParams';
import { usePageHistory } from '@src/hooks/usePageHistory';
import { NFT } from '@src/background/services/balances/nft/models';
import { useBalancesContext } from '@src/contexts/BalancesProvider';

enum ListType {
  GRID = 'GRID',
  LIST = 'LIST',
}

const ButtonGroup = styled(HorizontalFlex)`
  border-radius: 4px;
  overflow: hidden;
  width: fit-content;
  margin: 8px 0 8px 16px;
`;

const GroupButton = styled(PrimaryButton)<{ active: boolean }>`
  border-radius: 0;
  width: 32px;
  height: 24px;
  min-height: 24px;
  border: none;

  &:focus {
    border: none;
  }

  &:hover {
    background: ${({ active, theme }) =>
      active ? theme.buttons.primary.bgHover : `${theme.palette.grey[100]}4D`};
  }

  ${({ active, theme }) =>
    `background-color: ${
      active ? theme.buttons.primary.bg : `${theme.palette.grey[100]}33`
    }
    };`}
`;

export function Collectibles() {
  const theme = useTheme();
  const { nfts } = useBalancesContext();
  const setCollectibleParams = useSetCollectibleParams();
  const { getPageHistoryData, setNavigationHistoryData } = usePageHistory();
  const { listType: historyListType }: { listType?: ListType } =
    getPageHistoryData();
  const [listType, setListType] = useState<ListType>(
    historyListType || ListType.GRID
  );

  useEffect(() => {
    if (historyListType) {
      setListType(historyListType);
    }
  }, [historyListType]);

  const handleClick = (listType: ListType) => {
    setListType(listType);
    setNavigationHistoryData({ listType: listType });
  };

  return (
    <VerticalFlex grow="1">
      <ButtonGroup>
        <GroupButton
          active={listType === ListType.GRID}
          onClick={() => {
            handleClick(ListType.GRID);
          }}
        >
          <GridIcon
            height="14px"
            color={
              listType === ListType.GRID ? theme.colors.bg1 : theme.colors.icon2
            }
          />
        </GroupButton>
        <GroupButton
          active={listType === ListType.LIST}
          onClick={() => {
            handleClick(ListType.LIST);
          }}
        >
          <ListIcon
            height="16px"
            color={
              listType === ListType.LIST ? theme.colors.bg1 : theme.colors.icon2
            }
          />
        </GroupButton>
      </ButtonGroup>
      {!nfts.loading && nfts.items?.length && (
        <Scrollbars>
          {listType === ListType.LIST ? (
            <CollectibleList
              onClick={(nft: NFT, tokenId: string) =>
                setCollectibleParams({
                  nft,
                  tokenId,
                  options: { path: '/collectible' },
                })
              }
            />
          ) : (
            <CollectibleGrid
              onClick={(nft: NFT, tokenId: string) =>
                setCollectibleParams({
                  nft,
                  tokenId,
                  options: { path: '/collectible' },
                })
              }
            />
          )}
        </Scrollbars>
      )}
      {!nfts.loading && nfts.items?.length === 0 && (
        <VerticalFlex
          grow="1"
          padding="0 0 72px"
          width="100%"
          align="center"
          justify="center"
        >
          <CollectibleListEmpty />
        </VerticalFlex>
      )}
      {nfts.loading && (
        <VerticalFlex
          grow="1"
          padding="0 0 72px"
          width="100%"
          align="center"
          justify="center"
        >
          <LoadingSpinnerIcon color={theme.colors.primary1} />
        </VerticalFlex>
      )}
      {nfts.error && (
        <VerticalFlex
          grow="1"
          padding="0 0 72px"
          width="100%"
          align="center"
          justify="center"
        >
          <Typography size={18} height="22px" weight={600}>
            Error
          </Typography>
          <Typography size={14} align="center" height="17px" margin="8px 0">
            Failed to load collectibles
          </Typography>
        </VerticalFlex>
      )}
    </VerticalFlex>
  );
}