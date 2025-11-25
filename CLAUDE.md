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
│   │   │   ├── csprng.ts     # PBKDF2 + AES-CTR DRBG
│   │   │   ├── password.ts
│   │   │   ├── charset.ts
│   │   │   ├── realm.ts      # Domain → realm extraction (tldts)
│   │   │   └── types.ts
│   │   └── test/             # Vitest tests
│   └── extension/      # Chrome extension (WXT)
│       └── src/
│           ├── entrypoints/  # WXT entry points (thin layer)
│           │   ├── background.ts
│           │   ├── content.ts
│           │   └── popup/
│           ├── session/      # Session domain (master password)
│           ├── generator/    # Password generation domain
│           ├── autofill/     # Form detection & autofill
│           ├── inline/       # Inline dropdown (Shadow DOM)
│           ├── popup/        # Popup UI (pages, components, hooks)
│           ├── messaging/    # Message protocol types & handlers
│           └── shared/       # Shared utilities (clipboard)
├── pnpm-workspace.yaml
├── flake.nix
└── package.json
```

## Core Algorithm (gokey compatible)

gokey uses PBKDF2 + AES-CTR for deterministic random byte generation:

```typescript
// 1. Derive key from password + realm
const key = await PBKDF2(password, realm, 4096, 32, "SHA-256");

// 2. Create AES-CTR cipher with zero IV
const cipher = await AES-CTR(key, zeroIV);

// 3. Generate deterministic bytes by encrypting zeros
const bytes = cipher.encrypt(new Uint8Array(length));

// 4. Map bytes to charset with rejection sampling
const password = mapToCharset(bytes, spec);
```

Key points:

- PBKDF2-SHA256 with 4096 iterations
- Salt = realm string (password-only mode)
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
Popup/Content → Background: { type: 'GET_STATUS' }
Popup/Content → Background: { type: 'GENERATE', payload: { realm } }
Popup → Background: { type: 'GET_CURRENT_REALM' }
Background → Content: { type: 'FILL', payload: { password } }
```

## Implementation Status

### Completed
- [x] `packages/core/` - Crypto logic (65 tests passing)
- [x] `packages/extension/src/messaging/` - Type-safe message protocol
- [x] `packages/extension/src/session/` - Master password in-memory store (persists until browser close)
- [x] `packages/extension/src/generator/` - @tskey/core wrapper
- [x] `packages/extension/src/entrypoints/background.ts` - Service worker message handler
- [x] `packages/extension/src/popup/` - Unlock/Generator UI (auto-detects realm from active tab)
- [x] `packages/extension/src/autofill/` - Form detection & fill
- [x] `packages/extension/src/inline/` - Inline dropdown below password fields (Shadow DOM)
- [x] `packages/extension/src/entrypoints/content.ts` - Content script with password field focus detection
- [x] `packages/extension/src/shared/` - Clipboard auto-clear

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
