import { decryptSeed, encryptSeed, generateSeed } from '@tskey/core';

import { decryptWithKey, encryptWithKey, prfKeyToPassword } from '../prf/crypto';
import { createPasskey, derivePrfKey } from '../prf/service';
import {
  getEncryptedSeed,
  getPrfConfig,
  getSeedExported,
  hasEncryptedSeed,
  setEncryptedSeed,
  setPrfConfig,
  setSeedExported,
  setUnlockMethod,
} from '../storage';
import { getDecryptedSeed, getMasterPassword, isUnlocked, lock, unlock } from './store';

export { getDecryptedSeed, getMasterPassword, isUnlocked, lock } from './store';

export async function unlockSession(password: string): Promise<void> {
  const encryptedSeed = await getEncryptedSeed();

  if (encryptedSeed) {
    const seed = await decryptSeed(encryptedSeed, password);
    unlock(password, seed);
  } else {
    throw new Error('No seed found. Please set up first.');
  }
}

export async function setupSeed(password: string): Promise<void> {
  const seed = await generateSeed();
  const encrypted = await encryptSeed(seed, password);
  await setEncryptedSeed(encrypted);
  await setSeedExported(false);
  await setUnlockMethod('password');
  unlock(password, seed);
}

export async function setupSessionWithPrf(userId: string): Promise<void> {
  const { credentialId, salt } = await createPasskey(userId);
  const { prfKey } = await derivePrfKey(credentialId, salt);

  const seed = await generateSeed();
  const encryptedSeed = await encryptWithKey(seed, prfKey);

  await setEncryptedSeed(encryptedSeed);
  await setSeedExported(false);
  await setUnlockMethod('prf');
  await setPrfConfig({ credentialId, salt });

  const password = prfKeyToPassword(prfKey);
  unlock(password, seed);
}

export async function unlockSessionWithPrf(): Promise<void> {
  const prfConfig = await getPrfConfig();
  if (prfConfig === null) {
    throw new Error('PRF not configured');
  }

  const encryptedSeed = await getEncryptedSeed();
  if (encryptedSeed === null) {
    throw new Error('No seed found');
  }

  const { prfKey } = await derivePrfKey(prfConfig.credentialId, prfConfig.salt);
  const seed = await decryptWithKey(encryptedSeed, prfKey);
  const password = prfKeyToPassword(prfKey);

  unlock(password, seed);
}

export async function setupSessionWithPrfKey(
  prfKey: Uint8Array,
  credentialId: string,
  salt: string,
): Promise<void> {
  const seed = await generateSeed();
  const encryptedSeed = await encryptWithKey(seed, prfKey);

  await setEncryptedSeed(encryptedSeed);
  await setSeedExported(false);
  await setUnlockMethod('prf');
  await setPrfConfig({ credentialId, salt });

  const password = prfKeyToPassword(prfKey);
  unlock(password, seed);
}

export async function unlockSessionWithPrfKey(prfKey: Uint8Array): Promise<void> {
  const encryptedSeed = await getEncryptedSeed();
  if (encryptedSeed === null) {
    throw new Error('No seed found');
  }

  const seed = await decryptWithKey(encryptedSeed, prfKey);
  const password = prfKeyToPassword(prfKey);

  unlock(password, seed);
}

export async function hasSeedStored(): Promise<boolean> {
  return hasEncryptedSeed();
}

export async function exportSeed(): Promise<Uint8Array> {
  const seed = getDecryptedSeed();
  if (!seed) {
    throw new Error('Session not unlocked');
  }
  return seed;
}

export async function importSeed(seed: Uint8Array, password: string): Promise<void> {
  const encrypted = await encryptSeed(seed, password);
  await setEncryptedSeed(encrypted);
  await setSeedExported(true);
  await setUnlockMethod('password');
  unlock(password, seed);
}

export async function isSeedExported(): Promise<boolean> {
  return getSeedExported();
}

export async function markSeedExported(): Promise<void> {
  await setSeedExported(true);
}
