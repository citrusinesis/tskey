# Password Generation Mode Workflow

## Overview

TSKey supports two password generation modes, compatible with gokey CLI:

| Mode | Algorithm | gokey CLI equivalent |
|------|-----------|---------------------|
| **Password-only** | PBKDF2(masterPassword, realm) | `gokey -p "master" -r realm` |
| **Seed** | HKDF(seed, realm) | `gokey -p "master" -s keyfile -r realm` |

**Important**: The two modes generate **different passwords** for the same realm.

---

## Mode Selection (Initial Setup Only)

Mode is chosen **once** during initial setup and **cannot be changed** afterwards.

```
┌─────────────────────────────────────────────────────────────┐
│                    INITIAL SETUP                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Welcome to TSKey!                                          │
│  Choose how to generate your passwords:                     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ◉ Seed Mode (Recommended)                           │   │
│  │                                                      │   │
│  │   • 256-bit random seed for higher entropy           │   │
│  │   • Seed encrypted with your master password         │   │
│  │   • Export seed file for backup & gokey CLI          │   │
│  │   • Requires seed backup for recovery                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ○ Password-only Mode                                 │   │
│  │                                                      │   │
│  │   • Master password directly derives keys            │   │
│  │   • No backup file needed                            │   │
│  │   • Simpler, but password strength matters more      │   │
│  │   • Compatible with basic gokey CLI usage            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Master Password: [____________________]                    │
│  Confirm Password: [____________________]                   │
│                                                             │
│  [Continue]                                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Workflow by Mode

### Password-only Mode

```
┌──────────────────────────────────────────────────────────────┐
│                    PASSWORD-ONLY WORKFLOW                     │
└──────────────────────────────────────────────────────────────┘

[Initial Setup]
    │
    ▼
┌──────────────────┐
│ Enter master     │
│ password         │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Store mode:      │
│ "password-only"  │──────────────────────────────────┐
│ in storage       │                                  │
└────────┬─────────┘                                  │
         │                                            │
         ▼                                            │
    [Unlocked]                                        │
         │                                            │
         ▼                                            │
┌──────────────────┐                                  │
│ Generate password│                                  │
│                  │                                  │
│ PBKDF2(master,   │                                  │
│        realm)    │                                  │
│ → AES-CTR        │                                  │
└──────────────────┘                                  │
                                                      │
[Returning User] ─────────────────────────────────────┘
    │
    ▼
┌──────────────────┐
│ Enter master     │
│ password         │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Mode check:      │
│ "password-only"  │
│ No seed decrypt  │
└────────┬─────────┘
         │
         ▼
    [Unlocked]

gokey CLI compatible:
$ gokey -p "masterPassword" -r github.com
```

### Seed Mode

```
┌──────────────────────────────────────────────────────────────┐
│                       SEED WORKFLOW                           │
└──────────────────────────────────────────────────────────────┘

[Initial Setup]
    │
    ▼
┌──────────────────┐
│ Enter master     │
│ password         │
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
│ Store:           │
│ - mode: "seed"   │
│ - encryptedSeed  │──────────────────────────────────┐
└────────┬─────────┘                                  │
         │                                            │
         ▼                                            │
┌──────────────────┐                                  │
│ ⚠️ IMPORTANT:    │                                  │
│ Export seed file │                                  │
│ for backup!      │                                  │
│                  │                                  │
│ [Export Now]     │                                  │
│ [Remind Later]   │                                  │
└────────┬─────────┘                                  │
         │                                            │
         ▼                                            │
    [Unlocked]                                        │
         │                                            │
         ▼                                            │
┌──────────────────┐                                  │
│ Generate password│                                  │
│                  │                                  │
│ HKDF(seed, realm)│                                  │
│ → AES-CTR        │                                  │
└──────────────────┘                                  │
                                                      │
[Returning User] ─────────────────────────────────────┘
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
         ▼
    [Unlocked]

gokey CLI compatible:
$ gokey -p "masterPassword" -s exported.key -r github.com
```

---

## Seed Export/Import

### Export (Required for Seed Mode)

Seed file format must be compatible with gokey CLI.

```
┌─────────────────────────────────────────────────────────────┐
│                    SEED EXPORT                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Export your seed file for:                                 │
│  • Backup & recovery                                        │
│  • Using with gokey CLI on other devices                    │
│                                                             │
│  ⚠️ Keep this file secure! Anyone with access can           │
│     generate your passwords (with your master password).    │
│                                                             │
│  File format: [gokey-compatible ▼]                          │
│                                                             │
│  [Export Seed File]                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Export format**: Raw encrypted seed bytes (gokey `.key` file format)

```typescript
// Encrypted seed structure (272 bytes total)
// - Nonce: 12 bytes (from seed[0:12])
// - Ciphertext: 244 bytes (seed[12:256] encrypted)
// - Auth tag: 16 bytes (AES-GCM tag)
```

### Import (For Recovery)

```
┌─────────────────────────────────────────────────────────────┐
│                    SEED IMPORT                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Restore from exported seed file:                           │
│                                                             │
│  [Choose File: ____________] [Browse]                       │
│                                                             │
│  Master Password: [____________________]                    │
│  (Same password used when seed was created)                 │
│                                                             │
│  [Import & Unlock]                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Storage Schema

```typescript
interface ExtensionStorage {
  // Mode selection (set once, never changes)
  mode: 'seed' | 'password-only';

  // Only present in seed mode
  encryptedSeed?: string;  // base64 encoded

  // Reminder for seed backup
  seedExported?: boolean;

  // Other settings...
  settings: StorageSettings;
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
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
    ┌─────────────────┐      ┌─────────────────┐
    │  PASSWORD-ONLY  │      │   SEED MODE     │
    │     SETUP       │      │     SETUP       │
    └────────┬────────┘      └────────┬────────┘
             │                        │
             │                        ▼
             │               ┌─────────────────┐
             │               │  SEED EXPORT    │
             │               │   REMINDER      │
             │               └────────┬────────┘
             │                        │
             ▼                        ▼
    ┌─────────────────────────────────────────┐
    │                 LOCKED                   │
    └────────────────────┬────────────────────┘
                         │
                         │ unlock(password)
                         ▼
    ┌─────────────────────────────────────────┐
    │                UNLOCKED                  │
    │                                          │
    │  Password-only: masterPassword in memory │
    │  Seed mode: masterPassword + seed        │
    └────────────────────┬────────────────────┘
                         │
                         │ lock() / timeout
                         ▼
    ┌─────────────────────────────────────────┐
    │                 LOCKED                   │
    └─────────────────────────────────────────┘
```

---

## Message Types (Updated)

```typescript
// Setup messages
type SetupPasswordOnlyMessage = {
  type: 'SETUP_PASSWORD_ONLY';
  payload: { password: string };
};

type SetupSeedMessage = {
  type: 'SETUP_SEED';
  payload: { password: string };
};

// Export/Import
type ExportSeedMessage = {
  type: 'EXPORT_SEED';
};

type ImportSeedMessage = {
  type: 'IMPORT_SEED';
  payload: { encryptedSeed: Uint8Array; password: string };
};

// Status includes mode
type SessionStatus = {
  isUnlocked: boolean;
  mode: 'seed' | 'password-only' | null;  // null = not setup
  seedExported?: boolean;  // reminder flag
};
```

---

## UI Components

### SetupPage (New)

First-time setup with mode selection.

```typescript
type SetupPageProps = {
  onSetupSeed: (password: string) => void;
  onSetupPasswordOnly: (password: string) => void;
  isLoading: boolean;
  error: string | null;
};
```

### SeedExportReminder (New)

Shown after seed setup and periodically until exported.

```typescript
type SeedExportReminderProps = {
  onExport: () => void;
  onDismiss: () => void;
};
```

### UnlockPage (Updated)

Now only handles unlock, not setup.

```typescript
type UnlockPageProps = {
  mode: 'seed' | 'password-only';
  onUnlock: (password: string) => void;
  onImportSeed: () => void;  // Recovery option
  isLoading: boolean;
  error: string | null;
};
```

---

## Implementation Checklist

### Phase 1: Core Changes
- [ ] Add `mode` to storage schema
- [ ] Update `GET_STATUS` to return mode
- [ ] Add `SETUP_PASSWORD_ONLY` message handler
- [ ] Rename `SETUP_SEED` to be explicit about seed creation

### Phase 2: Seed Export/Import
- [ ] Implement `EXPORT_SEED` - returns encrypted seed bytes
- [ ] Implement `IMPORT_SEED` - decrypt and store seed
- [ ] Add `seedExported` flag to storage

### Phase 3: UI Updates
- [ ] Create `SetupPage` with mode selection
- [ ] Create `SeedExportReminder` component
- [ ] Update `UnlockPage` (remove setup logic)
- [ ] Update `App.tsx` routing logic

### Phase 4: Testing
- [ ] Test password-only workflow end-to-end
- [ ] Test seed workflow end-to-end
- [ ] Test seed export → gokey CLI compatibility
- [ ] Test seed import from gokey-generated file

---

_Last Updated: 2025-11_
