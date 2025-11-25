import { describe, expect, it } from 'vitest';

import { createDRNG } from '../src/csprng';

describe('createDRNG', () => {
  describe('determinism', () => {
    it('produces identical output for same password and realm', async () => {
      const drng1 = await createDRNG('password', 'realm');
      const drng2 = await createDRNG('password', 'realm');

      const bytes1 = await drng1.read(64);
      const bytes2 = await drng2.read(64);

      expect(bytes1).toEqual(bytes2);
    });

    it('produces same first chunk on multiple instances', async () => {
      const drng1 = await createDRNG('password', 'realm');
      const drng2 = await createDRNG('password', 'realm');

      const chunk1 = await drng1.read(32);
      const chunk2 = await drng2.read(32);

      expect(chunk1).toEqual(chunk2);
    });
  });

  describe('uniqueness', () => {
    it('produces different output for different passwords', async () => {
      const drng1 = await createDRNG('password1', 'realm');
      const drng2 = await createDRNG('password2', 'realm');

      const bytes1 = await drng1.read(64);
      const bytes2 = await drng2.read(64);

      expect(bytes1).not.toEqual(bytes2);
    });

    it('produces different output for different realms', async () => {
      const drng1 = await createDRNG('password', 'realm1');
      const drng2 = await createDRNG('password', 'realm2');

      const bytes1 = await drng1.read(64);
      const bytes2 = await drng2.read(64);

      expect(bytes1).not.toEqual(bytes2);
    });
  });

  describe('output quality', () => {
    it('produces non-zero bytes', async () => {
      const drng = await createDRNG('password', 'realm');
      const bytes = await drng.read(512);

      const hasNonZero = bytes.some((b) => b !== 0);
      expect(hasNonZero).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles empty realm', async () => {
      const drng = await createDRNG('password', '');
      const bytes = await drng.read(32);

      expect(bytes.length).toBe(32);
    });

    it('handles unicode password and realm', async () => {
      const drng1 = await createDRNG('패스워드', '영역');
      const drng2 = await createDRNG('패스워드', '영역');

      const bytes1 = await drng1.read(64);
      const bytes2 = await drng2.read(64);

      expect(bytes1).toEqual(bytes2);
    });
  });

  describe('gokey compatibility', () => {
    it('pass1/realm1 and pass1/realm2 produce different streams', async () => {
      const drng0 = await createDRNG('pass1', 'realm1');
      const drng1 = await createDRNG('pass1', 'realm2');

      const bytes0 = await drng0.read(512);
      const bytes1 = await drng1.read(512);

      expect(bytes0).not.toEqual(bytes1);
    });

    it('same password/realm pair produces identical stream', async () => {
      const drng0 = await createDRNG('pass1', 'realm1');
      const drng4 = await createDRNG('pass1', 'realm1');

      const bytes0 = await drng0.read(512);
      const bytes4 = await drng4.read(512);

      expect(bytes0).toEqual(bytes4);
    });

    it('all four combinations produce distinct streams', async () => {
      const streams = await Promise.all([
        createDRNG('pass1', 'realm1').then((d) => d.read(512)),
        createDRNG('pass1', 'realm2').then((d) => d.read(512)),
        createDRNG('pass2', 'realm1').then((d) => d.read(512)),
        createDRNG('pass2', 'realm2').then((d) => d.read(512)),
      ]);

      for (let i = 0; i < streams.length; i++) {
        for (let j = i + 1; j < streams.length; j++) {
          expect(streams[i]).not.toEqual(streams[j]);
        }
      }
    });
  });
});
