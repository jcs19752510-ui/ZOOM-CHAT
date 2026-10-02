# 내부 검증 로그 (Internal Verification Log) — unit-07 6단계(소급)

## 대상 산출물
- `docs/harness/units/unit-07-test.md` 및 시험 `media/unit07Transport.test.ts`, `lib/unit07Media.test.ts`, `lib/unit07AudioLevel.test.ts`, `lib/unit07AudioLevel.hook.test.ts`
- 작성: 06-unit-tester (Claude Sonnet 5.5), Tier Standard(규칙 B 2회 이상)

## 1차 검증 (작성자 관점)
- 일시: 2026-10-02
- [x] AC 커버리지: AC-1~13 모두 케이스 1개 이상(결과서 4.1). 이전 중단 실행이 남긴 파일 4개를 인계받아 87/87 통과 확인.
- [x] 기대값 근거: 설계서·PRD 수치와 코드 상수 대조, 호출 인자·상태·반환값을 비교(에러 없음만으로 통과 처리하지 않음).
- [x] 시험 설계 약점 점검(변이 재실행): 이전 라운드 결과 로그 확인 후 이번 호출에서 전부 재실행 → 생존 3종(M05, T19, T31) + N28 확인. M05는 TC-477f로 검출. T19·T31·N28은 등가(사유 결과서 4.4).
- [x] 시험 쪽 결함: 린트 `react-hooks/rules-of-hooks`(`use` 이름) 1건, 타입 `TS2322`(`flush`의 반환 타입) 1건 → 시험 쪽에서 수정.
- [x] 변이 시험 방식: 제품 파일이 아닌 `.harness-tmp/mut_06_unit07/` 복사본에서만 변이 → 제품 원본 불변(`git diff --stat -- lib/media.ts lib/audioLevel.ts media/` 출력 없음).
- 발견 결함: 제품 결함 없음. 관찰 OBS-001~003(Low, Deferred).

## 2차 검증 (독립 심사자 관점)
- 일시: 2026-10-02
- [x] "이대로 07로 넘겨도 되는가": 1차와 다른 종류로 독립 변이 93종(오류 이름 5종, window 가드, 구독 해제·version, 콜백 해제 6종, 후보 쌍 규칙 P01~09, 재시도 횟수·간격, 품질 판정 합산·최댓값, 훅 의존성·초기화 등) 수행 → 생존 23종. 근거로 13종은 새 시험(TC-477g·h, 478p, 476p·q, 479ad·ae·af·ag)을 쓴 뒤 재실행해 모두 검출. 10종은 등가(사유 기록).
- [x] 보강 시험이 올바른 이유로 실패하는지 확인: 보강 전 변이 복사본에서 새 시험이 해당 변이에만 실패함(S17은 복사본을 돌려주는 getParameters로 시험 약점 제거, S24는 have-local-offer 상태 answer 적용, S20은 최댓값이 앞인 후보 쌍).
- [x] 리팩터 후 재검증: 린트 수정 뒤 4개 스펙 전체(약 199종)를 다시 실행 → 검출 189, 생존 10(전부 등가). B01·B05(훅 의존성·초기화)도 계속 검출.
- [x] 게이트: 4파일 eslint 0건, `eslint apps/web`·`tsc --noEmit -p apps/web` 0건, unit-07 11파일 87 통과, `check-docs` 통과(`--gen` 후).
- [ ] 웹 전체 단위 전체 통과: 미확인 — 마지막 실행에서 타 단위(unit-09 테스터의 Room.tsx 변이 중) 1건 실패, 이 단위와 무관(파일 목록·`git status`로 확인).
- [ ] e2e(`webRetro.spec.ts` IT-52·59) 재실행: 미검증(지시상 금지).
- 남은 위험 점검: 가짜 객체 한계·등가 판정은 정독 근거·Safari 실기기 미검증을 결과서 8절에 명시.
- 판정: CONDITIONAL PASS (Critical/High 0, 결함 0, Low 관찰 3 Deferred)
