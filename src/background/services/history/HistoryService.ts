import {
  getBTCBlockchainLink,
  isBridgeTransaction,
} from '@src/utils/bridgeTransactionUtils';
import { BridgeService } from './../bridge/BridgeService';
import { BitcoinHistoryTx, BlockCypherProvider } from '@avalabs/wallets-sdk';
import { AccountsService } from '@src/background/services/accounts/AccountsService';
import { singleton } from 'tsyringe';
import { NetworkService } from '../network/NetworkService';
import {
  ActiveNetwork,
  BITCOIN_NETWORK,
  BTC_TOKEN,
  NetworkVM,
} from '../network/models';
import { WalletService } from '../wallet/WalletService';
import {
  AVAX_TOKEN,
  TransactionERC20,
  TransactionNormal,
} from '@avalabs/wallet-react-components';
import {
  isTransactionBitcoin,
  isTransactionERC20,
  isTransactionNormal,
} from '@src/utils/transactionUtils';
import { TxHistoryItem } from './models';

@singleton()
export class HistoryService {
  constructor(
    private networkService: NetworkService,
    private accountsService: AccountsService,
    private walletService: WalletService,
    private bridgeService: BridgeService
  ) {}
  isBridge(tx: TransactionNormal | TransactionERC20 | BitcoinHistoryTx) {
    try {
      const config = this.bridgeService.bridgeConfig;
      const bitcoinAssets = config?.config?.criticalBitcoin?.bitcoinAssets;
      const ethereumAssets = config?.config?.critical.assets;
      const bitcoinWalletAddresses =
        config?.config?.criticalBitcoin?.walletAddresses;

      if (bitcoinAssets && ethereumAssets && bitcoinWalletAddresses) {
        return isBridgeTransaction(tx, ethereumAssets, bitcoinAssets, [
          bitcoinWalletAddresses.btc,
          bitcoinWalletAddresses.avalanche,
        ]);
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  private bitcoinAmount(amount: number, demonimation: number) {
    if (amount < 0) {
      amount = amount * -1;
    }
    return (amount / Math.pow(10, demonimation)).toString();
  }

  private isContractCall(tx: TransactionNormal | TransactionERC20) {
    return isTransactionNormal(tx) && tx.input !== '0x';
  }

  private txHistoryItemConverter(
    tx: TransactionNormal | TransactionERC20 | BitcoinHistoryTx,
    network: ActiveNetwork
  ): TxHistoryItem {
    if (isTransactionBitcoin(tx)) {
      const userAddress = this.accountsService.activeAccount?.addressBTC
        ? this.accountsService.activeAccount?.addressBTC
        : '';
      const txAddress = tx.addresses[0] ? tx.addresses[0] : '';
      const denomination = BTC_TOKEN.denomination;
      return {
        isBridge: this.isBridge(tx),
        isIncoming: !tx.isSender,
        isOutgoing: tx.isSender,
        isContractCall: false,
        timestamp: new Date(tx.receivedTime).toISOString(),
        hash: tx.hash,
        amount: this.bitcoinAmount(tx.amount, denomination),
        isSender: tx.isSender,
        from: tx.isSender ? userAddress : txAddress,
        to: tx.isSender ? txAddress : userAddress,
        token: {
          decimal: denomination.toString(),
          name: BTC_TOKEN.name,
          symbol: BTC_TOKEN.symbol,
        },
        explorerLink: getBTCBlockchainLink(
          tx.hash,
          network.chainId === BITCOIN_NETWORK.chainId
        ),
        chainId: network.chainId,
      };
    } else if (isTransactionERC20(tx)) {
      return {
        isBridge: this.isBridge(tx),
        isIncoming: !tx.isSender,
        isOutgoing: tx.isSender,
        isContractCall: this.isContractCall(tx),
        timestamp: tx.timestamp.toISOString(),
        hash: tx.hash,
        amount: tx.amountDisplayValue,
        isSender: tx.isSender,
        from: tx.from,
        to: tx.to,
        token: {
          decimal: tx.tokenDecimal,
          name: tx.tokenName,
          symbol: tx.tokenSymbol,
        },
        explorerLink: tx.explorerLink,
        chainId: network.chainId,
      };
    } else {
      return {
        isBridge: this.isBridge(tx),
        isIncoming: !tx.isSender,
        isOutgoing: tx.isSender,
        isContractCall: this.isContractCall(tx),
        timestamp: tx.timestamp.toISOString(),
        hash: tx.hash,
        amount: tx.amountDisplayValue,
        isSender: tx.isSender,
        from: tx.from,
        to: tx.to,
        token: {
          decimal: AVAX_TOKEN.decimals ? AVAX_TOKEN.decimals.toString() : '18',
          name: AVAX_TOKEN.name,
          symbol: AVAX_TOKEN.symbol,
        },
        explorerLink: tx.explorerLink,
        chainId: network.chainId,
      };
    }
  }

  async getEVMHistory(network: ActiveNetwork) {
    if (network?.vm !== NetworkVM.EVM) {
      return [];
    }
    const state = this.walletService.walletState;
    const txHistory = state ? state.recentTxHistory : [];
    const results: TxHistoryItem[] = [];
    txHistory.forEach((tx) => {
      const txHistoryItem = this.txHistoryItemConverter(tx, network);
      if (txHistoryItem) {
        results.push(txHistoryItem);
      }
    });

    return results;
  }

  async getBTCTxHistory(network: ActiveNetwork) {
    if (network?.vm !== NetworkVM.BITCOIN) {
      return [];
    }
    const account = this.accountsService.activeAccount?.addressBTC;

    if (!account) {
      return [];
    }
    const provider = this.networkService.getProviderForNetwork(
      network
    ) as BlockCypherProvider;

    try {
      const txHistory: BitcoinHistoryTx[] = await provider.getTxHistory(
        account
      );
      const results: TxHistoryItem[] = [];
      txHistory.forEach((tx) => {
        const converted = this.txHistoryItemConverter(tx, network);
        if (converted) {
          results.push(converted);
        }
      });
      return results;
    } catch (error) {
      return [];
    }
  }

  async getTxHistory() {
    const network = this.networkService.activeNetwork;
    if (network) {
      switch (network.vm) {
        case NetworkVM.BITCOIN:
          return await this.getBTCTxHistory(network);
        default:
          return await this.getEVMHistory(network);
      }
    } else {
      return [];
    }
  }
}
