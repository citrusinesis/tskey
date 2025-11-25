export interface PrfSupportResult {
  supported: boolean;
  reason?: 'no-webauthn' | 'no-platform-authenticator' | 'no-prf-extension';
}

export async function detectPrfSupport(): Promise<PrfSupportResult> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return { supported: false, reason: 'no-webauthn' };
  }

  const platformAvailable =
    await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  if (!platformAvailable) {
    return { supported: false, reason: 'no-platform-authenticator' };
  }

  if (!isPrfExtensionSupported()) {
    return { supported: false, reason: 'no-prf-extension' };
  }

  return { supported: true };
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
