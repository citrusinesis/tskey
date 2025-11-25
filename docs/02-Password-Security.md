# Password Security & Regeneration

## Overview

This document covers password generation formula, security scenarios, and mitigation strategies for TSKey.

---

## Password Generation Formula

```
Password = CharsetMap(AES-CTR(HKDF(seed, realm)))
```

```
┌─────────────────────────────────────────────────────────────────┐
│                      PASSWORD DERIVATION                         │
└─────────────────────────────────────────────────────────────────┘

          seed (256 bits)          realm (e.g., "github.com")
                │                          │
                └────────────┬─────────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │        HKDF         │
                  │   hash: SHA-256     │
                  │   info: realm       │
                  │   keyLen: 32 bytes  │
                  └──────────┬──────────┘
                             │
                             ▼
                     256-bit AES key
                             │
                             ▼
                  ┌─────────────────────┐
                  │     AES-256-CTR     │
                  │   IV: 16 zero bytes │
                  │   encrypt(zeros)    │
                  └──────────┬──────────┘
                             │
                             ▼
                   Deterministic bytes
                             │
                             ▼
                  ┌─────────────────────┐
                  │  Rejection Sampling │
                  │  → Charset mapping  │
                  └──────────┬──────────┘
                             │
                             ▼
                     Final Password
```

**Key properties**:
- **Deterministic**: Same seed + realm always produces same password
- **Irreversible**: Cannot derive seed from password
- **Independent**: Different realms produce unrelated passwords
- **gokey compatible**: `gokey -p "master" -s seed.key -r realm`

---

## Password Regeneration (Realm Versioning)

When a site password is compromised, generate a NEW password without changing the seed.

### Solution: Version Suffix

Append version to realm before derivation:

```
Original:    realm = "github.com"     → password_v1
Regenerated: realm = "github.com:2"   → password_v2 (completely different)
```

### Storage Schema

```typescript
interface SiteConfig {
  realm: string;           // Base realm (e.g., "github.com")
  version: number;         // Default: 1, increment on regeneration
  lastUpdated: number;
}

function getEffectiveRealm(config: SiteConfig): string {
  return config.version > 1
    ? `${config.realm}:${config.version}`
    : config.realm;
}
```

### Regeneration Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                  PASSWORD REGENERATION                           │
└─────────────────────────────────────────────────────────────────┘

[User reports password compromised]
         │
         ▼
┌──────────────────────────────────┐
│  Select site to regenerate       │
│  "github.com" (version 1)        │
└────────────────┬─────────────────┘
                 │
                 ▼
┌──────────────────────────────────┐
│  ⚠️ WARNING                      │
│  This will generate a NEW        │
│  password. You must update the   │
│  password on the actual site.    │
│                                  │
│  [Cancel] [Regenerate]           │
└────────────────┬─────────────────┘
                 │
                 ▼
┌──────────────────────────────────┐
│  Increment version: 1 → 2        │
│  New realm: "github.com:2"       │
│  Generate new password           │
└────────────────┬─────────────────┘
                 │
                 ▼
┌──────────────────────────────────┐
│  New password generated!         │
│  [Copy] [Fill on site]           │
│                                  │
│  Remember to change password     │
│  on github.com                   │
└──────────────────────────────────┘
```

### gokey CLI Compatibility

```bash
# Original password (version 1)
gokey -p "master" -s seed.key -r "github.com"

# Regenerated password (version 2)
gokey -p "master" -s seed.key -r "github.com:2"
```

---

## Security Scenarios & Mitigations

### Scenario 1: Single Site Password Compromised

**Threat**: Attacker obtains one generated password (phishing, breach, keylogger).

**Impact**: LOW - Only that site affected.

**Why low impact**:
- Cannot derive seed from password (HKDF is one-way)
- Cannot derive other passwords (each realm is independent)
- Cannot derive master password

**Mitigation**:
1. Regenerate password using realm versioning (github.com → github.com:2)
2. Change password on the compromised site
3. No need to change master password or seed

```
┌─────────────────────────────────────────────────────────────────┐
│  SINGLE SITE COMPROMISE                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [github.com password leaked]                                    │
│           │                                                      │
│           ▼                                                      │
│  Can attacker derive seed?            → NO (one-way function)   │
│           │                                                      │
│           ▼                                                      │
│  Can attacker derive other passwords? → NO (unique per realm)   │
│           │                                                      │
│           ▼                                                      │
│  Action: Regenerate github.com only (version 1 → 2)             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### Scenario 2: Master Password Compromised

**Threat**: Attacker learns the master password.

**Impact**: HIGH - But requires BOTH master password AND encrypted seed.

**Key insight**: Master password alone is useless. Attacker needs access to:
- Your device (to get encrypted seed from storage), OR
- Your exported seed file

**Mitigation**:

```
┌─────────────────────────────────────────────────────────────────┐
│  MASTER PASSWORD COMPROMISE                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Attacker has: Master password                                   │
│  Attacker needs: Encrypted seed (device or exported file)        │
│                                                                  │
│  If seed NOT compromised:                                        │
│  → Change master password in TSKey settings                      │
│  → Re-encrypt seed with new password                             │
│  → All passwords remain valid (HKDF uses seed, not master pw)    │
│                                                                  │
│  If seed ALSO compromised:                                       │
│  → Generate new seed (full reset)                                │
│  → Change ALL site passwords                                     │
│  → This is worst-case scenario                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Important**: If only master password is compromised, you can change it and keep all your passwords! The seed stays the same.

---

### Scenario 3: Seed File Compromised

**Threat**: Attacker obtains exported seed file.

**Impact**: MEDIUM - Seed alone requires master password to generate passwords.

**Analysis**:
- Exported seed is raw 256 bytes (NOT encrypted)
- But passwords require HKDF(seed, realm) + charset mapping
- Attacker must know your realms to generate passwords
- Common realms (google.com, github.com) are guessable

**Mitigation**:

```
┌─────────────────────────────────────────────────────────────────┐
│  SEED FILE COMPROMISE                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Attacker has: Raw seed file                                     │
│  Attacker can: Generate passwords for any realm                  │
│                                                                  │
│  ⚠️ This is a serious compromise!                                │
│                                                                  │
│  Immediate actions:                                              │
│  1. Generate new seed (full reset)                               │
│  2. Change passwords on ALL high-value sites                     │
│  3. Store new seed file more securely                            │
│                                                                  │
│  Prevention:                                                     │
│  • Never store seed file unencrypted                             │
│  • Use encrypted storage (password manager, encrypted USB)       │
│  • Don't email seed file to yourself                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### Scenario 4: Device Compromised

**Threat**: Attacker gains access to device.

**Impact**: Depends on session state.

**Mitigation**:

```
┌─────────────────────────────────────────────────────────────────┐
│  DEVICE COMPROMISE                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Prevention (built-in):                                          │
│  • Auto-lock after inactivity (default: 15 min)                  │
│  • Lock on system sleep/screen lock                              │
│  • Master password + seed only in memory (cleared on lock)       │
│  • Encrypted seed in storage (AES-GCM)                           │
│                                                                  │
│  If compromised while UNLOCKED:                                  │
│  → Attacker has full access to passwords                         │
│  → Treat as full compromise (seed + master pw)                   │
│  → Generate new seed, change all passwords                       │
│                                                                  │
│  If compromised while LOCKED:                                    │
│  → Attacker has only encrypted seed                              │
│  → Must brute-force master password                              │
│  → Strong master password (16+ chars) = computationally safe     │
│  → Weak password = change master password ASAP                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### Scenario 5: Forgot Master Password

**Threat**: User cannot access their passwords.

**Impact**: CRITICAL - No recovery without seed file.

```
┌─────────────────────────────────────────────────────────────────┐
│  FORGOT MASTER PASSWORD                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  With exported seed file:                                        │
│  ✅ Import seed file                                             │
│  ✅ Set NEW master password                                      │
│  ✅ All passwords recovered (seed unchanged)                     │
│                                                                  │
│  Without seed file:                                              │
│  ❌ No recovery possible                                         │
│  ❌ Must reset all site passwords manually                       │
│  ❌ This is by design (no backdoor)                              │
│                                                                  │
│  Prevention:                                                     │
│  • Use memorable passphrase (not random string)                  │
│  • Write password hint in secure location                        │
│  • ALWAYS export and backup seed file                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### Scenario 6: Data Loss (Extension Uninstalled)

**Threat**: Local storage wiped.

**Recovery**:

```
┌─────────────────────────────────────────────────────────────────┐
│  DATA LOSS RECOVERY                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  With exported seed file:                                        │
│  ✅ Reinstall extension                                          │
│  ✅ Import seed file                                             │
│  ✅ Enter master password (can be new one)                       │
│  ✅ All passwords work                                           │
│  ⚠️ Site configs lost (versions, custom settings)                │
│                                                                  │
│  Without seed file:                                              │
│  ❌ No recovery possible                                         │
│  ❌ Must generate new seed                                       │
│  ❌ All passwords will be different                              │
│                                                                  │
│  This is why seed backup is REQUIRED!                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Best Practices

### Master Password

```
┌─────────────────────────────────────────────────────────────────┐
│  MASTER PASSWORD RECOMMENDATIONS                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Minimum: 16 characters                                          │
│  Recommended: 20+ characters (passphrase)                        │
│                                                                  │
│  Good examples:                                                  │
│  • "correct-horse-battery-staple-42"                             │
│  • "MyDog$Name!Is.Fluffy.Born.2019"                              │
│  • "three random words with numbers 789"                         │
│                                                                  │
│  Bad examples:                                                   │
│  • "password123" (common)                                        │
│  • "P@ssw0rd!" (predictable pattern)                             │
│  • "john1990" (personal info)                                    │
│                                                                  │
│  Remember: Master password protects the encrypted seed.          │
│  Stronger password = harder to brute-force if device stolen.     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Seed File Management

```
┌─────────────────────────────────────────────────────────────────┐
│  SEED FILE BEST PRACTICES                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  DO:                                                             │
│  ✅ Export immediately after setup                               │
│  ✅ Store in encrypted backup (password manager, encrypted USB)  │
│  ✅ Keep multiple copies in different locations                  │
│  ✅ Test recovery periodically                                   │
│                                                                  │
│  DON'T:                                                          │
│  ❌ Store in cloud unencrypted (Google Drive, Dropbox)           │
│  ❌ Email to yourself                                            │
│  ❌ Keep only on same device                                     │
│  ❌ Share with anyone                                            │
│  ❌ Store alongside master password hint                         │
│                                                                  │
│  Recommended storage:                                            │
│  • Encrypted USB drive in safe location                          │
│  • Password manager (1Password, Bitwarden)                       │
│  • Encrypted cloud storage (Cryptomator + cloud)                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Security Model Summary

```
┌─────────────────────────────────────────────────────────────────┐
│  WHAT'S PROTECTED WHERE                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  In Memory (when unlocked):                                      │
│  • Master password                                               │
│  • Decrypted seed                                                │
│  → Cleared on lock/timeout                                       │
│                                                                  │
│  In Storage (chrome.storage.local):                              │
│  • Encrypted seed (AES-GCM)                                      │
│  • Site configs (versions)                                       │
│  → Protected by master password                                  │
│                                                                  │
│  Exported Seed File:                                             │
│  • Raw seed bytes                                                │
│  → User's responsibility to protect                              │
│                                                                  │
│  NEVER Stored:                                                   │
│  • Master password                                               │
│  • Generated passwords                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Checklist

### Phase 1: Realm Versioning
- [ ] Add `version` field to SiteConfig
- [ ] Implement `getEffectiveRealm()` function
- [ ] Update password generation to use effective realm
- [ ] Add "Regenerate" button to site management UI

### Phase 2: Master Password Change
- [ ] Add "Change Master Password" in settings
- [ ] Re-encrypt seed with new password
- [ ] Verify old password before change

### Phase 3: Security Warnings
- [ ] Warn on weak master password (< 12 chars)
- [ ] Warn when regenerating passwords
- [ ] Seed export reminder (if not exported)

---

_Last Updated: 2025-11_
