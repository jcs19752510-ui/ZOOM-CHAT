# 테스트 결과서 — unit-09 (웹 회의실 UI: pages/Room.tsx, components/{VideoGrid,VideoTile,ControlBar,ConnectionBadge,Toasts,ConfirmModal}.tsx, lib/useMediaQuery.ts) — 소급 6단계

## 1. 개요
- 테스트 대상: unit-09 웹 회의실 UI. **5단계 노트(`unit-09-note.md`) 없음 — 소급 단위**라 인수 조건은 `02-planning.md` unit-09 행(FR-07·08·10·12·19·22, UX-04~07·12)과 `03-system-design.md`, CLAUDE.md 디자인·접근성 규칙에서 도출했다.
- 테스트 유형: 단위(소급 검증 + 변이 시험으로 기존 시험 품질 점검 + 시험 보강)
- 적용 Tier: Standard (DEC-002, 규칙 B 최소 2회) / 속도 트랙 L3 / 병렬 웨이브(소급 웹 06~12 묶음). 06·07 병합 미적용
- 테스트 목적: 기존 시험(`roomUi.test.ts`, `videoTileSpeaking.test.ts`, `e2e/webRetro.spec.ts`)이 요구별로 어디까지 잡는지 변이로 측정하고, 못 잡는 동작(핸들러 배선·효과·상태 전이·좁은 화면 배치·타이머)을 시험으로 보강
- 테스트 수행자: 06-unit-tester (Claude Sonnet 5.5) / 일시: 2026-10-01(1차 수행) / 2026-10-02(중단 후 재개·재검증)
- 제외: 실제 브라우저 렌더링·포커스·스크린샷·실기기(이 환경에 jsdom/testing-library가 없고 `test:e2e`·`build`·playwright 실행 금지) — **e2e(`webRetro.spec.ts` 포함)는 이번에 실행하지 않았다(미검증)**

## 2. 시험 방식(핵심)
DOM이 없는 vitest(node)에서 ① `renderToStaticMarkup`(기존) ② **함수 컴포넌트를 직접 호출해 엘리먼트 트리의 props·핸들러를 검사** + `vi.mock('react')`로 훅(useState·useRef·useEffect 등)을 제어해 효과를 수동 실행하는 방식(신규, 공용 도우미 `apps/web/src/testUtil.ts`)을 썼다. 제품 코드는 수정하지 않았다.

## 3. 요구 ↔ 시험 추적
| 요구 | 인수 조건(요지) | 기존 시험 | 신규 시험 |
|---|---|---|---|
| UX-04 | 컨트롤바 순서·나가기 분리/위험색, 버튼이 올바른 동작에 연결 | TC-455(순서·색) | TC-455b(7개 버튼 배선), 455c, 455d(Room 연결), 466x(Room 좁은 화면 질의 767px) |
| UX-10/FR-08 | 버튼 이름·aria-pressed·터치 크기 | TC-456, 457 | TC-456b(공유·채팅·참가자 pressed), 463b/c |
| FR-12/POL-12 | 화면공유 지원 판정·공유 중 표시·공유 레이아웃 | TC-458, 462 | TC-458b, 462b(공유 타일), 462c/d(스트림 매핑·썸네일), Room 466q |
| UX-05/06 | 1~6명 그리드(데스크톱), 마지막 줄 가운데 | TC-460, 461 | TC-460b/c(**좁은 화면 639px 열 수**·빈 방·정렬), 461b/c, 463d/e(속성 매핑) |
| FR-19 | 연결 배지·재연결 남은 시간·상단 배너·타일 띠 | TC-464, 465 | TC-465b(남은 시간 계산), 465c(타이머 해제), 465d, Room 466j |
| UX-12 | 토스트 aria-live | TC-466 | TC-466i, Room 466w |
| FR-22/FR-15/FR-16 | 나가기·전체 음소거·내보내기 확인창 | e2e IT-53/54만 | TC-466d~h(확인창 Esc·Tab 가둠·포커스 복귀·구조), 466o/p(Room 확인창 흐름·id 고정) |
| UX-14/15 | 복귀 배너 문구, 자동재생 차단 배너·재생 | e2e만(정책 확인은 unit-17 시험) | TC-464b~e(VideoTile 재생·sinkId), 466t/u |
| FR-11/UX-12 | 패널 전환·읽음 처리·Esc | e2e만 | TC-466m/n/r |
| NFR-10 | 좁은 화면 판정 훅 | 없음 | TC-459c/d/e(useMediaQuery) |
| FR-22 종료 | 회의 종료 사유 전달 | 없음 | TC-466s |

## 4. 결과
- 신규 시험 48개(7파일) 전부 PASS(재개 시 TC-466x 1개 추가): `controlBarWiring`(5) · `confirmModal`(5) · `videoTileEffects`(7) · `videoGridProps`(8) · `connectionBadgeTimer`(4) · `useMediaQuery`(3) · `pages/room`(16). 7파일 + 기존 `roomUi`·`videoTileSpeaking` 묶음 9파일 62/62(재개 시 실행), 웹 전체 47파일 340 통과·2 expected fail(2026-10-02, §8).
- **변이 시험**: 제품 코드를 임시로 바꿔 시험이 실패하는지 확인 후 매번 원복(`git checkout -- <파일>`). 1차 45종 + 2차 추가 11종 = 56종(M01~M56). **재개 후 3차 독립 변이 38종**(ConfirmModal 6·ConnectionBadge 5·useMediaQuery 2·Room 12·VideoGrid 5·ControlBar 4·Toasts 2·VideoTile 4 중 패턴 일치분, R01~R38): 생존 3종 — ① `quality !== 'good'`(`NetworkQuality`가 'good'|'poor'뿐이라 동등 변이) ② Room 나가기 확인 시 `setConfirm(null)` 추가(`leave()` 후 방이 끝나 화면 전환 — 외부 동작 차이 없음, 동등으로 판단) ③ Room 좁은 화면 질의 767→600px(**실제 시험 공백**) → TC-466x를 추가해 사망 확인. (검출 스크립트의 오탐 1건 — `FAIL` 줄을 놓치는 판정 오류 — 을 발견해 판정식을 고치고 전체 재실행.)
  - 기존 unit-09 시험(roomUi·videoTileSpeaking)만으로 죽는 변이: M04, M05, M15, M28, M30 등 **약 5종뿐**(실패 TC ID 기준 집계, e2e는 미실행). 나머지는 신규 시험(또는 다른 단위 테스터가 추가한 시험)이 처음 죽였다.
  - 시험 보강 후 56종 중 **55종 사망, 생존 1종은 동등 변이**(3차 포함 총 94종 중 사망 91, 동등 생존 3 — 단 ②는 "동등으로 판단"한 것이라 확정은 아님): M45(Room `onPlayBlocked`의 `if (set.has(el) === blocked) return;` 제거 — Set의 add/delete가 멱등이라 외부 동작이 같다. 중복 보고에도 개수가 변하지 않음을 TC-466t가 확인).
  - 1차 중 시험 보강이 필요했던 변이 2종(M24 `NotAllowedError` 판정 완화, M56 재연결 타이머 조건 완화)은 2차에서 시험을 고쳐 사망 확인(TC-464b 비-NotAllowed DOMException 추가, TC-465c idle/joining/ended 상태 추가).
- 시험 설계 중 정정 2건(제품 결함 아님): 5명 데스크톱 배치 기대값을 자동 배치 규칙대로 수정, 배지 올림 경계(5.999s 경과→15s) 기대값 수정.

## 5. 결함(Defect) 목록
| ID | 설명 | 심각도 | 상태 |
|---|---|---|---|
| (제품 결함) | **없음** — 신규 시험이 요구 대비 기대와 어긋나는 동작을 하나도 발견하지 못했다 | - | - |
| OBS-1 | 모바일/미지원 환경에서 `sharing=true`여도 공유 버튼이 `disabled`다(시작 불가가 정책이라 정상이나, 공유가 켜진 채 환경이 바뀌는 비정상 경로에서 중지 불가). TC-458b가 현재 동작을 고정 | Low(관찰) | 기록만 |
| OBS-2 | `ConfirmModal`의 Tab 가둠은 포커스가 창 안에 있을 때만 동작하고(마운트 시 취소에 포커스) 창 밖(`body`)으로 나간 경우는 처리하지 않는다. 포커스 이동은 e2e IT-54로만 확인(미실행) | Low(관찰) | 기록만 |
| 시험 인프라 | `testUtil.ts`의 한글 문구가 `design.test.ts` TC-213(한글은 strings.ts에만)에 걸려 일시 실패 → 영문 메시지로 수정해 해소(내 시험 자체의 결함) | - | Fixed |

## 6. 커버리지 및 한계
- 요구 FR-07·08·10·11(패널 부분)·12·14~16(확인창)·19·22, UX-04~07·10·12·14·15, NFR-10에 시험 연결(행은 `docs/05-qa/test-cases.md`에 자동 생성 반영 — 다른 테스터의 `--gen`으로 이미 들어가 있음을 확인).
- 못 덮은 것(미검증): 실제 포커스·`play()`·`matchMedia`·CSS(Tailwind 클래스는 문자열로만 확인), 360/1280px 스크린샷, 터치 사용성, Safari/iOS 동작, e2e 전체. 훅 목킹은 React 내부 호출 순서(useState 5개, useEffect 3개)에 의존하므로 Room의 훅 순서가 바뀌면 시험이 깨진다(깨지는 것이 변경 알림 역할이나 유지 비용 있음).
- 번호: TC-450~489는 전부 다른 단위가 사용 중이라 **기존 번호의 영문 접미사(예: TC-455b, TC-466d~w)**를 써서 겹침을 피했다(`check-docs`가 중복 ID 0건 확인).

## 7. 테스트 환경 정리(Teardown) — 규칙 K
- **재개 시(2026-10-02)**: 변이 스크립트는 `.harness-tmp/mut_06_unit09r/`에 만들고 삭제했다. 이전 중단 실행의 잔여물 `.harness-tmp/mut_06_unit09/`(이 단위 이름)도 삭제했다. 변이 후 `git checkout -- <파일>`로 원복, `git diff --stat -- apps/web/src/pages apps/web/src/components apps/web/src/lib` 출력 없음(제품 코드 무변경). 최종 `git status` 추적 파일 변경은 `docs/05-qa/test-cases.md`·`docs/traceability.md`(`--gen`)뿐이고 `.harness-tmp/`에는 다른 단위 디렉터리(mut_06_base/head/unit10/11/12, probe_06_web)만 남아 있으며 손대지 않았다. 아래는 1차 수행 기록.
- 이 단위가 만든 것: 변이 시험용 스크립트(`.harness-tmp/mut09*.py`, `addrows.py`)와 `/tmp/.../scratchpad/src_orig`(원본 백업 복사본) — 삭제함. 도커·서버·프로세스 없음. 임시 DB·venv 없음.
- 제품 코드 원복 확인: `git diff --quiet -- apps/web/src/pages/Room.tsx apps/web/src/components apps/web/src/lib/useMediaQuery.ts` → 변경 없음.
- `git status`(주석: 다른 테스터 소유 변경분 포함): 추적 파일 변경은 `docs/05-qa/test-cases.md`, `docs/traceability.md`(`--gen` 결과, 공동), `apps/web/src/lib/signaling.ts`(**다른 테스터 소유, 제품 코드 변경 — unit-06 계열로 추정, 내가 한 것 아님**). 내 미추적 파일: `apps/web/src/testUtil.ts`, `components/{controlBarWiring,confirmModal,videoTileEffects,videoGridProps,connectionBadgeTimer}.test.ts`, `lib/useMediaQuery.test.ts`, `pages/room.test.ts`, 이 결과서·verify-log. `.harness-tmp/mut_06_unit09/`(21:03 생성)는 내가 만든 것이 아니라 더 이전 실행의 잔여물로 보여 손대지 않았다(오케스트레이터 확인 필요).
- 변이 시험 중 제품 파일이 잠시 변형되므로 같은 시간대의 다른 테스터 웹 시험 실패(예: 공용 TC-213)가 섞였을 수 있다 — 변이는 모두 원복했다.

## 8. 최종 점검 명령 결과 (2026-10-02 재개 후)
- `npm run lint`: 통과(오류 0).
- `npm run typecheck`(server·web): 통과(오류 0). 1차 때의 `unit07Transport.test.ts` 오류는 해소됨.
- `npm run test -w @meetlite/web`: 47파일 전부 통과, 340 통과·2 expected fail(다른 단위 `it.fails`). 1차 때의 `signaling.test.ts` TC-468t 실패도 해소됨.
- `node scripts/check-docs.mjs --gen` 후 `node scripts/check-docs.mjs`: 점검 통과(TC/IT 665개, 미연결 요구 0).
- 미실행(미검증): e2e(`webRetro.spec.ts` 포함)·build·실브라우저(지시상 금지).

## 9. 판정
- [ ] PASS
- [x] CONDITIONAL PASS — 조건: 제품 결함 0건, Low 관찰 2건(OBS-1·2), 전체 lint·typecheck·웹 단위·check-docs 녹색. 남은 조건은 e2e·실브라우저 검증 미실행(미검증)뿐이다.

## 10. 내부 검증
- 1차: 요구별 빈틈(핸들러 배선, 효과, 좁은 화면, 타이머, Room 상태 전이)을 변이 45종으로 측정 → 기존 시험이 대부분 못 죽임을 확인하고 보강 → 전부 사망(동등 변이 1 제외). 시험 기대값 오류 2건(내 실수)을 명세·코드 규칙에 맞게 정정.
- 2차: "통과해도 되는가"를 의심해 추가 변이 11종·경계(0/음수/타이머 해제/비-NotAllowed 예외/idle·joining·ended 상태)를 적용 → 약한 시험 2건 강화 후 재확인.
- 검증 로그: `docs/harness/verify-log_unit-09-test.md`

## 11. 5인 검토
- ① 기획자 [통과]: 방 입장 후 핵심 흐름(컨트롤바·그리드 1~6명·확인창·재연결 표시·자동재생 복구) 요구에 시험 연결. 실사용 UAT는 미검증.
- ② 개발자 [통과]: 변이 94종으로 판별력 확인, 시험 공백 1건(좁은 화면 질의) 보강. 훅 순서 의존 한계 있음.
- ③ 디자이너 [우려]: 색·44px·스크린샷·포커스 이동은 클래스 문자열 확인에 그치고 실제 렌더는 미검증(e2e 소유).
- ④ 아키텍트 [통과]: 제품 코드 무수정, 시험 보조는 `testUtil.ts`·`testing/`에 격리.
- ⑤ 보안 [통과]: 강퇴·전체 음소거는 확인창을 거친 뒤 대상 id로만 서버 호출(TC-466p). 권한 판정 자체는 서버 시험 소유.

## 공유 문서 갱신 요청
- traceability.md "단위테스트": FR-07, FR-08, FR-10, FR-12, FR-19, FR-22, UX-04~07, UX-12 (unit-09) → `CONDITIONAL PASS (소급 6단계, 신규 47개·변이 56종, 제품 결함 0, Low 관찰 2건: unit-09-test.md)`
- decisions.md 후보: ① OBS-1·2 이연 수용 ② TC-450~489 번호 소진 → 이후 시험은 영문 접미사 또는 500번대 사용(다른 테스터는 이미 TC-500~517 사용)
