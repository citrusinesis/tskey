# Gokey Browser Extension - Project Context

## Overview

Cloudflare의 [gokey](https://github.com/cloudflare/gokey) 알고리즘을 기반으로 한 **Vaultless 패스워드 매니저** 브라우저 익스텐션을 개발한다.

### Core Concept

- **Vaultless**: 패스워드를 저장하지 않음
- **Deterministic**: `PBKDF2 + AES-CTR(masterPassword, realm)` → 항상 동일한 패스워드 생성
- **Zero-sync**: 동기화할 vault가 없으므로 어디서든 동일한 패스워드 재생성 가능
- **gokey Compatible**: gokey CLI와 동일한 출력 보장

### Project Goals

1. 브라우저 익스텐션으로 gokey 기능 제공
2. 자동 폼 감지 및 패스워드 자동입력
3. 추후 네이티브 앱, 기기간 동기화 확장 고려

---

## Tech Stack

| Category        | Choice               | Reason                      |
| --------------- | -------------------- | --------------------------- |
| Language        | **TypeScript**       | 타입 안정성, 생태계         |
| Extension       | **Manifest V3**      | Chrome 최신 표준, 보안 강화 |
| Build           | **WXT**              | 빠른 HMR, MV3/Firefox 지원  |
| UI              | **React + Tailwind** | 빠른 개발, 작은 번들        |
| Crypto          | **Web Crypto API**   | 네이티브 PBKDF2, AES        |
| Package Manager | **pnpm**             | 모노레포 지원, 빠름         |
| Monorepo        | **pnpm workspace**   | 심플, 충분한 기능           |
| Dev Environment | **Nix flake**        | 재현 가능한 개발 환경       |

---

## Architecture

### Monorepo Structure

```
gokey-ts/
├── packages/
│   ├── core/                     # 암호화 핵심 로직 (순수 TS, 플랫폼 무관)
│   │   ├── src/
│   │   │   ├── csprng.ts         # PBKDF2 + AES-CTR DRBG (gokey 호환)
│   │   │   ├── password.ts       # 패스워드 생성 로직
│   │   │   ├── charset.ts        # 문자셋 정의 및 매핑
│   │   │   ├── realm.ts          # URL → realm 추출 (tldts)
│   │   │   ├── types.ts          # 공통 타입 정의
│   │   │   └── index.ts          # public exports
│   │   ├── test/
│   │   │   ├── csprng.test.ts    # DRBG 테스트
│   │   │   ├── charset.test.ts   # 문자셋 테스트
│   │   │   ├── password.test.ts  # 패스워드 생성 테스트
│   │   │   └── realm.test.ts     # realm 추출 테스트
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── extension/                # 브라우저 익스텐션 (WXT)
│       ├── src/
│       │   ├── entrypoints/
│       │   │   ├── background.ts     # Service Worker
│       │   │   ├── popup/            # 팝업 UI (React)
│       │   │   │   ├── index.html
│       │   │   │   ├── main.tsx
│       │   │   │   ├── App.tsx
│       │   │   │   └── style.css
│       │   │   ├── content.ts        # Content Script
│       │   │   └── options/          # 설정 페이지
│       │   │       ├── index.html
│       │   │       ├── main.tsx
│       │   │       └── App.tsx
│       │   ├── components/           # 공유 React 컴포넌트
│       │   ├── hooks/                # React hooks
│       │   ├── lib/                  # 유틸리티
│       │   │   ├── session.ts        # 세션 관리
│       │   │   └── storage.ts        # chrome.storage 래퍼
│       │   └── assets/               # 아이콘 등
│       ├── public/
│       │   └── icon/
│       ├── wxt.config.ts
│       ├── tailwind.config.js
│       ├── package.json
│       └── tsconfig.json
│
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
├── flake.nix
└── README.md
```

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
│   - 로그인 폼 감지 (input[type="password"])                          │
│   - 패스워드 필드에 자동입력                                           │
│   - 마스터 패스워드에 직접 접근 불가 (보안)                             │
└────────────────────────────────────────────────────────────────────┘
```

---

## Core Algorithm Implementation

### gokey Password Generation (PBKDF2 + AES-CTR)

**중요**: gokey는 HKDF가 아닌 PBKDF2 + AES-CTR을 사용한다.

gokey의 패스워드 생성 로직 (https://github.com/cloudflare/gokey/blob/main/csprng.go):

```
1. key = PBKDF2-SHA256(
     password: masterPassword,
     salt: realm,              // password-only 모드
     iterations: 4096,
     keyLength: 32             // 256 bits for AES-256
   )

2. cipher = AES-256-CTR(key, zeroIV)
   // 16바이트 zero IV 사용

3. bytes = cipher.encrypt(zeros)
   // 0으로 채워진 버퍼를 암호화하여 deterministic random bytes 생성

4. password = mapBytesToCharset(bytes, spec)
   // rejection sampling으로 균등 분포 보장
```

### TypeScript Implementation Spec

```typescript
// packages/core/src/types.ts

export interface PasswordSpec {
  length: number; // 패스워드 길이 (default: 16)
  upper: number; // 최소 대문자 수 (default: 1)
  lower: number; // 최소 소문자 수 (default: 1)
  digits: number; // 최소 숫자 수 (default: 1)
  special: number; // 최소 특수문자 수 (default: 1)
  allowedSpecial?: string; // 허용할 특수문자
}

export interface GenerateOptions {
  masterPassword: string;
  realm: string; // 보통 도메인 (e.g., "github.com")
  spec?: Partial<PasswordSpec>;
}
```

```typescript
// packages/core/src/csprng.ts

/**
 * gokey 호환 CSPRNG (Cryptographically Secure Pseudo-Random Number Generator)
 * PBKDF2로 키 유도 후 AES-CTR로 deterministic random bytes 생성
 */
export async function createDRNG(
  password: string,
  realm: string
): Promise<{
  read: (length: number) => Promise<Uint8Array>;
}> {
  const encoder = new TextEncoder();
  const salt = encoder.encode(realm);

  // 1. PBKDF2로 AES 키 유도
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 4096,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );

  // 2. AES-CTR 키 생성
  const aesKey = await crypto.subtle.importKey(
    "raw",
    derivedBits,
    { name: "AES-CTR" },
    false,
    ["encrypt"]
  );

  let counter = 0;

  return {
    async read(length: number): Promise<Uint8Array> {
      // 16바이트 counter (little-endian)
      const counterBytes = new Uint8Array(16);
      const view = new DataView(counterBytes.buffer);
      view.setBigUint64(0, BigInt(counter), true);

      const zeros = new Uint8Array(length);
      const encrypted = await crypto.subtle.encrypt(
        { name: "AES-CTR", counter: counterBytes, length: 64 },
        aesKey,
        zeros
      );

      counter += Math.ceil(length / 16);
      return new Uint8Array(encrypted);
    },
  };
}
```

```typescript
// packages/core/src/charset.ts

// gokey 호환 문자셋 (94자)
export const CHARSET =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789`~!@#$%^&*()-_=+[{]}\\|;:'\",<.>/?";

export const LOWER = "abcdefghijklmnopqrstuvwxyz";
export const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const DIGITS = "0123456789";
export const SPECIAL = "`~!@#$%^&*()-_=+[{]}\\|;:'\",<.>/?";

/**
 * Rejection sampling으로 균등 분포 문자 선택
 */
export function randChar(
  bytes: Uint8Array,
  offset: number,
  charset: string
): { char: string; consumed: number } {
  const max = charset.length;
  const buck = Math.floor(255 / max);
  const rem = 255 % max;

  let i = offset;
  while (i < bytes.length) {
    const b = bytes[i]!;
    i++;
    if (b >= 255 - rem) continue; // reject
    return { char: charset[Math.floor(b / buck)]!, consumed: i - offset };
  }
  throw new Error("Not enough random bytes");
}
```

```typescript
// packages/core/src/password.ts

import { createDRNG } from "./csprng";
import { CHARSET, LOWER, UPPER, DIGITS, SPECIAL, randChar } from "./charset";
import type { PasswordSpec, GenerateOptions } from "./types";

export const DEFAULT_SPEC: PasswordSpec = {
  length: 16,
  upper: 1,
  lower: 1,
  digits: 1,
  special: 1,
};

export async function generatePassword(
  options: GenerateOptions
): Promise<string> {
  const spec = { ...DEFAULT_SPEC, ...options.spec };
  const drng = await createDRNG(options.masterPassword, options.realm);

  // gokey와 동일: compliance 만족할 때까지 재생성
  while (true) {
    const bytes = await drng.read(spec.length * 4); // 여유있게 할당
    let password = "";
    let offset = 0;

    for (let i = 0; i < spec.length; i++) {
      const result = randChar(bytes, offset, CHARSET);
      password += result.char;
      offset += result.consumed;
    }

    if (isCompliant(password, spec)) {
      return password;
    }
  }
}

function isCompliant(password: string, spec: PasswordSpec): boolean {
  let upper = 0,
    lower = 0,
    digits = 0,
    special = 0;
  for (const c of password) {
    if (UPPER.includes(c)) upper++;
    else if (LOWER.includes(c)) lower++;
    else if (DIGITS.includes(c)) digits++;
    else if (SPECIAL.includes(c)) special++;
  }
  return (
    upper >= spec.upper &&
    lower >= spec.lower &&
    digits >= spec.digits &&
    special >= spec.special
  );
}
```

---

## Storage Schema

### chrome.storage.local

```typescript
interface StorageSchema {
  // 사이트별 설정
  sites: {
    [domain: string]: SiteConfig;
  };

  // 전역 설정
  settings: GlobalSettings;
}

interface SiteConfig {
  realm: string; // 커스텀 realm (기본값: 도메인)
  spec: Partial<PasswordSpec>;
  version: number; // 패스워드 변경 시 증가
  notes?: string; // 사용자 메모
  createdAt: number;
  updatedAt: number;
}

interface GlobalSettings {
  defaultSpec: PasswordSpec;
  autoLockMinutes: number; // 자동 잠금 시간 (기본: 15분)
  autoFillEnabled: boolean; // 자동입력 활성화 여부
  showPasswordByDefault: boolean;
  theme: "light" | "dark" | "system";
}
```

### 저장하지 않는 것 (보안)

- Master Password
- Generated Passwords

---

## Security Model

### Threat Model

```
위협 1: 익스텐션 스토리지 탈취
  → 대응: 패스워드 미저장, 설정만 저장

위협 2: Content Script XSS
  → 대응: Content Script는 패스워드 생성 불가, 메시지로만 수신

위협 3: 메모리 덤프
  → 대응: 마스터 패스워드는 Service Worker 메모리에만, 자동 만료

위협 4: Clipboard 스니핑
  → 대응: 자동 클립보드 클리어 (30초), 직접 자동입력 권장
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
// Background → Content Script (자동입력)
chrome.tabs.sendMessage(tabId, {
  type: "FILL_PASSWORD",
  payload: { password: "..." },
});

// Content Script → Background (폼 감지 알림)
chrome.runtime.sendMessage({
  type: "PASSWORD_FIELD_DETECTED",
  payload: { domain: "github.com", formId: "..." },
});
```

---

## Implementation Phases

### Phase 1: MVP

**Goal**: 기본 패스워드 생성 및 복사

- [x] 프로젝트 셋업 (모노레포, Nix flake)
- [x] `@tskey/core` 패키지
  - [x] PBKDF2 + AES-CTR DRBG 구현
  - [x] 패스워드 생성 로직
  - [x] Realm 추출 (tldts)
  - [x] 테스트 (65 tests passing)
- [ ] Extension 기본 구조 (WXT)
  - [ ] Service Worker (세션 관리)
  - [ ] Popup UI (잠금해제 → 패스워드 생성 → 복사)
- [ ] 기본 스토리지 (사이트별 설정)

### Phase 2: Usability

**Goal**: 실사용 가능한 수준

- [ ] Content Script (폼 감지, 자동입력)
- [ ] 사이트별 커스텀 설정 UI
- [ ] 키보드 단축키
- [ ] 아이콘 및 뱃지 (잠금 상태 표시)
- [ ] 다크모드

### Phase 3: Polish

**Goal**: 배포 준비

- [ ] Options 페이지 (전역 설정)
- [ ] 패스워드 버전 관리 (realm#2 등)
- [ ] 설정 내보내기/가져오기 (JSON)
- [ ] Firefox 지원 (WXT 내장)
- [ ] 문서화 및 README

---

## Tests

`packages/core/test/` 디렉토리에 65개의 테스트 케이스:

- **csprng.test.ts** (10 tests): DRBG 결정론성, 고유성, gokey 호환성
- **charset.test.ts** (13 tests): 문자셋 상수, rejection sampling
- **password.test.ts** (15 tests): 패스워드 생성, spec 준수
- **realm.test.ts** (27 tests): URL 파싱, eTLD+1 추출, 커스텀 매핑, 버전

```bash
# 테스트 실행
nix develop --command pnpm --filter @tskey/core test
```

---

## Development Commands

```bash
# Nix 개발 환경 진입
nix develop

# 의존성 설치
nix develop --command pnpm install

# Core 패키지 테스트
nix develop --command pnpm --filter @tskey/core test

# Extension 개발 서버 (Chrome)
nix develop --command pnpm --filter @tskey/extension dev

# Extension 개발 서버 (Firefox)
nix develop --command pnpm --filter @tskey/extension dev:firefox

# Extension 빌드
nix develop --command pnpm --filter @tskey/extension build

# 전체 빌드
nix develop --command pnpm build

# 타입 체크
nix develop --command pnpm typecheck
```

---

## Key Files to Implement First

우선순위 순서:

1. `packages/core/src/csprng.ts` - PBKDF2 + AES-CTR DRBG
2. `packages/core/src/charset.ts` - 문자셋 및 rejection sampling
3. `packages/core/src/password.ts` - 패스워드 생성
4. `packages/core/tests/vectors.test.ts` - 호환성 테스트
5. `packages/extension/src/entrypoints/background.ts` - Service Worker
6. `packages/extension/src/lib/session.ts` - 세션 관리
7. `packages/extension/src/entrypoints/popup/App.tsx` - 팝업 UI

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

- 이 프로젝트는 **보안이 중요**합니다. 암호화 관련 코드는 신중하게 작성하세요.
- gokey 원본과의 **호환성**이 중요합니다. PBKDF2 + AES-CTR 알고리즘을 정확히 구현하세요.
- **Manifest V3** 제약사항을 숙지하세요 (background page → service worker 등).

### Code Style

#### TypeScript
- Strict mode (`strict: true`, `noUncheckedIndexedAccess: true`)
- **`any` 사용 절대 금지** - 모든 코드는 strictly typed
- 타입 좁히기 시 truthy 체크 대신 명시적 `undefined` 체크 사용

#### Functional Programming
- `map`, `filter`, `reduce` 사용 (명령형 루프 대신)
- 순수 함수 선호, 부작용 최소화
- 함수 합성과 파이프라인 활용

#### Comments
- **설명 주석 금지** - 코드가 스스로 설명해야 함
- 설명 주석 대신 명확한 함수/변수명 사용
- 허용되는 주석:
  - Public API용 JSDoc (`/** ... */`)
  - 이슈 참조가 있는 TODO/FIXME
  - 법적/규제 관련 주석
- 주석 포맷 (필요시):
  ```typescript
  /** export용 한 줄 JSDoc */

  /**
   * 복잡한 public API용 여러 줄 JSDoc
   * @param x - 설명
   * @returns 설명
   */

  // TODO(#123): 간단한 설명
  ```

#### Error Handling
- 명시적 throw 또는 Result 패턴
- silent failure 금지

#### Testing
- Vitest 사용

### Git Workflow

- **원자적 커밋**: 커밋당 하나의 논리적 변경
- **코드와 문서 동시 업데이트**: 모든 커밋에 관련 문서 업데이트 포함
- CLAUDE.md와 docs/를 구현과 동기화 유지
- 커밋 메시지 형식: `type(scope): description`

### When Stuck

1. gokey 소스 코드 참조: https://github.com/cloudflare/gokey/blob/main/csprng.go
2. Web Crypto API 문서 확인
3. WXT 문서 확인: https://wxt.dev/

---

_Last Updated: 2024-11_
