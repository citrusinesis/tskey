# Biometric Authentication (WebAuthn PRF)

## Overview

Support for biometric authentication via platform authenticators such as TouchID, Windows Hello, and Face ID.
Uses WebAuthn PRF Extension for hardware-bound key derivation.

## Unlock Methods

TSKey supports three unlock methods:

| Mode | Description | Supported Browsers |
|------|-------------|--------------------|
| `password` | Master password input | All browsers |
| `prf` | Biometric only (recommended) | Chrome 116+, Safari 17+, Edge 116+ |
| `hybrid` | Biometric + CLI compatible | Chrome 116+, Safari 17+, Edge 116+ |

## Architecture

### Mode: `prf` (PRF-only, Recommended)

```
┌─────────────────────────────────────────────────────────────────┐
│                         SETUP                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Create Passkey (platform authenticator)                     │
│     └─→ Store credentialId                                      │
│                                                                  │
│  2. PRF(salt) → prf_key (32 bytes)                              │
│     └─→ Store salt                                              │
│                                                                  │
│  3. Generate seed (256 bytes)                                    │
│                                                                  │
│  4. AES-GCM encrypt(seed, prf_key) → encrypted_seed             │
│     └─→ Store encrypted_seed                                    │
│                                                                  │
│  5. Convert prf_key to hex string → prf_password                │
│     (used for password generation)                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         UNLOCK                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. WebAuthn authenticate (biometric)                            │
│     └─→ PRF(salt) → prf_key                                     │
│                                                                  │
│  2. AES-GCM decrypt(encrypted_seed, prf_key) → seed             │
│                                                                  │
│  3. prf_key → prf_password (hex string)                         │
│                                                                  │
│  4. generate(prf_password, realm, seed) → site_password         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- No password input/memorization required
- No password storage (prf_key derived from hardware each time)
- CLI incompatible (user doesn't know prf_password value)

### Mode: `password` (Fallback)

```
┌─────────────────────────────────────────────────────────────────┐
│                         SETUP                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User inputs master_password                                  │
│                                                                  │
│  2. Generate seed (256 bytes)                                    │
│                                                                  │
│  3. AES-GCM encrypt(seed, master_password) → encrypted_seed     │
│     └─→ Store encrypted_seed                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         UNLOCK                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User inputs master_password                                  │
│                                                                  │
│  2. AES-GCM decrypt(encrypted_seed, master_password) → seed     │
│                                                                  │
│  3. generate(master_password, realm, seed) → site_password      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- All browser support
- CLI compatible (`gokey -p "master_password" -s seed.key -r realm`)

### Mode: `hybrid` (PRF + Password CLI Compatible)

```
┌─────────────────────────────────────────────────────────────────┐
│                         SETUP                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User inputs master_password                                  │
│                                                                  │
│  2. Create Passkey + PRF(salt) → prf_key                        │
│                                                                  │
│  3. AES-GCM encrypt(master_password, prf_key)                   │
│     └─→ Store encrypted_password                                │
│                                                                  │
│  4. Generate seed + encrypt(seed, master_password)              │
│     └─→ Store encrypted_seed                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         UNLOCK                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. WebAuthn authenticate → PRF(salt) → prf_key                 │
│                                                                  │
│  2. decrypt(encrypted_password, prf_key) → master_password      │
│                                                                  │
│  3. decrypt(encrypted_seed, master_password) → seed             │
│                                                                  │
│  4. generate(master_password, realm, seed) → site_password      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- Convenient biometric unlock
- CLI compatibility maintained (user knows master_password)
- master_password stored encrypted (cannot decrypt without PRF key)

---

## Storage Schema

```typescript
interface StorageData {
  // Seed (common to all modes)
  encryptedSeed: string;  // base64
  seedExported: boolean;

  // Unlock method
  unlockMethod: 'password' | 'prf' | 'hybrid';

  // PRF mode config (prf, hybrid)
  prf?: {
    credentialId: string;  // base64
    salt: string;          // base64
    // hybrid mode only
    encryptedPassword?: string;  // base64, master_password encrypted with PRF key
  };

  // Other
  sites: Record<string, SiteConfig>;
  settings: StorageSettings;
}
```

---

## Browser Support Detection

```typescript
async function detectPrfSupport(): Promise<boolean> {
  // 1. Check WebAuthn support
  if (!window.PublicKeyCredential) {
    return false;
  }

  // 2. Check platform authenticator
  const available = await PublicKeyCredential
    .isUserVerifyingPlatformAuthenticatorAvailable();
  if (!available) {
    return false;
  }

  // 3. Check PRF extension support (feature detection)
  // Chrome 116+, Safari 17+, Edge 116+
  try {
    // PRF can only be verified at credential creation time
    // Here we estimate based on browser version
    const ua = navigator.userAgent;
    // ... browser-specific version check
    return true;
  } catch {
    return false;
  }
}
```

---

## User Flows

### New User (PRF-supported Browser)

```
┌─────────────────────────────────────────────────────────────┐
│                    GET STARTED WITH TSKEY                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🔐 Start with Biometrics (Recommended)                     │
│     TouchID / Windows Hello / Face ID                       │
│     No password memorization needed                         │
│     [Get Started]                                           │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  🔑 Start with Password                                     │
│     Traditional method, CLI compatible                      │
│     [Set Password]                                          │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📁 Import Existing Seed File                               │
│     seed.key file exported from another device              │
│     [Select File]                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### New User (Firefox or PRF Unsupported)

```
┌─────────────────────────────────────────────────────────────┐
│                    GET STARTED WITH TSKEY                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ⚠️ This browser does not support biometric authentication. │
│     Use Chrome, Safari, or Edge for biometrics.             │
│                                                             │
│  🔑 Start with Password                                     │
│     [Set Password]                                          │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📁 Import Existing Seed File                               │
│     [Select File]                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### PRF User → Firefox Switch

```
┌─────────────────────────────────────────────────────────────┐
│                    UNLOCK TSKEY                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ⚠️ Biometric authentication is not available on this       │
│     device.                                                 │
│                                                             │
│  Import a seed file to use on this device.                  │
│                                                             │
│  📁 Import Seed File                                        │
│     [Select File]                                           │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💡 Don't have a seed file?                                 │
│     On your biometric-enabled device, go to                 │
│     Settings > Export Seed to download seed.key file.       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Unlock Screen (PRF Mode)

```
┌─────────────────────────────────────────────────────────────┐
│                       TSKEY                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                      🔐                                     │
│                                                             │
│              Unlock with TouchID                            │
│                                                             │
│              [Authenticate]                                 │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Unlock with another method                                 │
│  • Import seed file                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Recovery Scenarios

| Scenario | Solution |
|----------|----------|
| PRF device lost | Import seed file → re-setup on new device |
| Password forgotten | Import seed file → set new password/biometric |
| Biometric failure (temporary) | Retry or recover with seed file |
| No seed file + accessible device | Export seed from that device |
| No seed file + no device access | ❌ Unrecoverable |

**Core principle**: Seed file is the ultimate backup (regardless of unlock method)

---

## Implementation Plan

### Phase 1: Infrastructure ✅
- [x] Define `unlockMethod` type and extend storage schema
- [x] PRF support detection function (`detectPrfSupport`)
- [x] PRF key derivation utility (`derivePrfKey`)

### Phase 2: PRF-only Mode
- [x] Passkey creation flow (`createPasskey`)
- [x] PRF-based seed encryption/decryption
- [x] PRF unlock service (`unlockSessionWithPrf`, `setupSessionWithPrf`)
- [ ] PRF setup UI

### Phase 3: Mode Selection UI
- [ ] First-run mode selection screen
- [ ] PRF unsupported fallback UI
- [ ] Mode-specific unlock screen branching

### Phase 4: Cross-browser Support
- [ ] Firefox PRF user handling
- [ ] Seed import mode switch
- [ ] Error messages and guidance

### Phase 5: Hybrid Mode (Optional)
- [ ] Password input + PRF encryption
- [ ] CLI compatible mode

---

## Security Considerations

1. **PRF is hardware-bound**: Derived from TPM/Secure Enclave, extremely difficult to extract
2. **Salt is credential-specific**: PRF output cannot be shared across sites/apps
3. **Biometric bypass risk**: Sleeping user attacks, etc. - common limitation of all biometrics
4. **Cross-device impossible**: Each device requires separate setup (intentional design)
5. **Seed file security**: User responsibility, recommend storing in encrypted location

---

_Last Updated: 2025-11_
