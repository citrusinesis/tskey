let masterPassword: string | null = null;

export function unlock(password: string): void {
  masterPassword = password;
}

export function lock(): void {
  masterPassword = null;
}

export function isUnlocked(): boolean {
  return masterPassword !== null;
}

export function getMasterPassword(): string | null {
  return masterPassword;
}
