import { decryptSeed, encryptSeed, generateSeed } from '@tskey/core';

import { getEncryptedSeed, hasEncryptedSeed, setEncryptedSeed } from '../storage';
import { getDecryptedSeed, getMasterPassword, isUnlocked, lock, unlock } from './store';

export { getDecryptedSeed, getMasterPassword, isUnlocked, lock } from './store';

export async function unlockSession(password: string): Promise<void> {
  const encryptedSeed = await getEncryptedSeed();

  if (encryptedSeed) {
    const seed = await decryptSeed(encryptedSeed, password);
    unlock(password, seed);
  } else {
    unlock(password);
  }
}

export async function setupSeed(password: string): Promise<void> {
  const seed = await generateSeed();
  const encrypted = await encryptSeed(seed, password);
  await setEncryptedSeed(encrypted);
  unlock(password, seed);
}

export async function hasSeedStored(): Promise<boolean> {
  return hasEncryptedSeed();
}
