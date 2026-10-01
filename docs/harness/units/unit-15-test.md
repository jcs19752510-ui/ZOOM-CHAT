# 테스트 결과서 — unit-15 (처리방침·약관·문의 페이지, `GET /api/meta`, 로그 비식별, 제한기 정리)

## 1. 개요
- 테스트 대상: 작업 단위 unit-15 (커밋 `f08779d`, 브랜치 PROD) — `GET /api/meta`, `OPERATOR_CONTACT` 검증, `contactLink`/`parseMeta`, 법률 3종 페이지(SCR-23~25), 로그 비식별, 제한기 정기 정리(D-6)
- 테스트 유형: 단위 (+ 단위 범위의 보안 적대 시험·E2E 보강)
- 적용 Tier: Standard (DEC-003)
- 적용 속도 트랙: L4 (개인정보·보안 노출) — 전 섹션 작성, 규칙 B 2회
- 병렬 실행 정보: 병렬 웨이브 W1에서 실행(동시에 돌던 단위: unit-17의 6단계). 병합(06·07) 미적용, 개별 결과서만 산출
- 테스트 목적: 인수 조건 1~9의 실제 검증, 보안 적대 시험(링크 주입·악성 응답·로그 누출·제한기 메모리), 법률 문구 전수 점검
- 관련 산출물: `docs/harness/units/unit-15-note.md`, `03-system-design.md`(unit-15·§3.6·§6.4·§8.3 D-6), `04-ux-design.md`(SCR-23~25), `decisions.md`(DEC-017②·DEC-018), `CLAUDE.md` 보안 규칙
- 테스트 수행자: 06-unit-tester (Claude Sonnet 5.5)
- 테스트 일시: 2026-10-01

## 2. 테스트 범위 및 제외 범위
- 범위: unit-15 인수 조건 1~9. 5단계 게이트(린트·정적 분석·자체 리뷰)가 note에 기록돼 있고 6단계에서 재실행해 확인함
- 제외·미검증: 법적 정확성 자체(SEC-13, 법률 검토 필요), 실제 법령 문구 대조(확인 불가), 360/1280px 시각 품질(여백·색 대비)과 스크린샷 육안 검토, 스크린리더 읽기 순서, iOS Safari 새 탭 동작, 실제 production 배포 환경, 앱 종료 시 제한기 `dispose()` 연결(설계상 미연결). 06 단계는 unit-16·17·19 파일을 검증하지 않음

## 3. 테스트 환경
- 실행 환경: Linux 6.18, Node 22(`/opt/node22`), Vitest 5.0.3, Playwright + 사전 설치 Chromium 1194(`/opt/pw-browsers`), 1280×800 / 360×740 뷰포트
- 테스트 데이터: 시험 전용 값(예: `ops@example.com`, 악성 연락처 문자열 모음, 시험용 SESSION_SECRET). 비밀값 없음
- 전제 조건: `apps/web/dist`는 `f08779d`로 이미 빌드된 것을 unit-17과 공유. `npm run build`·`npm run test:e2e`는 실행하지 않고 `npx playwright test <파일> --workers=1`만 사용. dist가 낡았다는 징후는 없음(기존 IT-32~33c가 현재 코드의 기대대로 통과)
- 임시 환경: 변이 시험용 복사본과 스크립트는 `.harness-tmp/06_unit15/`에만 만들고 종료 시 삭제(7절)

## 4. 테스트 케이스 및 결과

### 4.1 실행한 명령과 실제 결과 요약
| 명령 | 결과 |
|---|---|
| `npm run lint` | 오류·경고 0 (신규 시험 파일에서 났던 `prefer-const`·`no-control-regex` 2건은 시험 코드 수정 후 0) |
| `npm run typecheck` | 오류 0 (shared·server·web·e2e) |
| `npm test` | shared 16, server **125**(111+신규 14, 4 skipped는 기존 조건부), web **52**(41+신규 8, +unit-17 3) 전부 통과 |
| `npm run check:docs` | 통과, 테스트 미연결 요구 0건, `--gen`으로 표 재생성(테스트 250개) |
| `npx playwright test e2e/legal.spec.ts e2e/legalfooter.spec.ts e2e/legalAdversarial.spec.ts --workers=1` | 13 passed (기존 IT-32·32b·33·33b·33c·IT-31 + 신규 IT-37·37b·38) |
| 변이 시험(임시 복사본) | 아래 4.4 |

참고: note의 "web 61 통과"는 실제 41(커밋 메시지도 41)이라 note가 틀렸다(DEF-005).

### 4.2 인수 조건 대 테스트 추적 (1:1)
| 인수 조건 | 케이스 | 판정 |
|---|---|---|
| AC1 `/api/meta` 필드·null·캐시·429·403·비노출 | 기존 TC-340·340b·340c·340d + 신규 TC-348·348b·348c·348d·348f | PASS |
| AC2 서버 `OPERATOR_CONTACT` 검증 | 기존 TC-344 + 신규 TC-347 | PASS |
| AC3 웹 href 안전·rel·텍스트 표시·`dangerouslySetInnerHTML` 없음 | 기존 TC-345~345d, IT-33, IT-33b + 신규 TC-347b·347c·347d·347e, IT-37 | PASS (경고: DEF-002·003 Low) |
| AC4 라우팅·리본·title·가로 스크롤·같은 탭·푸터 새 탭 | 기존 TC-341d, IT-32, IT-32b + 신규 IT-38 | PASS |
| AC5 필수 섹션·조문/시행일 단정 없음·보유 기간 문구 | 기존 TC-341·341b·341c + 신규 TC-349g·349h·349i | **FAIL(내용 정확성)**: DEF-001 |
| AC6 슬롯 5종·형식 오류 날짜·44px | 기존 TC-346~346e, IT-33c + 신규 TC-348g·348h, IT-37b·IT-38 | PASS |
| AC7 로그 비식별 | 기존 TC-342·342b + 신규 TC-348e·349c | PASS (한계: 4.4 M13e) |
| AC8 제한기 정리 | 기존 TC-343·343b·343c + 신규 TC-349·349b·349d·349e·349f | PASS |
| AC9 기존 동작 유지 | 전체 단위·E2E 회귀 | PASS (unit-15 관련 E2E 13/13, 단위 전량) |

### 4.3 신규 케이스 상세 (정상 경로·경계값·예외 입력)
`apps/server/test/unit15Adversarial.test.ts`(서버 14), `apps/web/src/legalAdversarial.test.ts`(웹 8), `e2e/legalAdversarial.spec.ts`(E2E 5). 아래 판정은 모두 실제 실행·기대 대비 비교 결과다.

| ID | 시나리오 / 기대 결과 | 실제 결과 | 판정 |
|---|---|---|---|
| TC-347 | 서버 config: `JAVASCRIPT:`·`javascript:..@`·`data:`·`vbscript:`·공백/개행/CRLF/널·키릴 혼동·전각·IDN 원문·`mailto:` 중첩·`<script>`·`" onmouseover=`·`@` 다중·IP 리터럴·201자·`HTTPS://`·https 안 공백/탭/NBSP는 시작 실패. 200자 경계 통과, 빈 값/공백은 undefined | 기대대로 | PASS |
| TC-347c | 서버가 받아들인 모든 값(+거부된 값)을 웹 `contactLink`에 넣어도 href는 `mailto:`/`https:`뿐 | 기대대로 | PASS |
| TC-347b | 웹 `contactLink` 52개 적대 문자열(스킴 대소문자·탭/개행 삽입·제어문자·RLO·혼동·속성 주입·3000자): href 없음 또는 안전 패턴, 렌더 태그에 `on*` 속성 없음, 태그는 a/span만 | 기대대로 | PASS |
| TC-347d | 경계: 정상 mailto/https 링크, 대문자 `HTTPS` 정규화, NUL은 `%00`으로 인코딩 | 기대대로(사실 확인: userinfo 형태 `https://good@evil/`도 링크가 됨, DEF-003) | PASS |
| TC-347e | 책임자·시행일·STUN/TURN 슬롯에 악성 문자열이 와도 a 태그·태그 속 이벤트 속성 없음 | 기대대로 | PASS |
| TC-348 | STUN/TURN URL에 `user:pw@`·쿼리·IPv6·중복: 호스트명만, 비밀값·포트·transport·SESSION_SECRET 미노출 | `user:pw@host`는 버려짐, 나머지 기대대로 | PASS |
| TC-348f | 헤더: JSON content-type, nosniff, CSP `script-src 'self'`, 쿠키 없음, ACAO는 허용 Origin만(`*` 아님). POST는 404/405, 내부 정보 없음. Origin `null`·유사 도메인·https 변형·끝 슬래시는 403 | 기대대로 | PASS |
| TC-348b | 고정 시계: 60번째 200, 61번째 429(`RATE_LIMITED`, 캐시 헤더 없음), 999ms 뒤 429, 1000ms 뒤 200 1회 후 429, XFF 위조(TRUST_PROXY=0)로 우회 불가 | 기대대로 | PASS |
| TC-348c | 429 상태에서 `/healthz` 정상, 방 조회 한도와 공유(설계 문서화) | 기대대로(공유 확인: DEF 아님, 관찰) | PASS |
| TC-348d | `LEGAL_EFFECTIVE_DATE` 형식·존재하지 않는 날짜는 시작 실패, 2024-02-29 통과. 책임자 100자 통과/101자 실패, HTML 값은 JSON 문자열로만 | 기대대로 | PASS |
| TC-348e | production + 연락처 없음 → warn 정확히 1건, 있음 → 0건, development → 0건, 기동은 막지 않음 | 기대대로 | PASS |
| TC-348g | `parseMeta`: 추가 필드 제거, `__proto__` 오염 없음, 17가지 타입·모양 오류는 null | 기대대로 | PASS |
| TC-348h | `getMeta`: HTML 200·빈 200·배열·null·v 오류·429·500·네트워크 단절은 실패 결과(예외 없음), 2MB 문자열은 처리 | 기대대로 | PASS |
| TC-349 | `KeyedRateLimiter`: 정확히 10분 유지, 10분+1ms 삭제, 5천 키 → 1, 삭제된 키는 새 버킷 | 기대대로 | PASS |
| TC-349d | 5분마다 쓰는 키는 6주기가 지나도 유지(제한 우회 불가) | 기대대로 | PASS |
| TC-349e | `AttemptLimiter`: 차단 종료 4999ms 유지, 5000ms 삭제, 창 정각 삭제, 삭제 뒤에도 2회 실패로 재차단 | 기대대로 | PASS |
| TC-349f | 실제 `setInterval` 핸들 2개 모두 `hasRef()===false`, `dispose()` 중복 호출 안전 | 기대대로 | PASS |
| TC-349b | 별도 프로세스: 제한기만 쓴 스크립트와 서버 기동·`/api/meta` 호출·`close()`한 스크립트가 스스로 종료(exit 0). 대조군(ref 타이머)은 4초 뒤에도 안 끝남 | 기대대로(대조군 매달림 확인) | PASS |
| TC-349c | `/api/meta` 조회·429·CORS 403·허용 안 된 소켓 Origin·404 흐름의 debug 로그에 `127.0.0.1`·`::1`·`::ffff:`·XFF 값·User-Agent 마커 없음, `server listening` 양성 대조군 있음 | 기대대로 | PASS |
| TC-349g | 문단 전수: 조문 번호·항·호·시행일 단정·법령명·기한(N일 이내)·과태료·적법 단정 없음 | 기대대로 | PASS |
| TC-349h | 법적 판단이 걸린 문단(14세·국외·제3자·통지·열람/삭제·면책·책임자 등 7+)은 같은 문단에 "확인 필요/법률 검토 후" | 기대대로 | PASS |
| TC-349i | `status:'draft'`, "법률 자문이 아닌 초안", 슬롯 미정 상태에 가짜 값 없음, 문단에 이메일·전화·URL 하드코딩 없음 | 기대대로 | PASS |
| IT-37 (360/1280) | 악성·초장문 16종을 `/api/meta`로 주입, 3개 페이지: 위험 스킴 href 0, `on*` 속성 0, 다이얼로그 0, `window.__pwned` 0, 가로 스크롤 0, 페이지 오류 0 | 기대대로 | PASS |
| IT-37b | HTML 200·429·500·빈 200·배열·타입 오류는 본문 읽힘+슬롯 error, 2MB 값에도 가로 스크롤 0, 지연 응답은 `aria-busy` 후 값으로 교체 | 기대대로 | PASS |
| IT-38 (360/1280) | Tab 순서(처음으로→문서 3종), 포커스 표시, Enter 이동 후 h1 포커스·title, 뒤로/앞으로, Ctrl+클릭은 같은 탭 유지, 처음으로→랜딩, 모든 링크 높이 ≥44px(헤더·목차·푸터·재시도), 키보드 재시도 복구, 콘솔 오류·CSP 위반 0 | 기대대로 | PASS |

### 4.4 시험이 실제로 결함을 잡는지 확인(변이 시험, 임시 복사본)
저장소 파일은 수정하지 않고 `.harness-tmp/06_unit15/mut/`에 복사해 한 번에 하나씩 변이한 뒤 관련 시험을 돌렸다. **죽은(실패한) 변이** = 시험이 결함을 잡은 것.

| 변이 | 결과 |
|---|---|
| iceHost가 전체 URI 반환 / meta에 TURN_SECRET 포함 / meta의 rate limit 제거 / 429에 캐시 헤더 / max-age 600 | 모두 KILLED |
| 서버 이메일 정규식 느슨화 / 줄 끝 `\s*` 허용 / https 규칙이 http 허용 | 모두 KILLED |
| 웹 `contactLink`가 `javascript:`를 href로 / 이메일 정규식 느슨화 / 임의 스킴 허용 | 모두 KILLED |
| 정리 타이머 `unref` 제거 / sweep `>=` / sweep no-op / 차단 중 키 삭제 / 창 무시 삭제 / seen 미갱신 / idle 1분 | 모두 KILLED |
| 로그에 IP(`meta` 핸들러·`participant joined`·`http error`), ipKey, 닉네임(payload), SDP(래핑 키), 전체 방 ID 추가 / redact 제거·무력화 | 모두 KILLED(TC-342·342b·349c) |
| production 경고 제거 | KILLED |
| `parseMeta` 타입 검사 제거 / 추가 필드 통과 | 모두 KILLED |
| `dangerouslySetInnerHTML` 추가 / `rel` 제거 / 문단에 `제30조`·`개인정보 보호법`·`2026년 10월 1일 시행`·`24시간 이내` 추가 / 연령 문단의 "확인 필요" 삭제 / `status` draft 해제 | 모두 KILLED |
| 웹 https 규칙이 http 허용(M7b) | **SURVIVED지만 동등 변이**: 뒤의 `u.protocol==='https:'` 검사가 막아 결과가 같음 |
| 로그 변이 M13d(핸드셰이크 auth 로깅) | SURVIVED지만 동등 변이: auth에 토큰 없음 |
| 로그 변이 M13e(`handler error` 로그에 payload 추가) | **SURVIVED** — TC-342 흐름이 `handler error` 경로를 타지 않는다. 시험 공백(Low, 8절) |
| E2E 시험의 판별력 | 변이 dist를 `.harness-tmp/`(점 디렉터리)에 빌드하면 서버의 정적 파일 서빙이 dotfile 경로를 거부해 E2E 변이 시험은 불가했다. 대신 IT-37이 쓰는 감지 함수(위험 href·`on*` 속성·가로 스크롤)를 오염시킨 DOM에 적용해 오염된 페이지에서 실제로 위반을 검출함을 별도로 확인 |

### 4.5 법률 문구 수동 전수 점검(문단 단위 읽기)
- 조문 번호·법령명·법령 시행일·처리 기한·금액은 없음(TC-349g). "초안(법률 검토 전)" 리본과 "법률 자문이 아닌 초안" 고지가 3개 문서에 모두 있음. 운영자 정보 미정 상태는 빈칸 없이 경고 문구(IT-32).
- 불확실한 사항은 "확인 필요"로 표기됨(개인정보 해당 여부, 제3자 제공/위탁, 국외 이전, 유출 통지, 열람·삭제, 14세, 면책, 신고 처리 의무).
- **사실과 다른 서술 1건**: 처리방침 `retention`의 "서버 로그에는 IP 주소·닉네임·채팅·토큰을 남기지 않습니다". MeetLite 앱 서버 로그는 맞다(TC-342). 그러나 TURN 서버(coturn)는 `infra/coturn/turnserver.conf`의 `simple-log`가 접속 IP·사용자명을 남기고, 같은 저장소의 `docs/04-security/privacy.md`도 "coturn이 연결 정보를 가질 수 있음"이라 적었다. TURN을 쓰는 배포에서는 "서버 로그에 IP를 남기지 않는다"가 거짓이다 → DEF-001.
- 사소한 점: "비밀번호는 암호화된 해시로만 보관"은 해시(argon2id/bcrypt)이며 암호화가 아니다(표현 부정확, Low, DEF-001에 합침).

## 5. 커버리지
- 커버리지 지표: 코드 커버리지 도구는 설정돼 있지 않아 수치 없음(미측정). 인수 조건 9개 전부 1개 이상 케이스에 매핑됨(4.2). 변이 시험으로 시험의 판별력 확인(4.4: 실질 변이 중 생존은 시험 공백 1건, 동등 변이 2건)
- 커버되지 않은 부분과 사유: 2절 제외 범위, `handler error`·`shutting down` 로그 경로(TC-342 흐름 밖), 앱 종료 시 제한기 `dispose()` 미연결(unref라 프로세스 종료는 확인함: TC-349b), E2E 시험의 변이 시험(dotfile 서빙 제약)

## 6. 결함(Defect) 목록
| ID | 설명 | 재현 절차 | 심각도 | 상태 | 조치 내용 |
|----|------|-----------|--------|------|-----------|
| DEF-001 | 처리방침 `retention` 문단 "서버 로그에는 IP 주소·닉네임·채팅·토큰을 남기지 않습니다"가 TURN(coturn) 로그와 모순. coturn은 `simple-log`로 접속 IP·사용자명을 기록하고 컨테이너 로그로 10MB×3 보관됨(`infra/coturn/turnserver.conf`·`infra/docker-compose.yml`·`docs/04-security/privacy.md` 표). 같은 문단 "비밀번호는 암호화된 해시"도 부정확 | `apps/web/src/strings.ts`의 `privacyDoc` `retention` 3·4번째 문단 읽기, `infra/coturn/turnserver.conf` 38~40행 대조 | **Medium**(개인정보 처리방침의 사실 오류, 초안 단계지만 공개 전 수정 필수) | Open | 5단계에서 문구 수정 요청: 앱 서버 로그와 TURN 서버 로그를 구분하고 "TURN 서버 로그에는 접속 IP·임시 사용자명이 남을 수 있고 컨테이너 로그 로테이션에 따라 삭제됨(기간 확인 필요)"로, "암호화된 해시"를 "해시"로. TC-341c·349g에 "TURN 로그" 단언 추가 권장. 의미를 바꾸는 수정이라 06에서 직접 고치지 않음 |
| DEF-002 | 이메일 로컬 파트에 `%`를 허용해(서버 config·웹 EMAIL 정규식 공통) `a%0d%0aBcc%3avictim@x.com`, `a%2cvictim@x.com`이 `mailto:` href가 된다. mailto 주소 부분이 디코딩될 때 수신자 추가·헤더 주입 가능성(메일 클라이언트 의존) | `loadConfig({OPERATOR_CONTACT:'a%2cvictim@x.com'})` 통과, `contactLink('a%0d%0aBcc%3avictim@x.com')` → `{kind:'mail', href:'mailto:a%0d%0a...'}` (`apps/server/src/config.ts` EMAIL, `apps/web/src/lib/legalMeta.ts` EMAIL) | Low(값은 운영자 env나 서버 응답이므로 신뢰 경계 안, 서버 응답 변조가 전제) | Open | 권고: 로컬 파트에서 `%` 제거(또는 `%[0-9a-f]{2}` 거부). 5단계에서 처리하거나 위험 수용을 decisions에 기록 |
| DEF-003 | https 연락처 검증이 느슨함: (a) 서버 `\S*`가 `\u0000`·`\u0007` 같은 제어문자 허용, (b) 웹이 `https://good.example@evil.example/`(userinfo)와 `https:///x`(빈 호스트 → `https://x/`)를 링크로 만들어 표시 텍스트와 이동 대상이 달라질 수 있음. 위험 스킴은 아님(https로 한정) | `loadConfig({OPERATOR_CONTACT:'https://example.com/\u0000x'})` 통과; `contactLink('https:///x')` → `href:'https://x/'`; `contactLink('https://good.example@evil.example/')` → web 링크(TC-347d가 현재 동작을 고정) | Low(운영자 신뢰 가정, 변조된 응답은 어차피 임의 https 링크 가능) | Open | 권고: 제어문자·userinfo·빈 호스트 거부. 현재 동작은 TC-347d에 기록돼 있어 수정 시 이 단언을 반대로 바꿀 것 |
| DEF-004 | `iceHost`가 대문자 스킴(`STUN:host`)을 해석하지 못해 해당 호스트가 처리방침의 STUN/TURN 공개 목록에서 조용히 빠진다(스킴은 대소문자 무관) | `STUN_URLS=STUN:upper.example,stun:ok.example` → `/api/meta` `stunHosts:["ok.example"]` | Low(공개 누락, 설정 실수가 전제) | Open | 권고: 정규식에 `i` 플래그. TC-348이 현재 동작(null)을 고정 |
| DEF-005 | unit-15-note의 "web 61 통과"가 실제 41과 다름(커밋 메시지는 41) | `npm test`(web) 결과 | Low(문서 오류) | Open | note 수정은 5단계/오케스트레이터 몫. 06은 note를 수정하지 않음 |

관찰(결함 아님, 설계 확인): (1) 오류 상태에서 페이지에 "다시 불러오기" 버튼이 슬롯마다 반복돼 처리방침은 5개가 보인다(04 UX 명세는 슬롯별 표시). 스크린리더 사용자에게 소음이므로 UX 검토 후보. (2) `/api/meta`와 방 상태 조회가 같은 `statusLimiter`를 써서 법률 페이지 조회가 방 상태 조회 한도를 소모한다(TC-348c). (3) 앱·소켓 제한기의 `dispose()` 미연결은 unref로 실해 없음(TC-349b).

## 7. 테스트 환경 정리(Teardown) 확인 — 규칙 K
- 이번 테스트에서 생성한 임시 아티팩트: `.harness-tmp/06_unit15/`(변이 복사본 `mut/`·변이 dist·`probe.ts`·`vary.ts`·`discr.cjs`·`mut.py`), 서버 프로세스는 시험 코드가 자동 기동·종료, 자식 프로세스(TC-349b)는 종료 또는 SIGKILL, Playwright 브라우저는 시험이 종료
- 위 아티팩트를 전부 `.harness-tmp/` 하위에서만 생성했는가: [x] 예 (단, `test-results/`는 Playwright 기본 출력 디렉터리로 `.gitignore` 대상이며 기존에 있던 것)
- 정리(삭제) 완료 여부: 완료. `.harness-tmp/06_unit15/`를 삭제했고 이 단위의 프로세스(vitest·playwright·chrome·자식 node)가 남지 않음을 `pgrep`으로 확인. 남아 있는 `.harness-tmp/mut_06_unit17/`와 chrome·playwright 프로세스는 unit-17 소유라 건드리지 않음
- 정리 후 `git status` 실행 결과(그대로):
```
On branch PROD
Your branch is up to date with 'origin/PROD'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   docs/05-qa/test-cases.md
	modified:   docs/traceability.md

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	apps/server/test/unit15Adversarial.test.ts
	apps/web/src/legalAdversarial.test.ts
	apps/web/src/lib/inApp.edge.test.ts
	apps/web/src/state/foreground.table.test.ts
	e2e/foreground-extra.spec.ts
	e2e/legalAdversarial.spec.ts

no changes added to commit (use "git add <file>..." to update what will be committed)
```
  (이 출력은 결과서·검증 로그 작성 직전에 찍은 것이라 `docs/harness/units/unit-15-test.md`·`docs/harness/verify-log_unit-15-test.md`는 아직 없었다. 이 두 파일은 이 단위의 의도된 산출물이다.)
- 병렬 실행 소유 표기: `apps/server/test/unit15Adversarial.test.ts`, `apps/web/src/legalAdversarial.test.ts`, `e2e/legalAdversarial.spec.ts` = unit-15(이 단위). `apps/web/src/lib/inApp.edge.test.ts`, `apps/web/src/state/foreground.table.test.ts`, `e2e/foreground-extra.spec.ts` = unit-17. `docs/05-qa/test-cases.md`·`docs/traceability.md`는 `--gen`으로 재생성되는 공유 생성 표(양 단위 신규 시험이 함께 반영, 마지막 `--gen`이 모두 포함). 이 실행이 만든 임시 아티팩트·미추적 잔여물은 위 시험 파일 3개(의도된 산출물) 외에 없음. 웨이브 종료 후 전체 트리 점검(`harness-janitor.sh --check`)은 오케스트레이터 몫
- 강제 중단(TaskStop 등): [x] 없음
- 규칙 K 판정: 이 단위의 임시 아티팩트 없음, 정리 완료

## 8. 리스크 및 잔존 이슈
- 커버되지 않은 알려진 리스크: 법률 내용 자체, 시각 품질·스크린샷 육안, 스크린리더, iOS Safari, 실제 production 기동, E2E 변이 시험 불가(DEF 아님), `handler error` 로그 경로에 대한 TC-342 공백(Low: 호출부가 payload를 로깅하도록 바뀌면 redact 키 이름에 따라 누출 가능, 다만 로거 redact가 2차 방어선)
- 후속 조치: DEF-001은 5단계 재작업 필요(문구 수정 + 시험 보강). DEF-002~004는 5단계에서 처리하거나 decisions에 위험 수용을 기록. DEF-005는 note 정정. 공유 문서 갱신 요청은 아래

## 9. 결론 및 판정
- [ ] PASS
- [ ] CONDITIONAL PASS
- [x] **FAIL** — 사유: DEF-001(Medium, 개인정보 처리방침이 TURN 로그의 IP 기록 사실과 모순)이 Open이다. 06 단계 완료 조건(모든 결함 Fixed)을 충족하지 못한다. 재작업 요청: `strings.ts` `retention` 문구 수정과 TC-341c/349g 보강(코드 로직 변경 없음, 문자열 수정이지만 의미를 바꾸므로 5단계에서 수행). DEF-002~004는 Low로 같은 재작업에서 함께 처리 권고. 그 외 인수 조건 1~4·6~9와 보안 적대 시험(링크 주입·악성 응답·로그 누출·제한기)은 모두 통과했다. 원인은 이 단위 안(`strings.ts` 서술)이며 다른 단위·공유 자원 영향은 없어 보인다(coturn 설정은 unit-18 산출물이지만 수정 대상은 문구)

## 10. 내부 검증
- 1차 검증 결과 요약: 인수 조건 9개 전부 케이스 매핑 확인. 시험 자체 결함 4건 발견·수정(시험 코드 문제였고 제품 결함 아님): 이스케이프된 텍스트 속 `onerror=`를 이벤트 속성으로 오탐, SVG xmlns의 `2000`을 가짜 값으로 오탐, 의도한 `route.abort()` 콘솔 오류를 CSP 위반으로 오탐, lint 2건
- 2차 검증 결과 요약: 독립 심사자 관점에서 변이 시험으로 시험의 판별력 확인(실질 변이 중 생존 1건=TC-342 `handler error` 공백), 법률 문구를 사실과 대조해 DEF-001 발견, 전체 명령 재실행(lint 0·typecheck 0·단위 전량·check:docs·E2E 13/13)
- 검증 로그 파일 경로: `docs/harness/verify-log_unit-15-test.md`

## 공유 문서 갱신 요청 (오케스트레이터가 반영)
`traceability.md`·`decisions.md`는 직접 수정하지 않음.
- traceability(단위테스트 컬럼): POL-17 += TC-348·348b·348c·348f·349g·349h·349i, IT-37·38 / POL-18 += TC-348e·349·349b·349c·349d·349e·349f / POL-19 += TC-347·347c·348d·348e / POL-20 += TC-348d·349i / SEC-07 += TC-347·347b·347c·347d·347e, IT-37 / SEC-06 += TC-348g·348h, IT-37b / SEC-13 += TC-349g·349h·349i. 상태: unit-15 06단계 **FAIL(DEF-001 Open)**, 재작업 후 재검증 필요
- decisions 제안: "DEF-002~004(연락처 `%`·https 제어문자/userinfo·대문자 STUN 스킴)는 5단계 수정 또는 위험 수용 여부 결정 필요"
- `docs/05-qa/test-cases.md`·`docs/traceability.md`(프로젝트 문서)는 `node scripts/check-docs.mjs --gen`으로 재생성함(IT-37·37b·38, TC-347~349i 25행 추가, `npm run check:docs` 통과)
