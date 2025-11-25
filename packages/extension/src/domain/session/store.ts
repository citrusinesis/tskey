let masterPassword: string | null = null;
let decryptedSeed: Uint8Array | null = null;

export function unlock(password: string, seed?: Uint8Array): void {
  masterPassword = password;
  decryptedSeed = seed ?? null;
}

export function lock(): void {
  masterPassword = null;
  decryptedSeed = null;
}

export function isUnlocked(): boolean {
  return masterPassword !== null;
}

export function getMasterPassword(): string | null {
  return masterPassword;
}

export function getDecryptedSeed(): Uint8Array | null {
  return decryptedSeed;
}

export function hasSeed(): boolean {
  return decryptedSeed !== null;
}
