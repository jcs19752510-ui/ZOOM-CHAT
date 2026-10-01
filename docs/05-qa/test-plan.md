> **이 문서의 용도** — 누가: 개발자, 기획자, 보안 담당자 / 언제: 테스트를 추가·실행하거나 출시 판정을 할 때 / 무엇을: 무엇을 어떤 수준·도구·기준으로 검증하는지 결정한다.

# 테스트 계획

| 항목 | 내용 |
|---|---|
| 버전 | 0.1 |
| 작성일 | 2026-10-01 |
| 상태 | 승인 (구현·검증 반영, DEC-004) |
| 주도 | ② 개발자, ① 기획자 |

## 변경 이력
| 버전 | 날짜 | 내용 |
|---|---|---|
| 0.1 | 2026-10-01 | 최초 작성 |


## 1. 목적과 범위
`prd.md`의 모든 요구(FR 23, NFR 13, UX 12, SEC 11)를 테스트 또는 수동 점검·UAT에 연결하고(`traceability.md`, 미연결 0건), 사칭·권한·XSS 같은 보안 요구를 자동으로 막는다.

## 2. 테스트 레벨과 도구
| 레벨 | 도구 | 위치 | 실행 |
|---|---|---|---|
| 단위 | Vitest | `packages/shared`, `apps/web/src`, `apps/server/test/roomManager.test.ts` | `npm test` |
| 통합·보안 | Vitest + 실제 서버·socket.io-client | `apps/server/test/*.test.ts` | `npm test` |
| E2E | Playwright(Chromium, 가짜 카메라·마이크) | `e2e/*.spec.ts` | `npm run test:e2e` |
| 접근성 | E2E(키보드, 이름·역할)+대비 계산 단위 테스트 | `e2e/a11y.spec.ts`, `design.test.ts` | 위와 동일 |
| 성능 | 부하 스모크 스크립트 | `scripts/load-smoke.mjs` | 수동/CI 선택 |
| 호환성 | 자동은 Chromium만, 나머지는 수동 | `compatibility-matrix.md` | 수동 |
| 수동·명령 | 점검 명령 | `manual-checks.md` | 수동 |
| UAT | 사람이 수행 | `uat.md` | 사용자 |

## 3. 환경
로컬(Node 22), CI(GitHub Actions: lint, typecheck, test, check:docs, audit, E2E). TURN은 `turnserver`(coturn) 설치 시 IT-21/22가 함께 실행된다(없으면 건너뜀).

## 4. 진입·종료 기준
- 진입: 코드가 lint·typecheck를 통과.
- 종료(출시 가능): M 우선순위 요구 전부에 통과한 TC, 보안 점검표 ✅(⏳ 항목은 사유 명시), `npm audit` 높음 이상 0건, 문서·매트릭스 최신(`npm run check:docs` 통과). 미검증 항목은 `release-checklist.md`에 남기고 사용자가 수용 여부를 정한다.

## 5. 위험 기반 우선순위
1) 보안(사칭·권한·XSS·토큰) 2) 입장·영상 수신(성공 기준) 3) 재연결·호스트 승계 4) 모바일·접근성 5) 성능.

## 6. 결함 등급
| 등급 | 정의 | 예 |
|---|---|---|
| 치명 | 보안 위반, 데이터 노출, 서비스 불가 | 사칭 가능, 권한 우회 |
| 높음 | 핵심 시나리오 불가 | 영상이 안 보임, 입장 불가 |
| 보통 | 기능은 되나 사용성·표시 문제 | 레이아웃 깨짐 |
| 낮음 | 사소한 문구·정렬 | — |

## 7. 자동화 원칙
테스트 이름 형식 `TC-nn [요구 ID,...] 제목`(단위·통합), `IT-nn [..]`(E2E). 요구 ID를 제목에 적으면 `npm run check:docs --gen`이 추적성 매트릭스와 `test-cases.md`를 만든다. 버그는 재현 테스트를 먼저 쓴다. 불안정한 테스트를 건너뛰거나 끄지 않는다.
