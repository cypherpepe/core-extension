import {
  ComponentSize,
  ContactsIcon,
  HorizontalFlex,
  LoadingSpinnerIcon,
  PrimaryButton,
  SecondaryButton,
  Typography,
  VerticalFlex,
} from '@avalabs/react-components';
import styled, { useTheme } from 'styled-components';
import { useApproveAction } from '@src/hooks/useApproveAction';
import { Action, ActionStatus } from '@src/background/services/actions/models';
import { useGetRequestId } from '@src/hooks/useGetRequestId';
import { ContactInfo } from '@src/components/settings/components/ContactInfo';
import { Contact } from '@avalabs/types';

const SiteAvatar = styled(VerticalFlex)`
  width: 80px;
  height: 80px;
  background-color: ${({ theme }) => theme.colors.bg2};
  border-radius: 50%;
  margin: 8px 0;
`;

export function UpdateContacts({
  method,
}: {
  method: 'create' | 'update' | 'remove';
}) {
  const theme = useTheme();
  const requestId = useGetRequestId();

  const {
    action,
    updateAction: updateMessage,
    cancelHandler,
  } = useApproveAction(requestId);

  const request = action as Action & {
    displayData: { contact: Contact; existing?: Contact };
  };

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

  const titlePrefix = method
    ? method.slice(0, 1).toUpperCase() + method.slice(1).toLowerCase()
    : '';

  return (
    <VerticalFlex>
      <VerticalFlex grow="1" align="center" justify="center">
        <SiteAvatar justify="center" align="center">
          <ContactsIcon height="48px" width="48px" color={theme.colors.icon1} />
        </SiteAvatar>
        <HorizontalFlex align="center" width="100%" justify="center">
          <Typography
            align="center"
            size={24}
            margin="16px 0"
            height="29px"
            weight={700}
          >
            {titlePrefix} Contact?
          </Typography>
        </HorizontalFlex>
        <HorizontalFlex>
          <Typography
            size={14}
            height="17px"
            color={theme.colors.text2}
            align="center"
          >
            {request.site?.domain || 'This website'} is requesting to {method} a
            contact:
          </Typography>
        </HorizontalFlex>

        <VerticalFlex
          align="flex-start"
          justify="space-between"
          width="100%"
          marginTop="32px"
          padding="16px"
        >
          {method === 'update' && request.displayData?.existing ? (
            <>
              <VerticalFlex>
                <Typography size={14} color={theme.colors.text2}>
                  From:
                </Typography>
              </VerticalFlex>
              <ContactInfo contact={request.displayData?.existing} />

              <VerticalFlex marginTop="16px">
                <Typography size={14} color={theme.colors.text2}>
                  To:
                </Typography>
              </VerticalFlex>
              <ContactInfo contact={request.displayData?.contact} />
            </>
          ) : (
            <ContactInfo contact={request.displayData?.contact} />
          )}
        </VerticalFlex>
      </VerticalFlex>

      <VerticalFlex width="100%" justify="space-between">
        <HorizontalFlex justify="space-between" gap="8px">
          <SecondaryButton
            size={ComponentSize.LARGE}
            onClick={() => {
              cancelHandler();
              window.close();
            }}
            width="168px"
          >
            Reject
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
            Approve
          </PrimaryButton>
        </HorizontalFlex>
      </VerticalFlex>
    </VerticalFlex>
  );
}
