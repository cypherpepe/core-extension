import { ExtensionRequest } from '@src/background/connections/extensionConnection/models';
import {
  TokenType,
  TokenWithBalance,
} from '@src/background/services/balances/models';
import { SendState } from '@src/background/services/send/models';
import { deserializeSendState } from '@src/background/services/send/utils/deserializeSendState';
import { useConnectionContext } from '@src/contexts/ConnectionProvider';
import Queue from 'queue';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { getDefaultSendForm, SendStateWithActions } from '../models';

export function useSend<
  T extends TokenWithBalance = TokenWithBalance
>(): SendStateWithActions<T> {
  const backgroundQueue = useRef(Queue({ autostart: true, concurrency: 1 }));
  const [sendState, setSendState] = useState<SendState<T>>(getDefaultSendForm);
  const stateRef = useRef<SendState<T>>(sendState);
  const { request } = useConnectionContext();

  const resetSendState = useCallback(
    () => setSendState(getDefaultSendForm),
    []
  );

  // Keep a ref to the sendState so it doesn't need to be a dependency of
  // updateSendState, otherwise it causes infinite rerenders in Send.tsx.
  useLayoutEffect(() => {
    stateRef.current = sendState;
  }, [sendState]);

  useEffect(() => {
    // Get initial maxAmount, fees, etc.
    if (sendState.loading) updateSendState(sendState);
    // ONLY run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateSendState = useCallback(
    (updates: Partial<SendState<T>>) => {
      // Updates are queued because the SEND_VALIDATE call may modify the state
      // and we want to ensure that subsequent updates have the latest state.
      backgroundQueue.current.push(async () => {
        const newState = getUpdatedState(updates, stateRef.current);
        const validatedState = await request({
          method: ExtensionRequest.SEND_VALIDATE,
          params: [newState],
        });
        setSendState(deserializeSendState(validatedState));
      });
    },
    [request]
  );

  const submitSendState = useCallback(async () => {
    if (!sendState) return Promise.resolve('');

    const txId = await request({
      method: ExtensionRequest.SEND_SUBMIT,
      params: [sendState],
    });

    setSendState((sendState) => ({ ...sendState, txId }));
    return txId;
  }, [sendState, request]);

  return {
    sendState,
    resetSendState,
    submitSendState,
    updateSendState,
  };
}

function getUpdatedState<T extends TokenWithBalance>(
  updates: Partial<SendState<T>>,
  current: SendState<T>
): SendState<T> {
  const newState = { ...current, ...updates };

  const shouldResetGasLimit =
    // A different address can affect the gasLimit estimate
    (updates.address && updates.address !== current.address) ||
    // A different token will affect the gasLimit estimate
    updates.token?.type !== current.token?.type ||
    (updates.token?.type === TokenType.ERC20 &&
      current.token?.type === TokenType.ERC20 &&
      updates.token?.symbol !== current.token?.symbol);

  if (shouldResetGasLimit) {
    delete newState.gasLimit;
  }

  return newState;
}
