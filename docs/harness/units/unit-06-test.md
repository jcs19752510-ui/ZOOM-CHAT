# 테스트 결과서 — unit-06 (웹 시그널링·세션: lib/{signaling,api,storage,useRoute}.ts, state/*, pages/RoomPage.tsx, App.tsx, main.tsx) — 소급 6단계

## 1. 개요
- 테스트 대상: 작업 단위 unit-06. 5단계 노트(`unit-06-note.md`)가 없는 소급 단위라 인수 조건은 `03-system-design.md`(unit-06 행: FR-01~03, FR-19~22, NFR-03), PRD 인수 조건, CLAUDE.md 보안 규칙(SEC-03·06)에서 도출했다.
- 테스트 유형: 단위(웹 소급 검증: 컨트롤러·훅·페이지 로직 시험 + 변이 시험 4라운드)
- 적용 Tier: Standard (DEC-002, 규칙 B 2회 이상) / 속도 트랙: L3 / 병렬 웨이브(소급 단위 묶음), 06·07 병합 미적용
- 이어받기: 이전 시도가 사용량 한도로 중단되어 시험 파일(`useRoute.hook`, `apiStorage.gap`, `meetingSession.gap`, `roomPage.hook`, `appRoutes`, `meetingController` 등)과 변이 도구가 남아 있었다. 남은 파일을 재실행·재검증하고 변이 시험으로 빈틈을 더 채웠다. unit-07/09/10 소유 파일은 건드리지 않았다.
- 테스트 수행자: 06-unit-tester (Claude Sonnet 5.5), 일시 2026-10-02
- 관련 산출물: `docs/05-qa/test-cases.md`(TC-454·467~469·500~524), `docs/harness/verify-log_unit-06-test.md`

## 2. 테스트 범위 및 제외 범위
- 범위: ① `SignalingClient`(옵션·연결 시간 초과·요청 시간 초과→NETWORK·정리) ② `api.ts`(요청 모양·오류 코드 매핑·네트워크 예외) ③ `storage.ts`(키 분리·저장소 차단 시 무동작) ④ `useRoute`·`parseRoomPath`(popstate·push/replace·경로 파서 경계)·`App` 라우팅 ⑤ `MeetingController`(입장 요청 모양, 이벤트 처리, 끊김·resume·복귀 프로브, 토큰 비노출, 신호 중계, 종료·정리, 화면공유·채팅·알림) ⑥ `foreground` 판정 함수·`useForeground` 훅 ⑦ `RoomPage`(방 상태별 화면, 입장 결과 코드 처리, 종료 사유 화면, 호스트 대기 폴링, 재시도, 언마운트 정리)
- 제외: 실제 브라우저·DOM·소켓(훅 실행기·가짜 소켓이라 한계 있음), `e2e/webRetro.spec.ts`와 기존 E2E 재실행(이번 지시상 금지 — 미검증, 아래 8절), 서버 측 동작(unit-01~05 소유), `main.tsx`의 실제 마운트(변이 M1은 시험이 잡지만 DOM 마운트 자체는 E2E로만 확인됨). 제품 코드는 수정하지 않았다.

## 3. 테스트 환경
- Linux, Node 22, Vitest 5.0.3, 웹 단위는 `npx vitest run --root apps/web <파일>`. 훅은 `apps/web/src/testing/hookHarness.ts`(deps 따르는 실행기) 또는 파일 안 가짜 훅으로 구동. 소켓·전송 계층은 가짜(`vi.mock`).
- 전제(5단계 게이트 소급 확인): `npm run lint` 0건. `npm run typecheck`는 웹에서 **이 단위와 무관한** 1건(`src/media/unit07Transport.test.ts(114,36)` TS2322, unit-07 소유 테스터 파일)만 실패 — 내 파일 오류 0건.
- 변이 시험용 도구는 `.harness-tmp/mut_06_unit06/`(변이 정의 JSON과 실행 스크립트)에만 두었고 종료 후 삭제했다.

## 4. 테스트 케이스 및 결과

### 4.1 인수 조건(소급 도출) ↔ 케이스 추적
| AC | 인수 조건(출처) | 케이스 |
|---|---|---|
| AC-1 | 소켓은 WebSocket 전용·무한 재연결·백오프, 요청은 시간 초과 시 NETWORK, 정리 시 리스너 제거(FR-20) | TC-468s·468t·468u·468v(signaling.test), TC-419f, 변이 S1~S9 |
| AC-2 | REST 호출: 방 생성 요청 모양·방 상태 조회 인코딩·오류 코드 매핑·네트워크 예외(FR-01, FR-06, SEC-07) | TC-467·467b·467c·467d, 변이 A1~A8 |
| AC-3 | 닉네임은 로컬에, 호스트 클레임은 탭 sessionStorage에만(URL 비노출), 저장소 차단 시에도 동작(FR-03, SEC-03) | TC-454·454b·469, 변이 T1~T5·G36 |
| AC-4 | 라우팅: `/r/<22자>`만 방, 법률 3종, 그 외 랜딩. popstate·push/replace(FR-03) | TC-508·508b·508c·509·509b~e·511·511b, 변이 U1~U6·AP1~AP3 |
| AC-5 | 입장: 요청에 비밀번호·호스트 클레임은 있을 때만, 토큰은 resume 외 어떤 요청에도 안 실림(FR-01, SEC-03, SEC-06) | TC-468·500·501 |
| AC-6 | 참가자·호스트·잠금·채팅·알림 상태 갱신, 중복 방지, 자기 메시지 판별(FR-08~11, FR-14~16) | TC-468f·468g·468h·468o·468p·468r·522 |
| AC-7 | 끊김→재연결→토큰 resume, 사라진 방·만료는 종료 사유별 처리, 일시 오류는 재시도(FR-20, FR-21) | TC-468k·468l·468m·505·505b·518·518b·519, DEF-06-01 |
| AC-8 | 화면 복귀(UX-14): 프로브·미디어 정합·ICE 재시작·중복 신호 제거·언마운트 해제 | TC-361d·364(foreground 판정), TC-502~502g, TC-503, TC-523~523c |
| AC-9 | 신호·경로 계측 중계는 서버 부여 값·식별자 없는 형태만(FR-07, NFR-15, SEC-06) | TC-504·504b·504c |
| AC-10 | 종료·정리: 타이머·소켓·트랙·구독 해제, dispose 멱등(FR-22, NFR-03) | TC-506·521, TC-468w |
| AC-11 | 로컬 미디어 조작: 마이크·카메라·장치 전환·화면공유(FR-04, FR-12, POL-12) | TC-468q·468x·468y·507·507b·520·521 |
| AC-12 | RoomPage: 방 상태별 화면(오류·없음·대기·잠김·가득·대기실), 호스트 클레임 예외, 입장 거부 코드별 처리, 종료 사유 화면, 재시도, 호스트 대기 폴링, 언마운트 정리(FR-06, FR-23, FR-16, FR-22, UX-02) | TC-514~514e·515·515b·516~516c·517~517d·524·524b |

### 4.2 실행 결과
| 구분 | 내용 | 결과 |
|---|---|---|
| 단위(이 단위 13개 파일) | `npx vitest run --root apps/web <13개 파일>` | 13 파일, **93 통과 + 1 expected fail(it.fails, DEF-06-01 재현) = 94** |
| 웹 전체 | `npx vitest run --root apps/web` | 47 파일, 339 통과 + 2 expected fail(다른 단위 1건 포함), 실패 0 |
| lint | `npm run lint` | 0건 |
| typecheck | `npm run typecheck`(웹) | 이 단위 오류 0, unit-07 소유 `unit07Transport.test.ts` 1건만 실패(타 테스터) |
| check-docs | `node scripts/check-docs.mjs --gen` 후 | 점검 통과(TC 659개, 테스트 미연결 요구 0건) |
| E2E | 이번 지시상 실행 금지 | **미검증**(DEC-023 ⑤에서 오케스트레이터가 E2E 83 통과 보고했으나 이 호출에서는 재실행하지 않음) |

### 4.3 이번 호출에서 추가한 시험(생존 변이 대응, 모두 변이 시험으로 판별력 확인)
| TC | 파일 | 막는 결함 |
|---|---|---|
| TC-502g | state/meetingSession.gap.test.ts | 확인 중 회의가 끝났는데 늦은 프로브 결과로 미디어 정합(reconcile)·토스트가 실행됨(C17) |
| TC-519 | 같음 | 복귀로 먼저 live가 된 뒤에도 남은 재연결 타이머가 소켓을 다시 연결·계속 돌아감(C37) |
| TC-520 | 같음 | 내가 공유 중일 때 "다른 사람이 공유 중"으로 오판(G21) |
| TC-521 | 같음 | 공유 중 회의 종료 시 화면 공유 트랙이 안 멈춤(G23) |
| TC-522 | 같음 | 읽음 처리가 다 읽은 상태에서도 구독자 알림→불필요 재렌더(G24) |
| TC-523·523b·523c | state/useForeground.hook.test.ts(신규) | `useForeground` 훅은 시험이 전혀 없었음: visible 판별·500ms 중복 제거·pageshow·해제(G25~G27) |
| TC-524·524b | pages/roomPageRetry.test.ts(신규) | 기존 RoomPage 시험의 가짜 훅은 의존성 배열을 무시해 "다시 시도"가 방 상태를 다시 묻는지·확인 중 화면으로 돌아가는지·호스트 대기 폴링이 재조회를 일으키는지 못 봄(N17·N18) |

### 4.4 변이 시험 요약(상세 4절 verify-log)
- 라운드 1~3(이전 시도, 100종: signaling 9·api 8·storage 5·useRoute 6·App 3·main 1·MeetingController 44·RoomPage 24 등) + 라운드 4(이번, 55종: RoomPage 20·MeetingController 24·foreground 계열 5·signaling/api/storage 6)를 **최종 시험 파일 전체에 대해 재실행: 155종 중 153종 검출, 2종 생존(둘 다 등가 변이)**. 제품 파일은 변이마다 원복했고 `git diff -- apps/web/src ':!*.test.ts'` 출력 없음.
- 생존 2종(등가 판정): AP3(`App.tsx`에서 방 경로와 법률 경로 판정 순서 교체 — 두 경로 형식이 서로소라 관측 불가), C33(`connectNow`에서 `!sock.connected` 가드 제거 — 판정 함수가 소켓이 끊겼을 때만 `connectNow`를 돌려주고 같은 동기 구간이라 관측 불가).
- 라운드 4 첫 실행에서 생존했던 8종(N17·N18·G21·G23·G24·G25·G26·G27)과 이전 라운드 생존 2종(C17·C37)은 위 4.3의 시험을 추가해 모두 검출됨을 변이로 확인.

## 5. 커버리지
- 지표: 기능 기준(AC-1~12 전부 케이스와 연결). 라인 커버리지 도구 실행은 하지 않았다(**미검증**). 변이 검출률 153/155(98.7%), 생존은 등가 2종.
- 커버되지 않은 부분: 실제 소켓·WebRTC·DOM 포커스(E2E 영역), `main.tsx` 마운트, 실서버 재시작·실제 모바일 백그라운드 복귀(UX-14 실기기), 훅 실행기가 재현 못 하는 React 배치·StrictMode 일부.

## 6. 결함(Defect) 목록
| ID | 설명 | 재현 절차 | 심각도 | 상태 | 조치 내용 |
|----|------|-----------|--------|------|-----------|
| DEF-06-01 | 재연결 `room:resume`이 일시 오류(NETWORK=8초 응답 없음 등)로 끝나면 코드 주석("다음 connect에서 다시 시도")과 달리 소켓이 계속 연결돼 있으면 새 `connect` 이벤트가 없어 **재시도가 없다**. 화면이 "재연결 중"에 머물고 서버 유예 시간(기본 20초)이 지나면 자리를 잃는다(다음 복귀 신호·끊김이 있어야 재시도) | `meetingSession.gap.test.ts`의 TC-518(`it.fails`): disconnect → connect(resume 응답 NETWORK) → 15초 대기 → resume 요청이 1회뿐 | Medium | Open (제품 수정 금지 → 5단계 반려/오케스트레이터 결정) | 권고: NETWORK 응답 시 짧은 지연 후 재시도(유예 시간 안에서 횟수 제한). 수정되면 TC-518의 `it.fails`를 일반 `it`으로 바꿔야 한다. TC-518b는 현재 동작(새 connect 시 재시도)을 기록 |
- 시험 쪽 결함(제품 아님): 라운드 4의 변이 G4는 `from`과 `to`가 같은 무효 변이라 삭제. 첫 작성한 TC-524 보조 함수의 타입 단언 오류(TS2352)를 `findAll` 사용으로 수정.
- 그 외 결함 없음. Critical/High 없음.

## 7. 테스트 환경 정리(Teardown) — 규칙 K
- 생성한 임시 아티팩트: `.harness-tmp/mut_06_unit06/`(변이 정의·도구·결과). 서버·포트·DB는 쓰지 않았다.
- 정리: `.harness-tmp/mut_06_unit06/` 삭제 완료. 다른 단위의 `.harness-tmp/mut_06_unit07·09·10·11·12`, `mut_06_base`, `mut_06_head`, `probe_06_web`는 손대지 않았다.
- 변이 원복: `git diff --stat -- apps/web/src ':!*.test.ts'` 출력 없음(제품 파일 변경 0).
- 정리 후 `git status --short`(추적 파일 변경만 발췌, 나머지는 `??` 미추적 시험·문서 파일):
```
 M docs/05-qa/test-cases.md        (이 단위: TC-502g·519~524b 행 추가. 다른 단위 행도 함께 존재)
 M docs/traceability.md            (check-docs --gen 재생성 결과)
?? apps/web/.vitest/               (vitest 5 실행 산출물, 소유자 불명 — 임의 삭제하지 않음, .gitignore 추가 권고)
```
- 이 단위 소유 변경: `apps/web/src/state/meetingSession.gap.test.ts`(TC-502g·519~522 추가), `apps/web/src/state/useForeground.hook.test.ts`(신규), `apps/web/src/pages/roomPageRetry.test.ts`(신규), 이전 시도분(`lib/useRoute.hook.test.ts`, `lib/apiStorage.gap.test.ts`, `pages/roomPage.hook.test.ts`, `appRoutes.test.ts`, `state/meetingController.test.ts` 등 검증 후 유지). unit-07·08·09·10 소유 파일과 `testing/hookHarness.ts`·`testUtil.ts`는 수정하지 않음.
- 도중 강제 중단: 이번 호출에서는 없음(이전 시도는 사용량 한도로 중단 — `.harness-tmp/mut_06_unit06` 잔여물을 확인해 이어받고 최종 삭제함).

## 8. 리스크 및 잔존 이슈
- DEF-06-01(Medium, Open): 일시 오류 뒤 재연결이 멈출 수 있음. 모바일 약한 망에서 현실적.
- 이 단위 E2E(IT-50~59 등 `e2e/webRetro.spec.ts` 포함)는 이 호출에서 재실행하지 않았다 — **미검증**.
- 훅 실행기·가짜 소켓의 한계로 실제 React 배치·소켓 타이밍·브라우저 이벤트 순서는 단위 시험에서 재현하지 못한다. 생존 등가 변이 2종은 판단 근거가 정독이다.
- 웹 전체 typecheck는 unit-07 시험 파일 1건 때문에 현재 실패 상태(내 단위 아님, 해당 테스터 확인 필요).

## 9. 결론 및 판정
- [ ] PASS
- [x] CONDITIONAL PASS — 조건: Critical/High 0, Medium DEF-06-01 Open(재현은 `it.fails`로 고정). 오케스트레이터가 수정 여부를 결정해야 한다. 07단계 handoff 가능
- [ ] FAIL

## 10. 내부 검증
- 1차: AC-1~12 모두 케이스·변이와 연결(4.1). 기대값은 문구는 `strings.ts`, 동작은 코드·PRD·ADR(UX-14, SEC-03)에 근거하며 "에러 없음"이 아닌 호출 인자·상태·호출 횟수를 비교. 시험 파일에는 한글 문구를 직접 넣지 않고 `S.*`를 쓴다(TC-213 통과 — 웹 전체 통과로 확인). 이전 시도 파일을 신뢰하지 않고 전부 재실행·재변이했다.
- 2차: "이대로 07로 넘겨도 되는가"를 의심해 이전 라운드와 다른 종류의 변이 55종(RoomPage 분기·코드 매핑·deps, 컨트롤러 임계값·타이머·종료 정리, 훅 구독) 수행 → 생존 8종 발견 → 시험 추가(`useForeground` 훅은 시험 전무, RoomPage deps 무시 가짜 훅 문제 포함). 추가 후 전체 155종 재실행해 153 검출·2 등가 확인, 원복 확인.
- 검증 로그 파일 경로: `docs/harness/verify-log_unit-06-test.md`

## 5인 검토
- ① 기획자: [통과] 입장·재연결·종료 사유별 화면 시나리오를 시험으로 확인. 호스트 이탈·재입장은 TC-515·517, E2E는 미검증.
- ② 개발자: [우려] DEF-06-01(resume 일시 오류 시 재시도 없음) Open. 시험은 변이 155종 중 153종 검출, 2종 등가. 웹 typecheck는 타 단위 파일 1건으로 실패 중.
- ③ 디자이너: [미검증] 상태 화면의 문구·역할은 단위에서 확인했으나 시각·포커스·접근성은 E2E 영역이라 이번에 재실행하지 않음.
- ④ 아키텍트: [통과] 컨트롤러는 SignalingClient·MediaTransport를 가짜로 바꿔 시험할 수 있어 계층 분리가 확인됨.
- ⑤ 보안: [통과] 세션 토큰은 resume 외 요청에 실리지 않음(TC-501), 호스트 클레임은 sessionStorage만(TC-454), 경로 파서가 접두·접미·쿼리를 거부(TC-508c).

## 공유 문서 갱신 요청
- traceability.md "단위테스트" 컬럼(unit-06 요구: FR-01~03, FR-19~22, NFR-03) → `CONDITIONAL PASS (소급 6단계, 웹 단위 93 통과 + 1 expected fail, 변이 155종 중 153 검출·2 등가, DEF-06-01 Open: unit-06-test.md)`
- decisions.md 후보: ① DEF-06-01 수정 여부(제안: resume 일시 오류 시 지연 재시도) ② `apps/web/.vitest/`·`apps/server/.vitest/` `.gitignore` 추가 권고(하네스 `.gitignore`는 수정 금지라 사용자 허락 필요) ③ unit-07 테스터 파일 typecheck 오류
- docs/05-qa/test-cases.md·docs/traceability.md는 `check-docs --gen`으로 이미 반영함.
