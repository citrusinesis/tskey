import { extractRealm, generatePassword } from '@tskey/core';

import { getSiteConfig } from '../storage';

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

export async function getEffectiveRealm(realm: string): Promise<string> {
  const config = await getSiteConfig(realm);
  const version = config?.version ?? 1;
  return version > 1 ? `${realm}#${version}` : realm;
}
