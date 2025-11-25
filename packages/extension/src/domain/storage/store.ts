import type { StorageData, StorageSettings } from './types';
import { DEFAULT_SETTINGS } from './types';

export async function getEncryptedSeed(): Promise<Uint8Array | null> {
  const result = await chrome.storage.local.get('encryptedSeed');
  if (!result.encryptedSeed) return null;
  return base64ToBytes(result.encryptedSeed);
}

export async function setEncryptedSeed(seed: Uint8Array): Promise<void> {
  await chrome.storage.local.set({ encryptedSeed: bytesToBase64(seed) });
}

export async function clearEncryptedSeed(): Promise<void> {
  await chrome.storage.local.remove('encryptedSeed');
}

export async function hasEncryptedSeed(): Promise<boolean> {
  const result = await chrome.storage.local.get('encryptedSeed');
  return !!result.encryptedSeed;
}

export async function getSettings(): Promise<StorageSettings> {
  const result = await chrome.storage.local.get('settings');
  return { ...DEFAULT_SETTINGS, ...result.settings };
}

export async function setSettings(settings: Partial<StorageSettings>): Promise<void> {
  const current = await getSettings();
  await chrome.storage.local.set({ settings: { ...current, ...settings } });
}

function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBytes(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}
