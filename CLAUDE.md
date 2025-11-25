# CLAUDE.md - TSKey Browser Extension

## What is this?

Vaultless password manager browser extension based on Cloudflare's gokey algorithm.
Generates passwords deterministically using PBKDF2 + AES-CTR.

## Tech Stack

- **Core**: TypeScript, Web Crypto API (PBKDF2, AES-CTR)
- **Extension**: Manifest V3, React, Tailwind, WXT
- **Monorepo**: pnpm workspace
- **Dev Environment**: Nix flake

## Project Structure

```
gokey-ts/
├── packages/
│   ├── core/           # Crypto logic (platform-agnostic)
│   │   ├── src/
│   │   │   ├── csprng.ts     # PBKDF2/HKDF + AES-CTR DRBG
│   │   │   ├── seed.ts       # Seed generation & encryption
│   │   │   ├── password.ts
│   │   │   ├── charset.ts
│   │   │   ├── realm.ts      # Domain → realm extraction (tldts)
│   │   │   └── types.ts
│   │   └── test/             # Vitest tests (82 tests)
│   └── extension/      # Chrome extension (WXT)
│       └── src/
│           ├── domain/       # Business logic + colocated UI
│           │   ├── autofill/
│           │   │   ├── detector.ts, filler.ts
│           │   │   └── ui/dropdown.ts  # Inline dropdown (Shadow DOM)
│           │   ├── generator/
│           │   │   ├── service.ts
│           │   │   └── ui/             # GeneratorPage, useGenerator
│           │   ├── session/
│           │   │   ├── store.ts, service.ts
│           │   │   └── ui/             # UnlockPage, useSession
│           │   ├── messaging/          # Message protocol types & handlers
│           │   └── storage/            # Chrome storage wrapper (encrypted seed)
│           ├── components/   # Shared React components (PasswordInput, CopyButton)
│           ├── lib/          # Utilities (clipboard)
│           └── entrypoints/  # WXT entry points (thin layer)
│               ├── background.ts
│               ├── content.ts
│               └── popup/App.tsx
├── pnpm-workspace.yaml
├── flake.nix
└── package.json
```

## Core Algorithm (gokey compatible)

### Password-only Mode
```typescript
// PBKDF2(password, realm) → AES-CTR key
const key = await PBKDF2(password, realm, 4096, 32, "SHA-256");
const drng = AES-CTR(key, zeroIV);
```

### Seed Mode (higher entropy)
```typescript
// 1. Generate & encrypt seed (one-time setup)
const seed = generateSeed();                    // 256 random bytes
const encrypted = encryptSeed(seed, password);  // AES-GCM

// 2. Decrypt seed & derive key with HKDF
const seed = decryptSeed(encrypted, password);
const salt = seed[0:12] + seed[-16:];           // 28 bytes
const key = HKDF(SHA256, seed, salt, realm);
const drng = AES-CTR(key, zeroIV);
```

Key points:
- Password-only: PBKDF2-SHA256, 4096 iterations
- Seed mode: HKDF-SHA256 with encrypted seed
- AES-256-CTR with 16-byte zero IV
- Rejection sampling for uniform character distribution
- gokey CLI compatible output

## Security Rules

1. **NEVER store** master password or generated passwords
2. Master password lives **only in Service Worker memory**
3. Content Scripts **cannot access** master password directly
4. Session persists until browser closes (Service Worker lifecycle)
5. Clear clipboard after copy (30s)

## Storage (chrome.storage.local)

```typescript
// Only store site configs, NOT passwords
{
  sites: {
    "github.com": {
      realm: "github.com",
      spec: { length: 20, upper: 2, lower: 2, digits: 2, special: 2 },
      version: 1
    }
  },
  settings: {
    autoFillEnabled: true
  }
}
```

## Message Flow

```
Popup/Content → Background: { type: 'UNLOCK', payload: { password } }
Popup/Content → Background: { type: 'LOCK' }
Popup/Content → Background: { type: 'GET_STATUS' }  → { isUnlocked, hasSeed }
Popup/Content → Background: { type: 'GENERATE', payload: { realm } }
Popup → Background: { type: 'GET_CURRENT_REALM' }
Popup → Background: { type: 'SETUP_SEED', payload: { password } }
Popup → Background: { type: 'HAS_SEED' }
Background → Content: { type: 'FILL', payload: { password } }
```

## Implementation Status

### Completed
- [x] `packages/core/` - Crypto logic (82 tests passing)
  - Password-only mode (PBKDF2 + AES-CTR)
  - Seed mode (HKDF + AES-CTR)
  - Seed generation & encryption (AES-GCM)
- [x] `packages/extension/src/domain/messaging/` - Type-safe message protocol
- [x] `packages/extension/src/domain/session/` - Session management with seed support
  - store.ts: In-memory master password & decrypted seed
  - service.ts: unlockSession, setupSeed, hasSeedStored
  - ui/: UnlockPage (with seed setup), useSession hook
- [x] `packages/extension/src/domain/storage/` - Chrome storage wrapper for encrypted seed
- [x] `packages/extension/src/domain/generator/` - Password generation
  - service.ts: @tskey/core wrapper (supports seed mode)
  - ui/: GeneratorPage, useGenerator hook
- [x] `packages/extension/src/domain/autofill/` - Form detection & fill
  - ui/: Inline dropdown below password fields (Shadow DOM)
- [x] `packages/extension/src/entrypoints/` - Thin WXT entry points
  - background.ts: Message router (delegates to domain services)
  - content.ts: Password field detection & dropdown trigger
  - popup/App.tsx: Composes domain UIs
- [x] `packages/extension/src/components/` - Shared UI (PasswordInput, CopyButton)
- [x] `packages/extension/src/lib/` - Utilities (clipboard auto-clear)

### Pending
- [ ] Options page (settings UI)
- [ ] Site-specific config storage

## Commands

```bash
# Enter Nix dev environment
nix develop

# Install dependencies
nix develop --command pnpm install

# Run core tests
nix develop --command pnpm --filter @tskey/core test

# Start extension dev server
nix develop --command pnpm --filter @tskey/extension dev

# Build all
nix develop --command pnpm build
```

## Tests

```bash
# Run all core tests (65 tests)
nix develop --command pnpm --filter @tskey/core test
```

Test files in `packages/core/test/`:
- `csprng.test.ts` - DRBG determinism, uniqueness, gokey compatibility
- `charset.test.ts` - Charset constants, rejection sampling
- `password.test.ts` - Password generation, spec compliance
- `realm.test.ts` - URL parsing, eTLD+1 extraction, custom mappings

## References

- gokey source: https://github.com/cloudflare/gokey
- gokey algorithm: https://github.com/cloudflare/gokey/blob/main/csprng.go
- Web Crypto API: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto
- MV3 docs: https://developer.chrome.com/docs/extensions/mv3/
- WXT: https://wxt.dev/

## Code Style

### TypeScript
- Strict mode (`strict: true`, `noUncheckedIndexedAccess: true`)
- **NEVER use `any`** - all code must be strictly typed
- Prefer explicit `undefined` checks over truthy checks for type narrowing

### Functional Programming
- Use `map`, `filter`, `reduce` over imperative loops
- Prefer pure functions, avoid side effects
- Use function composition and pipelines

### Comments
- **NO explanatory comments** - code should be self-documenting
- Use descriptive function/variable names instead of comments
- Only allowed comments:
  - JSDoc for public API (`/** ... */`)
  - TODO/FIXME with issue reference
  - Regulatory/legal comments
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

### Error Handling
- Explicit throws or Result pattern
- No silent failures

### Testing
- Vitest for all tests

## Git Workflow

- **Small atomic commits**: One commit = one small logical change
  - Adding 1-2 new files = 1 commit
  - One feature or bug fix = 1 commit
  - Separate refactoring from feature additions
- **Update docs with code**: Every commit must include relevant doc updates
- Keep CLAUDE.md and docs/ in sync with implementation
- If has breakthrough change, write documentation in docs/ in order
- Commit message format: `type(scope): description`
