import { makeAutoObservable, observable, configure } from 'mobx';
import { persistStore } from '@src/utils/mobx';
import {
  MnemonicWallet,
  Utils,
  BN,
  Assets,
} from '@avalabs/avalanche-wallet-sdk';
import { isInArray } from '@src/utils/common';
import { WalletType } from '@avalabs/avalanche-wallet-sdk/dist/Wallet/types';
import { store } from '@src/store/store';
import { normalize } from 'eth-sig-util';

import {
  AssetBalanceP,
  AssetBalanceRawX,
} from '@avalabs/avalanche-wallet-sdk/dist/Wallet/types';
import { Signal } from 'micro-signals';
import { ERC20 } from './types';

configure({
  enforceActions: 'never',
});
class WalletStore {
  wallet: WalletType | undefined = undefined;
  addrX: string = '';
  addrP: string = '';
  addrC: string = '';
  addrInternalX: string = '';
  hdIndexExternal: number = 0;
  hdIndexInternal: number = 0;
  balanceCRaw: BN = new BN(0);
  balanceC: string = '';
  balanceP: AssetBalanceP = {
    unlocked: new BN(0),
    locked: new BN(0),
    lockedStakeable: new BN(0),
  };
  balanceX: AssetBalanceRawX = {
    unlocked: new BN(0),
    locked: new BN(0),
  };
  balanceERC20: any = '';
  stakeAmt: any = '';
  customERC20Contracts: string[] = [];
  mnemonic: string = '';
  lastTransactionSent: string = '';
  /**
   * This will be c chain addresses
   */
  get accounts() {
    return (store.extensionStore.isUnlocked ? [this.addrC] : []).map(normalize);
  }
  /**
   *
   * @returns This is temporary until we fix wallet, this is used by permissions to ask for account permissions
   */
  get accountsInternal() {
    return [this.addrC];
  }

  /**
   * This is fired when mnemonic is set from anywhere so that we can create a wallet only if mnemonic exists or
   * when it is set
   */
  mnemonicSetSignal = new Signal<string>();
  newTokenAddedSignal = new Signal<ERC20>();

  constructor() {
    makeAutoObservable(this, {
      balanceERC20: observable,
    });
    persistStore(
      this,
      [
        'addrX',
        'addrP',
        'addrC',
        'addrInternalX',
        'hdIndexExternal',
        'hdIndexInternal',
        'balanceC',
        'balanceP',
        'balanceX',
        'balanceERC20',
        'stakeAmt',
        'mnemonic',
        'customERC20Contracts',
      ],
      'WalletStore'
    );

    this.newTokenAddedSignal.add((newToken) => {
      this.customERC20Contracts.push(newToken.address);
    });
  }

  importHD(mnemonic: string) {
    this.mnemonic = mnemonic;
    this.wallet = MnemonicWallet.fromMnemonic(mnemonic);
    // this.updateWallet();
    // return this.updateBalance();
  }

  async refreshHD() {
    let wallet = this.wallet as MnemonicWallet;

    await wallet.resetHdIndices(this.hdIndexExternal, this.hdIndexInternal);
  }

  createMnemonic(): void {
    MnemonicWallet.create();
    this.mnemonic = MnemonicWallet.generateMnemonicPhrase();
    this.mnemonicSetSignal.dispatch(this.mnemonic);
  }

  async getEthPrivateKey() {
    if (this.wallet!.type !== 'ledger') {
      let wallet = this.wallet as MnemonicWallet;
      return await wallet.getEvmPrivateKeyHex();
    }
  }

  // async updateUtxos(): Promise<void> {
  //   await this.wallet!.updateUtxosX();
  //   await this.wallet!.updateUtxosP();
  // }

  // async getPrice(): Promise<number> {
  //   return await Utils.getAvaxPrice();
  // }

  // updateWallet(): void {
  //   if (!this.wallet) {
  //     return;
  //   }

  //   this.addrX = this.wallet!.getAddressX();
  //   this.addrP = this.wallet!.getAddressP();
  //   this.addrC = this.wallet!.getAddressC();

  //   this.addrInternalX = this.wallet!.getChangeAddressX();

  //   if (this.wallet!.type === 'mnemonic') {
  //     let wallet = this.wallet as MnemonicWallet;

  //     this.hdIndexExternal = wallet.getExternalIndex();
  //     this.hdIndexInternal = wallet.getInternalIndex();
  //   }
  // }

  // async updateBalance(): Promise<void> {
  //   await this.updateUtxos();
  //   // await this.updateCustomERC20s();

  //   //  const { C, P, X } = await this.wallet!.getAvaxBalance();

  //   this.balanceCRaw = await this.wallet!.updateAvaxBalanceC();
  //   this.balanceC = await Utils.bnToAvaxC(this.balanceCRaw);
  //   this.balanceP = await this.wallet!.getAvaxBalanceP();
  //   // this.balanceX = await this.wallet!.getAvaxBalanceX();
  //   this.stakeAmt = await this.wallet!.getStake();
  // }

  async MnemonicWallet() {
    // check for wallet type, singleton vs mnemonic
    const mnemonic = await (this.mnemonic
      ? Promise.resolve(this.mnemonic)
      : this.mnemonicSetSignal.promisify());
    this.wallet = MnemonicWallet.fromMnemonic(mnemonic);
    await this.refreshHD();
  }

  // getGrandTotal(precision?: number): string {
  //   const p = Utils.bnToBig(this.balanceP.unlocked, 9);
  //   //  const x = Utils.bnToBig(this.balanceX.unlocked, 9);
  //   const c = Utils.bnToBig(this.balanceCRaw, 18);

  //   //  const xu = Utils.bnToBig(this.balanceX.unlocked, 9);
  //   const pl = Utils.bnToBig(this.balanceP.locked, 9);
  //   const ps = Utils.bnToBig(this.balanceP.lockedStakeable, 9);

  //   //    let total = p.add(x).add(c).add(xu).add(pl).add(ps);
  //   let total = p.add(c).add(pl).add(ps);

  //   if (precision) {
  //     return total.toFixed(precision).toLocaleString();
  //   }

  //   return total.toLocaleString();
  // }
}

export default WalletStore;
