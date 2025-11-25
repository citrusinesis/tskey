const NONCE_SIZE = 12;

export async function encryptWithKey(plaintext: Uint8Array, key: Uint8Array): Promise<Uint8Array> {
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_SIZE));
  const cryptoKey = await importKey(key);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    cryptoKey,
    new Uint8Array(plaintext),
  );

  const result = new Uint8Array(NONCE_SIZE + ciphertext.byteLength);
  result.set(nonce, 0);
  result.set(new Uint8Array(ciphertext), NONCE_SIZE);

  return result;
}

export async function decryptWithKey(encrypted: Uint8Array, key: Uint8Array): Promise<Uint8Array> {
  const nonce = encrypted.slice(0, NONCE_SIZE);
  const ciphertext = encrypted.slice(NONCE_SIZE);
  const cryptoKey = await importKey(key);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: nonce },
    cryptoKey,
    ciphertext,
  );

  return new Uint8Array(decrypted);
}

export function prfKeyToPassword(prfKey: Uint8Array): string {
  return Array.from(prfKey)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function importKey(key: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', new Uint8Array(key), { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}
