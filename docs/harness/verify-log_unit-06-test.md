# 내부 검증 로그 (Internal Verification Log) — unit-06 6단계(소급)

## 대상 산출물
- `docs/harness/units/unit-06-test.md` 및 시험 파일: `state/{meetingController,meetingSession.gap,useForeground.hook,foreground*}.test.ts`, `lib/{signaling,signalingPathCompat,storageApi,apiStorage.gap,useRoute.hook}.test.ts`, `appRoutes.test.ts`, `pages/{roomPage.hook,roomPageRetry}.test.ts`
- 작성: 06-unit-tester (Claude Sonnet 5.5), Tier Standard(규칙 B 2회 이상), 일시 2026-10-02

## 1차 검증 (작성자 관점)
- [x] AC 커버리지: AC-1~12 모두 케이스 1개 이상(결과서 4.1). 이전 시도의 시험 파일 13개를 재실행해 93 통과 + 1 expected fail 확인.
- [x] 기대값 근거: 문구는 `strings.ts`(S.*), 동작은 제품 코드 주석·ADR(UX-14)·PRD FR/SEC와 대조. 호출 인자·횟수·상태를 비교(에러 없음만으로 통과 처리하지 않음).
- [x] 이전 라운드(1~3, 100종) 결과 `final.txt`: 생존 4종(AP3, C17, C33, C37) → 판정: AP3·C33 등가, C17·C37 시험 부족 → TC-502g·TC-519 추가해 변이로 검출 확인.
- [x] 시험 쪽 결함: TC-524 타입 단언 오류 수정, 변이 G4(from=to 무효) 삭제.
- 발견 결함: DEF-06-01(Medium, Open, `it.fails` TC-518로 재현).

## 2차 검증 (독립 심사자 관점)
- [x] "07로 넘겨도 되는가": 이전과 다른 종류의 변이 라운드 4(55종: RoomPage 코드 매핑·deps·초기 상태, 컨트롤러 임계값·타이머·종료 정리·화면공유·알림, 훅 구독) 수행 → **생존 8종**(N17·N18 RoomPage 재시도·deps, G21 자기 공유 오판, G23 종료 시 공유 트랙, G24 읽음 알림, G25~G27 `useForeground` — 훅 시험이 아예 없었음).
- [x] 보강: TC-520·521·522(gap), TC-523·523b·523c(`useForeground.hook.test.ts` 신규), TC-524·524b(`roomPageRetry.test.ts` 신규, deps를 따르는 hookHarness 사용 — 기존 RoomPage 시험의 가짜 훅은 deps를 무시해 N17을 못 잡음). 보강 후 8종 모두 검출 확인.
- [x] 최종 재실행: 시험 전체(13파일)로 라운드 1~4 **155종 재실행 → 153 검출, 2 생존(AP3·C33 등가)**. 원복 확인: `git diff --stat -- apps/web/src ':!*.test.ts'` 출력 없음(라운드 후·최종).
- [x] `it.fails` 점검: TC-518은 15초 안에 resume 재시도가 없다는 "올바른 이유"로 실패(요청 수 1 vs 기대 >1). 제품이 고쳐지면 통과로 바뀌어 `it.fails`가 실패해 알려준다.
- [x] 게이트: 내 파일 eslint 0건, `npm run lint` 0건, 웹 전체 `47 파일 339 통과 + 2 expected fail`, `check-docs` 통과(TC 659개). typecheck는 unit-07 소유 `media/unit07Transport.test.ts(114,36)` 1건만 실패(내 파일 0건).
- [ ] E2E(`webRetro.spec.ts`)·실브라우저: 이번 호출에서 금지 → **미검증**.
- [x] 남은 위험 점검: 훅 실행기 한계, DEF-06-01, E2E 미검증을 결과서 8절에 명시.
- 판정: CONDITIONAL PASS (Critical/High 0, DEF-06-01 Medium Open)
