import { decryptSeed, encryptSeed, generateSeed } from '@tskey/core';

import {
  getEncryptedSeed,
  getSeedExported,
  hasEncryptedSeed,
  setEncryptedSeed,
  setSeedExported,
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
  unlock(password, seed);
}

export async function isSeedExported(): Promise<boolean> {
  return getSeedExported();
}

export async function markSeedExported(): Promise<void> {
  await setSeedExported(true);
}
