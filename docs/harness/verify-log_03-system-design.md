# 내부 검증 로그 (Internal Verification Log) — 03-system-design

> 이 로그는 `docs/harness/03-system-design.md`와, 같은 단계가 갱신한 `docs/harness/traceability.md`(설계 매핑 열·신규 요구 작업 단위), `docs/harness/decisions.md`(DEC-007~012)를 대상으로 한다. Standard 등급(DEC-002)이라 최소 2회, 결함 0건이 나올 때까지 반복했다(총 3회).

## 대상 산출물
- 파일: `docs/harness/03-system-design.md`, `docs/harness/traceability.md`(설계 매핑 열 갱신), `docs/harness/decisions.md`(append-only 6행)
- 작성 에이전트: 03-system-designer (하네스 3단계, 소급 적용 DEC-006)
- 적용 Tier: Standard (DEC-002)
- 버전: v0 (초안) -> v1 (1차 후) -> v2 (2차 후, 최종)

## 1차 검증 (작성자 관점 자가 재검토)
- 검증자(역할): 설계 작성자(아키텍트)
- 일시: 2026-10-01
- 수행 방법: 스크립트(절 번호 참조, 요구 ID 커버리지, 단위·DEC 참조 점검)와 코드 대조 재독
- 체크리스트
  - [x] 입력 계약 반영: 02-planning(PASS), traceability, decisions DEC-001~006, CLAUDE.md, 구현 코드(서버 전 파일·웹 핵심 파일·shared·infra·Dockerfile·CI), 기존 TRD/API/ADR/보안·관측성 문서를 읽었다
  - [x] 출력 계약 9개 섹션 + 작업 단위 확정표(1.3) + traceability 설계 매핑 + decisions 기록 존재
  - [x] 02와 모순 없음(달라진 점은 8.1에 사유와 함께 기록: unit-0·20 신설, unit-15~19 범위 변경)
  - [x] 추측 항목은 "확인 필요"(8.4) 또는 "추정/미검증"으로 표시(법령·CVE·Google STUN 약관·coturn 로그 형식·TURN 할당 동작·IPv6 릴레이)
  - [x] 구현 사실은 코드로 대조(RATE_SPECS, 타임아웃, 오류 코드 19종, 토큰 형식, 제한기 값, CSP 등)
  - [ ] 오탈자·형식·참조 오류 없음 → 아래 결함
- 스크립트 결과: 요구 ID 70건(FR 23, NFR 15, SEC 13, UX 15, POL 신규 4) 전부 traceability에 설계 매핑 존재, 신규 11건 모두 설계서에 등장, unit-0·01~20 전부 설계서에 등장, 참조한 DEC 전부 decisions에 존재, 설계서 필수 헤딩 전부 존재
- 발견된 결함 목록:
  1. **끊어진 절 참조**: 5.2가 "(5.5)"를 가리키나 5.5절이 없다(5.4가 맞음).
  2. **TC-213 충돌**: 법률 문구를 별도 `strings.legal.ts`에 두는 설계는 "한글 문구는 `strings.ts`에만 있다"를 검사하는 TC-213(`design.test.ts`)을 실패시키고 CLAUDE.md "문구는 strings 파일 한 곳" 규칙과도 어긋난다. `gen-content-guide.ts`는 중첩 객체·배열을 이미 순회하는 것을 확인해 `strings.ts`의 `S.legal` 한 블록으로 변경.
  3. **누락된 사실(D-6)**: 6.4의 IP 보유기간을 "약 10분"으로 쓸 뻔했으나 `KeyedRateLimiter.sweep`은 키가 5만 개를 넘을 때만 호출되어 IP 원문 키가 사실상 프로세스 수명 동안 메모리에 남는다. 보유기간 서술과 `privacy.md`의 "원문 저장 안 함" 설명이 부정확해지는 결함. D-6으로 등록하고 unit-15에 5분 주기 정리를 추가.
  4. **부정확한 서술**: 7.1이 compose에 "coturn(및 앱) 서비스"가 있다고 썼으나 `infra/docker-compose.yml`에는 coturn 서비스만 있다.
  5. **설계 누락(UX-14)**: 프로브가 시간 초과만 다루고, ack는 왔지만 `NOT_JOINED`/`PARTICIPANT_GONE`인 경우(소켓은 살았으나 자리에 묶이지 않음)가 없다. `resume()` 호출 경로와 `decideForeground` 입력(`'notBound'`)을 추가.
  6. 표 순서 어긋남(8.1 항목 번호, 8.3의 D-5/D-6 순서) — 형식 결함.
- 조치 내용: 위 6건 수정, `decisions.md` 6행 append(기존 행·문장 변경 없음, `git diff`로 +6행 확인), traceability 갱신 (-> v1)

## 2차 검증 (독립 심사자 관점 — 역할 전환 재검토)
- 검증자(역할): 이 설계서로 5단계에서 구현할 개발자 겸 보안 심사자
- 일시: 2026-10-01
- 수행 방법: 설계서 전문 재독("이 문장만 보고 구현할 수 있는가"), 병렬 단위의 파일 교집합 재계산
- 체크리스트
  - [x] 1차 지적 6건이 파일에 반영된 것을 재확인
  - [x] 병렬 단위 파일 교집합: W0(0·18·20), W1(15·17)은 서로 겹치는 파일이 없음을 표로 재검산. 겹침이 있는 16·17·19는 직렬화. 새 의존성 없음(`package.json`·lockfile 접촉 단위 0)
  - [x] 되돌리기 어려운 결정(DB 없음, 인증 방식, 핵심 구조)은 DEC-007에 근거와 함께 기록, 신규 보안 표면(admin)은 DEC-009
  - [x] 보안: CLAUDE.md 보안 규칙 11항목을 코드 증거와 대조(6.2). 규칙 문구와 다른 1건(이벤트별 토큰 검증 → 소켓 바인딩)과 설정 결함 1건(D-1)을 숨기지 않고 표기
  - [x] 외부 데이터·약관: Google STUN은 "확인 필요"로 명시하고 질문(Q2)으로 연결
  - [ ] 모호한 인터페이스·정의되지 않은 예외 처리 없음 → 아래 결함
- 발견된 결함 목록:
  1. **실행 조건 미정의(SEC-12 L2)**: coturn 실시간 시험이 기본 `npm test`에서 어떻게 동작하는지 정의되지 않았다. 그대로 구현하면 CI `verify` job이 도커 유무에 따라 불안정해지거나 도구가 없을 때 조용히 skip되어 거짓 안심을 준다. `COTURN_LIVE=1`일 때만 실행, 전용 job은 `REQUIRE_COTURN=1`로 실패 처리하도록 명시.
  2. **모호한 구현 규칙**: `/api/meta`의 `stunHosts`는 `stun:host:port` 형식이라 `URL` 파서로 호스트가 나오지 않는다. 호스트 추출 규칙(스킴 제거, 대괄호 IPv6, 포트·쿼리 제거)과 테스트 요구를 명시.
  3. **파일 충돌 위험**: "운영 기동 시 warn"의 구현 위치가 `server.ts`로 읽힐 수 있어 unit-16과 충돌한다. `createApp` 안(unit-15 파일 범위)으로 못박음.
  4. **범위 모호**: unit-0 문구 목록의 `S.contact.*`와 unit-15의 `S.legal.contact`가 겹친다. 법률·문의 페이지 문구는 전부 `S.legal.*`(unit-15), unit-0은 `legalLinks, inApp, autoplay, background, state.gone.operator`만으로 정리.
  5. **검증 규칙 누락**: `ADMIN_PORT`가 `PORT`와 같을 때, 둘 중 하나만 설정될 때의 동작이 없다. 쌍 필수·동일 값 거부를 3.6에 명시.
  6. **세부 누락**: admin 토큰 비교가 길이 노출 없이 이뤄지는 방식(양쪽 SHA-256 후 `timingSafeEqual`)이 없다.
  7. **근거 귀속 오류**: 6.2 #10의 "(02가 전수 확인)"은 이 단계가 직접 확인한 사실을 02에 귀속시킨 서술이다. 이 단계에서 `app.ts`·`socket/server.ts`·`server.ts`·`index.ts`의 로그 호출을 직접 읽었으므로 그렇게 정정.
- 조치 내용: 7건 수정, 변경 이력에 v2 기록 (-> v2)

## 3차 검증
- 검증자(역할): 독립 심사자(스크립트 재실행 + 수정 부위 재독)
- 일시: 2026-10-01
- 수행: 동일 스크립트 재실행(요구 ID 70건 매핑, 신규 11건, unit·DEC·D-n 참조, 절 번호 참조 — 끊어진 참조 0), `strings.legal`·`LEGAL` 잔존 문자열 grep 0건, 제안 번호(TC-3xx, IT-31~36, MC-06·07)가 기존 `test-cases.md`·`integration-test.md`에 없음을 grep 0건으로 확인, `node scripts/check-docs.mjs` 통과(기존 문서 불변, `git status`로 `decisions.md`·`traceability.md`·신규 2파일 외 변경 없음), 임시 프로세스·컨테이너 정리 확인(`pgrep turnserver`·`docker ps -a` 비어 있음)
- 발견된 결함 목록: 없음(0건)
- 한계(미검증으로 남김, 결함 아님): Mermaid 다이어그램 2개는 렌더링 도구가 없어 문법만 육안 확인. coturn L3(IPv6 릴레이)·공인 relay-ip 환경·법령 원문·CVE 원문·Google STUN 약관은 확인하지 못했고 설계서에 "확인 필요"로 남겼다. SEC-12 시험 코드는 임시 작업 폴더에서만 실행했고 저장소에는 설계(알고리즘·케이스)만 남겼다.

## 최종 판정
- [x] PASS (결함 0건, 최소 2회 검증 완료 — 총 3회) — 다음 단계로 handoff 가능
- [ ] PASS (Low 등급, 1차 검증 결함 0건으로 2차 생략)
- [ ] FAIL

## 5인 검토
- ① 기획자 [통과]: 신규 요구 11건과 기존 59건이 모두 설계 절에 매핑됨. 연령 확인 UI는 NFR-01 충돌 때문에 질문(Q3)으로 올림.
- ② 개발자 [통과]: 신규 단위의 파일 범위·직렬 근거·TC 후보가 파일 단위로 확정됨. 새 의존성 0.
- ③ 디자이너 [우려]: SCR-23~27 정식 등록과 문구는 4단계 소관, 아직 없음.
- ④ 아키텍트 [우려]: D-1(TURN 설정 결함)은 운영 전 필수 수정. TURN 할당 용량 가정은 미검증.
- ⑤ 보안 [우려]: 규칙 #3 문구 차이(D-5), IPv4-mapped 줄의 L3 미검증, 신규 admin 표면은 루프백·토큰·기본 비활성으로 최소화했으나 보안 담당 확인 필요.
