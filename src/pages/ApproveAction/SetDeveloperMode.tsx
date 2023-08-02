import {
  ComponentSize,
  GlobeIcon,
  HorizontalFlex,
  LoadingSpinnerIcon,
  PrimaryButton,
  SecondaryButton,
  Typography,
  VerticalFlex,
} from '@avalabs/react-components';
import { useGetRequestId } from '@src/hooks/useGetRequestId';
import { Action, ActionStatus } from '@src/background/services/actions/models';
import { TokenIcon } from '@src/components/common/TokenIcon';
import { useTheme } from 'styled-components';
import { Network } from '@avalabs/chains-sdk';
import { useApproveAction } from '../../hooks/useApproveAction';
import { useTranslation } from 'react-i18next';
import { SiteAvatar } from '@src/components/common/SiteAvatar';

export function SetDeveloperMode() {
  const { t } = useTranslation();
  const theme = useTheme();
  const requestId = useGetRequestId();

  const {
    action,
    updateAction: updateMessage,
    cancelHandler,
  } = useApproveAction(requestId);

  const request = action as Action;

  if (!request) {
    return (
      <HorizontalFlex
        width={'100%'}
        height={'100%'}
        justify={'center'}
        align={'center'}
      >
        <LoadingSpinnerIcon color={theme.colors.icon1} />
      </HorizontalFlex>
    );
  }

  const network: Network = request?.displayData;
  return (
    <VerticalFlex>
      <VerticalFlex grow="1" align="center" justify="center">
        <SiteAvatar
          sx={{
            justify: 'center',
            align: 'center',
            my: 1,
          }}
        >
          <TokenIcon height="48px" width="48px" src={network?.logoUri}>
            <GlobeIcon height="48px" width="48px" color={theme.colors.icon1} />
          </TokenIcon>
        </SiteAvatar>
        <HorizontalFlex align="center" width="100%" justify="center">
          <Typography
            align="center"
            size={24}
            margin="16px 0"
            height="29px"
            weight={700}
          >
            {request?.displayData?.isTestmode ? t('Activate') : t('Deactivate')}{' '}
            {t('Testnet Mode?')}
          </Typography>
        </HorizontalFlex>
        <HorizontalFlex>
          <Typography
            size={14}
            height="17px"
            color={theme.colors.text2}
            align="center"
          >
            {t('{{domain}} is requesting to turn Testnet Mode {{mode}}', {
              mode: request?.displayData?.isTestmode ? t('ON') : t('OFF'),
              domain: request?.site?.domain || t('This website'),
            })}
          </Typography>
        </HorizontalFlex>
      </VerticalFlex>

      <VerticalFlex width="100%" justify="space-between">
        <HorizontalFlex justify="space-between" gap="16px">
          <SecondaryButton
            size={ComponentSize.LARGE}
            onClick={() => {
              cancelHandler();
              window.close();
            }}
            width="168px"
          >
            {t('Reject')}
          </SecondaryButton>
          <PrimaryButton
            size={ComponentSize.LARGE}
            onClick={() => {
              updateMessage({
                status: ActionStatus.SUBMITTING,
                id: request.id,
              });

              window.close();
            }}
            width="168px"
          >
            {t('Approve')}
          </PrimaryButton>
        </HorizontalFlex>
      </VerticalFlex>
    </VerticalFlex>
  );
}
