# 테스트 결과서 — unit-03 (서버 보안)

## 1. 개요
- 테스트 대상 (모듈/기능/업무단위/전체 시스템 중 명시): 모듈 — `apps/server/src/security/{ids,ipKey,password,rateLimit,token,turn}.ts`와 `test/security.test.ts`
- 테스트 유형: 단위 (소급 6단계: 인수 조건 추적 + 시험 실행 + 변이 시험 + 적대·경계 보강)
- 적용 Tier (Low/Standard/High, ORCHESTRATOR.md 1장 참고): Standard (DEC-001)
- 적용 속도 트랙 (L1~L5, 06/07 전용): L3(소급) — 보안 단위라 L4 수준(변이·적대 시험 철저)으로 수행
- 병렬 실행 정보: 병렬 웨이브에서 실행(소급 묶음 A; 동시에 unit-19 테스터, 소급 웹(06~12), 소급 인프라·E2E(13~14) 테스터가 돌았다. 이 호출은 unit-0N 하나만 검증하고 `apps/web/dist`는 건드리지 않았다)
- 테스트 목적: 토큰 서명·만료 검증, 비밀번호 해시, 속도·시도 제한기, ID 난수, TURN 임시 자격증명이 보안 규칙(SEC-01~03, SEC-06 제한기, SEC-09 자격증명, POL-11)대로 동작하는지 L4 수준으로 증명한다.
- 관련 산출물: `docs/harness/03-system-design.md` §1.3·§3·§4·§6, `docs/harness/02-planning.md`, `docs/harness/traceability.md`, `docs/harness/decisions.md`, `docs/05-qa/test-cases.md`, `docs/03-engineering/api-spec.md`, `CLAUDE.md` 보안 규칙
- 테스트 수행자(에이전트): 06 단위 테스터 (소급 묶음 A, 재시작 호출)
- 테스트 일시: 2026-10-01 (코드 커밋 `c2cc28c`(PROD) 기준)

## 2. 테스트 범위 및 제외 범위
- 범위 (In-Scope) — 03 §1.3·§3.2·§3.3·§6.2 #1~3·#9에서 도출한 인수 조건:
  - AC1 방 ID 128비트·참가자 ID 72비트·메시지 ID는 `crypto` 난수이며 서버만 만든다 (SEC-01, SEC-04)
  - AC2 비밀번호는 bcrypt(SHA-256 선처리)로만 보관하고 72바이트 초과도 끝까지 검증한다, 오류 형식 해시는 false (SEC-02)
  - AC3 세션·호스트 클레임 토큰은 HMAC-SHA256 서명, 만료(정각 포함 무효), 종류(t), rid/pid 형식을 검증하고 어떤 변조·형식 오류에도 예외 없이 null (SEC-03)
  - AC4 TURN은 `username=<만료초>:<참가자>`, `credential=HMAC-SHA1(secret)` 임시값이며 설정이 없으면 만들지 않는다, 공유 비밀은 응답에 없다 (SEC-09)
  - AC5 토큰 버킷·키별 제한기: 용량 버스트, 보충, 유휴 시 용량 상한, 키별 독립 (SEC-06)
  - AC6 시도 제한: 창 안 N회 실패 → 차단(정확히 blockMs), 창 밖 실패는 미집계, 성공 시 초기화, 키별 독립 (SEC-02, POL-11)
  - AC7 강퇴용 IP 키는 HMAC 해시이며 원문·비밀 없이 복원 불가 (POL-06)
  - AC8 제한기 키 정기 정리(D-6, POL-18; unit-15가 소유하나 같은 파일이라 기존 TC-343만 참조)
- 제외 범위 (Out-of-Scope) 및 사유: 제한기가 서버에서 실제 쓰이는 방식(unit-05 소켓·unit-02 REST), TURN 서버 측 설정(unit-18), 암호학적 난수의 통계적 품질(Node `crypto` 신뢰), bcrypt 라이브러리 내부.

## 3. 테스트 환경
- 실행 환경: Linux 샌드박스, Node v22.22.0, Vitest 5.0.3, 서버 시험은 `PORT=0`(무작위 포트)·`127.0.0.1`만 사용. 브라우저·Docker·외부 네트워크 미사용. DB 없음(메모리 상태).
- 소급 단위: **5단계 노트(`unit-0N-note.md`)가 없다.** 인수 조건(AC)은 `03-system-design.md` §1.3 확정표·§3·§4·§6, 요구(FR/NFR/SEC/POL), `docs/03-engineering/api-spec.md`, 기존 시험과 `CLAUDE.md` 보안 규칙에서 도출했다(아래 AC 표).
- 5단계 게이트 확인(노트가 없어 대체): 커밋 `c2cc28c`에서 `npm run lint`(오류·경고 0), `npm run typecheck`(오류 0)를 이번 실행에서 직접 재확인. CI 통과는 오케스트레이터 전달 사실이며 직접 확인하지 않았다(미검증으로 표기). "자체 코드 리뷰 체크리스트"는 소급이라 존재하지 않아 03 §6.2 코드 대조(보안 규칙 11행)로 대체했다.
- 테스트 데이터: 합성 토큰(올바른 서명을 붙인 임의 본문), 가짜 시계, 임의 길이 문자열. 순수 함수 시험이라 서버·포트 불필요.
- 전제 조건 (Preconditions): 소스 무수정. 변이는 `.harness-tmp/mut_06_unit03/` 복사본에서만 적용.

## 4. 테스트 케이스 및 결과
### 4.1 인수 조건 ↔ 시험 추적
| AC | 요구 | 기존 TC(06 이전) | 기존 단언 강도 | 보강 TC(이번) |
|---|---|---|---|---|
| AC1 | SEC-01, SEC-04 | TC-137, 138, 101 | 중 — 형식·유일성. 엔트로피 길이는 정규식이 간접 보장하나 위치별 무작위성·메시지 ID 미검증 | TC-432b |
| AC2 | SEC-02 | TC-133, 134, 107 | 중 — 해시 불일치·검증·72바이트. **bcrypt 비용(10) 미검증**(M3-14 생존), 빈 문자열·이모지·오류 해시 미검증 | TC-432 |
| AC3 | SEC-03 | TC-130, TC-50·51(소켓) | **약** — 만료는 `exp+1001`만 확인(정각 경계 미검증, M3-01), 서명 통과 후 본문 검증(pid/rid/t 타입, JSON 아님)·점 3개 조각 미검증(M3-05~09 생존) | TC-430, 430b, 430c, 430d |
| AC4 | SEC-09 | TC-131, 132, 132b | 중 — 형식·만료·미설정. 공유 비밀 비노출(M3-25 생존)·참가자별 상이·소수 초 버림 미검증 | TC-433 |
| AC5 | SEC-06 | TC-135 | 약 — 유휴 시 용량 상한(M3-16 생존)·소수 보충·무보충 미검증 | TC-431, 431b |
| AC6 | SEC-02, POL-11 | TC-136, TC-343b | 중 — 5회 차단·해제·성공 초기화. 집계 창 만료(M3-18 생존)·정확히 blockMs 경계·키 독립·해제 후 재집계 미검증 | TC-431c |
| AC7 | POL-06 | TC-139 | 강 | TC-432c(IPv6·결정성) |
| AC8 | POL-18 | TC-343, 343b, 343c | 강(unit-15 보강본) | — |

### 4.2 보강 시험 실행 결과 (이번 실행: `npx vitest run test/unit03Adversarial.test.ts` → 11 passed)
| ID | 시나리오 | 사전조건 | 실행 절차 | 예상 결과 | 실제 결과 | Pass/Fail | 비고 |
|----|----------|----------|-----------|-----------|-----------|-----------|------|
| TC-430 | 만료 경계: exp-1 유효, exp 정각·+1 무효(세션·호스트 클레임), 다른 비밀 무효 | 가짜 시각 | `verifyToken` | 정각은 무효 | 기대대로 | Pass | `<=` 규칙 확인 |
| TC-430b | 서명은 맞고 본문이 비정상: JSON 아님·`null`·배열·`{}`, pid 누락/숫자/null, rid 누락/숫자, exp 문자열/null/음수, t 알 수 없음/대문자, rid 없는 클레임 → 모두 예외 없이 null. 추가 필드는 통과 | 올바른 서명을 직접 계산 | 13종 입력 | null | 기대대로 | Pass | |
| TC-430c | 형식 공격 17종: 점 3개·끝 점·서명 짧음/김·본문 한 글자 변조·서명 한 글자 변조·20만 자 입력·같은 길이 다른 비밀 | 없음 | `verifyToken` | 예외 없이 null | 기대대로 | Pass | 길이 불일치 시 `timingSafeEqual` 예외를 사전 검사가 막는지 포함 |
| TC-430d | 토큰 형식 `base64url.base64url(43자)`, 참가자별 상이, 본문에 비밀값 없음 | 없음 | `signToken` | 형식 일치 | 기대대로 | Pass | |
| TC-431 | 토큰 버킷: 100만 초 유휴 후에도 정확히 용량만, 0.5/초 보충, 무보충 | 가짜 시계 | take 반복 | 용량 상한 | 기대대로 | Pass | |
| TC-431b | 키별 제한기 독립 | 가짜 시계 | allow('a'/'b') | 키마다 용량 | 기대대로 | Pass | |
| TC-431c | 시도 제한: 창 밖 실패 미집계, 창 정확 경계, 정확히 blockMs 뒤 해제, 해제 후 0부터 재집계, 키 독립 | 가짜 시계 | recordFailure/isBlocked | 명세대로 | 기대대로 | Pass | |
| TC-432 | bcrypt `$2[aby]$1x` 이상 비용, 빈/이모지/1000자/NUL 해시·검증 일치와 변형 불일치, 오류 형식 해시·빈 해시는 false | 없음 | hash/verify | 기대대로 | 기대대로 | Pass | |
| TC-432b | ID 형식·유일성(3000/5000건), 위치별 문자 다양성 | 없음 | 생성 | 형식 일치·무충돌 | 기대대로 | Pass | |
| TC-432c | IP 키 결정성·IP별 상이·IPv6 22자·원문 미포함 | 없음 | ipKey | 기대대로 | 기대대로 | Pass | |
| TC-433 | TURN: 만료=floor(초)+TTL, 참가자별 상이, 시간 경과 시 상이, 비밀·`secret` 미노출, STUN 항목 무자격증명, 미설정 시 자격증명 없음, STUN 비움+TURN만 | 설정 3종 | buildIceServers | 기대대로 | 기대대로 | Pass | |

### 4.3 기존 시험 재실행
- `npx vitest run test/security.test.ts` → 통과(기존 14개). 보강 11개 포함 시 25개 통과.

### 4.4 변이 시험 결과 (임시 복사본 `.harness-tmp/mut_06_unit03/`, 총 26개)
| ID | 변이 내용 | 기존 시험(06 이전) | 보강 후 |
|---|---|---|---|
| M3-01 | 만료 경계: exp==now 를 유효로(<= -> <) | **생존**(전체 시험에서도) | 검출 TC-430 |
| M3-02 | 만료 검사 제거 | 검출 TC-130 | 검출 TC-130 |
| M3-03 | 서명 검증 제거(서명이 있기만 하면 통과) | 검출 TC-130 | 검출 TC-130 |
| M3-04 | 서명 길이 불일치 사전 검사 제거(예외 발생) | 다른 단위 시험만 검출 | 검출 TC-430c |
| M3-05 | 토큰 점(.) 개수 검사 약화(3조각 허용) | **생존**(전체 시험에서도) | 검출 TC-430c |
| M3-06 | 세션 토큰 pid 타입 검사 제거 | **생존**(전체 시험에서도) | 검출 TC-430b |
| M3-07 | 토큰 종류(t) 화이트리스트 제거 | **생존**(전체 시험에서도) | 검출 TC-430b |
| M3-08 | rid 타입 검사 제거 | **생존**(전체 시험에서도) | 검출 TC-430b |
| M3-09 | 서명은 맞지만 본문이 JSON이 아닐 때 예외 전파 | **생존**(전체 시험에서도) | 검출 TC-430b |
| M3-10 | 서명 비밀값 고정(SESSION_SECRET 무시) | 검출 TC-130 | 검출 TC-130 |
| M3-11 | 방 ID 엔트로피 128->96비트 | 검출 TC-137 | 검출 TC-137 |
| M3-12 | 참가자 ID 엔트로피 축소 | 검출 TC-138 | 검출 TC-138 |
| M3-13 | IP 키 비밀값 무시 | 검출 TC-139 | 검출 TC-139 |
| M3-14 | bcrypt 비용 10->4 | **생존**(전체 시험에서도) | 검출 TC-432 |
| M3-15 | 비밀번호 검증 항상 통과 | 검출 TC-133 | 검출 TC-133 |
| M3-16 | 버킷 용량 상한 제거(유휴 시간만큼 버스트 누적) | **생존**(전체 시험에서도) | 검출 TC-431 |
| M3-17 | 토큰 버킷 off-by-one(용량+1 허용) | 검출 TC-135 | 검출 TC-135 |
| M3-18 | 실패 집계 창 만료 미적용(오래된 실패도 누적) | **생존**(전체 시험에서도) | 검출 TC-431c |
| M3-19 | 차단 임계 off-by-one(limit+1회째에 차단) | 검출 TC-136 | 검출 TC-136 |
| M3-20 | KeyedRateLimiter 키 구분 제거(전역 공유) | 검출 TC-343b | 검출 TC-343b |
| M3-21 | 차단 판정 무력화 | 검출 TC-136 | 검출 TC-136 |
| M3-22 | 차단 시간 1/10로 단축 | 검출 TC-136 | 검출 TC-136 |
| M3-23 | TURN 자격증명 만료 24배 | 검출 TC-131 | 검출 TC-131 |
| M3-24 | TURN username에서 참가자 ID 제거 | 검출 TC-131 | 검출 TC-131 |
| M3-25 | TURN 공유 비밀 노출 | **생존**(전체 시험에서도) | 검출 TC-433 |
| M3-26 | IP 키 정기 정리 무력화 | 검출 TC-343 | 검출 TC-343 |

- 요약: 변이 26개 중 **기존 시험 단독 검출 15개(58%)**, 다른 단위 시험이 추가 1개(M3-04: TC-50이 우연히 검출), **10개는 전체 시험에서도 생존**. 보강 후 **26개 전부 검출(100%)**. 동등 변이 없음. 생존 10개는 모두 토큰 파서의 서명 이후 검증(가장 위험한 영역)과 제한기의 시간 경계에 몰려 있었다.

## 5. 커버리지
- 커버리지 지표: 라인/브랜치 도구 미설치로 **미측정**. 대체: AC 8개 모두 TC 대응(100%), 변이 점수 기존 58%→보강 후 100%(26/26).
- 커버되지 않은 부분과 사유: ① `timingSafeEqual`의 상수 시간 성질은 단위 시험으로 증명할 수 없다(길이 일치 후 비교만 확인; admin 토큰은 unit-16의 `adminTimingSafe.test.ts`가 별도 시험). ② bcrypt 라이브러리·`crypto.randomBytes` 내부.

## 6. 결함(Defect) 목록
| ID | 설명 | 재현 절차 | 심각도(Critical/High/Medium/Low) | 상태(Open/Fixed/Deferred) | 조치 내용 |
|----|------|-----------|-----------------------------------|----------------------------|-----------|
| DEF-001 | **시험 구멍**: 토큰 검증의 만료 정각 경계, 서명 후 본문 검증(pid/rid/t), 점 3개 조각, JSON 파싱 실패 처리, bcrypt 비용, 버킷 용량 상한, 시도 집계 창, TURN 비밀 비노출 변이 10개가 기존 시험 전체에서 검출되지 않음. 제품 코드는 정상(보강 시험이 현재 코드에서 통과) | 복사본에서 M3-01·05~09·14·16·18·25 적용 후 `security.test.ts` 등 실행 → 통과 | High (세션 토큰은 신원의 전부이므로 검증 약화를 못 잡는 구멍은 보안 위험) | Fixed | TC-430~433 추가 → 전부 검출 |
- 제품 코드 결함: **없음**. 근거: 토큰 적대 입력 약 40종(TC-430b·430c)에서 예외·오수락이 0건이었고, 제한기·TURN·비밀번호가 명세대로 동작했다.
- 관찰(결함 아님): ① 서명 검증은 `timingSafeEqual` 전에 길이를 비교하므로 서명 길이는 노출되나 고정 길이(43자)라 정보가 없다. ② 토큰에 서버가 모르는 필드가 있어도 서명 범위 안이면 통과한다(권한 필드로 쓰이지 않으므로 무해, TC-430b가 현재 동작을 고정). ③ 서버 저장 없는 무상태 토큰이라 강퇴·퇴장 외의 개별 폐기는 불가(03 §3.2에 이미 명시된 한계).

## 7. 테스트 환경 정리(Teardown) 확인 — 규칙 K
- 이번 테스트에서 생성한 임시 아티팩트 목록 (경로 포함): `.harness-tmp/mut_06_unit03/`(변이 시험용 저장소 복사본 — 소스·시험 복사 + 루트 `node_modules` 심볼릭 링크 모음. 변이는 이 복사본에서만 적용하고 변이마다 원본 파일로 복구)와 변이 목록·결과 JSON·실행 스크립트(세션 scratchpad, 저장소 밖)
- 위 아티팩트를 전부 `.harness-tmp/` 하위에서만 생성했는가 (규칙 K 1번): [x] 예 / [ ] 아니오
- 정리(삭제) 완료 여부: 완료 — `.harness-tmp/mut_06_unit01~05`를 모두 삭제했다. 다른 테스터의 `.harness-tmp/` 하위(작업 종료 시점에 `mut_06_unit06~12`, `mut_06_base`, `mut_06_head`, `probe_06_web` 등이 있었다)는 건드리지 않았다. `.harness-tmp/` 자체는 `.gitignore` 대상이다.
- 정리 후 `git status` 실행 결과 (그대로 첨부, 요약 금지):
```
 M docs/05-qa/test-cases.md
 M docs/traceability.md
?? apps/server/test/e2eGuard.test.ts
?? apps/server/test/infraGuard.test.ts
?? apps/server/test/metricsPathAdversarial.test.ts
?? apps/server/test/unit02Adversarial.test.ts
?? apps/server/test/unit03Adversarial.test.ts
?? apps/server/test/unit04Adversarial.test.ts
?? apps/server/test/unit05Adversarial.test.ts
?? apps/web/src/components/chatPanel.test.ts
?? apps/web/src/components/participantsPanel.test.ts
?? apps/web/src/components/roomUi.test.ts
?? apps/web/src/components/stateScreen.test.ts
?? apps/web/src/components/videoTileSpeaking.test.ts
?? apps/web/src/lib/audioLevel.test.ts
?? apps/web/src/lib/localMedia.test.ts
?? apps/web/src/lib/signaling.test.ts
?? apps/web/src/lib/signalingPathCompat.test.ts
?? apps/web/src/lib/storageApi.test.ts
?? apps/web/src/media/meshTransport.fake.test.ts
?? apps/web/src/media/pathMetricsAdversarial.test.ts
?? apps/web/src/pages/landing.test.ts
?? apps/web/src/state/meetingController.test.ts
?? docs/harness/units/unit-01-test.md
?? docs/harness/units/unit-02-test.md
?? docs/harness/units/unit-03-test.md
?? docs/harness/units/unit-04-test.md
?? docs/harness/units/unit-05-test.md
?? docs/harness/units/unit-13-test.md
?? docs/harness/units/unit-14-test.md
?? docs/harness/units/unit-19-test.md
?? docs/harness/verify-log_unit-01-test.md
?? docs/harness/verify-log_unit-02-test.md
?? docs/harness/verify-log_unit-03-test.md
?? docs/harness/verify-log_unit-04-test.md
?? docs/harness/verify-log_unit-05-test.md
?? docs/harness/verify-log_unit-13-test.md
?? docs/harness/verify-log_unit-14-test.md
?? docs/harness/verify-log_unit-19-test.md
?? e2e/pathMetrics-extra.spec.ts
?? e2e/webRetro.spec.ts
?? packages/shared/src/protocolBoundary.test.ts
(소유 주석: M docs/05-qa/test-cases.md·docs/traceability.md = --gen 재생성분(여러 테스터 행 혼재); apps/server/test/unit0{2,3,4,5}Adversarial.test.ts, packages/shared/src/protocolBoundary.test.ts, docs/harness/units/unit-0{1..5}-test.md, docs/harness/verify-log_unit-0{1..5}-test.md = 이 호출(묶음 A); apps/web/**, e2e/**, apps/server/test/{e2eGuard,infraGuard,metricsPathAdversarial}.test.ts, unit-13·14·19 문서 = 다른 테스터)
```
- 병렬 실행이었다면: 위 `git status`에서 이 호출(묶음 A)이 만든 것은 `packages/shared/src/protocolBoundary.test.ts`, `apps/server/test/unit0{2,3,4,5}Adversarial.test.ts`, `docs/harness/units/unit-0{1..5}-test.md`, `docs/harness/verify-log_unit-0{1..5}-test.md`, 그리고 `docs/05-qa/test-cases.md`·`docs/traceability.md`의 `--gen` 재생성분(다른 테스터의 행과 섞여 있음)이다. 나머지(`apps/web/**`, `e2e/**`, `apps/server/test/{e2eGuard,infraGuard,metricsPathAdversarial}.test.ts`, `docs/harness/units/unit-19-test.md`, `verify-log_unit-19-test.md`)는 다른 테스터 소유다. 이 호출이 만든 임시 아티팩트·미추적 잔여물(`.harness-tmp/mut_06_unit0*`)은 남아 있지 않다(위 `git status`에 `.harness-tmp`가 없고 `ls .harness-tmp`로도 확인). 웨이브 종료 후 전체 트리 점검(`harness-janitor.sh --check`)은 오케스트레이터 몫이다(미실행).
- 이번 테스트 도중 강제 중단(TaskStop 등)이 있었는가: [x] 없음 / [ ] 있음 (이 소급 단위의 이전 호출이 API 한도로 중단됐으나 저장소에 변경이 남지 않았음을 시작 시 확인했고, 시작 시 `.harness-tmp/`에 이 단위 잔여물이 없었다)
- **이 절이 미완성이거나 `git status`가 깨끗함을 확인하지 못했다면, 8절에서 PASS로 판정할 수 없다 (규칙 K 2번).** → 이 호출 소유분은 정리 완료, 위 판정 근거 충족.

## 8. 리스크 및 잔존 이슈
- 이번 테스트로 커버되지 않는 알려진 리스크: 비밀값(SESSION_SECRET) 유출·교체 절차(운영 단계), 토큰 4시간 수명의 적정성(03 §6.2 #3·D-5, 보안 담당 판단 대기).
- 후속 조치가 필요한 항목: 없음(제품 변경 불필요).

## 9. 결론 및 판정
- [x] PASS — 다음 단계 진행 가능 (7절 Teardown 확인 완료가 전제조건)
- [ ] CONDITIONAL PASS — 조건:
- [ ] FAIL — 사유 및 재작업 요청 사항:

## 10. 내부 검증 (최소 2회, `verification-log-template.md` 사용)
- 1차 검증 결과 요약: AC 8개 ↔ TC 추적, 기존 단언 약함 3곳(AC3·5·6) 식별, 변이 10개 생존 확인, 보강 시험 11개 작성·통과.
- 2차 검증 결과 요약: "통과해도 되는가"를 의심 — 시험이 공허하지 않은지(변이 26/26), 만료 경계의 해석(정각 무효, 코드 `<=`)이 03 §3.2의 "만료" 의미와 일치하는지, 동등 변이 가능성을 재검토. 추가 결함 없음.
- 검증 로그 파일 경로: `docs/harness/verify-log_unit-03-test.md`
