# 내부 검증 로그 (Internal Verification Log) — unit-10 6단계(소급)

## 대상 산출물
- `docs/harness/units/unit-10-test.md` 및 신규 시험 `components/chatPanelActions.test.ts`, `components/chatPanelHref.test.ts`, `lib/linkifyEdge.test.ts`
- 작성: 06-unit-tester (Claude Sonnet 5.5), Tier Standard(규칙 B 2회 이상)

## 1차 검증 (작성자 관점)
- 일시: 2026-10-02
- [x] AC 커버리지: AC-1~9 모두 케이스 1개 이상(결과서 4.1).
- [x] 기대값의 근거: PRD FR-11, POL-07(500자·빈 값), SEC-07, `strings.ts` 문구와 `LIMITS.chatMax`와 비교. 호출 인자·입력창 값·alert 문구·href·label을 비교(에러 없음만으로 통과 처리하지 않음).
- [x] 시험 설계 약점 점검: 변이 57종 → 생존 6종(href→label, 링크 색, `<>` 제거, 백틱 제거, 전각 쉼표 제거, tail 처리) 중 등가 2종을 제외한 4종 유형을 시험 보강으로 해결.
- [x] 시험 쪽 결함: `blob:https://…` 기대 오류, 한글 리터럴(TC-213), 타입 오류 → 수정.
- 발견 결함: 제품 결함 0건, 관찰 2건(Low).

## 2차 검증 (독립 심사자 관점)
- 일시: 2026-10-02
- [x] "이대로 07로 넘겨도 되는가": 보강한 시험을 변이 복사본에 다시 반영해 생존 5종 재실행 → 4종 검출. **전각 쉼표(`，`) 변이는 계속 생존** → 원인 조사: 보강 편집이 파일에 반영되지 않았음(치환 패턴 불일치, 시험 파일에 리터럴 U+3002가 있어 `。` 문자열 치환 실패). 줄 단위로 재편집 후 재실행해 검출 확인. (자기 검증이 놓칠 뻔한 지점)
- [x] 원문 보존 불변식: 무작위 3000건(스킴 조각·따옴표·꺾쇠·괄호·전각 마침표 등) 모두 조각을 이으면 원문, 링크 href는 항상 http(s). 2만 자 입력 2초 미만.
- [x] 등가 변이 2종 판정 근거 확인: `URL` 파서 이전에 정규식이 http(s)만 통과시킴 / tail 푸시를 끄면 마지막 `last < text.length` 분기가 동일 텍스트를 이어 붙임.
- [x] 게이트: 신규 3파일 eslint 0건, `tsc` 이 단위 파일 오류 0건, 웹 전체 51파일 통과(372 + 2 expected fail), `check-docs --gen` 후 통과. 제품 2파일 `git diff --stat` 출력 없음.
- [ ] 전체 `npm run lint`·`typecheck`: 다른 테스터의 `participantsPanelActions.test.ts` 타입 오류가 있었음 — 이 단위와 무관(파일 소유 구분). 전체 통과는 **미확인**.
- [x] 남은 위험: IME 조합 입력, 실제 DOM 스크롤, e2e 재실행 미검증을 결과서 8절에 명시.
- 판정: PASS (Critical/High 0, 관찰 Low 2건)
