export type PrfUnsupportedReason =
  | 'no-webauthn'
  | 'no-platform-authenticator'
  | 'no-prf-extension'
  | 'firefox-unsupported';

export interface PrfSupportResult {
  supported: boolean;
  reason?: PrfUnsupportedReason;
  browser?: 'chrome' | 'firefox' | 'safari' | 'edge' | 'unknown';
}

export async function detectPrfSupport(): Promise<PrfSupportResult> {
  const browser = detectBrowser();

  if (browser === 'firefox') {
    return { supported: false, reason: 'firefox-unsupported', browser };
  }

  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return { supported: false, reason: 'no-webauthn', browser };
  }

  const platformAvailable =
    await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  if (!platformAvailable) {
    return { supported: false, reason: 'no-platform-authenticator', browser };
  }

  if (!isPrfExtensionSupported()) {
    return { supported: false, reason: 'no-prf-extension', browser };
  }

  return { supported: true, browser };
}

export function getPrfUnavailableMessage(reason: PrfUnsupportedReason | undefined): string {
  switch (reason) {
    case 'firefox-unsupported':
      return 'Firefox does not support WebAuthn PRF. Please use Chrome, Edge, or Safari for biometric authentication.';
    case 'no-webauthn':
      return 'WebAuthn is not available in this browser.';
    case 'no-platform-authenticator':
      return 'No platform authenticator (Touch ID, Windows Hello, etc.) detected.';
    case 'no-prf-extension':
      return 'Your browser version does not support the PRF extension. Please update your browser.';
    default:
      return 'Biometric authentication is not available.';
  }
}

function detectBrowser(): PrfSupportResult['browser'] {
  const ua = navigator.userAgent;

  if (ua.includes('Firefox')) {
    return 'firefox';
  }
  if (ua.includes('Edg/')) {
    return 'edge';
  }
  if (ua.includes('Chrome')) {
    return 'chrome';
  }
  if (ua.includes('Safari') && !ua.includes('Chrome')) {
    return 'safari';
  }
  return 'unknown';
}

function isPrfExtensionSupported(): boolean {
  const ua = navigator.userAgent;

  const chromeMatch = ua.match(/Chrome\/(\d+)/);
  if (chromeMatch !== null && chromeMatch[1] !== undefined) {
    const version = parseInt(chromeMatch[1], 10);
    return version >= 116;
  }

  const safariMatch = ua.match(/Version\/(\d+).*Safari/);
  if (safariMatch !== null && safariMatch[1] !== undefined) {
    const version = parseInt(safariMatch[1], 10);
    return version >= 17;
  }

  const edgeMatch = ua.match(/Edg\/(\d+)/);
  if (edgeMatch !== null && edgeMatch[1] !== undefined) {
    const version = parseInt(edgeMatch[1], 10);
    return version >= 116;
  }

  return false;
}
