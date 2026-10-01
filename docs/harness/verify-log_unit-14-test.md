# 내부 검증 로그 (Internal Verification Log) — unit-14 6단계(소급)

## 대상 산출물
- 파일: `docs/harness/units/unit-14-test.md` (및 신규 시험 `apps/server/test/e2eGuard.test.ts`, TC-495~498)
- 작성 에이전트: 06-unit-tester (Claude Sonnet 5.5)
- 적용 Tier: Standard (규칙 B 최소 2회)
- 버전: v1 (5단계 노트 없는 소급 검증)

## 1차 검증 (작성자 관점 자가 재검토)
- 일시: 2026-10-01
- 체크리스트
  - [x] 입력 계약 반영: 지시문 ①~④(소스 전수 점검, 독립성, scripts 변이, 플레이크·반복 실행)를 4.1 AC-1~6에 매핑. `.only`/skip/fixme/임의 대기/단언 없음/느슨한 단언/시간 의존을 grep과 정독으로 전수 점검
  - [x] 출력 계약: 템플릿 전 섹션, "5단계 노트 없음" 명시, Teardown, 공유 문서 갱신 요청
  - [x] 기대 결과의 근거: DEC-015(IT-14 폴링), CLAUDE.md 테스트 규칙, check-docs 스크립트의 문서화된 목적(ID 정의/참조·양식)
  - [x] 실행하지 않은 것은 PASS 안 씀: 나머지 spec 실행·TURN E2E·gen-content-guide·타 브라우저는 "미실행/정적 점검만"으로 표기. `npm run build`·`npm run test:e2e` 미실행(공유 dist)
  - [x] 시험 자체의 결함 점검: TC-495 검사기가 `responsive.spec.ts`를 오탐 → `waitFor`/`noHScroll`을 인정하도록 보강. TC-497의 시험 안 문자열이 실제 check-docs 파서에 가짜 TC로 등록될 위험을 발견해 문자열을 분할
- 발견된 결함(제품·QA 자산): DEF-001 TURN E2E CI skip(Medium), DEF-002 check-docs가 시험 요구 태그 오타 미검출(Medium), DEF-004 IT-13 장치 전환 미단언(Medium), DEF-003·005·006·007·008·009(Low)
- 조치: 시험 추가(TC-495~498)만 수행, 나머지는 기존 spec·scripts 수정 금지 지시에 따라 Open으로 보고

## 2차 검증 (독립 심사자 관점 — 역할 전환 재검토)
- 일시: 2026-10-01
- 체크리스트
  - [x] 1차 지적 재확인: `npx vitest run test/e2eGuard.test.ts` 4/4, 전체 3개 시험 파일 13/13, `npm run check:docs` 통과, lint·typecheck 0건 재실행
  - [x] "통과했다고 넘겨도 되는가" 의심: E2E는 32/32 통과가 안정성의 증거인지 의심 → 결정적 위험을 변이로 확인(IT-14 폴링을 기본 간격으로 되돌리면 5회 모두 실패). 즉 현재 통과는 DEC-015 수정이 유효해서이며 우연이 아님. 반대로 정적 시험(TC-496)이 그 설정을 고정
  - [x] check-docs는 "대부분 잡는다"가 아니라 의도적으로 더 깨뜨려 봄: 수동 11종 + TC-497 8종. 검출 8종, 갭 3종(중복 정의·시험 태그 오타·생성물 변조)을 발견해 DEF로 기록
  - [x] 놓쳤을 법한 경계: 공허한 단언(IT-13 `'ok'` 항상 참, IT-22 PC 0개) 정독 발견. 실행 통과만으로는 알 수 없는 결함
  - [x] 다음 단계가 질문 없이 시작 가능: 재현 절차·권고 기재, 미확인(러너의 turnserver 유무, coturn 비밀 전달 대안)은 명시
  - [x] 비가역·위험: 공유 `test-results/`·`apps/web/dist`·기존 spec·scripts 미수정, 임시 파일 정리, 커밋 안 함
  - [x] 시험 설계 약점: TC-495는 정규식 기반 휴리스틱(템플릿 리터럴 제목은 ID 중복 검사에서 제외), 블록 경계는 줄 맨 앞 `test(`로 가정. 이 한계를 결과서에 기재
- 발견된 결함(시험 자체): 없음(1차에서 고친 검사기 오탐 외)
- 판정: CONDITIONAL PASS (Critical/High 0, Medium 3건 Open, Low 6건 Open)
