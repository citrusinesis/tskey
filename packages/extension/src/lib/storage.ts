import type { PasswordSpec } from '@tskey/core';

export interface SiteConfig {
  realm: string;
  spec: Partial<PasswordSpec>;
  version: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface GlobalSettings {
  defaultSpec: PasswordSpec;
  autoLockMinutes: number;
  autoFillEnabled: boolean;
  showPasswordByDefault: boolean;
  theme: 'light' | 'dark' | 'system';
}

export interface StorageSchema {
  sites: Record<string, SiteConfig>;
  settings: GlobalSettings;
}

// TODO: Implement storage helpers
export async function getSiteConfig(_domain: string): Promise<SiteConfig | null> {
  return null;
}

export async function saveSiteConfig(_domain: string, _config: SiteConfig): Promise<void> {
  // TODO: Implement
}

export async function getSettings(): Promise<GlobalSettings | null> {
  return null;
}

export async function saveSettings(_settings: GlobalSettings): Promise<void> {
  // TODO: Implement
}
