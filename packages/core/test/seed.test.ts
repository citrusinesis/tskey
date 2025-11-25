import { describe, expect, it } from 'vitest';

import { createDRNGWithSeed } from '../src/csprng';
import { generatePassword } from '../src/password';
import { decryptSeed, encryptSeed, generateSeed } from '../src/seed';

describe('seed generation', () => {
  it('generates 256 byte seed', async () => {
    const seed = await generateSeed();
    expect(seed.length).toBe(256);
  });

  it('generates unique seeds', async () => {
    const seed1 = await generateSeed();
    const seed2 = await generateSeed();
    expect(seed1).not.toEqual(seed2);
  });

  it('generates non-zero seeds', async () => {
    const seed = await generateSeed();
    const hasNonZero = seed.some((b) => b !== 0);
    expect(hasNonZero).toBe(true);
  });
});

describe('seed encryption/decryption', () => {
  it('round-trips seed correctly', async () => {
    const original = await generateSeed();
    const encrypted = await encryptSeed(original, 'password');
    const decrypted = await decryptSeed(encrypted, 'password');

    expect(decrypted).toEqual(original);
  });

  it('encrypted seed is 272 bytes (256 + 16 tag)', async () => {
    const seed = await generateSeed();
    const encrypted = await encryptSeed(seed, 'password');
    expect(encrypted.length).toBe(272);
  });

  it('different passwords produce different encrypted seeds', async () => {
    const seed = await generateSeed();
    const encrypted1 = await encryptSeed(seed, 'password1');
    const encrypted2 = await encryptSeed(seed, 'password2');

    expect(encrypted1.slice(12)).not.toEqual(encrypted2.slice(12));
  });

  it('fails to decrypt with wrong password', async () => {
    const seed = await generateSeed();
    const encrypted = await encryptSeed(seed, 'password');

    await expect(decryptSeed(encrypted, 'wrong')).rejects.toThrow();
  });

  it('throws on invalid seed size', async () => {
    const invalidSeed = new Uint8Array(100);
    await expect(encryptSeed(invalidSeed, 'password')).rejects.toThrow('Seed must be 256 bytes');
  });

  it('throws on invalid encrypted seed size', async () => {
    const invalid = new Uint8Array(100);
    await expect(decryptSeed(invalid, 'password')).rejects.toThrow(
      'Encrypted seed must be 272 bytes',
    );
  });
});

describe('createDRNGWithSeed', () => {
  it('produces deterministic output for same seed and realm', async () => {
    const seed = await generateSeed();

    const drng1 = await createDRNGWithSeed(seed, 'realm');
    const drng2 = await createDRNGWithSeed(seed, 'realm');

    const bytes1 = await drng1.read(64);
    const bytes2 = await drng2.read(64);

    expect(bytes1).toEqual(bytes2);
  });

  it('produces different output for different seeds', async () => {
    const seed1 = await generateSeed();
    const seed2 = await generateSeed();

    const drng1 = await createDRNGWithSeed(seed1, 'realm');
    const drng2 = await createDRNGWithSeed(seed2, 'realm');

    const bytes1 = await drng1.read(64);
    const bytes2 = await drng2.read(64);

    expect(bytes1).not.toEqual(bytes2);
  });

  it('produces different output for different realms', async () => {
    const seed = await generateSeed();

    const drng1 = await createDRNGWithSeed(seed, 'realm1');
    const drng2 = await createDRNGWithSeed(seed, 'realm2');

    const bytes1 = await drng1.read(64);
    const bytes2 = await drng2.read(64);

    expect(bytes1).not.toEqual(bytes2);
  });
});

describe('seed-based password generation', () => {
  it('generates deterministic password with seed', async () => {
    const seed = await generateSeed();

    const password1 = await generatePassword({
      masterPassword: 'unused',
      realm: 'github.com',
      seed,
    });

    const password2 = await generatePassword({
      masterPassword: 'different',
      realm: 'github.com',
      seed,
    });

    expect(password1).toBe(password2);
  });

  it('generates different passwords for different realms with same seed', async () => {
    const seed = await generateSeed();

    const password1 = await generatePassword({
      masterPassword: 'unused',
      realm: 'github.com',
      seed,
    });

    const password2 = await generatePassword({
      masterPassword: 'unused',
      realm: 'gitlab.com',
      seed,
    });

    expect(password1).not.toBe(password2);
  });

  it('generates different passwords with different seeds', async () => {
    const seed1 = await generateSeed();
    const seed2 = await generateSeed();

    const password1 = await generatePassword({
      masterPassword: 'unused',
      realm: 'github.com',
      seed: seed1,
    });

    const password2 = await generatePassword({
      masterPassword: 'unused',
      realm: 'github.com',
      seed: seed2,
    });

    expect(password1).not.toBe(password2);
  });

  it('uses password-only mode when seed is not provided', async () => {
    const password1 = await generatePassword({
      masterPassword: 'master',
      realm: 'github.com',
    });

    const password2 = await generatePassword({
      masterPassword: 'master',
      realm: 'github.com',
    });

    expect(password1).toBe(password2);
  });

  it('seed mode ignores masterPassword for generation', async () => {
    const seed = await generateSeed();

    const withPassword1 = await generatePassword({
      masterPassword: 'password1',
      realm: 'github.com',
      seed,
    });

    const withPassword2 = await generatePassword({
      masterPassword: 'password2',
      realm: 'github.com',
      seed,
    });

    expect(withPassword1).toBe(withPassword2);
  });
});
