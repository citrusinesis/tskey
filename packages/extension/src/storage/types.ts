export interface StorageData {
  encryptedSeed?: string;
  settings: StorageSettings;
}

export interface StorageSettings {
  useSeedMode: boolean;
}

export const DEFAULT_SETTINGS: StorageSettings = {
  useSeedMode: false,
};
