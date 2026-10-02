# 테스트 결과서 — unit-12 (웹 상태 화면·문구·디자인·접근성: strings.ts, components/{StateScreen,icons}.tsx, design/*, tailwind.config.ts, index.css, index.html, vite.config.ts) — 소급 6단계

## 1. 개요
- 테스트 대상: unit-12 웹 공용 기반. **5단계 노트(`unit-12-note.md`) 없음 — 소급 단위**라 인수 조건은 `02-planning.md` unit-12 행(UX-01~03·08·10·11, NFR-09·10), `docs/02-design/design-system.md`·`accessibility-spec.md`, CLAUDE.md 디자인·접근성 규칙에서 도출했다.
- 테스트 유형: 단위(소급 검증 + 변이 시험으로 기존 시험 품질 점검 + 시험 보강)
- 적용 Tier: Standard (DEC-002, 규칙 B 최소 2회) / 속도 트랙 L3 / 병렬 웨이브(소급 웹 06~12 묶음, unit-11 테스터 동시 작업). 06·07 병합 미적용
- 테스트 목적: 기존 시험(`design.test.ts` TC-212~217, `stateScreen.test.ts` TC-480~489b, `strings.test.ts` TC-305~306)이 요구별로 어디까지 잡는지 변이로 측정하고, 못 잡는 동작(컴파일된 CSS, 실제 클래스 사용 대비, 터치 크기, 문서-코드 드리프트, 상태 화면 사용처, 문구 함수·매핑)을 시험으로 보강
- 테스트 수행자: 06-unit-tester (Claude Sonnet 5.5) / 일시: 2026-10-02
- 제외(미검증): 실제 브라우저 렌더링·스크린샷·실기기 터치·스크린리더, e2e(`npm run test:e2e` 금지), `npm run build` — 이 단위의 e2e 소유 시험(IT-10·11·12·27)은 **이번에 실행하지 않았다**

## 2. 시험 방식(핵심)
- **컴파일된 CSS 검증**: vitest(node)에서 `postcss` + `tailwindcss`(실제 `tailwind.config.ts`의 content 글롭·토큰 그대로)로 `index.css`를 컴파일해 결과 규칙(`.btn`의 44px, `:focus-visible` 2px·토큰 색, reduced-motion `@media`, 버튼 색, body 폰트 등)을 postcss AST로 검사한다. 소스 문자열만 보던 기존 시험(TC-484·485)이 못 보는 "설정은 있으나 실제로는 안 풀리는" 경우를 잡는다. `vite build`는 쓰지 않았다.
- **실제 사용 기반 대비 감사**: tsx 문자열 리터럴과 `@apply`에서 같은 묶음의 `text-<토큰>`×`bg-<토큰>`(hover 변형 포함)을 뽑아 WCAG 대비를 계산한다(기존 TC-214~217은 손으로 고른 쌍만 계산).
- **독립 명세 대조**: `docs/02-design/design-system.md`의 색·반경·그림자·폰트·터치 표와 대비표 19행을 파싱해 `tokens.ts`와 양방향 비교(구현에서 복사한 기대값이 아님).
- **소스 구조 감사**: 여는 태그를 중괄호·따옴표 인식으로 추출해 button/select/input의 터치 크기 클래스, `outline-none`, 양수 `tabIndex`, 아이콘 `aria-hidden`/`aria-label`을 점검한다.
- **직접 호출 시험**: `StateScreen`을 함수로 호출해 엘리먼트 트리의 클래스·역할을 검사하고, RoomPage의 `<StateScreen>` 11종 사용처를 소스에서 파싱한다.
- 제품 코드는 수정하지 않았다. 시험 파일에 한글 문구를 직접 쓰지 않았다(한글 정규식은 `\u` 이스케이프, TC-213 통과).

## 3. 요구 ↔ 시험 추적
| 요구 | 인수 조건(요지) | 기존 시험 | 신규 시험 |
|---|---|---|---|
| UX-01 | 모든 문구는 strings.ts, 한국어 | TC-213, 305~306, 489b | TC-305f(공유 상수 일치), 305g(이름 함수), 305h(한글만), 486d(제목=앱 이름) |
| UX-02 | 상태 화면 7종 이상, 역할·구조 | TC-480, 481 | TC-480b~e(틀·XSS), 481b~e(RoomPage 11종·alert/status·원문 그룹 일치·도달 가능 7종) |
| UX-03 | 오류는 원인+해결 방법 | TC-482, 483 | TC-482b(전수 스캔), 481d(다음 행동 버튼), 481f(형식), 483b(errorText 전체 매핑·chat.invalid 회귀) |
| UX-08 | 토큰 한 곳, 하드코딩 색 0 | TC-212, 486 | TC-212b/c(명세 표 대조), 484c/f/g(컴파일 결과·오타 클래스·content 글롭), 486e |
| UX-10 | 포커스 링·이름·키보드 | TC-485, 489, 489b | TC-484d(컴파일 포커스 링), 484h(outline-none·양수 tabIndex), 486b(확대 허용), 489c/d(아이콘) |
| UX-11 | reduced-motion | TC-484 | TC-484e(컴파일된 `@media` 실물 검증) |
| NFR-09 | WCAG AA 대비 | TC-214~217 | TC-216b/c/d(실사용 쌍), 217b(팔레트), 217c(문서 대비표 19행 재현) |
| NFR-10 | 터치 44px, 좁은 화면 | TC-485 | TC-484b(컴파일 44px), 485b~f(소스 감사·칩 예외·체크박스·아이콘 버튼 폭), 480b(360px 카드) |
| SEC-07(부수) | 인라인 스크립트 없음 등 | TC-487, 488 | TC-486c(index.html CSP 호환), 486f(vite 프록시·소스맵), 480e(이스케이프) |

## 4. 결과
- 신규 시험 **40개(2파일)** 전부 PASS: `design/designAudit.test.ts`(24) · `components/stateScreenGap.test.ts`(16). 기존 3파일 포함 5파일 63/63. 웹 전체 53파일 412 통과·2 expected fail(다른 단위 `it.fails`), 2026-10-02(unit-11 테스터의 진행 중 파일 포함).
- **변이 시험**: 복사본(`.harness-tmp/mut_06_unit12r/`)에서 제품 파일을 바꿔 웹 전체 시험을 돌렸다(실제 저장소 파일 무변경).
  - 1차 117종(StateScreen 18·tokens 20·tailwind 8·index.css 19·index.html 12·vite 8·strings 27·icons 5): 사망 104, 생존 13. 생존 중 **실제 시험 공백 4건**(radius 토큰 T15·T20은 구현을 따라가는 기대값 → 명세 표 대조 TC-212c 추가, 영문 제목 X18 → TC-305h, `tooLong` 5000자 X26 부분문자열 오검출 → TC-305f를 숫자 토큰 정확 비교로 강화) 보강 후 모두 사망.
  - 2차 독립 26종(RoomPage·ControlBar·Lobby·Landing·Room·docs·strings·icons, R01~R26): 사망 22, 생존 4. 공백 3건(R03 `full` 제목 아래 `locked` 본문 — TC-481b에 제목·본문 그룹 일치 추가, R22 `copyFailed`·R24 `shareBusy` 해결 행동 누락 — 손 목록이던 TC-482를 전수 스캔 TC-482b로 보강) 보강 후 모두 사망. R04는 동등 변이(두 `home` 문구가 같은 글자).
  - **합계 143종: 사망 133, 생존 10**. 생존 10 = 동등/무변경 3(W08 `index.html` content 제거 — 그 파일에 Tailwind 클래스 없음 / R04 / C19 내용이 같은 무변경 변이) + 시각 전용 7(S14 제목 글자 크기, S15 버튼 영역 위 여백, C08 disabled 커서, C09 `text-wrap: balance`, C14 disabled 투명도, C16 overscroll, C17 보조 버튼 글자색 — 대비는 통과하므로 기능 영향 없고 스크린샷·e2e 시각 비교로만 판별 가능, 미검증).
  - 기존 unit-12 시험 3파일만으로 죽은 변이는 126종 중 51종(약 40%). 나머지 75종은 신규 시험이 처음 죽였다(다른 단위 시험이 먼저 죽인 것은 0건으로 집계, 동시 실패는 `appRoutes`·`roomUi` 등 의존 단위가 함께 죽은 것).
- 시험 설계 중 정정(제품 결함 아님): ① 배경 위 경고 글자의 `bg-overlay` 쌍이 흰 영상 위 최악 가정에서 4.41:1 → 영상 위 오버레이는 3:1 기준으로 명시(기준을 정의한 것이며 흰색 글자 8.5:1은 통과). ② 체크박스(`h-5 w-5`)는 `min-h-touch` 라벨 줄이 터치 영역임을 확인하는 TC-485e로 분리. ③ ControlBar 장치 메뉴 칩(`min-w-[28px]`)은 `accessibility-spec.md` 2.5.8이 "칩은 데스크톱 전용 28px"로 문서화한 예외라 처음 `it.fails`로 올렸다가 **결함이 아님**을 확인하고 정식 시험 TC-485d(예외가 정확히 칩 2개뿐임)로 바꿨다.

## 5. 결함(Defect) 목록
| ID | 설명 | 심각도 | 상태 |
|---|---|---|---|
| (제품 결함) | **없음** — 신규 시험이 요구·명세 대비 어긋나는 동작을 하나도 발견하지 못했다 | - | - |
| OBS-1 | ControlBar 장치 메뉴 칩 2개가 `sm`(640px) 이상에서 폭 28px(높이는 44px). 데스크톱 전용이라 문서화된 예외이나 태블릿 세로(≥640px)에서는 터치 사용자가 볼 수 있고, CLAUDE.md "터치 44px+"와 문서 예외가 어긋난다. WCAG 2.2 AA 2.5.8 최소 24px은 충족 | Low(관찰) | 기록만, TC-485d가 현재 상태 고정(결정 필요: 칩 폭 확대 또는 문서 예외 유지) |
| OBS-2 | `bg-overlay` 위 경고색 글자(VideoTile 재연결 띠)는 흰 영상 위 최악 가정에서 4.41:1(4.5 미만). 실제 영상 위에서는 대부분 더 높으나 보장은 없다 | Low(관찰) | 기록만, TC-216b가 3:1 기준으로 고정 |
| OBS-3 | `aria-label`만 달린 lucide 아이콘(`Crown`·`Mic` 등 참가자 목록·타일)은 `role="img"`가 없다. 스크린리더별 이름 노출 차이 가능(실제 스크린리더 시험은 UAT-07, 미검증) | Low(관찰) | 기록만 |
| 시험 인프라 | 처음 `designAudit.test.ts`가 `design.test.ts`의 `contrast`를 import해 기존 describe가 중복 등록될 뻔함 → 로컬 구현으로 수정, lint(`no-regex-spaces`)·typecheck(`nodes?.find`) 오류 수정(내 시험 자체의 결함) | - | Fixed |

## 6. 커버리지 및 한계
- 요구 UX-01~03·08·10·11, NFR-09·10(+SEC-07 일부)의 **정적·컴파일 결과·문서 대조** 수준은 변이로 확인했다. 행은 `docs/05-qa/test-cases.md`에 39+1행을 추가했고 `docs/traceability.md`의 해당 요구 9행 TC 열을 `--gen` 결과(복사본에서 생성)로 갱신했다. `node scripts/check-docs.mjs` 통과.
- 못 덮은 것(미검증): 실제 브라우저의 레이아웃·글자 크기·여백·disabled 표현(위 시각 전용 생존 7종), 360/1280px 스크린샷, Safari/iOS 동작, 실기기 터치 사용성, 스크린리더 발음, e2e 전부. 오버레이 위 실제 영상 대비.
- Tailwind 컴파일 시험은 `tailwindcss` 3.4 내부 동작(postcss 플러그인 API)에 의존한다. 메이저 업그레이드 시 깨질 수 있으며 이는 변경 알림 역할이다.
- 번호: TC-212b/c, 216b~d, 217b/c, 305f~h, 480b~e, 481b~f, 482b, 483b, 484b~h, 485b~f, 486b~f, 489c/d(기존 번호의 단일 영문 접미사). 다른 파일·문서에서 사용 중이지 않음을 grep으로 확인했고 `check-docs`가 중복 ID 0건을 확인했다.

## 7. 테스트 환경 정리(Teardown) — 규칙 K
- 이 단위가 만든 것: `.harness-tmp/mut_06_unit12r/`(변이 복사본·스크립트·로그), `.harness-tmp/gen_06_unit12/`(`--gen` 시험용 복사본), 이전 중단 실행의 잔여물 `.harness-tmp/mut_06_unit12/`(이 단위 이름, 삭제), 스크래치패드의 컴파일 CSS 출력 — 모두 삭제했다. 서버·도커·프로세스·임시 DB·venv 없음. unit-11 소유 `.harness-tmp/mut_06_unit11r`와 다른 단위 디렉터리(mut_06_base/head, probe_06_web)는 손대지 않았다.
- 제품 코드 원복 확인: 변이는 모두 복사본에서만 수행했고 `git diff --stat -- apps packages` 출력 없음(제품 코드 무변경).
- 최종 `git status`(주석: unit-11 테스터·이전 단위 소유 변경분 포함): 추적 파일 변경은 `docs/05-qa/test-cases.md`·`docs/traceability.md`(공동, 내 행·내 요구 9행만 반영). 이 단위의 미추적 파일은 `apps/web/src/design/designAudit.test.ts`, `apps/web/src/components/stateScreenGap.test.ts`, 이 결과서와 verify-log뿐이다. `apps/web/.vitest/`는 vitest JSON 출력 폴더로 이 단위가 만든 것이 아니다.

## 8. 최종 점검 명령 결과 (2026-10-02)
- `npm run lint`: 통과(오류 0).
- `npm run typecheck`: 통과(오류 0). 중간에 내 시험의 `no-regex-spaces`·`possibly undefined` 오류를 고쳤다.
- `npm test -w @meetlite/web`: 53파일 전부 통과, 412 통과·2 expected fail.
- `node scripts/check-docs.mjs`: 점검 통과.
- 미실행(미검증): e2e·build·실브라우저(지시상 금지).

## 9. 판정
- [ ] PASS
- [x] CONDITIONAL PASS — 조건: 제품 결함 0건, Low 관찰 3건(OBS-1~3), 전체 lint·typecheck·웹 단위·check-docs 녹색. 남은 조건은 e2e·실브라우저·시각 검증 미실행(미검증)과 시각 전용 변이 7종 생존이다.

## 10. 내부 검증
- 1차: 요구별 빈틈을 변이 117종으로 측정 → 기존 시험이 약 40%만 죽임을 확인, 생존 중 공백 4건을 시험 보강으로 해결.
- 2차: 독립 변이 26종과 의심 경계(사용처 파싱 대상 확장, 전수 문구 스캔, 문서 드리프트, 체크박스·칩 예외, outline 제거) → 추가 공백 3건 보강 후 재확인.
- 검증 로그: `docs/harness/verify-log_unit-12-test.md`

## 11. 5인 검토
- ① 기획자 [통과]: 상태 화면 11종이 모두 실제로 사용되고 각각 다음 행동이 있음을 시험이 보장. 실사용 UAT는 미검증.
- ② 개발자 [통과]: 변이 143종으로 판별력 확인. Tailwind 컴파일 시험은 라이브러리 버전 의존이 있다.
- ③ 디자이너 [우려]: 대비·44px·포커스 링은 컴파일 결과까지 확인했으나 시각 전용 변이 7종과 실제 영상 위 오버레이 대비(OBS-2)는 스크린샷 비교 필요. 칩 28px(OBS-1) 결정 필요.
- ④ 아키텍트 [통과]: 제품 코드 무수정, 토큰이 문서와 코드에서 한 값임을 양방향 시험으로 고정.
- ⑤ 보안 [통과]: index.html 인라인 스크립트·스타일 없음(CSP 호환), no-referrer, 상태 화면 제목·본문 이스케이프, 서버 오류 코드가 사용자 문구에 노출되지 않음을 확인.

## 공유 문서 갱신 요청
- traceability.md "단위테스트": UX-01·02·03·08·10·11, NFR-09·10 (unit-12) → `CONDITIONAL PASS (소급 6단계, 신규 40개·변이 143종, 제품 결함 0, Low 관찰 3건: unit-12-test.md)`. (본 호출에서 `docs/traceability.md`의 TC 열은 `--gen` 방식으로 갱신 완료, 단위테스트 판정 열은 오케스트레이터가 반영)
- decisions.md 후보: OBS-1(칩 28px: 문서 예외 유지 vs 폭 확대) 결정, OBS-2·3 이연 수용.
