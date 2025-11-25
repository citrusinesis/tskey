const SEED_SIZE = 256;
const NONCE_SIZE = 12;
const TAG_SIZE = 16;
const PBKDF2_ITERATIONS = 4096;

export async function generateSeed(): Promise<Uint8Array> {
  return crypto.getRandomValues(new Uint8Array(SEED_SIZE));
}

export async function encryptSeed(seed: Uint8Array, password: string): Promise<Uint8Array> {
  if (seed.length !== SEED_SIZE) {
    throw new Error(`Seed must be ${SEED_SIZE} bytes`);
  }

  const nonce = seed.slice(0, NONCE_SIZE);
  const masterKey = await deriveMasterKey(password, nonce);

  const plaintext = seed.slice(NONCE_SIZE);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    masterKey,
    plaintext,
  );

  const result = new Uint8Array(SEED_SIZE + TAG_SIZE);
  result.set(nonce, 0);
  result.set(new Uint8Array(encrypted), NONCE_SIZE);

  return result;
}

export async function decryptSeed(
  encryptedSeed: Uint8Array,
  password: string,
): Promise<Uint8Array> {
  if (encryptedSeed.length !== SEED_SIZE + TAG_SIZE) {
    throw new Error(`Encrypted seed must be ${SEED_SIZE + TAG_SIZE} bytes`);
  }

  const nonce = encryptedSeed.slice(0, NONCE_SIZE);
  const ciphertext = encryptedSeed.slice(NONCE_SIZE);
  const masterKey = await deriveMasterKey(password, nonce);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: nonce },
    masterKey,
    ciphertext,
  );

  const result = new Uint8Array(SEED_SIZE);
  result.set(nonce, 0);
  result.set(new Uint8Array(decrypted), NONCE_SIZE);

  return result;
}

async function deriveMasterKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
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
      salt: salt.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  );

  return crypto.subtle.importKey('raw', derivedBits, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}
