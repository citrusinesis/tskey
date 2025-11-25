import type { PrfConfig, SiteConfig, StorageSettings, UnlockMethod } from './types';
import { DEFAULT_SETTINGS } from './types';

interface StorageResult {
  encryptedSeed?: string;
  seedExported?: boolean;
  unlockMethod?: UnlockMethod;
  prf?: PrfConfig;
  settings?: StorageSettings;
  sites?: Record<string, SiteConfig>;
}

export async function getEncryptedSeed(): Promise<Uint8Array | null> {
  const result: StorageResult = await chrome.storage.local.get('encryptedSeed');
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
  const result: StorageResult = await chrome.storage.local.get('encryptedSeed');
  return !!result.encryptedSeed;
}

export async function getSeedExported(): Promise<boolean> {
  const result: StorageResult = await chrome.storage.local.get('seedExported');
  return result.seedExported === true;
}

export async function setSeedExported(exported: boolean): Promise<void> {
  await chrome.storage.local.set({ seedExported: exported });
}

export async function getUnlockMethod(): Promise<UnlockMethod> {
  const result: StorageResult = await chrome.storage.local.get('unlockMethod');
  return result.unlockMethod ?? 'password';
}

export async function setUnlockMethod(method: UnlockMethod): Promise<void> {
  await chrome.storage.local.set({ unlockMethod: method });
}

export async function getPrfConfig(): Promise<PrfConfig | null> {
  const result: StorageResult = await chrome.storage.local.get('prf');
  return result.prf ?? null;
}

export async function setPrfConfig(config: PrfConfig): Promise<void> {
  await chrome.storage.local.set({ prf: config });
}

export async function clearPrfConfig(): Promise<void> {
  await chrome.storage.local.remove('prf');
}

export async function getSettings(): Promise<StorageSettings> {
  const result: StorageResult = await chrome.storage.local.get('settings');
  return { ...DEFAULT_SETTINGS, ...result.settings };
}

export async function setSettings(settings: Partial<StorageSettings>): Promise<void> {
  const current = await getSettings();
  await chrome.storage.local.set({ settings: { ...current, ...settings } });
}

export async function getSites(): Promise<Record<string, SiteConfig>> {
  const result: StorageResult = await chrome.storage.local.get('sites');
  return result.sites ?? {};
}

export async function getSiteConfig(realm: string): Promise<SiteConfig | null> {
  const sites = await getSites();
  return sites[realm] ?? null;
}

export async function setSiteConfig(realm: string, config: SiteConfig): Promise<void> {
  const sites = await getSites();
  await chrome.storage.local.set({ sites: { ...sites, [realm]: config } });
}

export async function incrementSiteVersion(realm: string): Promise<number> {
  const config = await getSiteConfig(realm);
  const newVersion = (config?.version ?? 0) + 1;
  await setSiteConfig(realm, { realm, version: newVersion });
  return newVersion;
}

function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBytes(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}
