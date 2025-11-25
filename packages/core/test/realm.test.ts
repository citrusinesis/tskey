import { describe, expect, it } from 'vitest';

import { extractRealm, parseRealm } from '../src/realm';

describe('extractRealm', () => {
  describe('URL parsing', () => {
    it('extracts domain from full URL', () => {
      expect(extractRealm('https://www.example.com/path?query=1')).toBe('example.com');
    });

    it('extracts domain from URL with subdomain', () => {
      expect(extractRealm('https://login.github.com/auth')).toBe('github.com');
    });

    it('handles URL without path', () => {
      expect(extractRealm('https://example.com')).toBe('example.com');
    });

    it('handles hostname without protocol', () => {
      expect(extractRealm('example.com')).toBe('example.com');
    });
  });

  describe('eTLD+1 extraction', () => {
    it('extracts eTLD+1 from multi-level subdomain', () => {
      expect(extractRealm('https://a.b.c.example.com')).toBe('example.com');
    });

    it('handles public suffix correctly', () => {
      expect(extractRealm('https://example.co.uk')).toBe('example.co.uk');
    });

    it('handles github.io (tldts treats as regular domain)', () => {
      expect(extractRealm('https://user.github.io')).toBe('github.io');
    });
  });

  describe('special hostnames', () => {
    it('handles localhost', () => {
      expect(extractRealm('http://localhost:3000')).toBe('localhost');
    });

    it('handles IP address', () => {
      expect(extractRealm('http://192.168.1.1:8080')).toBe('192.168.1.1');
    });

    it('handles IPv6 address', () => {
      expect(extractRealm('http://[::1]:8080')).toBe('::1');
    });
  });

  describe('custom mappings', () => {
    it('maps hostname to custom realm', () => {
      expect(
        extractRealm('https://youtube.com', {
          customMappings: { 'youtube.com': 'google.com' },
        }),
      ).toBe('google.com');
    });

    it('maps extracted realm to custom realm', () => {
      expect(
        extractRealm('https://www.youtube.com', {
          customMappings: { 'youtube.com': 'google.com' },
        }),
      ).toBe('google.com');
    });

    it('prioritizes full hostname match over extracted realm', () => {
      expect(
        extractRealm('https://special.example.com', {
          customMappings: {
            'special.example.com': 'special-realm',
            'example.com': 'default-realm',
          },
        }),
      ).toBe('special-realm');
    });
  });

  describe('subdomain inclusion', () => {
    it('excludes subdomain by default', () => {
      expect(extractRealm('https://api.example.com')).toBe('example.com');
    });

    it('includes subdomain when enabled', () => {
      expect(
        extractRealm('https://api.example.com', {
          includeSubdomain: true,
        }),
      ).toBe('api.example.com');
    });

    it('handles no subdomain with includeSubdomain enabled', () => {
      expect(
        extractRealm('https://example.com', {
          includeSubdomain: true,
        }),
      ).toBe('example.com');
    });
  });

  describe('versioning', () => {
    it('does not add version suffix for version 1', () => {
      expect(extractRealm('https://example.com', { version: 1 })).toBe('example.com');
    });

    it('adds version suffix for version > 1', () => {
      expect(extractRealm('https://example.com', { version: 2 })).toBe('example.com#2');
    });

    it('adds version suffix for higher versions', () => {
      expect(extractRealm('https://example.com', { version: 10 })).toBe('example.com#10');
    });

    it('combines custom mapping with version', () => {
      expect(
        extractRealm('https://youtube.com', {
          customMappings: { 'youtube.com': 'google.com' },
          version: 3,
        }),
      ).toBe('google.com#3');
    });
  });
});

describe('parseRealm', () => {
  describe('without version', () => {
    it('returns realm with version 1', () => {
      expect(parseRealm('example.com')).toEqual({
        realm: 'example.com',
        version: 1,
      });
    });

    it('handles complex domain', () => {
      expect(parseRealm('api.example.co.uk')).toEqual({
        realm: 'api.example.co.uk',
        version: 1,
      });
    });
  });

  describe('with version', () => {
    it('extracts version 2', () => {
      expect(parseRealm('example.com#2')).toEqual({
        realm: 'example.com',
        version: 2,
      });
    });

    it('extracts higher version', () => {
      expect(parseRealm('example.com#15')).toEqual({
        realm: 'example.com',
        version: 15,
      });
    });

    it('handles realm with dots and version', () => {
      expect(parseRealm('api.example.co.uk#3')).toEqual({
        realm: 'api.example.co.uk',
        version: 3,
      });
    });
  });

  describe('edge cases', () => {
    it('handles hash in realm without number', () => {
      expect(parseRealm('example#test')).toEqual({
        realm: 'example#test',
        version: 1,
      });
    });

    it('handles multiple hashes', () => {
      expect(parseRealm('example#test#2')).toEqual({
        realm: 'example#test',
        version: 2,
      });
    });
  });
});
