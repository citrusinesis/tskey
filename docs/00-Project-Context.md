# Gokey Browser Extension - Project Context

## Overview

A **vaultless password manager** browser extension based on Cloudflare's [gokey](https://github.com/cloudflare/gokey) algorithm.

### Core Concept

- **Vaultless**: Never stores passwords
- **Seed-based**: 256-bit random seed + HKDF for realm-specific password generation
- **Deterministic**: Same seed + realm always produces the same password
- **Zero-sync**: Backup only the seed file to regenerate passwords anywhere
- **gokey Compatible**: `gokey -p "master" -s seed.key -r realm`

### Project Goals

1. Provide gokey functionality as a browser extension
2. Auto-detect login forms and autofill passwords
3. Consider future expansion to native apps and cross-device sync

---

## Tech Stack

| Category        | Choice               | Reason                          |
| --------------- | -------------------- | ------------------------------- |
| Language        | **TypeScript**       | Type safety, ecosystem          |
| Extension       | **Manifest V3**      | Chrome standard, enhanced security |
| Build           | **WXT**              | Fast HMR, MV3/Firefox support   |
| UI              | **React + Tailwind** | Rapid development, small bundle |
| Crypto          | **Web Crypto API**   | Native HKDF, AES-CTR, AES-GCM   |
| Package Manager | **pnpm**             | Monorepo support, fast          |
| Monorepo        | **pnpm workspace**   | Simple, sufficient features     |
| Dev Environment | **Nix flake**        | Reproducible dev environment    |

---

## Architecture

### Monorepo Structure

```
gokey-ts/
├── packages/
│   ├── core/                     # Crypto core logic (pure TS, platform-agnostic)
│   │   ├── src/
│   │   │   ├── csprng.ts         # PBKDF2/HKDF + AES-CTR DRBG (gokey compatible)
│   │   │   ├── seed.ts           # Seed generation & encryption (AES-GCM)
│   │   │   ├── password.ts       # Password generation logic
│   │   │   ├── charset.ts        # Character set definition and mapping
│   │   │   ├── realm.ts          # URL → realm extraction (tldts)
│   │   │   ├── types.ts          # Common type definitions
│   │   │   └── index.ts          # Public exports
│   │   └── test/                 # Vitest tests (82 tests)
│   │
│   └── extension/                # Browser extension (WXT)
│       └── src/
│           ├── domain/           # Business logic + colocated UI
│           │   ├── autofill/
│           │   │   ├── detector.ts, filler.ts
│           │   │   └── ui/dropdown.ts    # Shadow DOM dropdown
│           │   ├── generator/
│           │   │   ├── service.ts        # @tskey/core wrapper
│           │   │   └── ui/               # GeneratorPage, useGenerator
│           │   ├── session/
│           │   │   ├── store.ts          # In-memory session state
│           │   │   ├── service.ts        # unlock, setupSeed
│           │   │   └── ui/               # UnlockPage, useSession
│           │   ├── messaging/            # Message protocol
│           │   └── storage/              # chrome.storage (encrypted seed)
│           ├── components/       # Shared React components
│           ├── lib/              # Utilities (clipboard)
│           └── entrypoints/      # WXT entry points (thin layer)
│               ├── background.ts
│               ├── content.ts
│               ├── popup/
│               └── options/
│
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
├── flake.nix
└── README.md
```

### Extension Architecture

Follows Feature-Sliced Design pattern with business logic and UI colocated by domain:

```
domain/
├── session/           # Session management domain
│   ├── store.ts       # State: masterPassword, decryptedSeed
│   ├── service.ts     # Logic: unlockSession, setupSeed
│   └── ui/
│       ├── UnlockPage.tsx
│       └── useSession.ts
├── generator/         # Password generation domain
│   ├── service.ts     # Logic: generate(realm, seed?)
│   └── ui/
│       ├── GeneratorPage.tsx
│       └── useGenerator.ts
└── ...
```

Benefits:
- High feature cohesion (work in single folder)
- Clear domain boundaries
- Easy to add/remove (folder-based)

### Data Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                            POPUP UI                                 │
│                                                                     │
│   [Master Password Input] ──────┐                                  │
│                                  │                                  │
│   [Current Site: github.com] ───┼──► [Generate] ──► [Copy/Fill]   │
│                                  │                                  │
│   [Settings: length=20, ...]  ──┘                                  │
└────────────────────────────────────────────────────────────────────┘
                │                              │
                │ chrome.runtime.sendMessage   │
                ▼                              ▼
┌────────────────────────────────────────────────────────────────────┐
│                     SERVICE WORKER (Background)                     │
│                                                                     │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐   │
│   │   Session   │    │   @tskey/   │    │  chrome.storage     │   │
│   │   Manager   │    │    core     │    │  (site configs)     │   │
│   │             │    │             │    │                     │   │
│   │ masterPass  │───►│ generate()  │    │ { "github.com":     │   │
│   │ (in memory) │    │             │    │   { length: 20 } }  │   │
│   └─────────────┘    └─────────────┘    └─────────────────────┘   │
└────────────────────────────────────────────────────────────────────┘
                                │
                                │ chrome.tabs.sendMessage
                                ▼
┌────────────────────────────────────────────────────────────────────┐
│                     CONTENT SCRIPT (Per Tab)                        │
│                                                                     │
│   - Detect login forms (input[type="password"])                     │
│   - Autofill password fields                                        │
│   - Cannot directly access master password (security)               │
└────────────────────────────────────────────────────────────────────┘
```

---

## Core Algorithm Implementation

### Seed-based Password Generation (HKDF + AES-CTR)

Password generation compatible with gokey's seed mode:

```
1. Initial setup (once)
   seed = crypto.getRandomValues(256 bytes)
   encryptedSeed = AES-GCM(seed, masterPassword)
   // Store in chrome.storage

2. On unlock
   seed = AES-GCM-decrypt(encryptedSeed, masterPassword)
   // Keep in memory

3. Password generation
   salt = seed[0:12] + seed[-16:]   // 28 bytes
   key = HKDF-SHA256(seed, salt, realm)
   cipher = AES-256-CTR(key, zeroIV)
   bytes = cipher.encrypt(zeros)
   password = mapBytesToCharset(bytes, spec)
```

### TypeScript Implementation Spec

```typescript
// packages/core/src/types.ts

export interface PasswordSpec {
  length: number; // Password length (default: 16)
  upper: number; // Minimum uppercase count (default: 1)
  lower: number; // Minimum lowercase count (default: 1)
  digits: number; // Minimum digit count (default: 1)
  special: number; // Minimum special character count (default: 1)
}

export interface GenerateOptions {
  seed: Uint8Array;  // 256-bit decrypted seed
  realm: string;     // Domain (e.g., "github.com")
  spec?: Partial<PasswordSpec>;
}
```

```typescript
// packages/core/src/seed.ts

export const SEED_LENGTH = 256;

export function generateSeed(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SEED_LENGTH));
}

export async function encryptSeed(
  seed: Uint8Array,
  password: string
): Promise<Uint8Array> {
  // AES-GCM encryption with PBKDF2-derived key
}

export async function decryptSeed(
  encrypted: Uint8Array,
  password: string
): Promise<Uint8Array> {
  // AES-GCM decryption
}
```

```typescript
// packages/core/src/csprng.ts

/**
 * gokey seed mode compatible CSPRNG
 * Derives key via HKDF then generates deterministic random bytes via AES-CTR
 */
export async function createSeedDRNG(
  seed: Uint8Array,
  realm: string
): Promise<{
  read: (length: number) => Promise<Uint8Array>;
}> {
  // 1. salt = seed[0:12] + seed[-16:]
  const salt = new Uint8Array(28);
  salt.set(seed.slice(0, 12), 0);
  salt.set(seed.slice(-16), 12);

  // 2. Derive AES key via HKDF
  const key = await crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt, info: realm },
    seedKey,
    { name: "AES-CTR", length: 256 },
    false,
    ["encrypt"]
  );

  // 3. Generate deterministic bytes via AES-CTR
  return {
    async read(length: number): Promise<Uint8Array> {
      const zeros = new Uint8Array(length);
      return new Uint8Array(
        await crypto.subtle.encrypt(
          { name: "AES-CTR", counter: zeroIV, length: 64 },
          key,
          zeros
        )
      );
    },
  };
}
```

---

## Storage Schema

### chrome.storage.local

```typescript
interface StorageSchema {
  // Per-site settings
  sites: {
    [domain: string]: SiteConfig;
  };

  // Global settings
  settings: GlobalSettings;
}

interface SiteConfig {
  realm: string; // Custom realm (default: domain)
  spec: Partial<PasswordSpec>;
  version: number; // Increment on password change
  notes?: string; // User notes
  createdAt: number;
  updatedAt: number;
}

interface GlobalSettings {
  defaultSpec: PasswordSpec;
  autoLockMinutes: number; // Auto-lock time (default: 15 min)
  autoFillEnabled: boolean; // Autofill enabled
  showPasswordByDefault: boolean;
  theme: "light" | "dark" | "system";
}
```

### Never Stored (Security)

- Master Password
- Generated Passwords

---

## Security Model

### Threat Model

```
Threat 1: Extension storage theft
  → Mitigation: Passwords never stored, only settings

Threat 2: Content Script XSS
  → Mitigation: Content Script cannot generate passwords, receives via message only

Threat 3: Memory dump
  → Mitigation: Master password only in Service Worker memory, auto-expires

Threat 4: Clipboard sniffing
  → Mitigation: Auto-clear clipboard (30s), recommend direct autofill
```

---

## Message Protocol

### Popup ↔ Background

```typescript
type Message =
  | { type: "UNLOCK"; payload: { password: string } }
  | { type: "LOCK" }
  | { type: "GET_SESSION_STATUS" }
  | {
      type: "GENERATE_PASSWORD";
      payload: { realm: string; spec?: PasswordSpec };
    }
  | { type: "GET_SITE_CONFIG"; payload: { domain: string } }
  | {
      type: "SAVE_SITE_CONFIG";
      payload: { domain: string; config: SiteConfig };
    };

type Response<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };
```

### Background ↔ Content Script

```typescript
// Background → Content Script (autofill)
chrome.tabs.sendMessage(tabId, {
  type: "FILL_PASSWORD",
  payload: { password: "..." },
});

// Content Script → Background (form detection notification)
chrome.runtime.sendMessage({
  type: "PASSWORD_FIELD_DETECTED",
  payload: { domain: "github.com", formId: "..." },
});
```

---

## Implementation Phases

### Phase 1: MVP ✅

**Goal**: Basic password generation and copy

- [x] Project setup (monorepo, Nix flake)
- [x] `@tskey/core` package
  - [x] HKDF + AES-CTR DRBG implementation
  - [x] Seed generation & encryption (AES-GCM)
  - [x] Password generation logic
  - [x] Realm extraction (tldts)
  - [x] Tests (82 tests passing)
- [x] Extension basic structure (WXT)
  - [x] Service Worker (session management + seed)
  - [x] Popup UI (unlock/seed setup → password generation → copy)
  - [x] Domain-based architecture (Feature-Sliced Design)

### Phase 2: Usability ✅

**Goal**: Production-ready usability

- [x] Content Script (form detection, autofill)
- [x] Inline dropdown (Shadow DOM)
- [ ] Per-site custom settings UI
- [ ] Keyboard shortcuts
- [ ] Icon and badge (lock status indicator)
- [ ] Dark mode

### Phase 3: Polish

**Goal**: Release preparation

- [ ] Options page (global settings)
- [ ] Password version management (realm#2, etc.)
- [ ] Settings export/import (JSON)
- [ ] Firefox support (WXT built-in)
- [ ] Documentation and README

---

## Tests

82 test cases in `packages/core/test/` directory:

- **csprng.test.ts** (10 tests): DRBG determinism, uniqueness, gokey compatibility
- **charset.test.ts** (13 tests): Character set constants, rejection sampling
- **password.test.ts** (15 tests): Password generation, spec compliance
- **realm.test.ts** (27 tests): URL parsing, eTLD+1 extraction, custom mappings, versions

```bash
# Run tests
nix develop --command pnpm --filter @tskey/core test
```

---

## Development Commands

```bash
# Enter Nix dev environment
nix develop

# Install dependencies
nix develop --command pnpm install

# Core package tests
nix develop --command pnpm --filter @tskey/core test

# Extension dev server (Chrome)
nix develop --command pnpm --filter @tskey/extension dev

# Extension dev server (Firefox)
nix develop --command pnpm --filter @tskey/extension dev:firefox

# Extension build
nix develop --command pnpm --filter @tskey/extension build

# Full build
nix develop --command pnpm build

# Type check
nix develop --command pnpm typecheck
```

---

## Key Files

Core files:

1. `packages/core/src/seed.ts` - Seed generation & encryption (AES-GCM)
2. `packages/core/src/csprng.ts` - HKDF + AES-CTR DRBG
3. `packages/core/src/charset.ts` - Character set and rejection sampling
4. `packages/core/src/password.ts` - Password generation
5. `packages/extension/src/domain/session/` - Session management (seed decryption)
6. `packages/extension/src/domain/generator/` - Password generation
7. `packages/extension/src/entrypoints/popup/App.tsx` - Popup UI

---

## References

- [gokey GitHub](https://github.com/cloudflare/gokey)
- [gokey csprng.go](https://github.com/cloudflare/gokey/blob/main/csprng.go)
- [gokey keygen.go](https://github.com/cloudflare/gokey/blob/main/keygen.go)
- [Web Crypto API - PBKDF2](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey#pbkdf2)
- [Web Crypto API - AES-CTR](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt#aes-ctr)
- [Chrome Extension MV3 Docs](https://developer.chrome.com/docs/extensions/mv3/)
- [WXT Documentation](https://wxt.dev/)

---

## Notes for AI Agent

### Context Awareness

- This project is **security-critical**. Write crypto-related code carefully.
- **Compatibility** with gokey seed mode is important. Implement HKDF + AES-CTR algorithm precisely.
- Understand **Manifest V3** constraints (background page → service worker, etc.).

### Code Style

#### TypeScript
- Strict mode (`strict: true`, `noUncheckedIndexedAccess: true`)
- **NEVER use `any`** - all code must be strictly typed
- Use explicit `undefined` checks instead of truthy checks for type narrowing

#### Functional Programming
- Use `map`, `filter`, `reduce` (instead of imperative loops)
- Prefer pure functions, minimize side effects
- Use function composition and pipelines

#### Comments
- **NO explanatory comments** - code should be self-documenting
- Use descriptive function/variable names instead of comments
- Allowed comments:
  - JSDoc for public APIs (`/** ... */`)
  - TODO/FIXME with issue references
  - Legal/regulatory comments
- Comment format (when needed):
  ```typescript
  /** Single line JSDoc for exports */

  /**
   * Multi-line JSDoc for complex public APIs
   * @param x - Description
   * @returns Description
   */

  // TODO(#123): Brief description
  ```

#### Error Handling
- Explicit throw or Result pattern
- No silent failures

#### Testing
- Use Vitest

### Git Workflow

- **Atomic commits**: One logical change per commit
- **Update docs with code**: Every commit must include relevant doc updates
- Keep CLAUDE.md and docs/ in sync with implementation
- Commit message format: `type(scope): description`

### When Stuck

1. Reference gokey source code: https://github.com/cloudflare/gokey/blob/main/csprng.go
2. Check Web Crypto API docs
3. Check WXT docs: https://wxt.dev/

---

_Last Updated: 2025-11_
