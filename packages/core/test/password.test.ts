import { describe, expect, it } from 'vitest';

import { DIGITS, LOWER, SPECIAL, UPPER } from '../src/charset';
import { generatePassword } from '../src/password';

describe('generatePassword', () => {
  describe('determinism', () => {
    it('produces identical password for same inputs', async () => {
      const password1 = await generatePassword({
        masterPassword: 'master',
        realm: 'example.com',
      });
      const password2 = await generatePassword({
        masterPassword: 'master',
        realm: 'example.com',
      });

      expect(password1).toBe(password2);
    });

    it('produces different passwords for different master passwords', async () => {
      const password1 = await generatePassword({
        masterPassword: 'master1',
        realm: 'example.com',
      });
      const password2 = await generatePassword({
        masterPassword: 'master2',
        realm: 'example.com',
      });

      expect(password1).not.toBe(password2);
    });

    it('produces different passwords for different realms', async () => {
      const password1 = await generatePassword({
        masterPassword: 'master',
        realm: 'example1.com',
      });
      const password2 = await generatePassword({
        masterPassword: 'master',
        realm: 'example2.com',
      });

      expect(password1).not.toBe(password2);
    });
  });

  describe('spec compliance', () => {
    describe('length', () => {
      it('generates password with default length (16)', async () => {
        const password = await generatePassword({
          masterPassword: 'master',
          realm: 'example.com',
        });

        expect(password.length).toBe(16);
      });

      it('generates password with custom length', async () => {
        const password = await generatePassword({
          masterPassword: 'master',
          realm: 'example.com',
          spec: { length: 32 },
        });

        expect(password.length).toBe(32);
      });

      it('generates short password', async () => {
        const password = await generatePassword({
          masterPassword: 'master',
          realm: 'example.com',
          spec: { length: 8, upper: 1, lower: 1, digits: 1, special: 1 },
        });

        expect(password.length).toBe(8);
      });
    });

    describe('character requirements', () => {
      it('contains at least 1 uppercase by default', async () => {
        const password = await generatePassword({
          masterPassword: 'master',
          realm: 'example.com',
        });

        const upperCount = [...password].filter((c) => UPPER.includes(c)).length;
        expect(upperCount).toBeGreaterThanOrEqual(1);
      });

      it('contains at least 1 lowercase by default', async () => {
        const password = await generatePassword({
          masterPassword: 'master',
          realm: 'example.com',
        });

        const lowerCount = [...password].filter((c) => LOWER.includes(c)).length;
        expect(lowerCount).toBeGreaterThanOrEqual(1);
      });

      it('contains at least 1 digit by default', async () => {
        const password = await generatePassword({
          masterPassword: 'master',
          realm: 'example.com',
        });

        const digitCount = [...password].filter((c) => DIGITS.includes(c)).length;
        expect(digitCount).toBeGreaterThanOrEqual(1);
      });

      it('contains at least 1 special by default', async () => {
        const password = await generatePassword({
          masterPassword: 'master',
          realm: 'example.com',
        });

        const specialCount = [...password].filter((c) => SPECIAL.includes(c)).length;
        expect(specialCount).toBeGreaterThanOrEqual(1);
      });

      it('respects custom minimum requirements', async () => {
        const password = await generatePassword({
          masterPassword: 'master',
          realm: 'example.com',
          spec: { length: 20, upper: 3, lower: 3, digits: 3, special: 3 },
        });

        const upperCount = [...password].filter((c) => UPPER.includes(c)).length;
        const lowerCount = [...password].filter((c) => LOWER.includes(c)).length;
        const digitCount = [...password].filter((c) => DIGITS.includes(c)).length;
        const specialCount = [...password].filter((c) => SPECIAL.includes(c)).length;

        expect(upperCount).toBeGreaterThanOrEqual(3);
        expect(lowerCount).toBeGreaterThanOrEqual(3);
        expect(digitCount).toBeGreaterThanOrEqual(3);
        expect(specialCount).toBeGreaterThanOrEqual(3);
      });
    });
  });

  describe('edge cases', () => {
    it('handles empty realm', async () => {
      const password = await generatePassword({
        masterPassword: 'master',
        realm: '',
      });

      expect(password.length).toBe(16);
    });

    it('handles unicode master password', async () => {
      const password = await generatePassword({
        masterPassword: '한글패스워드',
        realm: 'example.com',
      });

      expect(password.length).toBe(16);
    });

    it('handles unicode realm', async () => {
      const password = await generatePassword({
        masterPassword: 'master',
        realm: '한글.com',
      });

      expect(password.length).toBe(16);
    });
  });

  describe('gokey compatibility', () => {
    it('empty realm produces valid password', async () => {
      const password = await generatePassword({
        masterPassword: 'test-master',
        realm: '',
        spec: { length: 16, upper: 2, lower: 2, digits: 1, special: 1 },
      });

      expect(password.length).toBe(16);

      const upperCount = [...password].filter((c) => UPPER.includes(c)).length;
      const lowerCount = [...password].filter((c) => LOWER.includes(c)).length;
      const digitCount = [...password].filter((c) => DIGITS.includes(c)).length;
      const specialCount = [...password].filter((c) => SPECIAL.includes(c)).length;

      expect(upperCount).toBeGreaterThanOrEqual(2);
      expect(lowerCount).toBeGreaterThanOrEqual(2);
      expect(digitCount).toBeGreaterThanOrEqual(1);
      expect(specialCount).toBeGreaterThanOrEqual(1);
    });
  });
});
