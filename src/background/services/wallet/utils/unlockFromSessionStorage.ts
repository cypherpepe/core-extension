import { isWalletReady$ } from '@avalabs/wallet-react-components';
import { resolve } from '@src/utils/promiseResolver';
import {
  getFromSessionStorage,
  removeFromSessionStorage,
} from '@src/utils/storage/session-storage';
import { filter, firstValueFrom } from 'rxjs';
import {
  LOCK_TIMEOUT,
  SessionAuthData,
  SESSION_AUTH_DATA_KEY,
} from '../models';
import {
  decryptPhraseOrKeyInStorage,
  decryptStorageKeyInStorage,
} from '../storage';
import { storageKey$ } from '../storageKey';
import { walletLocked$ } from '../walletLocked';
import { walletUnlock$ } from '../walletUnlock';

export async function unlockFromSessionStorage() {
  const isWalletLocked = await firstValueFrom(walletLocked$);

  // wallet is unlocked nothing to do
  if (isWalletLocked && !isWalletLocked.locked) {
    return;
  }

  const authData = await getFromSessionStorage<SessionAuthData>(
    SESSION_AUTH_DATA_KEY
  );

  if (
    !authData?.password ||
    !authData?.loginTime ||
    authData.loginTime + LOCK_TIMEOUT < Date.now()
  ) {
    await removeFromSessionStorage(SESSION_AUTH_DATA_KEY);
    return;
  }

  const [value, err] = await resolve(
    decryptPhraseOrKeyInStorage(authData.password)
  );
  const [storageKey, errStorageKey] = await resolve(
    decryptStorageKeyInStorage(authData.password)
  );

  if (err || errStorageKey) {
    return;
  }

  // add storage key so data can be loaded from storage
  storageKey$.next(storageKey);

  // set encrypted data and trigger unlock mechanism
  walletUnlock$.next({ value });

  // wait for the wallet to be really unlocked
  // to prevent "lot logged in" responses for dApp requests=
  await firstValueFrom(isWalletReady$.pipe(filter((wallet) => !!wallet)));
}
