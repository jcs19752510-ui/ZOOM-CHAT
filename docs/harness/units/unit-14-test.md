# 테스트 결과서 — unit-14 (E2E·QA: `e2e/*.spec.ts`·`e2e/fixtures.ts`·`playwright.config.ts`·`scripts/*`) — 소급 6단계

## 1. 개요
- 테스트 대상: 작업 단위 unit-14 (`c2cc28c` 기준 추적 파일: `e2e/*.spec.ts` 16개, `e2e/fixtures.ts`, `playwright.config.ts`, `scripts/check-docs.mjs`·`load-smoke.mjs`·`gen-content-guide.ts`). **5단계 노트 없음 — 소급 단위**. 인수 조건은 03 확정표("IT-01~30 등"), CLAUDE.md의 테스트 규칙(버그는 재현 테스트 먼저, E2E는 fake media 플래그), DEC-015·017의 CI 사고 기록에서 도출했다. 다른 테스터가 새로 추가 중인 `e2e/webRetro.spec.ts`·`pathMetrics-extra.spec.ts`는 이 단위 범위 밖(점검 목록에는 디렉터리 전체를 스캔하는 TC-495~498이 포함하므로 그 파일도 함께 점검됨)
- 테스트 유형: 단위(시험 코드·QA 스크립트의 품질 검증, 정적 불변식 + 실제 E2E 반복 실행 + 변이 시험)
- 적용 Tier: Standard (DEC-002, 규칙 B 최소 2회)
- 적용 속도 트랙: L3
- 병렬 실행 정보: 병렬 웨이브(소급 단위 묶음 C)에서 실행(동시에 돌던 축: unit-13 6단계(같은 호출), unit-19 테스터, 소급 서버 01~05, 웹 06~12). 개별 결과서만 산출
- 테스트 목적: E2E·QA 자산이 "요구를 실제로 단언하고, 서로 독립이며, 시간에 취약하지 않고, 문서 정합성 도구가 실제로 실패를 잡는지"를 증명한다
- 관련 산출물: `03-system-design.md`(unit-14), `decisions.md`(DEC-015·017·021), `docs/05-qa/test-cases.md`, `integration-test.md`, `CLAUDE.md`
- 테스트 수행자(에이전트): 06-unit-tester (Claude Sonnet 5.5)
- 테스트 일시: 2026-10-01

## 2. 테스트 범위 및 제외 범위
- 범위(In-Scope): ① E2E 소스 전수 점검(`.only`·skip·fixme·임의 대기·단언 없는 시험·느슨한 단언·시간 의존) ② 시험 간 독립성(공유 상태·포트·workers=1) ③ `scripts/check-docs.mjs` 변이 시험, `load-smoke.mjs` 실행·코드 검토 ④ 플레이크 위험 평가와 핵심 spec 반복 실행
- 제외 범위 및 사유: **`npm run build`·`npm run test:e2e` 미실행**(공유 `apps/web/dist` 보호, 지시에 따름), 전체 E2E 스위트 실행(핵심 2개 파일 32건만 반복 실행), `soak`(IT-29, `SOAK_MINUTES` 필요, 장시간), TURN E2E(IT-21·22·46, 고정 포트(34780, 49300~49400) 충돌 방지를 위해 실행하지 않음 — 정적 검토만), `gen-content-guide.ts`(`docs/05-qa/content-guide.md`를 덮어쓰므로 동시 작업 중 실행 안 함, 코드 정독만), 다른 브라우저(WebKit/Firefox, 문서상 미검증 목록). 제품 코드·`e2e/*.spec.ts` 기존 파일은 수정하지 않았다(신규 시험 파일 1개와 문서 행 추가만).

## 3. 테스트 환경
- 실행 환경: Linux 6.18, Node 22, Playwright 1.63 + 사전 설치 Chromium 1194(`/opt/pw-browsers`), `workers=1`, 기존 `apps/web/dist`(커밋 기준 빌드)·`apps/server/dist` 사용, Vitest 5.0.3
- 테스트 데이터: 시험 내장 값(`e2e/fixtures.ts`의 `extraServer`가 시험마다 빈 포트의 서버 기동). Playwright 출력은 `--output=.harness-tmp/pw_06_unit14`로 돌려 공유 `test-results/`를 건드리지 않음
- 전제 조건: 5단계 게이트는 소급이라 노트가 없어 6단계에서 재실행: `npm run lint` 오류·경고 0, `npm run typecheck` 오류 0, `npm test -w @meetlite/server` 통과, `npm run check:docs` 통과. 다른 테스터의 동시 `dist` 재빌드가 없었음을 반복 실행 결과(32건 모두 통과)로 확인

## 4. 테스트 케이스 및 결과

### 4.1 인수 조건(소급 도출) ↔ 케이스 추적
| AC | 인수 조건 | 케이스 |
|---|---|---|
| AC-1 | E2E 시험은 요구를 실제 단언한다(skip/only/fixme 없음, 단언 없는 시험 없음, 형식 있는 제목) | E-1~E-5, TC-495 |
| AC-2 | 시험 간 독립(빈 포트·workers=1·retries=0·컨텍스트 정리), 시간 의존 시험은 표본 겹침을 피한다(DEC-015) | F-1~F-4, TC-496, X-1(변이) |
| AC-3 | 계획된 IT-01~30이 모두 존재 | TC-498 |
| AC-4 | `check-docs`는 일부러 깨진 문서·시험에서 실패한다 | G-1~G-11, TC-497 |
| AC-5 | `load-smoke`가 부하 스모크를 올바르게 수행(MC-04) | H-1, H-2 |
| AC-6 | 핵심 E2E는 반복 실행해도 안정적이다 | R-1, R-2, X-1 |

### 4.2 실행한 케이스
| ID | 시나리오 | 사전조건 | 실행 절차 | 예상 결과 | 실제 결과 | Pass/Fail | 비고 |
|----|----------|----------|-----------|-----------|-----------|-----------|------|
| E-1 | `.only`·`.fixme`·`describe.skip` | 소스 전수 | grep `\.only\|\.skip\|fixme\|test\.fail` | 없음 | `.only`·`.fixme` 0건. `test.skip`은 `turn.spec.ts`(turnserver 없으면)·`soak.spec.ts`(`SOAK_MINUTES` 없으면)에만, 둘 다 사유 문자열 있음. `test.fail`(알려진 결함 표기)은 다른 테스터의 `webRetro.spec.ts`에만 | PASS | |
| E-2 | 단언 없는 시험 | 소스 전수 | 시험 블록별 `expect*`·`waitFor` 존재 검사(TC-495) | 모든 시험에 단언 | 위반 0건(첫 구현이 `responsive.spec.ts`를 오탐해 `waitFor`/`noHScroll`을 인정하도록 검사기를 고침) | PASS | |
| E-3 | 임의 대기(`waitForTimeout`·`setTimeout`) | 소스 전수 | grep | 대기 뒤에 단언이 따른다 | 추적 파일 `waitForTimeout` 22곳(+`turn.spec.ts` `setTimeout` 2곳). 모두 ① 부정 단언(무한 재연결 아님·중복 보고 없음) 관찰 창 ② 레이아웃 안정 후 측정/스크린샷 대기 ③ TURN 기동·불일치 대기. 마지막 대기가 시험의 끝인 경우 0건(TC-495) | PASS(관찰 있음) | 22곳 중 ②는 느린 러너에서 플레이크 후보(DEF-009) |
| E-4 | 느슨한 단언·공허한 단언 정독(`meeting`·`states`·`mesh6`·`soak`·`turn` 등) | 소스 | 정독 | 요구 대비 구체 단언 | IT-01~09·14~20은 구체적(개수 `toHaveCount`·정확 일치 `toBe`·본문 `toHaveText`·`aria` 속성). **IT-13은 장치 전환 여부를 단언하지 않음**(`expect.poll(() => enumerateDevices().then(() => 'ok'))`는 항상 'ok', `if (next)` 조건 때문에 장치가 1개면 전환 자체를 건너뜀) → DEF-004. **IT-22**는 `pcs.some(connected)`가 false라는 부정 단언이라 PC가 하나도 안 만들어져도 통과(`pcs.length>0` 없음), 게스트의 `addInitScript`는 페이지 이동 뒤라 적용되지 않음 → DEF-005 | 관찰 | |
| E-5 | CI에서 건너뛰는 시험 | `turn.spec.ts` `hasTurn = fs.existsSync('/usr/bin/turnserver')` | ci.yml e2e job 정독 | TURN E2E가 CI에서 실행되어야 SEC-09 E2E 근거 | e2e job은 coturn을 설치하지 않으므로(러너에 `turnserver`가 있다는 보장 **미확인**) IT-21·22·46이 조용히 skip되어도 CI는 녹색. coturn job은 vitest L1/L2만 실행(IT는 아님) | 결함 → DEF-001 | `REQUIRE_COTURN`과 같은 "건너뜀 금지" 장치가 E2E에는 없음 |
| F-1 | Playwright 설정 | - | `playwright.config.ts` 정독 | 직렬·재시도 없음·fake media | `workers: 1`, `fullyParallel: false`, `retries: 0`, 가짜 장치·UI 플래그 확인(TC-496) | PASS | `retries:0`이라 플레이크가 숨겨지지 않음 |
| F-2 | 포트 독립성 | - | `fixtures.ts` `freePort()`, 하드코딩 포트 grep | 서버는 시험마다 빈 포트 | `listen(0)`; 고정 포트는 `turn.spec.ts`의 `TURN_PORT=34780`(+릴레이 49300~49400) 하나뿐(TC-496) | PASS(관찰) | 동시에 두 번 실행하면 TURN 시험끼리 충돌(DEF-006) |
| F-3 | 공유 상태 | - | `fixtures.ts` 정독 | 시험 간 누수 없음 | `env`는 worker 범위라 파일·시험 간 서버를 공유하되 방은 시험마다 새로 만들고 `RATE_LIMIT_SCALE=1000`으로 속도 제한 영향 제거. 브라우저 컨텍스트는 모든 `hostMeeting/guestMeeting` 파일이 `afterEach(closeAll)`(TC-496)로 정리. 직접 `browser.newContext()`로 만든 컨텍스트는 실패 시 `ctx.close()`가 건너뛰어질 수 있으나 worker 종료 시 닫힘 | PASS(관찰) | `workers=1` 의존: 2 workers면 서버가 worker마다 따로 떠 독립적이지만 TURN 포트가 충돌 |
| F-4 | 시간 의존(DEC-015) | IT-14 | `states.spec.ts` 정독 + 변이 X-1 | 해제 구간 관측용 50ms 폴링 | `expect.poll(speakingCount, { timeout: 40_000, intervals: [50] }).toBe(0)` 존재(TC-496이 고정) | PASS | 켜짐 관측(`>0`)은 기본 간격이어도 두 위상 중 하나가 항상 켜짐 구간이라 안전(분석) |
| R-1 | 핵심 spec 반복 실행 1 | 기존 dist | `npx playwright test e2e/states.spec.ts e2e/meeting.spec.ts -g "IT-14\|IT-04\|IT-05\|IT-16\|IT-17" --workers=1 --repeat-each=2` | 전부 통과 | 10 passed (33.5s) | PASS | |
| R-2 | 핵심 spec 반복 실행 2(두 파일 전체) | 기존 dist | `... states.spec.ts meeting.spec.ts --workers=1 --repeat-each=2` | 전부 통과 | 32 passed (1.5m): IT-01~09, IT-13~19 각 2회 | PASS | 플레이크 0/32 |
| X-1 | 변이: IT-14 폴링을 기본 간격으로 되돌림(복사본 `.harness-tmp`) | R-1 환경 | `intervals: [50]` 제거 후 `--repeat-each=8` | (DEC-015) 해제 구간을 놓쳐 실패 | **관찰된 5회 모두 실패**(40초 타임아웃, 나머지는 시간 제한으로 중단) → 50ms 간격 수정이 필수이며 우연이 아니라 결정적 겹침 | PASS(변이 검출) | TC-496이 이 설정을 정적으로 고정 |
| H-1 | load-smoke 실행 | `apps/server/dist`(기존) | `node scripts/load-smoke.mjs 5 6` | 오류 0 | 5방×6명=30소켓, 신호 1,980건·릴레이 수신 1,950(=5·6·5·13), ack p50 5.3ms·p95 19ms, 오류 0, 속도제한 0, 모두 나간 뒤 방 존재 false | PASS | 포트 3290 사용 |
| H-2 | load-smoke 합격 판정 | 코드 정독 | `process.exit`·임계 판정 검색 | 실패 시 비정상 종료 | 판정·종료 코드가 없다(JSON만 출력, 오류가 있어도 종료 코드 0). 서버 시작 실패 시에만 연결 예외로 비정상 종료 | 관찰 → DEF-007 | 수동 도구(MC-04)라 CI 게이트 아님 |
| G-1~G-11 | check-docs 변이(복사본 `cd/`, 2회 수행: 수동 + TC-497) | 무변이 대조군 통과(`점검 통과`) | 변이 후 `node scripts/check-docs.mjs` | 변이마다 종료 코드 1 + 해당 메시지 | 아래 4.4 표 | 일부 PASS, 갭 3건 → DEF-002·003·008 | |

### 4.3 이번에 추가한 자동 시험 (`apps/server/test/e2eGuard.test.ts`, 4개)
| TC | 검증 | 변이 판별력 |
|---|---|---|
| TC-495 [NFR-11,NFR-08] | `e2e/*.spec.ts` 전수: `.only/.fixme` 금지, skip은 허용 파일·사유 문자열 필수, 모든 시험 제목은 `IT-n [요구ID] 제목` 형식·ID 중복 없음·단언 있음·마지막 대기 뒤 단언 있음 + 검사기 음성/양성 대조군 | `.only`·fixme·사유 없는 skip·단언 없는 시험·대기로 끝나는 시험·제목 형식 위반 모두 검출 |
| TC-496 [NFR-11,NFR-08] | `workers:1`·`retries:0`·`fullyParallel:false`·fake media 플래그, `freePort`, 하드코딩 포트는 `TURN_PORT` 한 곳, `afterEach(closeAll)`, IT-14의 50ms 폴링 | retries 2·workers 4·IT-14 기본 폴링·하드코딩 포트·closeAll 제거 모두 검출 |
| TC-497 [NFR-11,SEC-11] | `check-docs.mjs`를 임시 트리(`.harness-tmp/unit14_checkdocs_<pid>/`)에서 8가지 변이로 실행: 중복 TC ID·용도 첫 줄 삭제·미정의 ID 참조·FR 인수 조건 삭제·문서 인덱스 누락·api-spec EVT 매핑 삭제·매트릭스 수동 변조·요구 미연결(SEC-04 태그 제거). 무변이 대조군에는 같은 오류가 없음을 먼저 확인 | 8/8 검출 |
| TC-498 [NFR-11] | 계획된 IT-01~IT-30이 E2E 제목에 모두 존재 | IT-09를 IT-90으로 바꾸면 검출 |
unit-13의 `INFRA_GUARD_ROOT`처럼 `E2E_GUARD_ROOT`로 변이 복사본에 적용할 수 있다. 실행: `npx vitest run test/e2eGuard.test.ts` → 4 passed(TC-497은 약 3~5초). 임시 트리는 `afterAll`에서 삭제한다.

### 4.4 변이 시험 결과
| # | 변이 | 도구 | 결과 |
|---|---|---|---|
| G-1 | TC ID 중복(TC-100) | check-docs | 검출 `[테스트] TC/IT ID 중복` |
| G-2 | 문서 첫 줄 용도 삭제 | check-docs | 검출 `[양식] 첫 줄이 용도 한 줄이 아님` |
| G-3 | 미정의 ID 참조(`FR-99` 문서) | check-docs | 검출 `[참조] 정의되지 않은 ID` |
| G-4 | FR-01 인수 조건 행 삭제 | check-docs | 검출 `[PRD] 인수 조건(Given-When-Then) 없음` |
| G-5 | README 인덱스에서 api-spec 제거 | check-docs | 검출 `[인덱스]` |
| G-6 | api-spec §7의 FR-01 EVT 매핑 삭제 | check-docs | 검출(추적성 6건) |
| G-7 | traceability.md 표 수동 변조 | check-docs | 검출 `[추적성] ... 불일치` |
| G-8 | SEC-04를 태그한 모든 시험의 연결 제거 | check-docs | 검출(요구 미연결/추적성) |
| G-9 | **PRD에 FR-02 행 중복 정의** | check-docs | **통과(미검출)** → DEF-003 |
| G-10 | **시험 제목의 요구 태그를 존재하지 않는 `FR-99`로 오타** | check-docs | **통과(미검출)** → DEF-002 |
| G-11 | **`test-cases.md`에서 TC-100 행 삭제(생성물 변조)** | check-docs | **통과(미검출)** → DEF-008 |
| E2E-1~12 | `.only`·fixme·사유 없는 skip·단언 없음·대기로 끝남·제목 위반·IT-09 삭제·retries·workers·IT-14 기본 폴링·하드코딩 포트·closeAll 제거 | TC-495/496/498 | 모두 검출 |
| X-1 | IT-14 폴링 기본 간격 | 실제 E2E 실행 | 5회 모두 실패(변이 검출) |

## 5. 커버리지
- 커버리지 지표(기능 기준): AC-1~AC-6에 실행 근거. E2E 수행 범위는 IT-01~09·13~19 각 2회(32건) + IT-14 변이 5회. 시험 코드 소스는 16개 추적 파일 전수 정적 점검(TC-495·496·498은 디렉터리 전체).
- 커버되지 않은 부분과 사유: IT-10·11·12·20~30·31 이후(`responsive`·`a11y`·`ux`·`mesh6`·`soak`·`turn`·`foreground-extra`·`mobile-lifecycle`·`operatorClose*`·`legal*`·`pathMetrics`)는 정적 점검만, 실행 안 함(시간·공유 자원, 지시상 핵심 일부만). TURN E2E는 실행 안 함. 타 브라우저·실기기 미검증. `gen-content-guide.ts` 미실행.

## 6. 결함(Defect) 목록
| ID | 설명 | 재현 절차 | 심각도 | 상태 | 조치 내용 |
|----|------|-----------|--------|------|-----------|
| DEF-001 | TURN E2E(IT-21·22·46)가 `turnserver`가 없으면 조용히 skip되며 CI e2e job에는 coturn 설치도 "건너뜀 금지" 장치도 없다 → SEC-09의 E2E 근거가 CI에서 실행된다는 보장이 없다(녹색이어도 skip) | `turn.spec.ts` `hasTurn` 정독 + ci.yml e2e job 정독(러너에 turnserver가 없다고 가정 — **미확인**). (실행하지 않고 코드 정독으로 판단: 파일이 없으면 `test.skip`) | Medium | Open | 권고: `REQUIRE_TURN=1`이면 skip 대신 실패, e2e job에 `sudo apt-get install -y coturn`+`REQUIRE_TURN=1`. 이미 coturn job이 L2 실측을 하므로 위험은 중간 이하. 시험 파일 수정은 이 단계 범위 밖이라 보고만 함 |
| DEF-002 | `check-docs`가 시험 제목의 요구 태그가 **정의된 요구인지** 검사하지 않는다(오타 `FR-99`가 통과). CLAUDE.md의 "모든 TC는 요구에 연결, 미연결은 결함"이 오타로 조용히 깨질 수 있음 | 시험 제목을 `TC-120 [FR-99,NFR-08] ...`로 바꾸고 `node scripts/check-docs.mjs` → 점검 통과(G-10) | Medium | Open | 권고: `tests[].reqs` 각각이 `defined`에 있는지 `[참조]` 오류로 검사. 스크립트(`scripts/*`)는 이 단위 소유지만 이번 6단계는 제품·스크립트 수정 금지라 보고만 함 |
| DEF-003 | `check-docs`가 같은 요구/정책 ID의 **중복 정의**를 잡지 않는다(`defined`가 Set이라 조용히 합쳐짐). 같은 FR이 두 번 정의돼도 통과(G-9) | prd.md에 `| FR-02 | M | ... |` 행을 한 번 더 추가 → 점검 통과 | Low | Open | 권고: 정의 수집 시 중복이면 오류 |
| DEF-004 | IT-13이 "장치를 바꿔도"를 실제 단언하지 않는다: `expect.poll(... => 'ok')`는 항상 참(공허), 전환은 `if (next)` 조건부 | `states.spec.ts` IT-13 정독(전환 후 `getSettings().deviceId`가 바뀌는지 확인이 없음) | Medium | Open | 권고: `selectOption` 뒤 송신 트랙의 `deviceId` 변화·옵션이 2개 미만이면 실패로 단언. FR-09 인수 조건의 핵심 부분이 미검증 |
| DEF-005 | IT-22(자격증명 불일치) 부정 단언이 공허할 수 있음: PC가 0개여도 `connected=false`로 통과, 게스트의 FORCE_RELAY `addInitScript`는 이미 열린 페이지에 적용되지 않음. 대기도 고정 8초 | `turn.spec.ts` IT-22 정독 | Low | Open | 권고: `pcs.length>0` 선단언, IT-21(양성 대조군)과 같은 조건임을 유지. IT-21이 대조군 역할을 하므로 위험은 낮음 |
| DEF-006 | `turn.spec.ts`가 고정 포트(3478 아님, 34780·49300~49400)를 쓴다 → 같은 호스트에서 E2E를 동시에 두 번 돌리면 충돌(병렬 웨이브에서 직렬화 필요) | 정독 + TC-496이 "하드코딩 포트는 이 한 곳뿐"으로 고정 | Low | Open | 권고: 빈 포트 사용. `load-smoke.mjs`도 3290 고정 |
| DEF-007 | `load-smoke.mjs`는 합격 판정·종료 코드가 없다(오류 N건이어도 종료 코드 0), 포트 3290 고정, `ps`·`/proc` 사용으로 Linux 전용 | 코드 정독(H-2). 실행 시 정상 출력(H-1) | Low | Open | 권고: `errors>0`이거나 `모두나간뒤방존재`가 true면 종료 코드 1. MC-04 수동 도구라 우선순위 낮음 |
| DEF-008 | `check-docs`는 `docs/05-qa/test-cases.md`(생성물)의 오래됨/변조를 검사하지 않는다(행 삭제해도 통과, G-11) — `traceability.md`만 검증 | `test-cases.md`에서 TC-100 행 삭제 → 점검 통과 | Low | Open | 권고: 생성 결과와 비교하거나 CI에서 `--gen` 후 `git diff --exit-code` |
| DEF-009 | 레이아웃 측정·스크린샷 전 고정 대기(`waitForTimeout(300~800)`) 6곳은 느린 러너에서 플레이크 후보(실행 결과 32/32 안정이라 현재 증거는 없음). `responsive` IT-10은 스크린샷을 저장만 하고 비교(`toHaveScreenshot`)는 안 함(DEC-004의 수동 비교 대체) | 정독 | Low | Open | 관찰. 비교 자동화는 비목표 범위(수동 확인 MC)이므로 요구 변경 없음 |
- 위 외 결함 없음. 근거: E-1~E-4의 정독·grep 결과, R-1·R-2 반복 실행 32/32 통과, TC-495~498의 변이 검출, check-docs 변이 11종(8종 검출·3종 갭). Critical/High 없음.

## 7. 테스트 환경 정리(Teardown) 확인 — 규칙 K
- 이번 테스트에서 생성한 임시 아티팩트 목록: `.harness-tmp/pw_06_unit14/`(Playwright 출력), `.harness-tmp/pw_unit14_run1.log`·`run2.log`, `.harness-tmp/mut_06_unit13/{cd,me,m,ci,ctx}`(check-docs·E2E 변이 복사본; unit-13과 같은 디렉터리를 공유해 썼음), `apps/server/test/e2eGuard.test.ts` 실행 중 `.harness-tmp/unit14_checkdocs_<pid>/`(시험의 `afterAll`이 삭제), `/tmp/x.bak` 1개(즉시 삭제)
- 위 아티팩트를 전부 `.harness-tmp/` 하위에서만 생성했는가 (규칙 K 1번): [x] 예 / [ ] 아니오 (위 `/tmp/x.bak` 사소한 예외 1건, 삭제 확인)
- 정리(삭제) 완료 여부: 완료. 변이 복사본·Playwright 출력·로그 삭제, `ls .harness-tmp`에 이 단위의 항목 없음, `pgrep`로 Playwright·Chromium 잔여 프로세스 없음 확인. 공유 `test-results/`·`apps/web/dist`는 건드리지 않음
- 정리 후 `git status` 실행 결과: unit-13 결과서 7절에 그대로 첨부(같은 시각·같은 호출). 요지: 이 단위가 추가한 파일은 `apps/server/test/e2eGuard.test.ts`와 `docs/05-qa/test-cases.md`·`docs/traceability.md`(`check-docs --gen` 재생성)뿐
- 병렬 실행이었다면: 다른 단위 소유 항목(`unit02~05Adversarial`, `unit-19`, `web/src/**`, `e2e/webRetro.spec.ts`, `e2e/pathMetrics-extra.spec.ts`, `protocolBoundary`)은 이 단위가 만든 것이 아님. `apps/server/.vitest/`·`packages/shared/.vitest/`는 소유자 불명(unit-13 7절 참조). "이 실행이 만든 임시 아티팩트·미추적 잔여물 없음" 판정 근거: `.harness-tmp` 확인 + `git status`에서 이 단위의 신규 파일은 의도한 시험 파일뿐. 웨이브 종료 후 전체 트리 점검은 오케스트레이터가 수행
- 이번 테스트 도중 강제 중단(TaskStop 등)이 있었는가: [x] 없음 / [ ] 있음 (IT-14 변이 반복 실행은 8회 중 5회 실패 확인 후 `pkill`로 직접 중단하고 프로세스 잔여가 없음을 확인)

## 8. 리스크 및 잔존 이슈
- 이번 테스트로 커버되지 않는 알려진 리스크: ① TURN E2E의 CI 미실행 가능성(DEF-001) ② IT-10·20~30 등 나머지 spec의 실제 안정성(정적 점검만) ③ 느린 러너·헤드리스 환경 차이(샌드박스 32/32 통과가 CI 안정성을 보장하지 않음; DEC-015 사고는 CI에서만 드러났음) ④ check-docs의 3가지 갭(DEF-002·003·008) ⑤ 실제 브라우저 다양성(Chromium만)
- 후속 조치가 필요한 항목: DEF-001·002·004(Medium)를 우선. 새 spec 추가 시 TC-495가 형식·단언·skip을 점검한다. 새 요구 태그 오타 방지는 DEF-002 해소 전까지 리뷰에서 확인.

## 9. 결론 및 판정
- [ ] PASS
- [x] CONDITIONAL PASS — 조건: Critical/High 없음. Medium 3건(DEF-001·002·004)과 Low 6건이 Open이므로 오케스트레이터가 수용 또는 재작업(5단계) 지시를 정해야 한다. 07단계 handoff는 가능하나 DEF-001은 07·08 단계의 SEC-09 E2E 근거에 영향
- [ ] FAIL

## 10. 내부 검증 (최소 2회)
- 1차 검증 결과 요약: AC-1~6 모두 실행 근거와 연결. 기대값은 CLAUDE.md·DEC-015·설계서에 근거. 시험 자체의 결함 점검: 처음 쓴 TC-495 검사기가 `responsive.spec.ts`를 오탐해 검사 규칙을 보강(시험 결함, 제품 결함 아님). TC-497의 시험 안 문자열이 실제 check-docs 파서에 시험 ID로 잡힐 위험을 발견해 문자열을 이어붙이는 방식으로 회피.
- 2차 검증 결과 요약: "통과했으니 넘겨도 되는가"를 의심해 check-docs를 손으로 더 깨뜨려(중복 정의·태그 오타·생성물 변조) 갭 3건 발견. 반복 실행과 IT-14 변이로 시간 의존 위험이 실제로 결정적임을 확인. 못 본 것: 나머지 spec 실행, 타 브라우저, CI 실제 환경.
- 검증 로그 파일 경로: `docs/harness/verify-log_unit-14-test.md`

## 공유 문서 갱신 요청 (traceability.md·decisions.md는 직접 수정하지 않음)
- traceability.md "단위테스트" 컬럼: unit-14가 소유한 요구(IT-01~30 계열 FR/NFR 전반, 특히 NFR-11) → `CONDITIONAL PASS (소급 6단계, TC-495~498, Medium 3건 Open: unit-14-test.md)`
- decisions.md 후보: ① DEF-001(TURN E2E CI skip) 처리 방침 ② check-docs 갭 DEF-002·003·008 수정 여부 ③ 새로 쓴 TC-490~498 범위(TC-499·IT-60~64는 미사용)
