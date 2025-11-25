# Setup & Seed Workflow

## Overview

TSKey uses **seed-based** password generation for maximum security:

```
Password = CharsetMap(AES-CTR(HKDF(seed, realm)))
```

| Component | Description |
|-----------|-------------|
| **Seed** | 256-bit random bytes (generated once at setup) |
| **Unlock Key** | Master password or PRF-derived key |
| **Realm** | Site identifier (e.g., "github.com") |

## Unlock Methods

TSKey supports three unlock methods:

| Mode | Description | CLI Compatible |
|------|-------------|----------------|
| `password` | Master password input | ✅ |
| `prf` | Biometric (TouchID/Windows Hello) | ❌ |
| `hybrid` | Biometric + stored password | ✅ |

> Details: [03-Biometric-Authentication.md](./03-Biometric-Authentication.md)

---

## Initial Setup Workflow

```
┌──────────────────────────────────────────────────────────────┐
│                       INITIAL SETUP                           │
└──────────────────────────────────────────────────────────────┘

[Fresh Install]
    │
    ▼
┌──────────────────┐
│ Enter master     │
│ password         │
│ (+ confirm)      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Generate seed    │
│ (256 random      │
│  bytes)          │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Encrypt seed     │
│ with master pw   │
│ (AES-GCM)        │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Store encrypted  │
│ seed in storage  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ ⚠️ IMPORTANT:    │
│ Export seed file │
│ for backup!      │
│                  │
│ [Export Now]     │
│ [Remind Later]   │
└────────┬─────────┘
         │
         ▼
    [Unlocked]
```

### Setup UI

```
┌─────────────────────────────────────────────────────────────┐
│                    WELCOME TO TSKEY                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Create your master password to get started.                │
│                                                             │
│  Your master password:                                      │
│  • Encrypts your 256-bit seed                               │
│  • Is NEVER stored anywhere                                 │
│  • Cannot be recovered if forgotten                         │
│                                                             │
│  Master Password: [____________________]                    │
│  Confirm Password: [____________________]                   │
│                                                             │
│  ⚠️ Use a strong password (16+ characters recommended)      │
│                                                             │
│  [Create & Generate Seed]                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Returning User Workflow

```
┌──────────────────────────────────────────────────────────────┐
│                    RETURNING USER                             │
└──────────────────────────────────────────────────────────────┘

[Extension locked]
    │
    ▼
┌──────────────────┐
│ Enter master     │
│ password         │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Decrypt seed     │
│ from storage     │
│ (AES-GCM)        │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
 Success    Fail
    │         │
    ▼         ▼
[Unlocked]  [Show error]
            "Wrong password"
```

### Unlock UI

```
┌─────────────────────────────────────────────────────────────┐
│                       TSKEY                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Enter your master password to unlock.                      │
│                                                             │
│  Master Password: [____________________]                    │
│                                                             │
│  [Unlock]                                                   │
│                                                             │
│  ─────────────────────────────────────                      │
│  Lost access? [Import seed file]                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Seed Export/Import

### Export (Required for Backup)

Seed file is essential for recovery. Without it, passwords cannot be regenerated.

```
┌─────────────────────────────────────────────────────────────┐
│                    SEED EXPORT                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Export your seed file for:                                 │
│  • Backup & recovery                                        │
│  • Using with gokey CLI on other devices                    │
│                                                             │
│  ⚠️ Keep this file secure! Anyone with access can           │
│     generate your passwords (with your master password).    │
│                                                             │
│  [Export Seed File]                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Export format**: Raw 256 bytes (gokey `.key` file format)

The exported seed is the raw decrypted seed, NOT the encrypted version.
User must protect this file themselves (store in encrypted location).

### Import (For Recovery)

```
┌─────────────────────────────────────────────────────────────┐
│                    SEED IMPORT                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Restore from exported seed file:                           │
│                                                             │
│  [Choose File: ____________] [Browse]                       │
│                                                             │
│  New Master Password: [____________________]                │
│  (Can be different from original)                           │
│                                                             │
│  [Import & Setup]                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Note**: When importing, user can set a NEW master password. The seed itself
doesn't change, so all generated passwords remain the same.

---

## Storage Schema

```typescript
interface ExtensionStorage {
  // Encrypted seed (AES-GCM encrypted, base64 encoded)
  encryptedSeed?: string;

  // Reminder flag for seed backup
  seedExported?: boolean;

  // Site-specific configurations
  sites: Record<string, SiteConfig>;

  // User settings
  settings: StorageSettings;
}

interface SiteConfig {
  realm: string;
  version: number;  // For password regeneration
  // spec: PasswordSpec;  // Future: custom spec per site
}

interface StorageSettings {
  autoLockMinutes: number;
  autoFillEnabled: boolean;
}
```

---

## State Machine

```
                    ┌─────────────┐
                    │   FRESH     │
                    │  INSTALL    │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   SETUP     │
                    │   SCREEN    │
                    └──────┬──────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │  GENERATE SEED  │
                  │  & ENCRYPT      │
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │  SEED EXPORT    │
                  │   REMINDER      │
                  └────────┬────────┘
                           │
                           ▼
    ┌─────────────────────────────────────────┐
    │                UNLOCKED                  │
    │                                          │
    │  In memory: masterPassword + seed        │
    └────────────────────┬────────────────────┘
                         │
                         │ lock() / timeout
                         ▼
    ┌─────────────────────────────────────────┐
    │                 LOCKED                   │
    │                                          │
    │  In storage: encryptedSeed only          │
    └────────────────────┬────────────────────┘
                         │
                         │ unlock(password)
                         ▼
    ┌─────────────────────────────────────────┐
    │                UNLOCKED                  │
    └─────────────────────────────────────────┘
```

---

## Message Types

```typescript
// Setup (first time)
type SetupSeedMessage = {
  type: 'SETUP_SEED';
  payload: { password: string };
};

// Unlock (returning user)
type UnlockMessage = {
  type: 'UNLOCK';
  payload: { password: string };
};

// Lock
type LockMessage = {
  type: 'LOCK';
};

// Export/Import
type ExportSeedMessage = {
  type: 'EXPORT_SEED';
};

type ImportSeedMessage = {
  type: 'IMPORT_SEED';
  payload: { seed: Uint8Array; password: string };
};

// Status
type GetStatusMessage = {
  type: 'GET_STATUS';
};

type SessionStatus = {
  isUnlocked: boolean;
  hasSeed: boolean;        // true if encrypted seed exists in storage
  seedExported?: boolean;  // reminder flag
};
```

---

## UI Components

### SetupPage

First-time setup for new users.

```typescript
type SetupPageProps = {
  onSetup: (password: string) => void;
  onImport: (seed: Uint8Array, password: string) => void;
  isLoading: boolean;
  error: string | null;
};
```

### UnlockPage

For returning users with existing seed.

```typescript
type UnlockPageProps = {
  onUnlock: (password: string) => void;
  onImport: (seed: Uint8Array, password: string) => void;
  isLoading: boolean;
  error: string | null;
};
```

### SeedExportReminder

Shown after setup and periodically until exported.

```typescript
type SeedExportReminderProps = {
  onExport: () => void;
  onDismiss: () => void;
};
```

---

## Implementation Checklist

### Phase 1: Core ✅
- [x] Implement `SETUP_SEED` - generate seed, encrypt, store
- [x] Implement `UNLOCK` - decrypt seed from storage
- [x] Implement `GET_STATUS` - return hasSeed, isUnlocked, seedExported
- [x] Add `seedExported` flag to storage

### Phase 2: Export/Import ✅
- [x] Implement `EXPORT_SEED` message & handler
- [x] Implement `IMPORT_SEED` message & handler
- [x] Add export/import session service functions
- [x] Create `SeedExportReminder` component
- [x] File download UI (export)
- [x] File upload UI (import from UnlockPage & SetupPage)

### Phase 3: UI Separation ✅
- [x] Create `SetupPage` component (separate from UnlockPage)
- [x] Simplify `UnlockPage` (unlock only, add import option)
- [x] Update `App.tsx` routing logic

### Phase 4: Storage & Versioning ✅
- [x] Remove `useSeedMode` from storage (now seed-only)
- [x] Add `sites` config with version field
- [x] Implement `getEffectiveRealm()` for versioned realms

### Phase 5: Testing
- [ ] Test setup workflow end-to-end
- [ ] Test unlock/lock cycle
- [ ] Test seed export → gokey CLI compatibility
- [ ] Test seed import from gokey-generated file

---

## Biometric Authentication Phases

> Details: [03-Biometric-Authentication.md](./03-Biometric-Authentication.md)

### Phase 6: Infrastructure
- [ ] Define `unlockMethod` type (`password` | `prf` | `hybrid`)
- [ ] Extend storage schema (prf config)
- [ ] PRF support detection function (`detectPrfSupport`)
- [ ] PRF key derivation utility (`derivePrfKey`)

### Phase 7: PRF-only Mode
- [ ] Passkey creation flow (`createPasskey`)
- [ ] PRF-based seed encryption/decryption
- [ ] PRF unlock service (`unlockWithPrf`)
- [ ] PRF setup UI component

### Phase 8: Mode Selection UI
- [ ] First-run mode selection screen
- [ ] PRF unsupported fallback UI
- [ ] Mode-specific unlock screen branching
- [ ] Mode change UI in settings

### Phase 9: Cross-browser Support
- [ ] Firefox PRF user handling
- [ ] Seed import mode switch flow
- [ ] Error messages and guidance UI

### Phase 10: Hybrid Mode (Optional)
- [ ] Password input + PRF encryption
- [ ] CLI compatible mode support

---

_Last Updated: 2025-11_
