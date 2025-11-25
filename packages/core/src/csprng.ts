type DRNG = {
  read: (length: number) => Promise<Uint8Array>;
};

/** gokey-compatible DRBG using PBKDF2 + AES-CTR (password-only mode) */
export async function createDRNG(password: string, realm: string): Promise<DRNG> {
  const encoder = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(realm),
      iterations: 4096,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  );

  return createAesCtrDRNG(derivedBits);
}

/** gokey-compatible DRBG using HKDF + AES-CTR (seed mode) */
export async function createDRNGWithSeed(seed: Uint8Array, realm: string): Promise<DRNG> {
  const encoder = new TextEncoder();

  const salt = new Uint8Array(28);
  salt.set(seed.slice(0, 12), 0);
  salt.set(seed.slice(seed.length - 16), 12);

  const keyMaterial = await crypto.subtle.importKey('raw', seed, 'HKDF', false, ['deriveBits']);

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt,
      info: encoder.encode(realm),
    },
    keyMaterial,
    256,
  );

  return createAesCtrDRNG(derivedBits);
}

async function createAesCtrDRNG(keyBytes: ArrayBuffer): Promise<DRNG> {
  const aesKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-CTR' }, false, [
    'encrypt',
  ]);

  let counter = 0n;

  return {
    async read(length: number): Promise<Uint8Array> {
      const counterBytes = new Uint8Array(16);
      new DataView(counterBytes.buffer).setBigUint64(0, counter, true);

      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-CTR', counter: counterBytes, length: 64 },
        aesKey,
        new Uint8Array(length),
      );

      counter += BigInt(Math.ceil(length / 16));
      return new Uint8Array(encrypted);
    },
  };
}
