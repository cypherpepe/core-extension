import {
  VerticalFlex,
  Typography,
  HorizontalFlex,
  HorizontalSeparator,
} from '@avalabs/react-components';
import styled from 'styled-components';
import { OnboardingStepHeader } from './components/OnboardingStepHeader';
import { StyledNumberList } from '@src/components/common/StyledNumberList';
import { Trans, useTranslation } from 'react-i18next';

interface LedgerTroubleProps {
  onBack(): void;
}

const LedgerLink = styled(Typography)`
  font-weight: 600;
  font-size: 14px;
  line-height: 24px;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.secondary1};
`;

export function LedgerTrouble({ onBack }: LedgerTroubleProps) {
  const { t } = useTranslation();

  return (
    <VerticalFlex width="100%" align="center">
      <OnboardingStepHeader
        testId="ledger-trouble"
        title={t('Trouble Connecting')}
        onClose={onBack}
      />
      <VerticalFlex justify="center" margin="0 0 24px 0">
        <Typography align="center" margin="8px 0 0" size={14} height="17px">
          {t("We're having trouble connecting to your device.")}
        </Typography>
      </VerticalFlex>

      <VerticalFlex width="361px" margin="12px 0 0">
        <HorizontalFlex margin="0 0 24px 0">
          <StyledNumberList>{t('1.')}</StyledNumberList>
          <Typography size={14} height="17px">
            {t('Connect the Ledger device to your computer.')}
          </Typography>
        </HorizontalFlex>

        <HorizontalFlex margin="0 0 24px 0">
          <StyledNumberList>{t('2.')}</StyledNumberList>
          <Typography size={14} height="17px">
            {t('Enter your PIN.')}
          </Typography>
        </HorizontalFlex>

        <HorizontalFlex>
          <StyledNumberList>{t('3.')}</StyledNumberList>
          <Typography size={14} height="17px">
            <Trans
              i18nKey="Ensure you have installed the latest <typography>Avalanche App</typography> and open it on your device."
              components={{ typography: <Typography weight="bold" /> }}
            />
          </Typography>
        </HorizontalFlex>

        <HorizontalSeparator margin="32px 0" />

        <Typography size={14} height="22px">
          <Trans
            i18nKey="If you do not have the latest Avalanche App, please add it through the <ledgerLink>Ledger Live</ledgerLink> app manager."
            components={{
              ledgerLink: (
                <LedgerLink
                  as="a"
                  href="https://www.ledger.com/ledger-live"
                  target="_blank"
                  rel="noopener noreferrer"
                />
              ),
            }}
          />
        </Typography>
        <Typography size={14} height="22px" margin="24px 0 0">
          <Trans
            i18nKey="More instructions can be found <ledgerLink>here</ledgerLink>."
            components={{
              ledgerLink: (
                <LedgerLink
                  as="a"
                  href="https://support.ledger.com/hc/en-us/articles/4404389606417-Download-and-install-Ledger-Live?docs=true"
                  target="_blank"
                  rel="noopener noreferrer"
                />
              ),
            }}
          />
        </Typography>
      </VerticalFlex>
    </VerticalFlex>
  );
}
