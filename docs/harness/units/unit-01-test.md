# 테스트 결과서 — unit-01 (공통 프로토콜 `packages/shared`)

## 1. 개요
- 테스트 대상 (모듈/기능/업무단위/전체 시스템 중 명시): 모듈 — `packages/shared/src/{limits,text,schemas,protocol,index}.ts`와 `schemas.test.ts`, `text.test.ts`
- 테스트 유형: 단위 (소급 6단계: 인수 조건 추적 + 시험 실행 + 변이 시험 + 적대·경계 보강)
- 적용 Tier (Low/Standard/High, ORCHESTRATOR.md 1장 참고): Standard (DEC-001)
- 적용 속도 트랙 (L1~L5, 06/07 전용): L3(소급)
- 병렬 실행 정보: 병렬 웨이브에서 실행(소급 묶음 A; 동시에 unit-19 테스터, 소급 웹(06~12), 소급 인프라·E2E(13~14) 테스터가 돌았다. 이 호출은 unit-0N 하나만 검증하고 `apps/web/dist`는 건드리지 않았다)
- 테스트 목적: 서버·웹 전 단위가 의존하는 메시지 스키마(zod strict)·입력 한도·닉네임/채팅 정리 규칙이 요구(NFR-12, SEC-04·06, POL-04·07)대로 동작하는지 증명하고, 기존 시험이 이를 실제로 단언하는지 변이 시험으로 확인한다.
- 관련 산출물: `docs/harness/03-system-design.md` §1.3·§3·§4·§6, `docs/harness/02-planning.md`, `docs/harness/traceability.md`, `docs/harness/decisions.md`, `docs/05-qa/test-cases.md`, `docs/03-engineering/api-spec.md`, `CLAUDE.md` 보안 규칙
- 테스트 수행자(에이전트): 06 단위 테스터 (소급 묶음 A, 재시작 호출)
- 테스트 일시: 2026-10-01 (코드 커밋 `c2cc28c`(PROD) 기준)

## 2. 테스트 범위 및 제외 범위
- 범위 (In-Scope) — 5단계 노트가 없으므로 03 확정표(NFR-12, SEC-04·06 스키마, POL-04·07)와 요구에서 도출한 인수 조건:
  - AC1 모든 클라이언트→서버 요청은 `v: 1`이 필수이고 다른 값·누락·문자열 `"1"`은 거부한다 (NFR-12)
  - AC2 모든 요청 스키마는 strict다: 모르는 키, 특히 발신자 `from` 같은 필드를 거부한다 (SEC-04, SEC-06)
  - AC3 `signal:send`는 `description`과 `candidate` 중 정확히 하나만 허용한다 (SEC-04)
  - AC4 크기·길이 한도: SDP ≤16384, candidate ≤2048, sdpMid·usernameFragment ≤64, sdpMLineIndex 정수 0~255, 토큰 20~512, 비밀번호 4~32, 채팅 원문 1~2000, 닉네임 원문 ≤80, 소켓 메시지 32KB (SEC-06)
  - AC5 ID 형식: 방 ID는 정확히 22자 URL-safe, 참가자 ID는 8~24자 URL-safe (SEC-01, SEC-06)
  - AC6 닉네임 규칙: 허용 문자(한글·영문·숫자·공백·`_-.`), 정규화(NFC·연속 공백 축약·trim) 후 1~20 코드포인트, 제어·방향·제로폭·이모지 거부, 중복 비교 키는 대소문자 무시 (POL-04)
  - AC7 채팅 정리: 제어·방향·제로폭 문자 제거, 개행 정규화, 정리 후 1~500 코드포인트, HTML은 변형하지 않음(렌더링은 텍스트로만) (POL-07, SEC-07)
  - AC8 계약 상수(PROTOCOL_VERSION=1, LIMITS, MAX_MESSAGE_BYTES, ERROR_CODES)가 문서(api-spec)와 일치하고 서버 `MESSAGES`(Record<ErrorCode,…>)로 완전성이 타입 검사된다 (NFR-12)
- 제외 범위 (Out-of-Scope) 및 사유: `MetricsPathRequestSchema`(unit-19 소유, TC-302·304는 참고만), 서버·웹의 스키마 사용 방식(unit-02·05·08), 브라우저 렌더링(웹 단위). 라인 커버리지 도구(@vitest/coverage-v8)는 설치돼 있지 않아 미측정(5절).

## 3. 테스트 환경
- 실행 환경: Linux 샌드박스, Node v22.22.0, Vitest 5.0.3, 서버 시험은 `PORT=0`(무작위 포트)·`127.0.0.1`만 사용. 브라우저·Docker·외부 네트워크 미사용. DB 없음(메모리 상태).
- 소급 단위: **5단계 노트(`unit-0N-note.md`)가 없다.** 인수 조건(AC)은 `03-system-design.md` §1.3 확정표·§3·§4·§6, 요구(FR/NFR/SEC/POL), `docs/03-engineering/api-spec.md`, 기존 시험과 `CLAUDE.md` 보안 규칙에서 도출했다(아래 AC 표).
- 5단계 게이트 확인(노트가 없어 대체): 커밋 `c2cc28c`에서 `npm run lint`(오류·경고 0), `npm run typecheck`(오류 0)를 이번 실행에서 직접 재확인. CI 통과는 오케스트레이터 전달 사실이며 직접 확인하지 않았다(미검증으로 표기). "자체 코드 리뷰 체크리스트"는 소급이라 존재하지 않아 03 §6.2 코드 대조(보안 규칙 11행)로 대체했다.
- 테스트 데이터: 시험 안에서 생성한 합성 값(길이 경계 문자열, 분해된 한글, 제로폭 문자 등). 외부 데이터 없음.
- 전제 조건 (Preconditions): `npm ci` 완료 상태, 저장소 소스 무수정. 변이는 `.harness-tmp/mut_06_unit01/` 복사본에서만 적용.

## 4. 테스트 케이스 및 결과
### 4.1 인수 조건 ↔ 시험 추적 (요구 → TC가 가리키는 시험을 실제로 읽어 단언 강도 평가)
| AC | 요구 | 기존 TC(06 이전) | 기존 단언 강도 | 보강 TC(이번) |
|---|---|---|---|---|
| AC1 | NFR-12 | TC-241 | 약 — Join 스키마 하나만 확인(Signal·Chat·Kick 등 9개 스키마의 `v` 검사는 미검증) | TC-420b |
| AC2 | SEC-04·06 | TC-242, TC-302, TC-304 | 중 — Join·Signal·Metrics만. Chat·Kick·Lock·Media·Resume·Create 스키마 strict는 미검증(M1-19·20·22 생존) | TC-420b |
| AC3 | SEC-04 | TC-243 | 강 — 0개·2개·1개 | TC-420(타입 `pranswer` 거부) |
| AC4 | SEC-06 | TC-244 | 약 — SDP 16385만 확인. 정확히 16384, candidate 2048/2049, sdpMLineIndex, 토큰·비밀번호·채팅 경계는 미검증(M1-05·07·14·15·17·18 생존) | TC-420 |
| AC5 | SEC-01·06 | TC-245 | 약 — 방 ID `short`와 `../..` 두 값만. 22자 정확·개행 뒤 붙임·참가자 ID 경계 미검증(M1-16 생존) | TC-420 |
| AC6 | POL-04 | TC-230~233 | 중 — 정상·거부 대표값은 있으나 NFC·정규화 후 경계 20·분해 한글 미검증(M1-09 생존) | TC-421 |
| AC7 | POL-07, SEC-07 | TC-234~237 | 약 — 제어문자 `\u0007`·`\u202E`만 확인. U+200B·U+2060·U+FEFF 등 범위 대부분과 이모지 코드포인트 길이 미검증(M1-10~13 생존) | TC-421b |
| AC8 | NFR-12 | (없음; 타입 검사만) | — | TC-421c |

### 4.2 보강 시험 실행 결과 (모두 이번 실행에서 직접 실행)
| ID | 시나리오 | 사전조건 | 실행 절차 | 예상 결과 | 실제 결과 | Pass/Fail | 비고 |
|----|----------|----------|-----------|-----------|-----------|-----------|------|
| TC-420 | 스키마 경계값(토큰 19/20/512/513, 비밀번호 3/4/32/33, SDP 16384/16385·`pranswer`, candidate 2048/2049, sdpMLineIndex -1/0/255/256/1.5/'1'/null, sdpMid 65자, 참가자 ID 7/8/24/25·공백·`../`·개행·한글, 방 ID 21/22/23·`\n`·공백·NUL·`=` 접미, 채팅 요청 0/2000/2001) | 없음 | `packages/shared/src/protocolBoundary.test.ts` | 안쪽 경계만 통과, 바깥 거부 | 모두 기대대로 | Pass | 정규식 끝 앵커 우회(`$` 뒤 개행)까지 확인 |
| TC-420b | 9개 클라이언트→서버 스키마 전부: `v` 없음/2/"1" 거부, `from`·`isHost` 추가 키 거부, null·undefined·문자열·숫자·배열·true 거부, 불리언 필드에 "true"/1/0 거부, 닉네임 원문 81자 거부 | 없음 | 위와 동일 | 모두 거부(정상 입력만 통과) | 기대대로 | Pass | 변이 M1-19·20·22·23 검출 |
| TC-421 | 닉네임: 분해 한글(NFD)→NFC, 연속 공백 축약, 정규화 후 20자(통과)/21자(거부), `a/b`·`a@b`·따옴표·`<`·탭·NUL·전각 영문·이모지·U+2028·U+200B·U+202E 거부, `-`·`.` 단독 허용 | 없음 | 위와 동일 | 규칙대로 | 기대대로 | Pass | `nicknameKey`가 NFD·NFC를 같은 키로 봄 |
| TC-421b | 채팅 정리: 23개 제어·제로폭·방향 문자(범위 양끝 포함) 제거, 탭 보존, CR/CRLF→LF, 앞뒤 공백 제거, 제어문자만이면 거부, 이모지 500(통과)/501(거부), 제어문자로 부풀린 원문(정리 후 500)은 통과, 원문 2001자 거부, `<b>&amp;</b>` 그대로 | 없음 | 위와 동일 | 규칙대로 | 기대대로 | Pass | 코드포인트 기준 길이 확인 |
| TC-421c | 계약 상수 고정: PROTOCOL_VERSION=1, LIMITS 10개 값, MAX_MESSAGE_BYTES=32768, ERROR_CODES 중복 없음·핵심 12코드 포함 | 없음 | 위와 동일 | api-spec과 일치 | 일치 | Pass | 상수가 바뀌면 문서·웹과 함께 갱신하라는 알림 역할 |

### 4.3 기존 시험 재실행
- `cd packages/shared && npx vitest run` → **Test Files 3 passed, Tests 21 passed**(기존 16 + 보강 5).
- 06 이전 기준선: Tests 16 passed(`schemas.test.ts` 8 + `text.test.ts` 8).
- 서버 쪽 소비 시험(`signaling.test.ts` 등)도 전체 `npm test`에서 통과(서버: 이번 실행 Tests 224 passed·1 expected fail·4 skipped, 단 `e2eGuard.test.ts`의 TC-497이 병렬 테스터의 문서 변경과 겹쳐 1회 실패했으나 단독 재실행 4 passed — unit-14 소유, 이 단위와 무관).

### 4.4 변이 시험 결과 (임시 복사본 `.harness-tmp/mut_06_unit01/`, 저장소 파일 수정 없음, 총 23개)
| ID | 변이 내용 | 기존 시험(06 이전) | 보강 후 |
|---|---|---|---|
| M1-01 | 버전 필드 검사 제거(아무 숫자 허용) | 검출 TC-241 | 검출 TC-420b |
| M1-02 | 입장 스키마 strict 해제(from 등 추가 키 허용) | 검출 TC-242 | 검출 TC-420b |
| M1-03 | 신호 스키마 strict 해제(발신자 from 허용) | 검출 TC-242 | 검출 TC-420b |
| M1-04 | description/candidate 정확히 하나 -> 둘 다 허용 | 검출 TC-243 | 검출 TC-243 |
| M1-05 | SDP 상한 경계 -1(정확히 16384자 거부) | **생존**(전체 시험에서도) | 검출 TC-420 |
| M1-06 | SDP 상한 사실상 제거 | 검출 TC-244 | 검출 TC-420 |
| M1-07 | 비밀번호 최소 길이 4->3 | **생존**(전체 시험에서도) | 검출 TC-420 |
| M1-08 | 비밀번호 최대 길이 32->33 | 다른 단위 시험만 검출 | 검출 TC-420 |
| M1-09 | 닉네임 NFC 정규화 제거 | **생존**(전체 시험에서도) | 검출 TC-421 |
| M1-10 | 채팅 제로폭 공백(U+200B) 제거 누락 | **생존**(전체 시험에서도) | 검출 TC-421b |
| M1-11 | 채팅 U+2060 제거 누락 | **생존**(전체 시험에서도) | 검출 TC-421b |
| M1-12 | 채팅 BOM(U+FEFF) 제거 누락 | **생존**(전체 시험에서도) | 검출 TC-421b |
| M1-13 | 길이 계산을 코드포인트->UTF-16 단위로 | **생존**(전체 시험에서도) | 검출 TC-421b |
| M1-14 | 토큰 최소 길이 20->1 | **생존**(전체 시험에서도) | 검출 TC-420 |
| M1-15 | 토큰 최대 길이 제한 제거 | **생존**(전체 시험에서도) | 검출 TC-420 |
| M1-16 | 참가자 ID 형식 느슨화 | **생존**(전체 시험에서도) | 검출 TC-420 |
| M1-17 | sdpMLineIndex 정수·범위 검사 느슨화 | **생존**(전체 시험에서도) | 검출 TC-420 |
| M1-18 | ICE candidate 길이 제한 제거 | **생존**(전체 시험에서도) | 검출 TC-420 |
| M1-19 | 채팅 스키마 strict·길이 제한 제거 | **생존**(전체 시험에서도) | 검출 TC-420 |
| M1-20 | 강퇴 스키마 느슨화 | **생존**(전체 시험에서도) | 검출 TC-420 |
| M1-21 | 소켓 메시지 크기 상한 32KB->32MB | 다른 단위 시험만 검출 | 검출 TC-421c |
| M1-22 | media:state 불리언 강제변환 허용 | **생존**(전체 시험에서도) | 검출 TC-420b |
| M1-23 | 방 생성 요청 strict 해제 | 다른 단위 시험만 검출 | 검출 TC-420b |

- 요약: 변이 23개 중 **기존 시험이 단독으로 검출 5개(22%)**, 다른 단위(서버) 시험이 추가로 3개, **15개는 전체 시험에서도 생존**. 보강 후 **23개 전부 검출(100%)**. 동등 변이 없음.

## 5. 커버리지
- 커버리지 지표: 라인/브랜치 커버리지는 도구 미설치로 **미측정**. 대체 지표: AC 8개 모두 TC 대응(100%), 변이 점수 기존 22%→보강 후 100%(23/23).
- 커버되지 않은 부분과 사유: ① `MetricsPathRequestSchema`는 unit-19 시험이 소유. ② `LIMITS.nicknameRawMax`(80)와 `chatMax*4` 원문 가드는 다음 이유로 관찰 가능한 차이를 만들지 못해 변이 대상에서 제외(정규화 후 길이 검사가 어차피 거부하므로 동작 동등; 성능 방어용). ③ 브라우저에서 스키마를 쓰는 방식(웹 단위).

## 6. 결함(Defect) 목록
| ID | 설명 | 재현 절차 | 심각도(Critical/High/Medium/Low) | 상태(Open/Fixed/Deferred) | 조치 내용 |
|----|------|-----------|-----------------------------------|----------------------------|-----------|
| DEF-001 | **시험 구멍**: 입력 한도·정규화 변이 15개(토큰 길이 경계, 참가자 ID 형식, sdpMLineIndex 범위, candidate 길이, SDP 정확히 16384, 비밀번호 3/4, 채팅 스키마·Kick 스키마 strict, NFC, 제로폭·BOM 제거, 코드포인트 길이, 불리언 강제변환)이 기존 시험 전체에서 검출되지 않음. 제품 코드는 모두 정상(보강 시험이 현재 코드에서 통과) | `.harness-tmp/mut_06_unit01`에서 `m01.json`의 M1-05·07·09~20·22를 적용하고 `npx vitest run`(기존 시험만) → 모두 통과 | Medium (SEC-06 입력 검증은 보안 규칙 항목이라 한도 회귀를 못 잡는 점이 문제) | Fixed | TC-420, TC-420b, TC-421, TC-421b, TC-421c 추가 → 전부 검출 |
- 제품 코드 결함: **없음**. 근거: TC-420~421c(경계 안·밖 쌍 단언 5개)와 기존 16개 시험이 모두 현재 코드에서 통과했고, 서버 통합 시험(TC-31, TC-43, TC-71)에서 같은 스키마가 실제 소켓으로 동작함을 확인했다.
- 관찰(결함 아님): ① M1-19(채팅 스키마 strict·길이 제한 제거)는 서버 통합 시험(signaling)에서도 생존했다 — 서버 핸들러가 `sanitizeChatText`로 다시 거르는 이중 방어 때문이며 보강 TC-420이 스키마 층을 직접 단언한다. ② `ERROR_CODES`와 서버 `MESSAGES`의 일치는 타입 검사(`Record<ErrorCode,…>`)가 보장한다 — 런타임 시험은 TC-421c가 목록 고정으로 보강.

## 7. 테스트 환경 정리(Teardown) 확인 — 규칙 K
- 이번 테스트에서 생성한 임시 아티팩트 목록 (경로 포함): `.harness-tmp/mut_06_unit01/`(변이 시험용 저장소 복사본 — 소스·시험 복사 + 루트 `node_modules` 심볼릭 링크 모음. 변이는 이 복사본에서만 적용하고 변이마다 원본 파일로 복구)와 변이 목록·결과 JSON·실행 스크립트(세션 scratchpad, 저장소 밖)
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
- 이번 테스트로 커버되지 않는 알려진 리스크: 브라우저 간 `String.prototype.normalize` 구현 차이(Chrome/Safari/Firefox)는 Node 기준으로만 확인(웹 단위·UAT 소관). 라인 커버리지 수치 미확인.
- 후속 조치가 필요한 항목: 없음(제품 변경 불필요). 스키마·한도 값을 바꿀 때 TC-421c(상수 고정)가 실패하므로 api-spec·웹 안내 문구와 같은 커밋에서 갱신해야 한다.

## 9. 결론 및 판정
- [x] PASS — 다음 단계 진행 가능 (7절 Teardown 확인 완료가 전제조건)
- [ ] CONDITIONAL PASS — 조건:
- [ ] FAIL — 사유 및 재작업 요청 사항:

## 10. 내부 검증 (최소 2회, `verification-log-template.md` 사용)
- 1차 검증 결과 요약: AC 8개 ↔ TC 1:1 확인, 기존 시험 단언 강도 평가(5개 AC가 약함), 변이 15개 생존 확인, 내 시험의 작성 오류 1건(닉네임 경계 단언 식이 모호) 수정.
- 2차 검증 결과 요약: "통과했다고 07로 넘겨도 되는가" 관점으로 경계 재검토 — 정규식 앵커 우회, 서버 핸들러 이중 방어에 가려진 변이, 시험이 공허하지 않은지(변이 23/23 검출) 재확인. 추가 결함 없음.
- 검증 로그 파일 경로: `docs/harness/verify-log_unit-01-test.md`
