import { extractRealm, generatePassword } from '@tskey/core';

export async function generate(
  masterPassword: string,
  realm: string,
  seed?: Uint8Array,
): Promise<string> {
  return generatePassword({ masterPassword, realm, seed });
}

export function getRealm(url: string): string {
  return extractRealm(url);
}
