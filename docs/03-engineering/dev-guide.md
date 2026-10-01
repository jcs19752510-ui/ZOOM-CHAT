> **이 문서의 용도** — 누가: 개발자(운영자 포함) / 언제: 로컬 실행, 테스트, 의존성 추가, 커밋을 할 때 / 무엇을: 개발 환경, 폴더 구조, 규칙, 의존성 목록과 점검 결과를 결정한다.

# 개발 가이드

| 항목 | 내용 |
|---|---|
| 버전 | 0.1 |
| 작성일 | 2026-10-01 |
| 상태 | 승인 (구현·검증 반영, DEC-004) |
| 주도 | ② 개발자 |

## 변경 이력
| 버전 | 날짜 | 내용 |
|---|---|---|
| 0.1 | 2026-10-01 | 최초 작성 |


## 1. 실행 방법 (재현 가능)
```bash
node -v            # 22 이상
npm ci
cp .env.example .env      # SESSION_SECRET 등을 채운다
npm run dev               # 서버(3001) + 웹(5173) 동시 실행, 웹이 API·소켓을 프록시
```
| 명령 | 설명 |
|---|---|
| `npm run lint` | ESLint(`dangerouslySetInnerHTML` 금지 규칙 포함) |
| `npm run typecheck` | 전 워크스페이스 + e2e, strict |
| `npm test` | 단위·보안 테스트(Vitest): 공유 14, 서버 87, 웹 14 |
| `npm run test:e2e` | 웹 빌드 후 Playwright E2E(Chromium 가짜 카메라·마이크) |
| `npm run build` / `npm start` | 운영 빌드 / 실행 |
| `npm run check:docs` | 문서 정합성·추적성 점검(`scripts/check-docs.mjs`, `--gen`으로 매트릭스 갱신) |
| `node scripts/load-smoke.mjs 30 6` | 부하 스모크(서버 빌드 필요) |

E2E 브라우저: 이 저장소의 CI는 `npx playwright install chromium`, 로컬 샌드박스는 미리 설치된 Chromium을 쓴다. TURN 시험(IT-21/22)은 `turnserver`(coturn)가 있을 때만 실행된다.

## 2. 폴더 구조
```
packages/shared/     메시지 타입, zod 스키마, 닉네임·채팅 규칙(서버·웹 단일 출처)
apps/server/src/     config, rooms(도메인), socket(시그널링), http, security
apps/web/src/        pages, components, media(MediaTransport/MeshTransport), state, lib, design, strings
e2e/                 Playwright 시나리오
infra/               coturn 설정, 개발용 compose
scripts/             문서 점검, 부하 스모크, 콘텐츠 가이드 생성
docs/                01 기획 · 02 디자인 · 03 기술 · 04 보안 · 05 품질 · 06 운영
```

## 3. 코딩 규칙
`CLAUDE.md`의 규칙을 따른다: strict, `any` 금지, 공유 타입은 `packages/shared`, 설정은 `config.ts`(zod), 색·문구는 토큰·`strings.ts`, 요구가 바뀌면 같은 커밋에서 문서·TC·매트릭스 갱신, 테스트 이름에 `TC-nn [요구 ID]`.

## 4. 브랜치·커밋·PR
- 개발·푸시 브랜치는 **`PROD`**(사용자 지정). 강제 푸시 금지, PR은 요청 시에만.
- 커밋: `type(scope): 요약`, 한 커밋 한 의도. 비밀값·`.env`·산출물 금지.

## 5. 의존성 (사후 보고: 추가 전 보고 규칙을 지키지 못했다 → DEC-005)
속도 우선 진행(DEC-004) 중 아래 의존성을 먼저 추가하고 이 문서로 사유를 보고한다. 불필요하다고 판단하면 제거를 요청해 달라.
| 구분 | 패키지 | 이유 |
|---|---|---|
| 서버 | express, socket.io | HTTP와 시그널링 소켓(요구된 스택) |
| 서버 | zod, helmet, pino | 입력 검증, 보안 헤더, 구조화 로그(요구된 스택) |
| 서버 | bcryptjs | 방 비밀번호 해시(bcrypt 요구, 네이티브 빌드 없는 순수 JS) |
| 웹 | react, react-dom, socket.io-client | UI, 소켓 클라이언트(요구된 스택) |
| 웹 | lucide-react | 아이콘 세트(직접 SVG를 만드는 시간 절약, MIT, 사용한 것만 번들) |
| 개발 | vite, @vitejs/plugin-react, tailwindcss(3.4), postcss, autoprefixer | 웹 빌드·스타일(요구된 스택, 토큰을 TS 설정으로 읽기 위해 Tailwind 3 선택) |
| 개발 | typescript, eslint, typescript-eslint, @eslint/js, eslint-plugin-react-hooks | 정적 검사 |
| 개발 | vitest, @playwright/test | 단위·E2E 테스트(요구된 스택) |
| 개발 | tsx, esbuild, concurrently | TS 실행, 서버 번들, 개발 서버 동시 실행 |

점검: `npm audit` 취약점 0건(2026-10-01). 라이선스는 MIT 대다수, ISC·Apache-2.0·BSD, 소수 MPL-2.0·CC-BY-4.0(데이터)·BlueOak-1.0.0·0BSD이며 사용 제한이 되는 라이선스(GPL 등)는 확인되지 않았다(license-checker 요약, 2026-10-01).
