export interface StorageData {
  encryptedSeed?: string;
  seedExported?: boolean;
  sites: Record<string, SiteConfig>;
  settings: StorageSettings;
}

export interface SiteConfig {
  realm: string;
  version: number;
}

export interface StorageSettings {
  autoLockMinutes: number;
  autoFillEnabled: boolean;
}

export const DEFAULT_SETTINGS: StorageSettings = {
  autoLockMinutes: 15,
  autoFillEnabled: true,
};
