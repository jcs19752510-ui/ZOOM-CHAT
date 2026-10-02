# 내부 검증 로그 (Internal Verification Log) — unit-12 6단계(소급)

## 대상 산출물
- 파일: `docs/harness/units/unit-12-test.md` (및 신규 시험 2파일 `apps/web/src/design/designAudit.test.ts`, `apps/web/src/components/stateScreenGap.test.ts`)
- 작성 에이전트: 06-unit-tester (Claude Sonnet 5.5) / 적용 Tier: Standard (규칙 B 최소 2회) / 버전: v1 (5단계 노트 없는 소급 검증)

## 1차 검증 (작성자 관점 자가 재검토)
- 일시: 2026-10-02
- [x] 입력 계약: 인수 조건은 02-planning·design-system.md·accessibility-spec.md·CLAUDE.md에서 도출(노트 없음 명시), 요구↔시험 표(결과서 3절)
- [x] 출력 계약: 결과서 섹션 전부(개요·방식·추적·결과·결함·한계·Teardown·점검 결과·판정·내부검증·5인 검토·공유 문서 요청)
- [x] 기대값이 명세에 근거: 색·반경·그림자·폰트·대비표는 `design-system.md`에서 파싱(구현 복사 아님), 칩 28px 예외는 `accessibility-spec.md` 2.5.8, 열린 숫자는 `packages/shared` 상수
- [x] 변이 117종(M: StateScreen 18·tokens 20·tailwind 8·index.css 19·index.html 12·vite 8·strings 27·icons 5) 복사본에서 실행: 사망 104, 생존 13 → 생존 분류: 동등/무변경 2(W08, C19), 시각 전용 7(S14, S15, C08, C09, C14, C16, C17), **실제 공백 4(T15, T20 radius 토큰, X18 영문 제목, X26 `tooLong` 5000자 부분문자열 오검출)**
- [x] 공백 4건 시험 보강: TC-212c(명세 표 대조), TC-305h(한글만), TC-305f(숫자 토큰 정확 비교) → 재실행 4종 모두 사망
- [x] 시험 자체 결함 점검: (a) 기존 시험 파일 import로 describe 중복 등록 위험 → 로컬 `contrast` (b) 오버레이 쌍 NaN 통과 위험(rgba 파싱 불가) → 흰 영상 위 최악 가정으로 블렌딩, 3:1 기준 명시 (c) 칩 28px를 결함으로 오판 → 문서 확인 후 TC-485d로 변경 (d) 체크박스 오탐 → TC-485e로 분리 (e) 변이 판정 스크립트가 JSON 보고서 경로를 못 읽는 문제(설정이 파일로 출력) 수정
- 발견된 제품 결함: 없음 / 관찰 3건(OBS-1~3)

## 2차 검증 (독립 심사자 관점 — 역할 전환 재검토)
- 일시: 2026-10-02
- [x] "이 시험이 통과했다고 넘겨도 되는가" 의심: 1차와 다른 독립 변이 26종(R01~R26: RoomPage 사용처·ControlBar 터치·Lobby/Landing/Room·문서 드리프트·문구·아이콘) → 사망 22, 생존 4: **공백 3(R03 제목/본문 그룹 불일치, R22 `copyFailed`·R24 `shareBusy` 해결 행동 누락)** + 동등 1(R04 동일 글자)
- [x] 공백 3건 보강: TC-481b에 제목·본문 그룹 일치, TC-482b 전수 문구 스캔(손 목록 의존 제거, 20건 이상 스캔 보장) → 재실행 R03·R22·R24 사망
- [x] 놓쳤을 법한 경계 재검토: children이 `0`·빈 문자열·false인 StateScreen, `alert=false` 명시, 적대적 이름 문자열(`<b>`, `${x}`), 프로토타입 키(`__proto__`, `constructor`) errorText, 대소문자·공백 포함 코드, 문서 표 행 수 고정(17색·19대비), 체크박스 라벨, outline 제거 변형(`focus:`·`focus-visible:`), 양수 tabIndex, 확대 금지 viewport 변형 2종(`user-scalable=no`, `maximum-scale=1`)
- [x] 합계: 143종 중 사망 133, 생존 10(동등/무변경 3, 시각 전용 7). 기존 3파일만으로 죽은 것은 126종 중 51종, 나머지 75종은 신규 시험이 처음 죽임
- [x] 게이트: lint 0, typecheck 0(내 시험의 오류 2건 수정 후), 웹 53파일 412 통과+2 expected fail, check-docs 통과
- [x] 한계 명시: e2e·build·실브라우저·스크린샷·스크린리더 미실행(미검증), 시각 전용 변이 7종, Tailwind 컴파일 시험의 라이브러리 버전 의존
- 판정: CONDITIONAL PASS (제품 결함 0, Low 관찰 3, e2e·시각 검증 미검증)

## 3차 확인 (정리 직전)
- [x] `npm run lint`·`npm run typecheck`·`npm test -w @meetlite/web`·`node scripts/check-docs.mjs` 최종 재실행 결과 위와 동일
- [x] 제품 코드 `git diff --stat -- apps packages` 출력 없음, `.harness-tmp/mut_06_unit12r`·`gen_06_unit12`·이전 잔여 `mut_06_unit12` 삭제, unit-11 소유 `.harness-tmp/mut_06_unit11r` 미접촉
