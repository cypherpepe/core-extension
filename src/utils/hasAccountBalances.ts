import { Account } from '@src/background/services/accounts/models';
import { Balances } from '@src/background/services/balances/models';

export function hasAccountBalances(
  balances: Balances,
  account: Account,
  networkIds: number[]
) {
  return Object.entries(balances)
    .filter(([networkId]) => networkIds.includes(Number(networkId)))
    .some(([, item]) => {
      if (!item) {
        return false;
      }
      const addresses = Object.keys(item);

      return (
        addresses.includes(account.addressC) ||
        (typeof account.addressBTC === 'string' &&
          addresses.includes(account.addressBTC))
      );
    });
}
