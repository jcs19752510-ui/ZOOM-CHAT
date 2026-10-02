# 내부 검증 로그 (Internal Verification Log) — 09-security-audit (9단계)

## 대상 산출물
- 파일: `docs/harness/09-security-audit.md` 및 신규 시험 `apps/server/test/security09.test.ts`(TC-530~538, 9건), `e2e/security09.spec.ts`(IT-110·111), `docs/05-qa/test-cases.md`·`docs/traceability.md`(`--gen` 재생성)
- 작성 에이전트: 09-security-auditor (Claude Sonnet 5.5) / 적용 Tier: Standard (규칙 B 최소 2회) / 버전: v1

## 1차 검증 (작성자 관점 자가 재검토)
- 일시: 2026-10-02
- [x] 입력 계약: CLAUDE.md 보안 규칙, ORCHESTRATOR 9단계 규칙, `docs/04-security/*`, decisions DEC-006~026, 08 결과서, 소스(서버 전부·웹 보안 관련 파일) 읽음
- [x] 출력 계약: 템플릿 1~10절 + 필수 점검 항목 전부(인증·인가, 인젝션, 시크릿, CVE, **의존성 환각**, 암호화, 오류 노출, 설계 대비 불일치, 개인정보, 라이선스, 이용약관, 규칙 I·J) 4.1·4.2·7·8절에 존재
- [x] 추측 점검: 실행하지 못한 것(실서버·Docker·CI·IPv6 실소켓·법률)은 "미검증/미확인"으로 표기. DEF-09-06은 "정적 분석, 미재현"으로 표기
- 발견된 결함(제품): DEF-09-01(High)·02·03·04. 4.3 공격 시도 68건 중 66 통과, 2건 불일치(I2 = 실제 결함 DEF-09-02, H5 = 내 시험 설계 오류)
- 내 시험·문서 오류와 조치:
  1. IT-110 첫 실행 실패 — CDP `page.evaluate` 안의 `eval`은 CSP 검사를 받지 않아 "eval 차단" 판정이 틀림 → 페이지 자신의 타이머 문자열 실행(`setTimeout('...')`)으로 교체해 `script-src` 위반 이벤트까지 단언
  2. IT-110 — 채팅 패널의 아이콘 `svg` 2개를 "본문 HTML 주입"으로 오탐 → 검사 범위를 `chat-text` 요소로 한정
  3. IT-111 — 앞선 시험이 공유 서버에 남긴 방 때문에 `rooms.size`가 0이 아님 → 시험 시작 시점 값과 비교
  4. 공격 스크립트 H5 — 강퇴된 루프백 주소로 입장해 `NOT_JOINED`가 나옴(내 시험 순서 오류) → 새 방에서 재실행(attack4)하여 정상 통과 확인
  5. 서버 시험 lint 오류(미사용 import) 수정
  6. 문서 오기: 환경변수 개수(28→22), 직접 의존성 수(27→29), 위반 횟수 표현, 결함 요약 문구 정정
- 조치 내용: 위 정정 후 v1

## 2차 검증 (독립 심사자 관점 — 역할 전환 재검토: "공격자라면 이 시스템에서 어디를 노릴까")
- 일시: 2026-10-02
- [x] 1차 지적 반영 재확인: 정정 후 `security09.test.ts` 2 통과·7 expected fail, `e2e/security09.spec.ts` 2/2 통과
- [x] "`it.fails`가 엉뚱한 이유(준비 오류)로 실패하는 것 아닌가" 의심 → 7건 모두 `it.fails`를 `it`으로 바꾼 임시 복사본을 실행해 **의도한 단언에서 실패**함을 확인(TC-530 `expected 12 <= 5`, TC-531 이웃 주소 `KICKED` 기대에서 실패하고 같은 주소 대조군은 통과, TC-532 `expected 0 > 0` 이전에 대조군(IPv4 429 발생) 통과, TC-533 `expected 40 <= 10`, TC-534 `expected 12 <= 5`, TC-535 예외 미발생, TC-538 `expected 503 to be 201` 이전에 공격자 10건 201 단언 통과). 임시 복사본은 삭제
- [x] "통과 시험이 빈 검사 아닌가" 의심 → IT-110은 payload 10건 모두 `chat:send ok`와 본문 요소 10개 도착(`toHaveCount(10)`)을 먼저 단언하고 CSP 위반 이벤트 3종을 단언. IT-111은 대조군(정상 Origin 회의 입장)을 끝에 둠. TC-536은 호스트 권한 유지를 마지막에 확인
- [x] 놓친 공격 표면 재열거: ① 엔진 수준 연결(CONNECT 전) ② IPv6 단위 ③ 방 수 상한의 소유권(누가 채우나) ④ TURN 자격증명 발급 경로 ⑤ 바이너리 첨부 파서 ⑥ permessage-deflate ⑦ 프록시 직접 노출(`TRUST_PROXY`) ⑧ 환경변수 기본값 fail-open ⑨ CSP 실효(실브라우저) ⑩ 의존성 환각·타이포·최근 등록 패키지·워크스페이스 이름 미등록 ⑪ CI 권한·액션 고정 ⑫ 화면공유 슬롯 점유. ①~④·⑧·⑩~⑫에서 결함·관찰 추가
- [x] 카테고리 연쇄(문서 11절): 8개 경로 점검, 인증 우회+XSS 연쇄는 성립하지 않음, IPv6 회전 중심의 연쇄 3개 확인
- [x] 심각도 재판정: DEF-09-01을 Medium으로 낮추고 싶은 유혹(방 ID 비밀, IPv6 노출 조건)을 점검 → 규칙·비즈니스 영향(비밀번호 방·강퇴가 제품 약속)상 낮추지 않음
- [x] 환경·원복: 제품 코드(`apps/*/src`, `packages/*/src`)·인프라 설정·HANESS 복사본 `git diff` 0. 공격 서버 프로세스 잔여 0, `.harness-tmp/sec09/` 삭제
- [x] 과장 점검: 커버리지 % 미측정 명시, 실서버·Docker·CI·IPv6 실소켓·법률 "미검증/미확인", DEF-09-06은 미재현 표기, 웹 검색 결과는 `npm audit` 결과와 교차 확인
- 발견된 결함(2차): 제품 결함 DEF-09-05·06·07·08·09, 관찰 OBS-09-01~08. 문서 결함 없음
- 판정: FAIL(High 1건 Open) — 문서는 완결, 제품 수정 후 재검증 필요

## 3차 검증 (전체 회귀 재확인)
- [x] lint 0, typecheck 0, `npm test`(shared 21 / server 235+8xf+4skip / web 433+1xf), `check:docs` 통과(테스트 791개), `npm audit` 0건, coturn L1·L2 8건 통과, `npm run test:e2e` 100 통과·1 skipped
- [x] 9절 `git status` 원문 확인(HANESS 복사본·제품 코드 변경 없음)
- 판정: FAIL(DEF-09-01 High, 5단계 수정 후 재실행 필요)

## 최종 판정
- [ ] PASS
- [ ] PASS (Low 등급 생략)
- [x] FAIL — 재작업 필요, 사유: High 결함 DEF-09-01(IPv6 주소 회전으로 IP 기반 통제 우회) Open. 보고서 자체는 완결(규칙 B 2회 이상 수행)이며, 제품 수정 후 09 재검증이 필요하다
