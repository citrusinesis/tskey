# CLAUDE.md - TSKey Browser Extension

## What is this?

Vaultless password manager browser extension based on Cloudflare's gokey algorithm.
Generates passwords deterministically using seed-based HKDF + AES-CTR.

## Tech Stack

- **Core**: TypeScript, Web Crypto API (HKDF, AES-CTR, AES-GCM)
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
│           │   ├── prf/                # WebAuthn PRF utilities
│           │   │   └── detect.ts       # PRF support detection (getClientCapabilities)
│           │   ├── settings/           # Settings management
│           │   │   └── ui/useSettings.ts
│           │   ├── messaging/          # Message protocol types & handlers
│           │   └── storage/            # Chrome storage wrapper (encrypted seed, PRF config)
│           ├── components/   # Shared React components (PasswordInput, CopyButton)
│           ├── lib/          # Utilities (clipboard)
│           └── entrypoints/  # WXT entry points (thin layer)
│               ├── background.ts  # Message router + auto-lock timer
│               ├── content.ts
│               ├── popup/App.tsx
│               └── options/App.tsx  # Settings UI
├── pnpm-workspace.yaml
├── flake.nix
└── package.json
```

## Core Algorithm (gokey compatible)

```typescript
// 1. Initial setup: Generate & encrypt seed
const seed = generateSeed();                    // 256 random bytes
const encrypted = encryptSeed(seed, password);  // AES-GCM
// Store encrypted seed in chrome.storage

// 2. On unlock: Decrypt seed
const seed = decryptSeed(encrypted, password);

// 3. Generate password: HKDF + AES-CTR
const salt = seed[0:12] + seed[-16:];           // 28 bytes
const key = HKDF(SHA256, seed, salt, realm);
const drng = AES-CTR(key, zeroIV);
const password = mapToCharset(drng.read(length));
```

Key points:
- 256-bit random seed for high entropy
- Seed encrypted with AES-GCM (master password)
- HKDF-SHA256 for per-realm key derivation
- AES-256-CTR with 16-byte zero IV
- Rejection sampling for uniform character distribution
- gokey CLI compatible: `gokey -p "master" -s seed.key -r realm`

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
    autoLockMinutes: 15,        // 0 = never
    autoFillEnabled: true,
    clipboardClearSeconds: 30,  // 0 = never
    defaultPasswordLength: 20
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
  - HKDF + AES-CTR password derivation
  - Seed generation & encryption (AES-GCM)
- [x] `packages/extension/src/domain/messaging/` - Type-safe message protocol
- [x] `packages/extension/src/domain/session/` - Session management with seed support
  - store.ts: In-memory master password & decrypted seed
  - service.ts: unlockSession, setupSeed, exportSeed, importSeed
  - ui/: SetupPage, UnlockPage, SeedExportReminder, useSession hook
- [x] `packages/extension/src/domain/storage/` - Chrome storage wrapper
  - Encrypted seed (AES-GCM), sites config, settings
  - UnlockMethod type (`password` | `prf`)
  - PrfConfig storage (credentialId, salt)
  - getEffectiveRealm() for versioned passwords
- [x] `packages/extension/src/domain/prf/` - WebAuthn PRF utilities
  - detectPrfSupport(): Browser PRF support detection
  - createPasskey(): Create passkey with PRF extension
  - derivePrfKey(): Derive key from PRF during authentication
- [x] `packages/extension/src/domain/generator/` - Password generation
  - service.ts: @tskey/core wrapper (supports seed mode)
  - ui/: GeneratorPage, useGenerator hook
- [x] `packages/extension/src/domain/autofill/` - Form detection & fill
  - ui/: Inline dropdown below password fields (Shadow DOM)
- [x] `packages/extension/src/domain/settings/` - Settings management
  - ui/useSettings.ts: React hook for settings CRUD
- [x] `packages/extension/src/entrypoints/` - WXT entry points
  - background.ts: Message router + auto-lock timer (Chrome alarms)
  - content.ts: Password field detection & dropdown trigger
  - popup/App.tsx: Composes domain UIs
  - options/App.tsx: Full settings UI
- [x] `packages/extension/src/components/` - Shared UI (PasswordInput, CopyButton)
- [x] `packages/extension/src/lib/` - Utilities (clipboard auto-clear)

### Pending

#### Completed: Biometric Authentication (WebAuthn PRF)
- [x] Multi-mode unlock types (`password` | `prf`)
- [x] PRF support detection (`detectPrfSupport()` with `getClientCapabilities()`)
- [x] Passkey creation + PRF key derivation (`createPasskey`, `derivePrfKey`)
- [x] PRF-based seed encryption/decryption
- [x] Mode selection UI (first run)
- See: `docs/03-Biometric-Authentication.md`

#### Later
- [x] Options page (settings UI)
- [x] Auto-lock timer implementation (Chrome alarms API)
- [ ] E2E tests for extension

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
# Run all core tests (82 tests)
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
- Commit message format: `type(scope): description`
- **ALWAYS run lint and format before committing**:
  ```bash
  nix develop --command pnpm lint
  nix develop --command pnpm format
  ```

### Documentation Sync (CRITICAL)

**Every code change MUST update corresponding documentation:**

| Change Type | Update Required |
|-------------|-----------------|
| New feature/function | CLAUDE.md (Implementation Status) + relevant docs/ |
| API change | CLAUDE.md (Message Flow, Storage) + docs/ |
| Bug fix | CLAUDE.md if it affects documented behavior |
| Refactor | CLAUDE.md (Project Structure) if file paths change |

**Files to keep in sync:**
- `CLAUDE.md` - Implementation status, project structure, message flow
- `docs/00-Project-Context.md` - Architecture, phases
- `docs/01-Mode-Workflow.md` - User flows, state machine
- `docs/02-Password-Security.md` - Security scenarios
- `docs/03-Biometric-Authentication.md` - PRF implementation plan

**Rule**: If a PR adds/modifies functionality, the PR MUST include doc updates. No exceptions.

## PR Workflow for External Agents

When assigning tasks to external agents, split features into reviewable PR units:

### PR Size Guidelines

| PR Type | Scope | Example |
|---------|-------|---------|
| **XS** | 1-2 files, < 100 lines | Fix typo, add constant |
| **S** | 3-5 files, < 300 lines | Add utility function, new component |
| **M** | 5-10 files, < 500 lines | New domain feature, refactor module |
| **L** | 10+ files, < 1000 lines | Cross-cutting feature (avoid if possible) |

### Splitting Large Features

Break down by **vertical slice** (end-to-end for one scenario), not horizontal layer:

```
❌ Bad: Split by layer
  PR1: Add all types
  PR2: Add all services
  PR3: Add all UI

✅ Good: Split by feature slice
  PR1: Infrastructure (types, storage schema, detection util)
  PR2: Core flow (service + basic UI)
  PR3: Integration (background handler, App routing)
  PR4: Polish (error handling, edge cases)
```

### PR Template for Agents

When creating a task for an external agent, provide:

```markdown
## Task: [Feature Name]

### Context
- Related docs: `docs/XX-Feature.md`
- Related code: `packages/extension/src/domain/xxx/`

### Scope
- [ ] Specific file/function to create or modify
- [ ] Expected inputs/outputs
- [ ] Test requirements

### Out of Scope
- What NOT to touch in this PR

### Acceptance Criteria
- [ ] Tests pass
- [ ] Types strict (no `any`)
- [ ] Follows existing patterns in codebase
```

### Branch Naming

```
feat/short-description    # New feature
fix/issue-description     # Bug fix
refactor/what-changed     # Code restructure
docs/topic                # Documentation only
```

### Example: Biometric Auth Split

From `docs/03-Biometric-Authentication.md`:

```
PR1: feat/prf-infrastructure
  - Add unlockMethod type to storage/types.ts
  - Add prf config to StorageData interface
  - Add detectPrfSupport() utility

PR2: feat/prf-passkey-creation
  - Add createPasskey() in new domain/prf/service.ts
  - Add derivePrfKey() function
  - Unit tests for PRF key derivation

PR3: feat/prf-unlock-flow
  - Add unlockWithPrf() service function
  - Add PRF-based seed encryption/decryption
  - Integration with session store

PR4: feat/prf-setup-ui
  - Add PrfSetupPage component
  - Add mode selection to SetupPage
  - Update App.tsx routing

PR5: feat/prf-unlock-ui
  - Update UnlockPage for PRF mode
  - Add biometric button component
  - Error handling UI
```

Each PR should:
1. Be independently reviewable
2. Not break existing functionality
3. Include relevant tests
4. Update docs if API changes
