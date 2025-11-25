/** gokey-compatible DRBG using PBKDF2 + AES-CTR */
export async function createDRNG(
  password: string,
  realm: string,
): Promise<{
  read: (length: number) => Promise<Uint8Array>;
}> {
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

  const aesKey = await crypto.subtle.importKey('raw', derivedBits, { name: 'AES-CTR' }, false, [
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
