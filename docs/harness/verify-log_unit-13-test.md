# 내부 검증 로그 (Internal Verification Log) — unit-13 6단계(소급)

## 대상 산출물
- 파일: `docs/harness/units/unit-13-test.md` (및 신규 시험 `apps/server/test/infraGuard.test.ts`, TC-490~494)
- 작성 에이전트: 06-unit-tester (Claude Sonnet 5.5)
- 적용 Tier: Standard (규칙 B 최소 2회)
- 버전: v1 (5단계 노트 없는 소급 검증)

## 1차 검증 (작성자 관점 자가 재검토)
- 일시: 2026-10-01
- 체크리스트
  - [x] 입력 계약 반영: 03 확정표·§6.3·§7, DEC-015·017·021, CLAUDE.md 보안 규칙, 지시문의 5개 항목(ci.yml·Dockerfile·compose/coturn 비밀값·npm audit/lockfile/eslint/tsconfig·변이)을 4.1 AC-1~7에 1:1 매핑
  - [x] 출력 계약: 템플릿 1~10절 전부, "5단계 노트 없음" 명시, 7절 Teardown, 공유 문서 갱신 요청
  - [x] 기대 결과가 명세·실측에 근거: 비루트·HEALTHCHECK·SIGTERM·예시 비밀값 거부 등은 CLAUDE.md/config.ts 규칙, 로그·`docker inspect`·`docker history` 실측과 비교
  - [x] 실행하지 않은 것은 PASS로 쓰지 않음: Actions 실제 실행, 공식 베이스 이미지 빌드(우회 베이스 사용), IPv6 릴레이, `no-tlsv1` 영향은 "미검증/미확인"으로 표기
  - [x] 시험 자체의 결함 점검: TC-493의 coturn 정규식이 `user-quota`를 `user`로 오탐해 첫 실행에서 실패 → 수정 후 통과. 기대값이 아닌 시험 쪽 오류였음
- 발견된 결함: (제품) DEF-001 시험 부재(Medium, 시험 추가로 Fixed), DEF-002 중첩 `.env` 미제외(Low), DEF-003 TURN 비밀 노출 면(Low), DEF-004 `no-tlsv1*` 경고(Low), DEF-005 compose down(Low), DEF-006 ci.yml permissions(Low), DEF-007 non-null warn(Low)
- 조치: DEF-001은 시험 추가. 나머지는 제품·인프라 수정 금지 지시에 따라 Deferred로 보고

## 2차 검증 (독립 심사자 관점 — 역할 전환 재검토)
- 일시: 2026-10-01
- 체크리스트
  - [x] 1차 지적 재확인: `npx vitest run test/infraGuard.test.ts test/coturnConfig.test.ts test/e2eGuard.test.ts` 13/13 통과, `npm run check:docs` 통과, lint·typecheck 0건을 다시 실행해 확인
  - [x] "통과했다고 넘겨도 되는가" 의심: 시험이 쉽게 통과하는지 변이 20종으로 판별력 확인 → 신규 시험이 Dockerfile(USER·HEALTHCHECK·`.env` 복사 등)·ci.yml(audit·check:docs 제거, needs, REQUIRE_COTURN, 액션 v4, YAML 사고)·`.dockerignore`·compose 리터럴·eslint any off/warn·tsconfig strict false를 전부 검출. 기존 시험만으로는 대부분 못 잡았을 것(정독·grep 판단, 실행 확인은 compose 태그 변이)
  - [x] 놓쳤을 법한 경계: ① `.dockerignore`는 컨텍스트에 가짜 `.env`·`apps/server/.env`를 실제로 넣어 빌드해 최종 이미지 0건·빌드 스테이지 유입을 확인(DEF-002) ② 비밀값은 파일·로그·레이어뿐 아니라 `docker inspect`·호스트 `ps`까지 확인(DEF-003) ③ lockfile은 호환 범위 변경(통과 정상)과 비호환 변경(실패)을 구분 ④ eslint 경고는 CI 통과(DEF-007)
  - [x] 다음 단계가 질문 없이 시작 가능: 결함마다 재현 명령·권고·"미확인" 표기
  - [x] 비가역·위험: 샌드박스 도커 데몬·이미지·컨테이너 전부 정리, 제품·인프라 파일 미수정, 커밋 안 함
  - [x] 시험 설계 약점 재검토: TC-490은 휴리스틱이라 들여쓰기·구조 오류를 못 잡는다는 한계를 결과서 6·8절에 명시. 우회 베이스(프록시 CA)로 빌드한 한계도 명시
- 발견된 결함(시험 자체): 없음(1차에서 고친 정규식 외)
- 판정: CONDITIONAL PASS (Critical/High 0, Medium 1건 Fixed, Low 6건 Deferred)
