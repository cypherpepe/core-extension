import { BN } from '@avalabs/avalanche-wallet-sdk';
import {
  ExtensionConnectionMessage,
  ExtensionRequest,
} from '@src/background/connections/models';
import { AntWithBalance } from '@avalabs/wallet-react-components';

export function sendAntValidateRequest(
  amount: BN,
  address: string,
  token: AntWithBalance
): Omit<ExtensionConnectionMessage, 'id'> {
  return {
    method: ExtensionRequest.SEND_ANT_VALIDATE,
    params: [amount, address, token],
  };
}
