export type WalletConnectUri = `wc:${string}`;

export enum AccountImportStatus {
  NotInitiated,
  Initiated,
  AwaitingApproval,
  Successful,
  Failed,
}

interface DefaultAccountImportState {
  status: AccountImportStatus.NotInitiated;
}

interface InitiatedAccountImportState {
  status: AccountImportStatus.Initiated;
}

export interface AwaitingApprovalAccountImportState {
  status: AccountImportStatus.AwaitingApproval;
  uri: WalletConnectUri;
}

interface SuccessfulAccountImportState {
  status: AccountImportStatus.Successful;
  uri: WalletConnectUri;
  accountId: string;
}

interface FailedAccountImportState {
  status: AccountImportStatus.Failed;
  uri: WalletConnectUri;
  error: string;
}

export type AccountImportState =
  | DefaultAccountImportState
  | InitiatedAccountImportState
  | AwaitingApprovalAccountImportState
  | SuccessfulAccountImportState
  | FailedAccountImportState;