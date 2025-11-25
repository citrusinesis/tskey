export interface CreatePasskeyResult {
  credentialId: string;
  salt: string;
}

export interface DeriveKeyResult {
  prfKey: Uint8Array;
}

export async function createPasskey(userId: string): Promise<CreatePasskeyResult> {
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const saltBase64 = bytesToBase64(salt);

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: {
        name: 'TSKey Password Manager',
        id: window.location.hostname,
      },
      user: {
        id: new TextEncoder().encode(userId),
        name: 'TSKey Biometric Key',
        displayName: 'TSKey Biometric Key',
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },
        { alg: -257, type: 'public-key' },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      extensions: {
        prf: {
          eval: {
            first: salt,
          },
        },
      },
    },
  });

  if (credential === null) {
    throw new Error('Failed to create passkey');
  }

  const pkCredential = credential as PublicKeyCredential;
  const credentialId = bytesToBase64(new Uint8Array(pkCredential.rawId));

  return { credentialId, salt: saltBase64 };
}

export async function derivePrfKey(credentialId: string, salt: string): Promise<DeriveKeyResult> {
  const saltBytes = base64ToBytes(salt);
  const credentialIdBytes = base64ToBytes(credentialId);

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [
        {
          id: credentialIdBytes,
          type: 'public-key',
        },
      ],
      userVerification: 'required',
      extensions: {
        prf: {
          eval: {
            first: saltBytes,
          },
        },
      },
    },
  });

  if (assertion === null) {
    throw new Error('Failed to authenticate');
  }

  const pkAssertion = assertion as PublicKeyCredential;
  const extensionResults = pkAssertion.getClientExtensionResults() as {
    prf?: { results?: { first?: ArrayBuffer } };
  };

  const prfResult = extensionResults.prf?.results?.first;
  if (prfResult === undefined) {
    throw new Error('PRF extension not supported or failed');
  }

  return { prfKey: new Uint8Array(prfResult) };
}

function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binaryString = atob(base64);
  return new Uint8Array([...binaryString].map((c) => c.charCodeAt(0)));
}
