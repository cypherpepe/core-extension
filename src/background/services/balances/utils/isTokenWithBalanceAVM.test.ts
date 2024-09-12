import { isTokenWithBalanceAVM } from './isTokenWithBalanceAVM';
import {
  TokenType,
  TokenWithBalanceAVM,
  TokenWithBalanceBTC,
  TokenWithBalanceEVM,
  TokenWithBalancePVM,
  TokenType as VMModulesTokenType,
} from '@avalabs/vm-module-types';

describe('src/background/services/balances/utils/isTokenWithBalanceAVM.ts', () => {
  const tokenWithBalanceAVM: TokenWithBalanceAVM = {
    type: TokenType.NATIVE,
    name: 'Avalanche',
    symbol: 'AVAX',
    balance: 1n,
    balanceDisplayValue: '0.000000001',
    coingeckoId: '',
    decimals: 9,
    description: 'description',
    logoUri: 'logoUri',
    balancePerType: {
      locked: 1,
      unlocked: 2,
      atomicMemoryUnlocked: 3,
      atomicMemoryLocked: 4,
    },
  };

  const tokenWithBalancePVM: TokenWithBalancePVM = {
    type: TokenType.NATIVE,
    name: 'Avalanche',
    symbol: 'AVAX',
    balance: 1n,
    balanceDisplayValue: '0.00000001',
    coingeckoId: '',
    decimals: 9,
    description: 'description',
    logoUri: 'logoUri',
    balancePerType: {
      atomicMemoryLocked: 4,
      atomicMemoryUnlocked: 5,
      lockedStaked: 1,
      lockedStakeable: 2,
      lockedPlatform: 3,
      unlockedUnstaked: 6,
      unlockedStaked: 7,
      pendingStaked: 8,
    },
  };

  const tokenWithBalanceBTC: TokenWithBalanceBTC = {
    type: VMModulesTokenType.NATIVE,
    name: 'Avalanche',
    symbol: 'AVAX',
    coingeckoId: 'avax',
    balance: 1n,
    balanceDisplayValue: '0.00000001',
    decimals: 9,
    description: 'description',
    logoUri: 'logoUri',
    utxos: [],
  };

  const tokenWithBalanceEVM: TokenWithBalanceEVM = {
    type: TokenType.NATIVE,
    name: 'Avalanche',
    symbol: 'AVAX',
    balance: 1n,
    balanceDisplayValue: '0.000000001',
    coingeckoId: '',
    decimals: 9,
    description: 'description',
    logoUri: 'logoUri',
  };

  it('should return true when balance is TokenWithBalanceAVM ', () => {
    const result = isTokenWithBalanceAVM(tokenWithBalanceAVM);
    expect(result).toEqual(true);
  });

  it('should return fa;se when balance is not TokenWithBalanceAVM ', () => {
    const resultPVM = isTokenWithBalanceAVM(tokenWithBalancePVM);
    expect(resultPVM).toEqual(false);
    const resultBTC = isTokenWithBalanceAVM(tokenWithBalanceBTC);
    expect(resultBTC).toEqual(false);
    const resultEVM = isTokenWithBalanceAVM(tokenWithBalanceEVM);
    expect(resultEVM).toEqual(false);
  });
});
