import { ContractCall } from '@src/abi/contractParsers/models';
import { GasPrice } from '../gas/models';

/* eslint-disable no-prototype-builtins */
export enum TxStatus {
  // user has been shown the UI and we are waiting on approval
  PENDING = 'pending',
  // user has approved and we are waiting on the background to confirm
  SUBMITTING = 'submitting',
  // tx was submitted and returned succesfull
  SIGNED = 'signed',
  ERROR = 'error',
  ERROR_USER_CANCELED = 'error-user-canceled',
}

export interface TransactionDisplayValues {
  fromAddress: string;
  toAddress: string;
  total: string;
  gasPrice: GasPrice;
  contractType: ContractCall;
  gasLimit?: number;
  fee?: string;
  feeUSD?: number;
  [key: string]: any;
}
export interface Transaction {
  id: number | string | void;
  time: number;
  status: TxStatus;
  metamaskNetworkId: string;
  chainId: string;
  txParams: txParams;
  type: string;
  transactionCategory: string;
  txHash?: string;
  displayValues: TransactionDisplayValues;
}

export function isTxParams(params: Partial<txParams>): params is txParams {
  return !!(params.to && params.from && (params.value || params.gas));
}

export type PendingTransactions = {
  [id: string]: Transaction;
};

export interface txParams {
  from: string;
  to: string;
  value: string;
  data?: string;
  gas?: string;
  gasPrice?: string;
}
/**
 * This is updating the gasPrice and gasEstimate for a pending tx
 */
export interface txParamsUpdate {
  id: any;
  params: txParams;
}
/**
 * This is updating the result with the txHash or the status
 */
export interface txStatusUpdate {
  status: TxStatus;
  id: Transaction['id'];
  result?: string;
}

export function isTxParamsUpdate(
  update: txParamsUpdate | txStatusUpdate
): update is txParamsUpdate {
  return update?.hasOwnProperty('id') && update.hasOwnProperty('params');
}

export function isTxStatusUpdate(
  update: txParamsUpdate | txStatusUpdate
): update is txStatusUpdate {
  return (
    update?.hasOwnProperty('id') &&
    update.hasOwnProperty('status') &&
    !update.hasOwnProperty('result') &&
    (update as txStatusUpdate).status !== TxStatus.SIGNED &&
    (update as txStatusUpdate).status !== TxStatus.ERROR &&
    (update as txStatusUpdate).status !== TxStatus.ERROR_USER_CANCELED
  );
}

export function isTxFinalizedUpdate(
  update: txParamsUpdate | txStatusUpdate
): update is txStatusUpdate {
  return (
    update?.hasOwnProperty('id') &&
    update.hasOwnProperty('result') &&
    update.hasOwnProperty('status') &&
    (update as txStatusUpdate).status === TxStatus.SIGNED &&
    (update as txStatusUpdate).status === TxStatus.ERROR &&
    (update as txStatusUpdate).status === TxStatus.ERROR_USER_CANCELED
  );
}
