import { parse } from 'tldts';

export interface RealmConfig {
  /** Custom domain → realm mappings (e.g., { "youtube.com": "google.com" }) */
  customMappings?: Record<string, string>;
  /** Include subdomain in realm (default: false) */
  includeSubdomain?: boolean;
  /** Version suffix for password rotation (e.g., 2 → "realm#2") */
  version?: number;
}

/**
 * Extract realm from URL or hostname
 *
 * @example
 * extractRealm("https://login.github.com/auth") // "github.com"
 * extractRealm("https://youtube.com", { customMappings: { "youtube.com": "google.com" } }) // "google.com"
 * extractRealm("https://github.com", { version: 2 }) // "github.com#2"
 */
export function extractRealm(urlOrHostname: string, config: RealmConfig = {}): string {
  const { customMappings = {}, includeSubdomain = false, version } = config;

  let hostname: string;
  try {
    hostname = new URL(urlOrHostname).hostname;
  } catch {
    hostname = urlOrHostname;
  }

  const hostnameMapping = customMappings[hostname];
  if (hostnameMapping !== undefined) {
    return applyVersion(hostnameMapping, version);
  }

  const parsed = parse(hostname);

  const realm = parsed.domain
    ? includeSubdomain && parsed.subdomain
      ? `${parsed.subdomain}.${parsed.domain}`
      : parsed.domain
    : (parsed.hostname ?? hostname);

  const realmMapping = customMappings[realm];
  if (realmMapping !== undefined) {
    return applyVersion(realmMapping, version);
  }

  return applyVersion(realm, version);
}

function applyVersion(realm: string, version?: number): string {
  return version && version > 1 ? `${realm}#${version}` : realm;
}

/**
 * Parse realm string to extract base realm and version
 *
 * @example
 * parseRealm("github.com") // { realm: "github.com", version: 1 }
 * parseRealm("github.com#3") // { realm: "github.com", version: 3 }
 */
export function parseRealm(realmWithVersion: string): {
  realm: string;
  version: number;
} {
  const match = realmWithVersion.match(/^(.+)#(\d+)$/);
  if (match) {
    return {
      realm: match[1]!,
      version: parseInt(match[2]!, 10),
    };
  }
  return { realm: realmWithVersion, version: 1 };
}
