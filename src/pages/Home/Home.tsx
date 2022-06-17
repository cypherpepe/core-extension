import {
  VerticalFlex,
  TransactionToast,
  TransactionToastType,
  toast,
} from '@avalabs/react-components';
import { FAB } from '@src/components/common/fab/FAB';
import { Portfolio } from './components/Portfolio/Portfolio';
import { useSettingsContext } from '@src/contexts/SettingsProvider';
import { useEffect, useState } from 'react';
import { useOnboardingContext } from '@src/contexts/OnboardingProvider';
import { useLedgerDisconnectedDialog } from '../SignTransaction/hooks/useLedgerDisconnectedDialog';
import { LedgerAppType } from '@src/contexts/LedgerProvider';

export function Home() {
  const { toggleIsDefaultExtension, isDefaultExtension } = useSettingsContext();
  const { updateInitialOpen, onboardingState } = useOnboardingContext();
  const [isSetAsDefaultDisplayed, setIsSetAsDefaultDisplayed] = useState(false);

  useLedgerDisconnectedDialog(console.log, LedgerAppType.ETHEREUM);

  useEffect(() => {
    if (
      !isSetAsDefaultDisplayed &&
      onboardingState.initialOpen &&
      !isDefaultExtension
    ) {
      toast.custom(
        <TransactionToast
          status="You've entered your Core wallet!"
          type={TransactionToastType.SUCCESS}
          text="Set as your default wallet?"
          onClick={() => toggleIsDefaultExtension()}
          buttonText="Yes"
        />,
        {
          // Toast will show until user clicks X icon or yes button
          duration: Infinity,
          // define id to prevent showing it up multiple times
          id: 'default_extension_toast',
        }
      );
      setIsSetAsDefaultDisplayed(true);
    }
    if (onboardingState.initialOpen) {
      updateInitialOpen();
    }
  }, [
    onboardingState,
    isDefaultExtension,
    toggleIsDefaultExtension,
    updateInitialOpen,
    isSetAsDefaultDisplayed,
  ]);

  return (
    <VerticalFlex width={'100%'}>
      <VerticalFlex flex={1}>
        <Portfolio />
      </VerticalFlex>
      <FAB />
    </VerticalFlex>
  );
}
