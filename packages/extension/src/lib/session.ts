/**
 * Session management for master password
 * Master password is stored only in memory (Service Worker)
 */

let masterPassword: string | null = null;
let lastActivity = 0;
const LOCK_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export function unlock(password: string): void {
  masterPassword = password;
  lastActivity = Date.now();
}

export function lock(): void {
  masterPassword = null;
  lastActivity = 0;
}

export function isUnlocked(): boolean {
  if (!masterPassword) return false;
  if (Date.now() - lastActivity > LOCK_TIMEOUT_MS) {
    lock();
    return false;
  }
  return true;
}

export function getMasterPassword(): string | null {
  if (!isUnlocked()) return null;
  lastActivity = Date.now();
  return masterPassword;
}

export function touch(): void {
  if (masterPassword) {
    lastActivity = Date.now();
  }
}
