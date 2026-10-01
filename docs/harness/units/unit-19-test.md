# 테스트 결과서: unit-19 TURN 릴레이 비율 계측 (NFR-15)

> 누가/언제/무엇: 07단계·오케스트레이터가 unit-19(경로 계측) 6단계 판정을 인수할 때, 무엇을 실제 실행했고 무엇이 미검증인지 확인하는 문서. 버전 v1, 2026-10-01.

## 1. 개요
- 테스트 대상: unit-19 — 웹 `media/pathType.ts`·`MeshTransport.probePath`·`MeetingController`(metrics:path 전송), 서버 `socket/server.ts`의 `metrics:path` 핸들러와 `peer path` 로그, 공유 `MetricsPathRequestSchema` (코드 커밋 `c2cc28c`)
- 테스트 유형: 단위 (+ 인수 조건 검증용 E2E 회귀, 변이 시험)
- 적용 Tier: Standard (규칙 B 최소 2회)
- 적용 속도 트랙: L3 (보안 인수는 L4 수준으로 시험)
- 병렬 실행 정보: 병렬 웨이브에서 실행(동시에 돌던 축: 서버 01~05, 웹 06~12, 인프라·E2E 13~14 소급 테스터)
- 테스트 목적: 경로 판정의 오보 방지, `metrics:path` 서버 처리의 적대 입력 내성, 로그 비식별(DEC-012·022), 기존 통화 흐름 회귀 없음 확인
- 관련 산출물: `docs/harness/units/unit-19-note.md`, `docs/harness/03-system-design.md`(§3·§4.2 EVT-33·§4.3·§5.4·§7.1), `docs/harness/decisions.md`(DEC-012·022), `docs/05-qa/measurement-guide.md`, `CLAUDE.md` 보안 규칙
- 테스트 수행자: 06-unit-tester (Claude Sonnet 5.5)
- 테스트 일시: 2026-10-01

## 2. 테스트 범위 및 제외 범위
- 범위: note의 6단계 인수 조건 1~6, 판정 함수 경계, 서버 이벤트 적대 입력·인증 상태·빈도 제한·소켓당 로그 상한, 실제 로그 캡처 전수 검사(debug 수준), MeshTransport 보고 규칙(연결당 1회·재시도·정리), 구 서버 호환(클라이언트 측), 변이 시험(47종)
- 제외 및 사유(모두 **미검증**): 실제 NAT/CGNAT 환경의 direct/relay 비율, Safari·Firefox의 getStats 형식(`selectedCandidatePairId` 지원 차이; 환경에 없음), 실제 구 서버 바이너리와의 E2E(핸들러 없는 서버를 만들어 돌리지 않음 — 클라이언트 요청이 ack 없이 끝나는 것은 TC-419f로 시험), 03 §7.1의 KPI-01·04 로그(unit-19 범위 밖, 미구현), 로그 집계 runbook(note상 미작성), 라인 커버리지 수치(도구 없음)

## 3. 테스트 환경
- 실행 환경: Linux 6.18, Node 22, vitest 5.0.3, Playwright(Chromium fake media), coturn(IT-46 통과 → 사용 가능 확인)
- 테스트 데이터: 시험별 임시 서버(무작위 포트, `PORT=0`/`freePort`), 가상 시계 주입(`startServer(config, logger, now)`)으로 빈도 제한 보충·로그 상한을 실제 대기 없이 시험, pino 출력 스트림 캡처
- 전제 조건: `apps/web/dist`는 `c2cc28c` 기준 기존 빌드를 공유(`metrics:path` 문자열이 번들에 있음을 grep으로 확인). `npm run build`·`npm run test:e2e`는 실행하지 않았고 E2E는 `npx playwright test <파일> --workers=1`만 사용
- 변이 시험 환경: `.harness-tmp/mut_06_unit19/`(저장소 복사본, 완료 후 삭제). 컨트롤러·전송 변이는 임시 복사본에서 `vite build --outDir`(scratchpad)로 따로 빌드해 E2E 실행(공유 dist 미사용·미수정). 저장소의 제품 코드(`apps/*/src`, `packages/*/src`)는 수정하지 않음

## 4. 테스트 케이스 및 결과

### 4.1 정적 게이트(5단계 게이트 확인)
| 항목 | 실제 결과 | 판정 |
|---|---|---|
| note 게이트 1·2 기재 여부 | 게이트 1(lint·typecheck·test·e2e·check:docs)·게이트 2 체크리스트가 note에 있음 | PASS |
| `npm run lint` (재실행) | 6단계 시험 추가 직후 `no-unused-vars` 1건(내 시험의 미사용 import) → 수정 후 내 파일 4개 eslint 통과. 전체 `npm run lint`는 수정 후 재실행하지 않고 해당 파일만 재검 | PASS(내 파일) |
| `npm run typecheck` | web·shared 통과. server는 **타 테스터가 추가 중인 `test/unit02Adversarial.test.ts(129)` 1건 오류**(내 파일 아님; `tsc` 출력에서 내 파일 오류 0건 확인) | 이 단위 PASS / 전체는 타 단위 소유 오류 |
| `npm test` | shared 21, server 220 passed·1 expected fail·4 skipped, web 151 passed (타 테스터 추가분 포함 합계) | PASS |
| `npm run check:docs` | 통과(TC/IT 470개, 미연결 요구 0건) | PASS |

### 4.2 인수 조건 ↔ 케이스 추적(1:1)
| AC | 내용 | 케이스 | 판정 |
|---|---|---|---|
| 1 | 루프백 2인 통화 후 `peer path` 정확히 2줄, 각 `direct`, 식별 키 없음 | IT-45(재실행), TC-403, TC-415 | PASS |
| 2 | TURN 강제에서 2줄 모두 relay | IT-46(재실행; coturn 사용) | PASS |
| 3 | 추가 키·v:2·대소문자·비객체 → INVALID_PAYLOAD, 로그 없음 | TC-404, TC-410, TC-411, TC-302·304(shared) | PASS |
| 4 | 입장 전 NOT_JOINED, 10회 초과 RATE_LIMITED | TC-405, TC-406, TC-412, TC-414 | PASS |
| 5 | 구 서버에서도 통화 영향 없음(응답 비대기) | TC-419f(ack 없음 → NETWORK로 종료·예외 없음), 코드 리뷰(`void request`), IT-01·03·20·24 회귀 | PASS(클라이언트 측만; 실제 구 서버 미검증) |
| 6 | 사용자 화면에 변화·알림 없음 | IT-47(`getByRole('alert')` 0건), 코드 리뷰(`pathType` 콜백은 state를 바꾸지 않음) | PASS |

### 4.3 케이스 결과
| ID | 시나리오 | 예상 결과 | 실제 결과 | Pass/Fail |
|---|---|---|---|---|
| TC-400~402 (기존) | 판정 경계 기본 | 5단계 시험 | 재실행 통과 | PASS |
| TC-403~406 (기존) | 서버 정상/거부/미입장/빈도 | 5단계 시험 | 재실행 통과 | PASS |
| TC-416 | local×remote 4×4 조합표(한쪽만 relay), 미상 혼합 | relay 우선, relay 없이 미상이면 null | 16조합 + 미상 조합 일치 | PASS |
| TC-417 | `RELAY`·`Host`·`" host"`·`constructor`·`__proto__`·undefined·null·0·{}·[] 후보 타입 | 모두 null(오보 금지) | 일치 | PASS |
| TC-418 | selected 우선, 없는 id 폴백, selected가 후보를 가리킴, 비문자열 selected, nominated/state 미충족 | 규칙대로 | 일치(첫 nominated+succeeded 쌍 선택 포함) | PASS |
| TC-419 | Map.values·Set, 잡다한 항목, id 충돌, 20만 건 통계 | 예외 없음, 1초 이내 | direct 판정, 1초 미만 | PASS |
| TC-419b | connected/completed 반복·ICE restart | 같은 경로 1회, 변경 시 1회 더 | `[direct]` → `[direct, relay]` | PASS |
| TC-419c | 통계가 비어 있는 경우 | 총 3회 시도 후 포기, 타이머 0; 재시도 중 성공 시 1회 보고 | 일치 | PASS |
| TC-419d | getStats 동기 throw·reject·미지원·형식 이상 | 보고 없음, 예외·unhandledRejection 없음, 미지원이면 타이머 0 | 일치 | PASS |
| TC-419e | removePeer·close, 진행 중 중복 호출, 같은 id 새 피어 | 타이머 0, 늦은 통계 무시, getStats 1회 | 일치 | PASS |
| TC-419f | ack 없는 서버(구 서버) | 3000ms 뒤 NETWORK 결과, 예외 없음, 페이로드 `{v,path}` | 일치 | PASS |
| TC-410 | `__proto__`·candidate·sdp·peerId·ip 추가 키, path 123/true/{}/null/undefined/공백/키릴 유사 문자/NUL, `v:'1'`·1.5·0, 배열·문자열·숫자·undefined, 인자 없음, ack 없음 | 전부 INVALID_PAYLOAD, `peer path` 0줄, 서버 생존 | 26종 일치, 이후 정상 보고·/healthz 200 | PASS |
| TC-411 | 20KB 문자열 / 100KB·1MB 메시지 | 20KB는 INVALID_PAYLOAD, 초과는 연결 종료, 로그에 흔적 없음, 다른 소켓 정상 | 일치 | PASS |
| TC-412 | 입장 전·같은 소켓 입장 후·퇴장 후·강퇴 후·다른 방·resume 소켓 | 전·후 상태에 맞게 NOT_JOINED/기록, 방 ID 없음 | 일치 | PASS |
| TC-413 | 소켓당 상한 | 20줄째까지 기록, 21번째는 ack ok·미기록, 다른 소켓 독립 | 일치(19→20→21 경계) | PASS |
| TC-414 | 빈도 경계 | 정확히 10건 성공·11번째 RATE_LIMITED, 보충 후 1건 성공, 15회 거부 누적 시 연결 종료, 타 소켓 영향 없음 | 일치 | PASS |
| TC-415 | debug 로그 전수(방 ID·IP·닉네임·참가자 ID·소켓 ID·토큰·SDP·후보 주소·주입 문자열·비밀번호) | 어느 줄에도 없음, `peer path` 줄 키는 level/time/pid/hostname/msg/kpi/path만 | 일치 | PASS |
| IT-45(재) | 루프백 2인 | direct 2줄 | 통과(4.3s) | PASS |
| IT-46(재) | TURN 강제 | relay 2줄 | 통과(5.1s) | PASS |
| IT-47 | 3인 mesh | direct 정확히 6줄(연결 끝 6개), 식별자 없음, 화면 alert 0 | 통과(9.1s) | PASS |
| IT-01·02·03·04~09 (meeting.spec) | 입장·재연결 등 회귀 | 통과 | 9건 통과 | PASS |
| IT-20 (mesh6) | 6인 | 통과 | 통과(연결 완료 5초) | PASS |
| IT-23~28 (ux.spec) | 입장 3회 이내·첫 영상 시간 등 | 통과 | 6건 통과, 첫 원격 영상 419·438·452·461·463ms(IT-24) | PASS |
| IT-21·22 (turn) | TURN 회귀 | 통과 | 통과 | PASS |

### 4.4 변이 시험(임시 복사본에서만, 47종)
"5단계 시험"=기존 TC-400~406+TC-302·304, "6단계 추가"=이번에 추가한 TC-410~419f.
| ID | 변이 | 결과 |
|---|---|---|
| M01 | strictObject→object(추가 키 제거 후 통과) | 사멸(5단계) |
| M02 | strictObject→looseObject | 사멸(5단계) |
| M03 | path enum→string | 사멸(5단계) |
| M04 | v 검사 완화 | 사멸(5단계) |
| M05 | 빈도 제한 제거 | 사멸(5단계) |
| M06 | 버킷 용량 10→11 | 사멸(**6단계 추가**; 5단계는 허용 범위 10~11이라 못 잡음) |
| M07 | 용량 10→9 | 사멸(5단계) |
| M08 | 보충 0.5→5/s | 사멸(**6단계 추가**) |
| M09~M13 | 로그에 pid / ip / 방 짧은 ID / 소켓 ID / 원본 페이로드 추가 | 5건 모두 사멸(5단계) |
| M14 | metrics:path 입장 검사 제거 | 사멸(5단계) |
| M15~M17 | 소켓당 상한 제거 / 21 / 19 | 3건 사멸(**6단계 추가**; 5단계는 상한 시험이 없었음) |
| M18 | 상한 카운터를 소켓 간 공유(모듈 전역) | 사멸(**6단계 추가**, TC-413) |
| M19 | 로그 수준 info→debug | 사멸(5단계) |
| M20 | 상한 초과 시 ack 오류 | 사멸(**6단계 추가**) |
| M21·M22 | 로그 msg·kpi 키 변경 | 사멸(5단계) |
| M23 | 핸들러 예외 | 사멸(5단계; INTERNAL ack, 서버 생존) |
| W01~W03 | relay/direct 판정 반전, direct를 relay로, 한쪽만 relay를 direct로 | 사멸(5단계) |
| W04 | 후보 타입 대소문자 무시 | 사멸(**6단계 추가**) |
| W05~W07 | nominated 무시 / state 무시 / selected 무시 | 사멸(5단계) |
| W08~W10 | 알 수 없는 타입도 direct / 누락 후보 허용 / prflx 미인식 | 사멸(5단계) |
| W11 | lastPath 비교 제거(중복 보고) | 단위 사멸(**6단계 추가**). E2E(IT-45·47)는 **생존** — 루프백에서는 connected 반복이 없어 E2E로는 못 잡고, TC-419b가 잡음 |
| W12·W13 | 재시도 제거 / 무제한 | 사멸(**6단계 추가**) |
| W14 | removePeer 타이머 정리 제거 | 사멸(**6단계 추가**) |
| W15 | 폐기된 피어 가드 제거 | 사멸(**6단계 추가**) |
| W16 | pathProbing 가드 제거 | 사멸(**6단계 추가**) |
| W17 | getStats 미지원 가드 제거 | 처음 **생존**(try/catch가 삼켜 관측 차이 없음 → 재시도 타이머가 남는 차이를 단언하도록 TC-419d 보강) → 사멸(**6단계 추가**) |
| W18 | probePath try/catch 제거 | 사멸(**6단계 추가**) |
| W19 | pathProbing 해제 누락 | 사멸(**6단계 추가**) |
| W20 | connected 시 probe 호출 제거 | 사멸(6단계 추가 + IT-45·47 E2E) |
| W21 | 컨트롤러가 peerId를 함께 전송 | 사멸(E2E IT-45·47; 서버 strict가 거부) |
| W22 | 컨트롤러 보고 대신 throw(보고 실패 전파 가정) | 사멸(E2E) |
| W23 | 컨트롤러 경로 반전 | 사멸(E2E) |
| W24 | 컨트롤러 보고 제거 | 사멸(E2E) |
- 집계: 유효 변이 47종 중 기존 5단계 시험만으로는 **25종 사멸·22종 생존**(18종은 6단계 추가 단위 시험이, 4종(W21~W24)은 E2E가 해소). 6단계 추가 후 **생존 0종**(W11은 E2E 단독으로는 생존이나 단위에서 사멸). 컨트롤러 변이(W21~W24)는 단위 시험이 아니라 E2E만이 잡는다(이 단위에 컨트롤러 단위 시험 없음 → 8절).
- 무효였던 초기 변이: M18 첫 구현이 `let` 삭제로 ReferenceError를 유발해 자명하게 죽는 무효 변이였음 → 모듈 전역 카운터로 재작성해 재시험.

## 5. 커버리지
- 지표: 라인/브랜치 커버리지 도구 미사용(측정 안 함). 인수 조건 6/6 추적, 변이 사멸 47/47(위 조건 포함).
- 미커버: 실제 NAT 환경, Safari/Firefox 통계 형식, 실제 구 서버 E2E, KPI-01·04 로그(범위 밖), `getStats`가 Map이 아닌 형식(예: `forEach` 없음)을 주는 브라우저는 try/catch로 미보고 처리됨(코드 리뷰만).

## 6. 결함(Defect) 목록
| ID | 설명 | 재현 절차 | 심각도 | 상태 | 조치 내용 |
|----|------|-----------|--------|------|-----------|
| DEF-001 | `MeshTransport.probePath`가 재시도 대기 중(1초 안)에 ICE `connected`가 다시 오면(disconnected→connected) 새 `setTimeout`이 `peer.pathTimer` 참조를 덮어써 앞선 타이머가 **removePeer로 지워지지 않는다**. 그 타이머는 최대 1초 뒤 한 번 더 실행돼 닫힌 pc에 getStats를 호출하지만 `peers.get(id) !== peer` 가드와 try/catch로 보고·예외 없이 끝난다. 재시도는 `attempt<2`로 한정돼 누적·누수는 없음(자원 영향 사실상 없음) | 임시 복사본에서 가짜 pc로 재현: `next=[]` 상태로 `setIce('connected')`→`setIce('disconnected')`→`setIce('connected')`(1초 안)→`timers=2`→`removePeer`→`timers=1`(고아)→5초 뒤 0. 재현 코드는 저장소에 넣지 않음(실패하는 시험을 남기지 않기 위함) | Low | Open(제품 코드 수정은 06단계 권한 밖) | 수정 제안: `probePath` 시작 시 `clearTimeout(peer.pathTimer)`. 07 진행 비차단 |
- 시험 설계 결함(결과서 자체): 6단계 시험 초안의 기대값 오류 3건(거부된 요청도 버킷 토큰을 소비해 용량 10을 넘는 거부 시험이 RATE_LIMITED로 끊김, 21번째 보고 직전 보충 누락, 강퇴 단계 서술 혼선)을 실행으로 발견해 시험을 고쳤다(제품 결함 아님).
- 관찰(결함 아님, 설계대로): 스키마·입장 검증에 실패한 `metrics:path`도 빈도 버킷 토큰과 strike를 소비한다(공통 `on()`). 조작된 클라이언트가 잘못된 값을 연속 전송하면 15회 거부로 연결이 끊긴다(POL-10).

## 7. 테스트 환경 정리(Teardown) — 규칙 K
- 생성한 임시 아티팩트: `.harness-tmp/mut_06_unit19/`(저장소 복사본, `node_modules` 심볼릭 링크 포함, 임시 e2e·playwright 설정·test-results), scratchpad `mutdist`(변이 빌드), scratchpad `mut.py`·원본 백업 파일(저장소 밖)
- 전부 `.harness-tmp/` 하위(또는 세션 scratchpad)에서만 생성했는가: [x] 예
- 정리 완료: `.harness-tmp/mut_06_unit19/` 삭제, scratchpad `mutdist*` 삭제. 확인: `ls .harness-tmp`에 `mut_06_unit19` 없음. 이 단위가 띄운 서버·브라우저 프로세스는 각 시험 종료 시 `server.close()`/Playwright 종료로 정리됨(`ps`에서 내 프로세스 없음; 보이는 vitest/playwright 프로세스는 타 테스터 소유)
- 정리 후 `git status --short` 원문:
```
 M docs/05-qa/test-cases.md                        (이 단위 행 TC-410~419f·IT-47 추가 + 타 테스터 행 동시 수정 가능)
 M docs/traceability.md                            (check-docs --gen 재생성; 타 테스터 변경분과 합쳐짐)
?? apps/server/test/e2eGuard.test.ts               (타 테스터 소유)
?? apps/server/test/infraGuard.test.ts             (타 테스터 소유)
?? apps/server/test/metricsPathAdversarial.test.ts (이 단위)
?? apps/server/test/unit02Adversarial.test.ts      (타 테스터)
?? apps/server/test/unit03Adversarial.test.ts      (타 테스터)
?? apps/server/test/unit04Adversarial.test.ts      (타 테스터)
?? apps/server/test/unit05Adversarial.test.ts      (타 테스터)
?? apps/web/src/components/chatPanel.test.ts       (타 테스터)
?? apps/web/src/components/participantsPanel.test.ts (타 테스터)
?? apps/web/src/components/roomUi.test.ts          (타 테스터)
?? apps/web/src/components/stateScreen.test.ts     (타 테스터)
?? apps/web/src/components/videoTileSpeaking.test.ts (타 테스터)
?? apps/web/src/lib/audioLevel.test.ts             (타 테스터)
?? apps/web/src/lib/localMedia.test.ts             (타 테스터)
?? apps/web/src/lib/signalingPathCompat.test.ts    (이 단위)
?? apps/web/src/lib/storageApi.test.ts             (타 테스터)
?? apps/web/src/media/meshTransport.fake.test.ts   (타 테스터)
?? apps/web/src/media/pathMetricsAdversarial.test.ts (이 단위)
?? apps/web/src/pages/landing.test.ts              (타 테스터)
?? apps/web/src/state/meetingController.test.ts    (타 테스터)
?? e2e/pathMetrics-extra.spec.ts                   (이 단위)
?? e2e/webRetro.spec.ts                            (타 테스터)
?? packages/shared/src/protocolBoundary.test.ts    (타 테스터)
```
  (위 목록은 정리 직후 실행한 `git status --short` 출력에 소유 주석만 덧붙인 것이다. 제품 코드 `apps/*/src`·`packages/*/src` 수정 0건.)
- 병렬 실행 판정: 이 단위가 남긴 미추적 파일은 위 "이 단위" 표기 4개(의도한 시험 산출물)뿐이며 임시 아티팩트·잔여물은 없다. 웨이브 종료 후 전체 트리 점검은 오케스트레이터 몫.
- 강제 중단: 없음.

## 8. 리스크 및 잔존 이슈
- 미검증 리스크: 실제 NAT/CGNAT 비율, Safari/Firefox 통계 형식(미지원 시 미보고라 비율이 과소 집계될 수 있음), 실제 구 서버 E2E.
- 컨트롤러 단위 시험 부재: `MeetingController`의 `metrics:path` 페이로드 형태(peerId 미포함)는 E2E(IT-45·47)와 서버 strict 스키마가 간접으로만 보장한다(변이 W21~W24는 E2E로만 사멸). 타 테스터가 `meetingController.test.ts`를 추가 중이므로 거기서 흡수 가능한지 확인 권장(이 단위에서는 미확인).
- W11(중복 보고)은 E2E로는 못 잡는다(루프백에 재연결이 없음). 단위(TC-419b)가 방어선.
- 후속 조치: (1) DEF-001 Low 수정 여부 결정(권장 1줄), (2) 03 §7.1 KPI-01·04 로그 별도 단위 결정(note 요청 유지), (3) `docs/traceability.md`(프로젝트)는 `--gen`으로 재생성됨.

## 9. 결론 및 판정
- [ ] PASS
- [x] CONDITIONAL PASS — 조건: DEF-001(Low, 영향 거의 없음)의 처리 방침(수정/보류) 결정. 07 진행은 막지 않는다. 다른 모든 인수 조건·보안 시험·변이 시험은 통과(생존 변이 0).
- [ ] FAIL

## 10. 내부 검증
- 1차 검증 결과 요약: 시험 자체의 오류 4건(빈도 버킷 소비 누락 2건, 미사용 import 린트 1건, 변이 M18 무효, 변이 W17 생존→시험 보강) 발견·수정. 인수 조건 6/6 추적 확인.
- 2차 검증 결과 요약: 신규 시험 3회 연속 안정, E2E 회귀 통과, 변이 47종 재집계(생존 0), 독립 관점에서 DEF-001 발견·기록, 컨트롤러 단위 시험 부재를 리스크로 명시.
- 검증 로그 파일 경로: `docs/harness/verify-log_unit-19-test.md`

## 공유 문서 갱신 요청 (traceability.md·decisions.md는 직접 수정하지 않음)
- traceability.md NFR-15 / KPI-05: 단위테스트 컬럼에 `TC-410~415, TC-416~419, TC-419b~f` 추가, 통합 `IT-47` 추가, 비고에 "6단계: 변이 47종 생존 0, DEF-001 Low(타이머 참조 덮어쓰기)".
- decisions.md: 기록 요청 없음.
