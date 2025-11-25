export interface PrfSupportResult {
  supported: boolean;
  reason?: 'no-webauthn' | 'no-platform-authenticator' | 'no-prf-extension';
}

interface ClientCapabilities {
  conditionalCreate?: boolean;
  conditionalGet?: boolean;
  hybridTransport?: boolean;
  passkeyPlatformAuthenticator?: boolean;
  userVerifyingPlatformAuthenticator?: boolean;
  extensions?: {
    prf?: boolean;
    largeBlob?: boolean;
    credProps?: boolean;
  };
}

interface PublicKeyCredentialWithCapabilities {
  getClientCapabilities?: () => Promise<ClientCapabilities>;
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

  const prfSupported = await isPrfExtensionSupported();
  if (!prfSupported) {
    return { supported: false, reason: 'no-prf-extension' };
  }

  return { supported: true };
}

async function isPrfExtensionSupported(): Promise<boolean> {
  const credential = PublicKeyCredential as unknown as PublicKeyCredentialWithCapabilities;

  if (typeof credential.getClientCapabilities === 'function') {
    try {
      const capabilities = await credential.getClientCapabilities();
      if (capabilities.extensions?.prf === false) {
        return false;
      }
      if (capabilities.extensions?.prf === true) {
        return true;
      }
    } catch {
      // getClientCapabilities failed, fall through to assume supported
    }
  }

  // Fallback: assume supported if:
  // - getClientCapabilities is not available
  // - getClientCapabilities doesn't report prf status
  // - getClientCapabilities call failed
  // The actual PRF operation will fail with a clear error if not supported
  return true;
}
