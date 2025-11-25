import { describe, expect, it } from 'vitest';

import { CHARSET, DIGITS, LOWER, randChar, SPECIAL, UPPER } from '../src/charset';

describe('charset', () => {
  describe('constants', () => {
    describe('CHARSET', () => {
      it('has 94 characters (gokey compatible)', () => {
        expect(CHARSET.length).toBe(94);
      });

      it('matches gokey charset exactly', () => {
        const gokeyCharset =
          'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890`~!@#$%^&*()-_=+[{]}\\|;:\'",<.>/?';
        expect(CHARSET).toBe(gokeyCharset);
      });

      it('contains all character groups', () => {
        expect([...LOWER].every((c) => CHARSET.includes(c))).toBe(true);
        expect([...UPPER].every((c) => CHARSET.includes(c))).toBe(true);
        expect([...DIGITS].every((c) => CHARSET.includes(c))).toBe(true);
        expect([...SPECIAL].every((c) => CHARSET.includes(c))).toBe(true);
      });
    });

    describe('LOWER', () => {
      it('has 26 lowercase letters', () => {
        expect(LOWER).toBe('abcdefghijklmnopqrstuvwxyz');
        expect(LOWER.length).toBe(26);
      });
    });

    describe('UPPER', () => {
      it('has 26 uppercase letters', () => {
        expect(UPPER).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
        expect(UPPER.length).toBe(26);
      });
    });

    describe('DIGITS', () => {
      it('has gokey digit order (1234567890)', () => {
        expect(DIGITS).toBe('1234567890');
        expect(DIGITS.length).toBe(10);
      });
    });

    describe('SPECIAL', () => {
      it('has 32 symbols', () => {
        expect(SPECIAL.length).toBe(32);
      });
    });
  });

  describe('randChar', () => {
    describe('basic behavior', () => {
      it('returns character from charset', () => {
        const bytes = new Uint8Array([50]);
        const result = randChar(bytes, 0, CHARSET);

        expect(CHARSET.includes(result.char)).toBe(true);
        expect(result.consumed).toBeGreaterThan(0);
      });

      it('produces deterministic output', () => {
        const bytes = new Uint8Array([100, 150, 200]);

        const result1 = randChar(bytes, 0, CHARSET);
        const result2 = randChar(bytes, 0, CHARSET);

        expect(result1.char).toBe(result2.char);
        expect(result1.consumed).toBe(result2.consumed);
      });
    });

    describe('rejection sampling', () => {
      it('rejects high byte values and continues', () => {
        const bytes = new Uint8Array([254, 255, 100]);
        const result = randChar(bytes, 0, CHARSET);

        expect(result.consumed).toBe(3);
        expect(CHARSET.includes(result.char)).toBe(true);
      });

      it('throws when all bytes are rejected', () => {
        const bytes = new Uint8Array([254, 255]);

        expect(() => randChar(bytes, 0, CHARSET)).toThrow('Not enough random bytes');
      });
    });

    describe('offset handling', () => {
      it('respects offset parameter', () => {
        const bytes = new Uint8Array([50, 100, 150]);

        const result0 = randChar(bytes, 0, CHARSET);
        const result1 = randChar(bytes, 1, CHARSET);

        expect(result0.char).not.toBe(result1.char);
      });
    });

    describe('custom charset', () => {
      it('works with smaller charset', () => {
        const bytes = new Uint8Array([50]);
        const customCharset = 'abc';
        const result = randChar(bytes, 0, customCharset);

        expect(customCharset.includes(result.char)).toBe(true);
      });
    });
  });
});
