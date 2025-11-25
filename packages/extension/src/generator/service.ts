import { extractRealm, generatePassword } from '@tskey/core';

export async function generate(masterPassword: string, realm: string): Promise<string> {
  return generatePassword({ masterPassword, realm });
}

export function getRealm(url: string): string {
  return extractRealm(url);
}
