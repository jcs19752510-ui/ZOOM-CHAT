# 테스트 결과서 — unit-08 (웹 랜딩·대기실: pages/{Landing,Lobby}.tsx, components/{DeviceSheet,CopyLink}.tsx) — 소급 6단계

## 1. 개요
- 테스트 대상: 작업 단위 unit-08. 5단계 노트(`unit-08-note.md`) 없음 — 소급 단위라 인수 조건은 `03-system-design.md` unit-08 행(FR-01~04·06, NFR-01, UX-03·09)과 PRD 인수 조건(FR-01·02·03·04·05, NFR-01, UX-03·10)에서 도출했다.
- 테스트 유형: 단위(소급 보강: 동작 시험 + 변이 시험). Tier Standard(DEC-002, 규칙 B 2회 이상), 속도 트랙 L3. 병렬 웨이브(소급 웹 06~12 동시 실행), 06·07 병합 미적용.
- 목적: 기존 시험(`landing.test.ts`의 정적 마크업 3개 + e2e IT-50·52·59·59b)이 놓친 **동작(검증 순서·서버 호출 인자·저장·이동·오류 분기·복사·포커스 순환·효과 정리)** 을 jsdom 없이 직접 구동해 증명하고, 변이로 시험 판별력을 확인.
- 수행자: 06-unit-tester (Claude Sonnet 5.5), 2026-10-01.

## 2. 범위
- 범위: Landing(만들기·링크 입장), Lobby(대기실 입장·장치·권한 문제), CopyLink, DeviceSheet. 제품 코드(`apps/*/src`)는 수정하지 않았다.
- 제외/미검증: 실제 DOM·포커스·레이아웃·실제 브라우저의 getUserMedia 동작(e2e 소유, 이번 호출은 playwright·build 금지라 **e2e 재실행 미검증**), `Lobby`의 video `srcObject` 연결, 마이크 레벨 계산(unit-07 `audioLevel`), 실제 클립보드 권한.

## 3. 환경·도구
- Node 22, Vitest 5.0.3(`--root apps/web`, 환경 node). jsdom/testing-library 미설치(새 의존성 추가 안 함) → **시험 전용 최소 훅 실행기** `apps/web/src/testing/hookHarness.ts`를 만들었다: `vi.mock('react')`로 `useState/useRef/useMemo/useEffect/useSyncExternalStore`를 대체해 함수 컴포넌트를 직접 호출하고, 반환된 요소 트리에서 이벤트 핸들러(onSubmit·onChange·onClick·onKeyDown)를 호출한다. StrictMode식 이중 효과 실행·`beforeEffects`(ref 주입) 옵션 포함. 한계: 자식 컴포넌트는 펼치지 않음, DOM 없음.
- 잔여 확인: 이전 중단 실행이 남긴 `.harness-tmp/mut_06_unit08/`(20:44, 이 단위 이름)을 발견해 삭제했다(규칙 K).

## 4. 케이스와 결과
### 4.1 인수 조건 ↔ 케이스
| AC | 인수 조건(출처) | 케이스 |
|---|---|---|
| AC-1 | 유효 닉네임으로 만들면 방 ID 링크로 이동, 위반은 서버 호출 없이 사유 안내(FR-01) | TC-469k(위반 4종), TC-469m, TC-469q, 기존 TC-476e |
| AC-2 | 비밀번호 선택, 4~32자(경계), 끄면 보내지 않음·URL에 넣지 않음(FR-01·05, SEC-02) | TC-469l, TC-469m, TC-469r, 기존 TC-476f |
| AC-3 | 서버 오류 원인별 안내·요청 중 비활성(FR-01, UX-03, NFR-10) | TC-469n, TC-469o |
| AC-4 | 링크/코드로 입장, 잘못된 입력 안내(FR-03) | TC-469p |
| AC-5 | 링크 복사 성공 알림·실패 대체 입력창, 대기실 복사는 이 방 ID(FR-02) | TC-469s~v, TC-453x |
| AC-6 | 대기실: 장치 한 번 요청·준비 전 입장 불가·장치 없이 입장(FR-04, NFR-01) | TC-453l, TC-453p, TC-453y(`it.fails`) |
| AC-7 | 대기실 닉네임 검증·비밀번호 방 처리·오류 표시(FR-03·05, UX-03) | TC-453m, TC-453n, TC-453o |
| AC-8 | 권한 거부 4종 안내·재시도·인앱 안내(FR-04, UX-03) | TC-453q, TC-453r |
| AC-9 | 장치 선택·마이크/카메라 토글·레벨 미터·장치 변경 반영(FR-04, FR-08) | TC-453s, TC-453t, TC-453u, TC-453v, TC-453w |
| AC-10 | 통화 중 장치 시트: 선택·접근성·Tab 순환·포커스 복귀(FR-09, UX-10) | TC-469w~z, TC-453k |
| AC-11 | 키보드·접근성 라벨·터치(UX-10, NFR-10) | TC-469r, TC-469v, TC-469y, 기존 e2e IT-54b·IT-58 |

(TC 번호: 다른 테스터와 번호가 겹쳐 `check-docs`가 중복을 잡아 TC-469k~z, TC-453k~y로 옮겼다. 전체 대응표는 `docs/05-qa/test-cases.md`의 해당 파일 행 참고.)

### 4.2 신규 자동 시험(31개 TC, 파일 3개 + 훅 실행기)
- `apps/web/src/pages/landingActions.test.ts` (8): TC-469k~r
- `apps/web/src/components/copyLinkDeviceSheet.test.ts` (9): TC-469s~z(복사 4 + 장치 시트 4) + TC-453k(시트 초기 포커스·복귀·구독 해제)
- `apps/web/src/pages/lobbyActions.test.ts` (14, 그중 `it.fails` 1): TC-453l~y
- 합계 31개(30 통과 + 1 expected fail), 거기에 기존 `landing.test.ts` 3개를 더하면 33 통과 + 1 expected fail.

(정확한 ID↔파일 대응은 test-cases.md 행의 시험 파일 열이 기준이다.)

### 4.3 실행 결과
- 신규+기존 4파일: `npx vitest run --root apps/web src/pages/{landing,landingActions,lobbyActions}.test.ts src/components/copyLinkDeviceSheet.test.ts` → **4파일 통과, 33 통과 + 1 expected fail(`it.fails`, DEF-001)**.
- 전체 `npm run test -w @meetlite/web`(마지막 실행): 44파일 중 43 통과, **3 실패는 모두 다른 테스터가 작성 중인 `roomPage.hook.test.ts`**(unit-09 소유, 이 단위 파일 아님). 앞선 실행에서는 `design.test.ts` TC-213이 내 훅 실행기의 한글 오류 문구를 잡아 영어로 고쳤다(시험 쪽 결함, 수정 완료). TC-213은 현재 다른 테스터의 `testUtil.ts`도 지적하는 상태였다(그쪽 소유).

### 4.4 변이 시험(제품 코드를 임시 변경 → 시험 실패 확인 → 원복; 원복은 `git diff --stat`로 확인, 4개 제품 파일 diff 없음)
- 1라운드 73종(Landing 18, CopyLink 10, DeviceSheet 15, Lobby 30) + 재실행 보강: 첫 실행에서 **생존 6종**(DeviceSheet 비활성 항목 필터, 열릴 때 닫기 버튼 포커스, Lobby 중복 시작 방지 `startedRef`, `!starting` 라벨 조건, `alive` 가드, `[version]` 의존성, CopyLink roomId) → 시험을 보강해 모두 검출. **무효 변이 1종**(괄호가 깨지는 구문 오류, 시험 이름 없이 "KILLED"로 나옴)은 올바른 변이로 다시 해 검출 확인.
- 2라운드 27종(독립 설계: 검증 순서 제거, 문구 분기 단일화, aria 속성, autocomplete, testId, 키 처리 등): 첫 실행 생존 5종(비밀번호 autocomplete 2, Tab 가로채기 조건 2, 카메라 aria-pressed) → 시험 보강 후 모두 검출. 패턴 불일치 1종(`onSink}` 없음, 무시), **등가 변이 1종**(`?? undefined`, 동작 동일 → 검출 불가가 정상).
- 결과: 유효 변이 98종 전부 검출, 등가 1종 제외. 상세는 verify-log 참고.

## 5. 커버리지
- 4개 컴포넌트의 모든 핸들러(onSubmit·onChange·onClick·onKeyDown·onFocus)와 분기(오류 코드·권한 4종·장치 유무·호스트/비밀번호 방·클립보드 성공/거부/부재)를 직접 구동. 라인 커버리지 수치는 측정하지 않았다(미측정).
- 미커버: DOM 포커스 실제 이동, video `srcObject` 연결(효과 내 `videoRef`), 레이아웃·색 대비·44px(e2e IT-58 소유), 다른 브라우저(미검증).

## 6. 결함
| ID | 설명 | 재현 | 심각도 | 상태 |
|----|------|------|--------|------|
| DEF-001 | `Lobby`는 `media.start(...).finally(() => setStarting(false))`로만 준비 완료를 판단하고 시간 제한이 없다. `getUserMedia`가 끝나지 않는 환경(권한 프롬프트를 닫기만 하고 거부/허용하지 않는 브라우저 — 예: Firefox "나중에"; **실제 브라우저 재현은 미검증**)에서 [입장] 버튼이 `disabled`로 영구히 남아 NFR-01(조작 3번 이내)·FR-04("장치 없이 입장" 선택지)가 막힐 수 있다. | `lobbyActions.test.ts`의 `it.fails` TC-453y: start가 영원히 대기 → 30초 뒤에도 버튼 비활성 | Medium(후보) | **Open — 제품 수정 보류**(권고: 일정 시간 후 "장치 없이 입장" 활성화 또는 안내). 재현 시험은 `it.fails`로 남김(수정되면 "예상 밖 통과"로 알려 줌) |
| OBS-001 | 장치 없음(`audio` null)이고 `micOn`=true일 때 마이크 버튼은 비활성이면서 접근 가능한 이름이 "마이크 끄기"(음소거 동작)이고 아이콘은 꺼짐 — 이름과 모양이 어긋남 | TC-453s 설정과 동일 조건 | Low(관찰) | Deferred |
| OBS-002 | `Landing.create`는 요청 중 재진입 방어가 없다(버튼 `disabled`에만 의존). 실제 브라우저는 비활성 기본 버튼이면 암묵 제출을 막으므로 도달 불가에 가깝다. 미검증 | 훅 실행기에서 핸들러 직접 2회 호출 시 `createRoom` 2회 | Low(관찰) | Deferred |
- 시험 쪽 결함(수정 완료): TC-213(한글 문구 단일 출처) 위반 — 훅 실행기의 오류 메시지를 영어로 변경. `import()` 타입 주석·Mock 타입 불일치 린트/타입 오류를 수정.
- 위 외 결함 없음. Critical/High 없음.

## 7. Teardown(규칙 K)
- 이 호출은 `.harness-tmp/`를 쓰지 않았다(변이는 제품 파일을 직접 바꾸고 원복). 스크래치(`/tmp/claude-0/mut*.py`·json·로그)는 삭제했다. 이전 중단 실행의 `.harness-tmp/mut_06_unit08/` 잔여물을 삭제했다.
- `git status`(다른 테스터의 변경이 함께 보임; 이 단위 소유는 `apps/web/src/testing/`, `pages/landingActions.test.ts`, `pages/lobbyActions.test.ts`, `components/copyLinkDeviceSheet.test.ts`, test-cases.md의 해당 행, `docs/traceability.md`(`check-docs --gen` 재생성), 이 결과서와 verify-log). 제품 4파일(Landing/Lobby/CopyLink/DeviceSheet) diff 없음. 임시 아티팩트·미추적 잔여물 없음.

## 8. 남은 위험
- DEF-001(실브라우저 재현 미검증), 실제 DOM·포커스·브라우저 호환은 e2e와 타 브라우저 UAT 몫(이번 호출에서 e2e 재실행 **미검증**).
- 훅 실행기는 React의 실제 렌더 순서·배치·StrictMode 전부를 흉내 내지 않는다(요소 트리와 핸들러 중심). 실제 React 동작 차이로 놓친 결함이 있을 수 있다.
- 전체 `npm run lint`·`typecheck`·`npm run test -w @meetlite/web`는 다른 테스터의 작성 중 파일(room.test.ts, roomPage.hook.test.ts, useRoute.hook.test.ts, unit07Transport.test.ts 등)의 오류로 **전체 통과 미확인**. 이 단위 파일만 별도로 eslint 0건·tsc 0건·시험 통과를 확인했다.

## 9. 판정
**CONDITIONAL PASS** — 신규 시험 통과, 변이 98종 검출, 결함 후보 DEF-001 Open(제품 수정 금지 지시). 

## 10. 5인 검토
- ① 기획자 [우려]: 입장 버튼 영구 비활성 가능성(DEF-001)은 성공 기준(3번 이내 입장)에 직접 영향 — 실브라우저 확인 필요.
- ② 개발자 [통과]: 모든 분기를 직접 구동하고 변이로 판별력 확인. 훅 실행기는 시험 전용이며 의존성 추가 없음.
- ③ 디자이너 [우려]: OBS-001(비활성 마이크 버튼의 이름·모양 불일치). 색·터치 크기는 이 호출에서 미검증(e2e).
- ④ 아키텍트 [통과]: 제품 코드 무수정, 시험 보조 코드는 `testing/`에 격리.
- ⑤ 보안 [통과]: 비밀번호가 URL에 들어가지 않음(TC-469m)·껐을 때 미전송·autocomplete 속성·링크 입장 형식 검증(TC-469p)을 변이로 확인. 서버 측 검증은 범위 밖.

## 11. 공유 문서 갱신 요청
- `docs/05-qa/test-cases.md` 행 31개 추가 완료(Edit 대신 파이썬으로 본인 행만 삽입). `docs/traceability.md`는 `node scripts/check-docs.mjs --gen`로 재생성됨(테스트 643개).
