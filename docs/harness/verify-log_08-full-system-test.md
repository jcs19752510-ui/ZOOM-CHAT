# 내부 검증 로그 (Internal Verification Log) — 08-full-system-test (8단계)

## 대상 산출물
- 파일: `docs/harness/08-full-system-test.md` 및 신규 시험 `e2e/system.spec.ts`(IT-90~IT-102), `apps/server/test/e2eGuard.test.ts`(허용 목록 1개 추가), `docs/05-qa/test-cases.md`·`docs/traceability.md`(`--gen` 재생성)
- 작성 에이전트: 08-full-system-tester (Claude Sonnet 5.5) / 적용 Tier: Standard (규칙 B 최소 2회) / 버전: v1

## 1차 검증 (작성자 관점 자가 재검토)
- 일시: 2026-10-02
- [x] 입력 계약: 7단계 6건 결과·`02-planning` KPI·`03` §5·`trd` §5·`performance-test`·`measurement-guide`·`uat`·decisions DEC-020~025·traceability 전부 읽고 반영
- [x] 출력 계약: 템플릿 1~10절 + UAT 절 + 사용자 결정·실기기 목록 + 갱신 요청 존재, Teardown에 `git status` 원문
- [x] 핵심 가치(3조작 입장·서로 영상)와 KPI 6개·UAT 7개가 시나리오·표로 커버됨(4.2·4.5·10.1)
- [x] 단위·통합 시험 반복 금지 준수: 4.2에서 기존 IT를 매핑하고 비어 있던 경계(운영 프로세스·실제 SIGTERM·상한·로그·TURN+재시작·같은 IP 강퇴)만 신규
- [x] 추측 점검: 수치는 모두 실행 출력에서 옮김. 1회만 잰 값(복구 0.8초, 안정 구간 CPU)은 "1회 측정"으로 표기, 실망·실기기는 "미검증"
- 발견된 결함(문서): ① 4.1 하단의 신규 시험 계수가 틀림("통과 11 + 재현 4") → 파일 기준 통과 10 + expected fail 5로 정정 ② 첫 영상 표본 수를 24로 적었으나 5실행×8=40 → 정정 ③ Teardown 규칙 K 1번 체크를 "예"로 적었으나 시험 복사본 2개를 `e2e/`에 잠깐 둔 사실이 있어 "아니오(사유 명시)"로 정정 ④ SEC-11 비고가 존재하지 않는 "8절"을 가리킴 → 11절
- 시험 자체 결함(내 실수) 정정: 게스트 컨텍스트 강제 종료 후 유예 때문에 타일 대기 실패(→명시적 나가기), 재시작 시험에서 SESSION_SECRET을 바꿔 '만료' 안내가 나옴(→같은 비밀), 호스트 재입장이 같은 IP 강퇴에 걸림(→시나리오 순서 조정 + IT-99로 분리, DEF-S-03 발견), 범위 태그 `FR-01~FR-04`를 check-docs가 거부(→나열), `test.skip` 허용 목록 위반(TC-495) → 허용 목록에 system.spec.ts 추가
- 조치 내용: 위 정정 후 v1

## 2차 검증 (독립 심사자 관점 — 역할 전환 재검토: "보안팀(9)·배포팀(10)에 넘겨도 되는가")
- 일시: 2026-10-02
- [x] 1차 지적 반영 재확인
- [x] "이 시험이 항상 통과하는 빈 검사 아닌가" 의심 → 음성 대조군 3종 실행: IT-90에 `console.error` 주입→콘솔 오류 목록에 잡혀 실패, IT-94 비밀 목록에 로그에 실제 있는 문자열(`participant joined`) 추가→로그 검사 실패, IT-92 상한을 올려 거부가 안 생기게→`create-error` 미표시로 실패. `test.fail` 4종(IT-92b·97·98·99)·IT-92c는 `test.fail`을 제거한 복사본에서 지정한 단언 위치에서 실패함을 확인(IT-92c도 별도로 실행해 `not.toBe(S.state.error.body)` 단언에서 실패함을 확인)
- [x] "토큰 비식별 검사가 토큰을 못 찾아 공허하게 통과하는 것 아닌가" → 소켓 프레임에서 token·hostClaim 추출 수 >0 단언
- [x] "admin 포트 비노출을 실제로 확인했나" → 이 환경에 비루프백 인터페이스(192.0.2.2)가 있어 접속 거부를 실제 수행(없었다면 '미검증'으로 표기하도록 코드에 로그를 둠)
- [x] 비결정성: `e2e/system.spec.ts` 단독 3회(15/15 ×3) + 최종 전체 E2E 2회(98 통과 ×2). IT-91 성능 수치는 실행 간 편차 작음(첫 영상 중앙값 0.37~0.41초, 6명 mesh 6.4~6.9초)
- [x] 환경·원복: 제품 코드(`apps/*/src`, `packages/*/src`) `git diff` 0, 변경 파일은 시험·문서뿐. 복사본 2개 삭제, 서버·coturn·chrome 잔여 프로세스 0개
- [x] 과장 점검: 커버리지 % 미측정으로 명시, 실기기·실망·타 브라우저·20분 이상은 "미검증", 브라우저 MCP 미연결로 "눈으로 확인하지 못했다"를 2절에 명시
- 발견된 결함(2차): 제품 결함 DEF-S-01~04(결과서 6절). 문서 결함 없음
- 판정: CONDITIONAL PASS (Open 결함 규칙 F 처리·사용자 결정 대기)

## 3차 검증 (전체 회귀 재확인)
- [x] lint 0, typecheck 0, `npm test`(shared 21 / server 233+1xf+4skip / web 433+1xf), check:docs 통과, `npm audit --audit-level=high` 0건, `npm run test:e2e` 98 통과·1 skipped
- [x] 결과서 7절 `git status` 원문 확인
- 판정: CONDITIONAL PASS (미검증: 실기기·iOS·타 브라우저·실망·20분 이상·도커·CI 실행·법률)

## 최종 판정
- [ ] PASS
- [x] CONDITIONAL PASS — Open 결함(DEF-S-01~04)과 사용자 결정·UAT 대기. 09단계 착수는 가능(Critical/High 없음)
- [ ] FAIL
