# 내부 검증 로그 (Internal Verification Log) — unit-08 6단계(소급)

## 대상 산출물
- `docs/harness/units/unit-08-test.md` 및 신규 시험 `pages/landingActions.test.ts`, `pages/lobbyActions.test.ts`, `components/copyLinkDeviceSheet.test.ts`, 훅 실행기 `testing/hookHarness.ts`
- 작성: 06-unit-tester (Claude Sonnet 5.5), Tier Standard(규칙 B 2회 이상)

## 1차 검증 (작성자 관점)
- 일시: 2026-10-01
- [x] AC 커버리지: AC-1~11 모두 케이스 1개 이상(결과서 4.1). 기존 정적 마크업 시험이 못 본 동작 분기를 신규로 보강.
- [x] 기대값의 근거: PRD 인수 조건(FR-01·02·03·04·05, NFR-01, UX-10)과 제품 코드의 문구(strings.ts)와 비교. "에러 없음"이 아닌 호출 인자·상태·문구를 비교.
- [x] 시험 설계 약점 점검(변이 1라운드 73종): 생존 6종 발견 → 시험 보강(DeviceSheet 비활성 필터·초기 포커스, StrictMode 이중 효과, `!starting` 라벨, Lobby `alive`·`[version]`·CopyLink roomId). 무효 변이 1종(구문 오류가 "KILLED"로 오탐됨) → 올바른 변이로 재수행.
- [x] 시험 쪽 결함: TC-213이 훅 실행기의 한글 문자열을 지적 → 영어로 변경. 린트의 `import()` 타입 주석·Mock 타입 → 수정.
- 발견 결함: DEF-001(Medium 후보, Open), OBS-001·002(Low). 제품 수정은 지시상 금지 → 기록, 재현은 `it.fails`.
- 문제: TC 번호가 unit-07 테스터와 겹쳐 `check-docs`가 중복을 보고 → TC-469k~z·TC-453k~y로 이동하고 test-cases.md 행도 같이 변경(내 파일 행만).

## 2차 검증 (독립 심사자 관점)
- 일시: 2026-10-01
- [x] "이대로 07로 넘겨도 되는가": 독립 변이 27종(1라운드와 다른 종류: 검증 순서 삭제, 분기 단일화, aria 속성, autocomplete, testId, Tab 가로채기 조건) 수행 → 생존 5종 → 보강 후 모두 검출. 패턴 불일치 1종·등가 변이 1종(`?? undefined`)은 제외 사유 기록.
- [x] `it.fails`가 올바른 이유로 실패하는지 확인: 임시 복사본에서 일반 시험으로 돌려 `expected true to be false`(버튼이 계속 비활성)로 실패함을 확인한 뒤 복사본 삭제.
- [x] 원복 확인: 변이마다 파일 백업·복원, 라운드 종료 후 `git diff --stat -- Landing/Lobby/CopyLink/DeviceSheet` 출력 없음.
- [x] 게이트: 이 단위 파일 `eslint` 0건, `tsc` 이 단위 파일 오류 0건, 4파일 `33 passed | 1 expected fail`, `node scripts/check-docs.mjs` 통과(`--gen` 후).
- [ ] 전체 `npm run lint`·`typecheck`·`npm run test -w @meetlite/web`: 다른 테스터의 작성 중 파일 때문에 실패(room.test.ts, roomPage.hook.test.ts 등) — **전체 통과 미확인**, 이 단위와 무관함을 파일 목록으로 확인.
- [x] 남은 위험 점검: 훅 실행기의 한계(DOM·포커스·실제 React 배치), e2e 재실행 미검증을 결과서 8절에 명시.
- 판정: CONDITIONAL PASS (Critical/High 0, DEF-001 Medium 후보 Open, Low 2건 Deferred)
