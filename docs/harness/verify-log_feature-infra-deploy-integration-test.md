# 내부 검증 로그 (Internal Verification Log) — feature-infra-deploy-integration-test (7단계)

## 대상 산출물
- 파일: `docs/harness/feature-infra-deploy-integration-test.md` 및 추가 시험 IT-84, IT-85, IT-86 (`apps/web/src/integration/*`, `apps/server/test/featureContracts.test.ts`)
- 작성 에이전트: 07-integration-tester (Claude Sonnet 5.5) / 적용 Tier: Standard (규칙 B 최소 2회) / 버전: v1

## 1차 검증 (작성자 관점 자가 재검토)
- 일시: 2026-10-02
- [x] 입력 계약: 이 업무 단위 작업 단위들의 06 결과서 확인, 설계서 §1.3의 작업 단위 구성 반영
- [x] 출력 계약: 결과서 1~10절·공유 문서 갱신 요청 존재, Teardown(7절)에 `git status` 원문 첨부
- [x] 단위 시험 반복 금지 준수: 2.1에서 기존 시험을 매핑하고 2.2의 빈 경계만 추가
- [x] 단위 간 데이터 흐름·상태 전이·E2E 성격 시나리오 포함(실제 서버 + 실제 웹 컨트롤러)
- [x] 추측 점검: 결함 판정은 모두 실행 결과(`it.fails`의 실패 원인 단언 위치 확인, 직접 출력)로 뒷받침. 확인하지 못한 것은 "미검증"으로 표시(실기기·도커·CI·soak)
- 발견된 결함: 없음
- 시험 자체 결함(내 실수) 정정: 웹 통합 시험 작성 중 ① 호스트 마이크 표시 기대값이 장치 없는 대역 때문에 틀림(기대값 수정) ② 계약 목록 시험의 환경변수 구간 파싱이 `.refine(` 첫 등장에서 끊김(구간 끝 표지 수정) ③ lint 3건(미사용 import·`import()` 타입) 수정 ④ typecheck 1건(마운트 제네릭) 수정. 모두 시험 코드 쪽 수정이며 제품 코드는 건드리지 않음
- 조치 내용: 위 정정 후 v1

## 2차 검증 (독립 심사자 관점 — 역할 전환 재검토)
- 일시: 2026-10-02
- [x] 1차 지적 반영 재확인: 모든 추가 시험 통과(결함 재현 3건은 expected fail)
- [x] "이 시험이 항상 통과하는 빈 검사 아닌가" 의심: IT-60은 음성 대조군(스키마 위반 요청이 감시에 잡힘), IT-80은 사본 변형 대조군을 넣음. `it.fails` 3건은 `it.fails`를 일반 시험으로 바꿔 실행해 **의도한 단언 위치에서** 실패함을 확인(IT-75: 닉네임 문구 반환, IT-88: 서버 audio=false ≠ micOn=true, IT-83: 누락 목록)
- [x] "8단계에서 다른 업무 단위와 만나면?" 의심: 마이크 연타 탐침으로 DEF-I-02 발견, 종료 사유·오류 코드 전수, 서버 재시작 3종 사유 확인
- [x] 비결정성: 통합 시험 전체 3회 추가 반복 동일 결과(웹 18 통과·1 expected fail 3회·서버 7 통과·1 expected fail 3회), 이후 `npm test` 전체 2회 통과
- [x] 환경·원복: 제품 코드(apps/*/src 외 test 제외, packages/*/src) `git diff` 없음, 임시 탐침 파일(`tmpProbe.test.ts`) 삭제, 루트에 둔 E2E 로그 삭제
- 발견된 결함(2차): DEF-I-02는 media-recovery 결과서 참조
- 판정: PASS

## 3차 검증 (전체 회귀 재확인)
- [x] `npm run lint` 0, `npm run typecheck` 0, `npm test` 전체(shared 21, 서버 233+1xf, 웹 431+3xf), `check-docs` 통과, `npm run test:e2e` 83 통과·1 skipped(IT-29)
- [x] 결과서 7절 `git status` 원문 확인, 추가 임시 파일 없음
- 판정: PASS (미검증: 실기기·iOS·타 브라우저·도커·CI·soak·법률)
