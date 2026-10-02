> **이 문서의 용도** — 누가: 오케스트레이터·사용자(운영자)·배포 담당(10) / 언제: 8단계(전체 시스템 시험) 직후, 배포 준비 전 / 무엇을: 보안 결함의 심각도와 재현 방법을 보고 10단계 착수 여부, 수정 범위(5단계 반려), 공개 출시 전 사용자 결정을 정한다.

# 테스트 결과서 — 보안 검증 (9단계)

## 1. 개요
- 테스트 대상: **전체 코드베이스**(`apps/server`, `apps/web`, `packages/shared`, `e2e`, `Dockerfile`, `infra/`, `.github/workflows/ci.yml`, `.env.example`, 의존성 421개 항목의 lockfile) — 기준 커밋 4aaab94
- 테스트 유형: 보안
- 적용 Tier: Standard (DEC-002, 규칙 B 최소 2회). 속도 트랙은 이 단계에서 의미가 없고, 전체 코드를 점검했다("빠르게 만든 코드니까 가볍게" 판단 없음)
- 병렬 실행 정보: 단독 실행(호출 프롬프트에 점검 카테고리 지정 없음, 사용자가 수동·단독 수행 지시. P1 조각 모드가 아님)
- 테스트 목적: ① CLAUDE.md "보안 규칙" 전 항목과 OWASP Top 10을 코드·실행으로 점검 ② 서버에 대해 실제 악용 시도(위조 토큰·사칭·거대 페이로드·연타·강퇴 우회·Origin 위조·경로 순회·헤더·연결 폭주·IPv6 주소 회전)를 **로컬 프로세스에만** 실행해 결과 기록 ③ 의존성(CVE·환각·타이포스쿼팅·라이선스)·Docker·CI·시크릿 점검 ④ 개인정보·규칙 I·J 반영 확인
- 관련 산출물: `CLAUDE.md`(보안 규칙), `docs/04-security/*`, `docs/harness/03-system-design.md`(§6 보안), `decisions.md`(DEC-006~026), `08-full-system-test.md`, `feature-*-integration-test.md` 6건
- 테스트 수행자(에이전트): 09-security-auditor (Claude Sonnet 5.5)
- 테스트 일시: 2026-10-02 (커밋 4aaab94 + 미커밋 변경: `apps/server/test/security09.test.ts`·`e2e/security09.spec.ts` 신규, `docs/05-qa/test-cases.md`·`docs/traceability.md` 재생성)
- 공격 실행 범위 제한: 이 환경의 `127.0.0.1`에서 직접 띄운 운영 빌드 프로세스(포트 3911·3921·3931·3941)에만 시도했다. 제3자 서버·실제 서비스·STUN(Google)에는 아무 시도도 하지 않았다. 시도 후 프로세스는 모두 종료했다.

## 2. 테스트 범위 및 제외 범위
- 범위(In-Scope): 인증·인가·권한 경계(수평/수직), 인젝션·입력 검증, 시크릿·로그 노출, 의존성(CVE·환각·라이선스), 암호화·전송, 오류 메시지 노출, 설계 대비 구현 불일치, 개인정보, 이용약관, 규칙 I·J 반영, DoS·자원 고갈, Docker·CI 설정, 교차 카테고리 연쇄 공격(11절 2차 검증)
- 제외 범위 및 사유(모두 **미검증**으로 남김):
  - **실서버 응답 헤더·TLS·HSTS 실효**: 배포 대상 없음(규칙 E). 로컬 HTTP 프로세스에서 헤더 값만 확인했다
  - **실환경 admin 비노출**: 이 환경의 비루프백 주소(192.0.2.2)로 접속 거부는 확인했으나, 실제 호스팅(방화벽·리버스 프록시·Docker 포트 매핑)에서의 노출 여부는 확인 못 함
  - **IPv6 실망 동작**: 이 샌드박스에는 IPv6(`/proc/net/tcp6`)가 없어 실제 IPv6 소켓 대신 `TRUST_PROXY=1`+`X-Forwarded-For`로 서로 다른 IPv6 주소를 흉내 냈다(DEF-09-01 재현은 이 방식). 서버가 실제로 IPv6로 열리는지는 배포 환경에 달려 있다
  - **coturn IPv6 릴레이(L3)**, 실제 TURN 남용 부하: 환경 제약
  - **Docker 이미지 빌드·실행·compose·GitHub Actions 실행**: 이 환경에 Docker 데몬이 없다(`docker info`가 소켓 연결 실패). Dockerfile·compose·CI는 **정적 검토만** 했다
  - **법률 검토**(개인정보 법령 적용 여부 U-04, 처리방침 초안), 외부 STUN(Google) 이용약관 원문 — 확인 불가 → 미확인
  - 모의 침투 전문가의 외부 점검, 사회공학, 물리 보안

## 3. 테스트 환경
- 실행 환경: Linux 6.18, Node 22.22.0, Chromium(사전 설치, headless), coturn 4.6.1(`/usr/bin/turnserver`). 웹 소켓은 `ws`·`socket.io-client`, HTTP는 `fetch`·원시 TCP(`node:net`)로 시도
- 공격 대상 서버 설정: `NODE_ENV=production`, 무작위 `SESSION_SECRET`(32바이트)·`ADMIN_TOKEN`, `ALLOWED_ORIGINS=https://meet.example.test`, `WEB_DIST=apps/web/dist`, `LOG_LEVEL=debug`(로그 노출 점검을 위해 가장 장황하게), `IP_MAX_CONNECTIONS` 5·20, 일부 `TRUST_PROXY=1`
- 테스트 데이터: 시험 중 생성한 무작위 방 ID·토큰. 실제 개인정보 없음
- 전제 조건: 8단계 CONDITIONAL PASS(Critical/High 없음, 09 착수 가능), `npm ci`·`npm run build` 완료
- 사용한 저장소 외부 접근: npm 레지스트리 조회(`npm view`·`npm audit`, 읽기 전용), 웹 검색(권고 확인). 모두 성공

## 4. 테스트 케이스 및 결과

### 4.1 CLAUDE.md 보안 규칙 항목별 판정
| # | 규칙 | 결과 | 근거(실행·코드) |
|---|---|---|---|
| 1 | 방 ID `crypto` 128비트 이상 URL-safe | **통과** | `randomBytes(16).toString('base64url')` 22자. TC-137(2000개 무중복). 라이브 38개 방 생성에서 중복 없음 |
| 2a | 비밀번호는 argon2id/bcrypt 해시로만 보관 | **통과** | bcryptjs 비용 10 + SHA-256 선처리(72바이트 잘림 방지). TC-107·133·134·432. 평문은 어디에도 저장·로그 안 됨(라이브 로그 3개 grep 0건) |
| 2b | 입장 시도를 IP+방 기준으로 제한 | **부분 실패** | 같은 IPv4는 5회 후 차단(대조군 통과). **IPv6는 같은 /64의 다른 주소로 우회**(DEF-09-01, High). 동시 오답은 소켓 수만큼 검증됨(DEF-09-03, Low) |
| 3 | 서명된 단기 세션 토큰, 모든 이벤트 검증, 재접속은 토큰으로만 | **통과** | 위조 7종(예시 비밀값 서명·빈 서명·본문 변조·종류 바꿔치기·3조각·프로토타입 오염·잘린 서명) 모두 `TOKEN_INVALID`(라이브 C1, TC-536). 세션 토큰을 hostClaim으로 제시 → 거부(C2). 만료 4시간(ADR-0003). 입장하지 않은 소켓의 모든 이벤트 `NOT_JOINED`(D9·D10) |
| 4a | 발신자 ID는 서버 부여값만 신뢰 | **통과** | `from`·`nickname`·`isHost` 추가 키는 zod strict로 `INVALID_PAYLOAD`(D1·D3·D8). 릴레이된 신호의 `from`은 서버 값(D4). 채팅 `from`·`nickname`은 서버 값(D2) |
| 4b | 같은 방 참가자에게만 릴레이, 권한은 서버 상태로만 | **통과** | 다른 방 참가자에게 신호·강퇴 → `TARGET_NOT_FOUND`(D11·D12). 비호스트의 강퇴·잠금·전체 음소거 → `FORBIDDEN`(D5~D7) |
| 4c | 강퇴 세션 재입장 차단 | **부분 실패** | 같은 IPv4 재입장 `KICKED`, 옛 토큰 resume `PARTICIPANT_GONE`, 강퇴된 소켓 즉시 종료(E1~E4). **같은 IPv6 /64의 이웃 주소로는 재입장 성공**(DEF-09-01). IPv4 주소 변경 우회는 설계 한계(A-05, 7절) |
| 5 | 모든 소켓 이벤트 zod+크기+이벤트별 rate limit | **통과(관찰 1)** | 등록 이벤트 12종 전부 공통 래퍼(`on()`)로 rate limit → zod → 입장 확인 순서. 1MB 프레임은 1009로 연결 종료(H1), 3000자·31KB 채팅·SDP 16385바이트 거부(H2~H4), 채팅 100연타 → 5건 처리 후 `RATE_LIMITED`, 15회 위반에서 연결 종료(attack4), 잘못된 페이로드 40연타 → 15회째 위반에서 연결 종료. 바이너리 첨부 과다 선언(10개 초과)은 파서가 거부하고 메모리 증가 없음(4종 시도, RSS 변화 +0~4MB). **관찰**: 등록되지 않은 이벤트 이름의 연타는 핸들러가 없어 위반 집계·속도 제한을 받지 않는다(5000개×1KB 연타에도 `/healthz` 2ms, 처리 비용 작음 — 8절 OBS-09-02) |
| 6a | IP당 동시 연결 상한 | **실패** | Socket.IO 네임스페이스 연결 뒤에만 적용된다. CONNECT 패킷 없이 엔진 WebSocket만 여는 연결은 **상한 5에서 2000개가 모두 열림**(RSS +44MB, fd 2022). DEF-09-02(Medium) |
| 6b | 서버 전체 방 수 상한 | **작동하나 악용 가능** | 상한은 지켜진다(TC-108·IT-92). 그러나 한 IP가 입장 안 할 방으로 상한을 채우면 다른 사용자가 503(DEF-09-05, Medium) |
| 7 | 채팅 XSS·링크 `rel` | **통과** | 실브라우저 IT-110: UI를 거치지 않고 소켓으로 직접 보낸 10종(`javascript:`·대소문자 혼합·`data:`·속성 탈출·`<img onerror>`·`<iframe srcdoc>`·`<svg><script>`·방향 제어 문자)이 텍스트로만 표시, `__xss` 미설정, 대화상자 0, 본문 안 HTML 요소 0, 모든 링크 `target=_blank`·`rel=noopener noreferrer`·속성 `class,href,rel,target`뿐. `dangerouslySetInnerHTML`·`innerHTML`·`eval` 소스 grep 0건 |
| 8a | Origin 허용 목록(CORS+Socket.IO) | **통과** | 허용 외 Origin·`null`·접미 도메인·대문자 → REST 403(ACAO 없음), 소켓 거부(B1~B5). 실브라우저 IT-111: 다른 Origin 페이지의 `fetch`는 CORS로 차단, `WebSocket`은 열리지 않음, 서버에 방이 생기지 않음. `text/plain` 본문(단순 요청 CSRF)은 400 |
| 8b | CSP·Permissions-Policy·helmet | **통과** | 응답 헤더: `script-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`, `nosniff`, `no-referrer`, `COOP/CORP same-origin`, `X-Powered-By` 없음, `Permissions-Policy: camera=(self), microphone=(self), display-capture=(self), geolocation=()`. IT-110: 실브라우저에서 주입한 인라인 스크립트·문자열 eval·외부 `fetch`·외부 `<script src>`가 실제로 차단(`securitypolicyviolation`: script-src-elem, script-src, connect-src). 사소한 지적은 DEF-09-08 |
| 8c | HTTPS 전제 | **미검증** | 로컬은 HTTP. HSTS 헤더(`max-age=31536000; includeSubDomains`)는 붙지만 HTTPS 응답에서의 실효는 실서버가 있어야 확인 |
| 9a | TURN 단기 HMAC 임시 자격증명, 고정 비밀번호 금지 | **통과** | `username=<만료>:<참가자ID>`, `credential=HMAC-SHA1(TURN_SECRET)`, TTL 기본 1시간. 고정 비밀번호 없음(TC-131~133·433) |
| 9b | `denied-peer-ip` 사설·루프백 차단 | **통과(IPv4)** | `COTURN_LIVE=1 REQUIRE_COTURN=1`로 실제 coturn에 대해 `coturnLive`·`coturnConfig` 8건 통과(공인 허용·사설 거부 양성 대조군 포함). IPv6 릴레이(L3)는 미검증 |
| 9c | TURN 할당량 제한 | **설정은 있음, 남용 경로 남음** | `user-quota=12`, `total-quota=300`, `max-bps=1500000`, `bps-capacity=0`. 임시 자격증명은 방을 만들 수 있는 누구에게나 발급되어 총량 고갈·대역폭 무단 사용 가능(DEF-09-06, Medium, 정적 분석) |
| 10a | 비밀값은 `.env`만, 커밋 금지 | **통과** | 추적 파일 중 `.env`류는 `.env.example`뿐, 이력 전체(`git log --all`)에도 `.env`·`.pem`·`.key` 추가 이력 없음. 키·토큰 패턴(`BEGIN PRIVATE`, `AKIA…`, `ghp_…`, `sk-…` 등) 0건. 하드코딩 비밀 후보는 시험용 상수뿐 |
| 10b | 로그에 개인정보·SDP·토큰 금지 | **통과** | `LOG_LEVEL=debug` 운영 빌드에 공격 시험 전체(위조·사칭·강퇴·연타·IPv6)를 가한 뒤 로그 3개 파일(총 65줄) grep: 토큰(`eyJ`)·`127.0.0.1`·`::ffff`·`2001:db8`·닉네임·비밀번호·`v=0`·`<img`·`candidate`·TURN 비밀 **모두 0건**. 남는 것은 방 ID 앞 6자·인원수·이벤트 종류뿐 |
| 10c | `npm ci`+lockfile, `npm audit` | **통과** | `npm audit`·`npm audit --omit=dev` 취약점 0건, `npm ci --dry-run` 정상(lock 동기). 421개 항목 전부 `registry.npmjs.org` 해석, 무결성 해시 누락 0 |
| 11 | 대기실에 IP 노출 가능성 고지 | **통과** | `strings.ts`·UX-09·IT-26. 처리방침 초안에도 WebRTC IP 노출 명시 |
| 12 | 오류 응답에 내부 정보 금지 | **통과** | 잘못된 JSON·100KB 본문·퍼센트 오류·`%00`·5000자 경로·프로토타입 오염 쿼리 모두 `{"code":"..."}`뿐(F1~F6, ODD). 소켓 ack는 `{ok,code,message}`이고 message는 짧은 일반 문구. 서버 로그에도 예외 종류만 |
| 13 | admin 리스너 127.0.0.1 한정 | **통과(로컬)** | `/proc/net/tcp`에서 공개 포트는 `0.0.0.0`, admin 포트는 `127.0.0.1`(0100007F)만 LISTEN. 비루프백 주소 192.0.2.2의 admin 포트 → `ECONNREFUSED`, 공개 포트의 `/admin/...`은 404, 토큰 없으면 401(J1~J3). 인증은 SHA-256+상수 시간 비교. **실환경 비노출은 미검증** |

### 4.2 OWASP Top 10 (2021) 대응 점검
| 항목 | 결과 | 근거 |
|---|---|---|
| A01 접근 통제 | 통과(DEF-09-01 제외) | 4.1 #3~4. 서버 상태 기반 권한, 수평(타 방)·수직(비호스트→호스트) 시도 전부 거부. **IPv6 우회는 통제 회피이므로 High** |
| A02 암호화 실패 | 통과 | bcrypt 비용 10, HMAC-SHA256 토큰(타이밍 안전 비교), 128비트 난수 ID, IP는 HMAC 해시만 보관. 평문 비밀번호 저장·전송 없음(비밀번호는 입장 요청 본문에만 있고 TLS는 배포 전제). 영상은 WebRTC DTLS-SRTP(브라우저 기본) |
| A03 인젝션 | 통과 | SQL·셸 호출 없음(DB 없음, `child_process` 없음 — 소스 grep). XSS는 4.1 #7. 명령·경로 주입 입력은 정규식·zod로 제한 |
| A04 불안전 설계 | 지적 | DEF-09-02·05·06(자원·남용 설계), DEF-09-01 |
| A05 보안 설정 오류 | 지적(경미) | DEF-09-04(NODE_ENV 기본값), DEF-09-08(CSP 외부 폰트 허용). 헤더 전반은 양호 |
| A06 취약·노후 구성요소 | 통과 | 0건. engine.io 6.6.11은 2026 권고 3건(CVE-2026-102599·59724·59725, 수정 6.6.10·6.6.7)의 수정 버전 이상이다. 웹 검색(권고 DB) 결과이며 `npm audit`와 일치 |
| A07 식별·인증 실패 | 통과(DEF-09-01·03 제외) | 로그인 없음(비목표). 비밀번호 방 시도 제한·토큰 검증 |
| A08 소프트웨어·데이터 무결성 | 통과(경미 지적) | lockfile+`npm ci`, 설치 스크립트는 esbuild·fsevents(dev, 정상)뿐. CI 권한·액션 고정은 DEF-09-07 |
| A09 로깅·모니터링 실패 | 지적(경미) | 민감정보 비노출은 통과. 대신 **보안 사건 자체(비밀번호 차단, 위반 누적 종료)가 로그에 안 남아** 공격을 못 알아챈다(DEF-09-09) |
| A10 SSRF | 해당 없음 | 서버가 사용자 입력 URL을 가져가는 코드 없음. 운영자 연락처 https 값은 링크로만 표시 |

### 4.3 실제 공격 시도 결과(로컬 프로세스, 모두 서버 상태 영향 없음 확인)
| 구분 | 시도 | 결과 |
|---|---|---|
| 위조 토큰 | 7종(위 4.1 #3) + 세션 토큰 hostClaim 바꿔 쓰기 + 다른 방 hostClaim + 사용된 hostClaim 재사용 | 전부 거부(재사용은 일반 참가자로만 입장) |
| 사칭 | `from`·`nickname`·`isHost` 주입, 입장 전 이벤트, 타 방 신호·강퇴 | 전부 거부 |
| 거대 페이로드 | 소켓 1MB 프레임, 31KB 채팅, SDP 16385B, REST 100KB, 바이너리 첨부 과다 | 모두 거부·연결 종료, 서버 정상 |
| 연타 | 채팅 100연타, 잘못된 페이로드 40연타, 미등록 이벤트 5000연타 | 앞 두 건은 속도 제한+연결 종료. 미등록은 관찰 OBS-09-02 |
| 강퇴 우회 | 같은 IP 재입장, 옛 토큰 resume, 강퇴된 소켓 | 거부. **IPv6 이웃 주소 재입장은 성공(결함)** |
| CORS·Origin 위조 | 허용 외·null·접미·대문자 Origin, 사전 요청, `text/plain` 본문, 실브라우저 교차 Origin | 전부 거부 |
| 경로 순회 | 정적 파일 14종(`..`·`%2e%2e`·`%5c`·`%00`·`//`·`.env`·`.git/config`·`/apps/server/dist/index.js` 등, 원시 TCP로 전송) | 전부 SPA `index.html`로만 응답, 파일 내용 유출 0 |
| 헤더 | `/`·`/api/meta`·정적 자산 | 4.1 #8b와 같음 |
| 연결 폭주 | 완성 연결 9개 시도(상한 5), 원시 엔진 연결 2000개 | 완성 연결은 상한에서 거부, **원시 연결은 2000개 모두 수용(DEF-09-02)**. 그동안 `/healthz` 17ms, 정상 소켓 연결 가능 |
| 비밀번호 대입 | 한 IPv4 40회 / 소켓 18개 동시 / IPv6 /64 주소 40개 | IPv4: 5회 오답 후 `TOO_MANY_ATTEMPTS`. 동시: **18건 모두 검증됨**. IPv6: **40건 모두 `WRONG_PASSWORD`(제한 없음)** |
| 방 생성 제한 | 한 IPv4 25회 / IPv6 /64 주소 25개 | IPv4: 10회 후 429. IPv6: **25건 모두 201** |
| 압축 폭탄 | WebSocket permessage-deflate 협상 요청 | 확장 협상 없음(압축 꺼짐) |

### 4.4 이 단계에서 추가한 시험(자동, 저장소에 남김)
`docs/05-qa/test-cases.md`에 행이 자동 생성됨(`node scripts/check-docs.mjs --gen`). 번호는 기존 최대(TC-524·IT-102) 다음이다.
| ID | 내용 | 파일 | 결과 |
|---|---|---|---|
| TC-530 | IPv6 /64 이웃 주소로 비밀번호 시도 제한 우회(DEF-09-01) | `apps/server/test/security09.test.ts` | expected fail(결함 재현) |
| TC-531 | 강퇴된 사용자가 이웃 IPv6 주소로 재입장(DEF-09-01) | 〃 | expected fail |
| TC-532 | 방 생성 속도 제한이 이웃 IPv6 주소로 우회(DEF-09-01) | 〃 | expected fail |
| TC-533 | CONNECT 없는 엔진 연결이 IP 상한을 우회(DEF-09-02) | 〃 | expected fail |
| TC-534 | 동시 오답이 5회 제한을 넘어 검증됨(DEF-09-03) | 〃 | expected fail |
| TC-535 | NODE_ENV 미지정 시 예시 비밀값 허용(DEF-09-04) | 〃 | expected fail |
| TC-538 | 입장 안 할 방으로 방 수 상한 고갈(DEF-09-05) | 〃 | expected fail |
| TC-536 | 위조 세션 토큰 6종·세션 토큰의 hostClaim 전용 | 〃 | 통과 |
| TC-537 | 1MB 프레임 1009 종료, 바이너리 첨부 과다 거부 | 〃 | 통과 |
| IT-110 | 실브라우저: 소켓 직접 전송 악성 채팅 10종 + CSP 실효 | `e2e/security09.spec.ts` | 통과 |
| IT-111 | 실브라우저: 다른 Origin 페이지의 API·소켓 시도 차단 + 응답 헤더 | 〃 | 통과 |

`it.fails`로 남긴 7건은 결함이 수정되면 "예상 밖 통과"로 실패해 알려 준다. 각각 **수정 전에는 `it.fails`를 일반 `it`으로 바꿔 실행해 의도한 단언에서 실패함을 확인**했다(TC-530 `expected 12 <= 5`, TC-531 이웃 주소 `KICKED` 기대에서 실패하고 같은 주소 대조군은 통과, TC-532 `expected 0 > 0`, TC-533 `expected 40 <= 10`, TC-534 `expected 12 <= 5`, TC-535 예외 미발생, TC-538 `expected 503 to be 201`). 설정·준비 오류로 실패하는 것이 아님을 확인했다.

## 5. 커버리지
- 커버리지 지표: 라인·브랜치 커버리지는 측정하지 않았다(보안 검증은 코드 줄이 아니라 공격 표면 열거 기준). 표면 열거: 공개 HTTP 라우트 4개(`/healthz`, `/api/meta`, `POST /api/rooms`, `GET /api/rooms/:id`)+정적 파일·SPA 폴백, Socket.IO 클라이언트→서버 이벤트 12종(`RATE_SPECS` 키와 `on(` 호출 12개를 대조), admin 리스너 1개 경로, 환경변수 22개 항목, 외부 호출(STUN·TURN)·로그 출력·`localStorage`/`sessionStorage` 사용처(닉네임, 호스트 클레임). 전부 4절에서 한 번 이상 시도·검토했다
- 커버되지 않은 부분과 사유: 2절 제외 범위(실서버·Docker·CI 실행·IPv6 실소켓·법률)

## 6. 결함(Defect) 목록
심각도 근거는 기획의 비즈니스 영향(핵심 약속: 링크로 입장, 비밀번호 방·강퇴·잠금으로 회의 통제, 1인 운영·서버 1대)과 연결했고 낮추지 않았다.

| ID | 설명 | 재현 절차 | 심각도 | 상태 | 조치 내용 |
|----|------|-----------|--------|------|-----------|
| **DEF-09-01** | **IPv6 주소 회전으로 IP 기반 통제가 모두 무력화된다.** 속도 제한·비밀번호 시도 제한(IP+방)·강퇴 차단(IP 해시)·입장 시도 제한·방 생성 제한이 `clientIp()`가 돌려준 **IPv6 전체 주소** 단위다. IPv6 사용자는 보통 /64 이상을 받아 주소를 임의로 바꿀 수 있어 통제가 사실상 없다. 영향: ① CLAUDE.md 보안 규칙 "입장 시도를 IP+방 기준 제한"·"강퇴 세션 재입장 차단" 위반 ② 링크만 아는 공격자가 최소 4자인 비밀번호를 제한 없이 대입(방 비밀번호 방 기밀성) ③ 강퇴된 괴롭힘 사용자가 즉시 재입장 ④ 방 생성·입장 속도 제한 우회로 DEF-09-05·06 증폭. 완화 요인(심각도를 낮추지 않는 근거): 방 ID 128비트는 여전히 비밀이고 서버가 IPv6로 열려 있어야 한다. 그러나 `listen(port)`는 IPv6 가능 호스트에서 `::`로 열리고 대부분의 클라우드·가정망이 IPv6를 준다 | `npx vitest run --root apps/server test/security09.test.ts`의 TC-530·531·532(`it.fails`를 `it`으로 바꾸면 `expected 12 <= 5`, 이웃 주소 `KICKED` 기대 실패, `expected 0 > 0`). 수동: 서버를 `TRUST_PROXY=1`로 띄우고 `X-Forwarded-For: 2001:db8:abcd:1::1`, `…::2`, …로 같은 방에 오답 40회 → 40회 모두 `WRONG_PASSWORD`(대조군 IPv4는 5회 후 `TOO_MANY_ATTEMPTS`). 방 생성 25회 → 25건 모두 201(IPv4는 10회 후 429) | **High** | **Open** | 권고: `clientIp()`(`apps/server/src/http/clientIp.ts`) 한 곳에서 정규화 — IPv4-mapped(`::ffff:a.b.c.d`)는 IPv4로, 그 밖의 IPv6는 **/64 접두**로 마스크한 값을 키로 쓴다(제한기·`ipConnections`·`ipKey`·`passwordAttempts` 전부 이 값 사용). TC-530~532의 `it.fails`를 일반 `it`으로 전환해 회귀로 고정. 5단계(제품 수정)로 반려 필요. 03 §6 설계서에 IPv6 단위 명시 |
| **DEF-09-02** | **IP당 동시 연결 상한이 엔진 연결에는 적용되지 않는다.** 상한이 `io.use()`(네임스페이스 CONNECT 이후) 미들웨어에만 있어, CONNECT 패킷을 보내지 않는 엔진 WebSocket은 한 IP가 무제한으로 열 수 있다(Socket.IO 기본 `connectTimeout` 45초 동안 유지, 끊기면 다시 연다). 공개 HTTP 리스너에도 `maxConnections`가 없다. 03 §232·`security.md` T4가 "IP당 동시 연결 상한"이라 적은 것과 구현이 어긋난다 | TC-533(`expected 40 <= 10`). 수동: `IP_MAX_CONNECTIONS=5`로 기동 후 `ws://…/socket.io/?EIO=4&transport=websocket`를 허용 Origin 헤더로 2000개 연결(CONNECT 패킷 안 보냄) → 2000개 모두 수락, 서버 RSS 82→125MB, fd 22→2022, `/healthz`는 17ms로 정상 | **Medium** | **Open** | 근거: 인증 없이 단일 IP로 fd·메모리 고갈 가능하나 연결당 약 22KB라 중소 규모에서는 즉시 마비되지 않고 리버스 프록시로 완화 가능. 권고: Socket.IO `connectTimeout`을 3~5초로 줄이고(`new Server(..., { connectTimeout: 5000 })`), `io.engine.on('connection')`/`allowRequest`에서 IP별 엔진 연결 수를 세어 상한 적용, 프록시에 `limit_conn`·SYN 제한 문서화(runbook) |
| **DEF-09-05** | **입장하지 않을 방으로 서버 방 수 상한을 채워 서비스 거부.** 아무도 입장하지 않은 방이 `ROOM_EMPTY_TTL_MIN`(기본 10분) 동안 `MAX_ROOMS`(기본 100)를 차지한다. 한 IP가 생성 한도(분당 10회)만 지켜도 약 9분에 100개를 채우고 이후 만료되는 만큼 계속 다시 만들면, 다른 모든 사용자의 새 회의 생성이 503(`SERVER_BUSY`)이다. 핵심 약속("링크 클릭 후 3번 조작")의 시작점이 막힌다. IPv6 회전(DEF-09-01)이면 한도 자체가 없다 | TC-538(`MAX_ROOMS=10`에서 한 IP가 10개 생성 후 다른 IP의 생성 → `expected 503 to be 201`). 수동: `MAX_ROOMS=100`에서 `POST /api/rooms`를 분당 10회 반복 → 약 9분 뒤 타 IP 503 | **Medium** | **Open** | 근거: 기존 방의 입장·진행은 영향 없고 프록시 IP 차단으로 복구 가능, 데이터 유출 아님 → Medium(1인 운영 MVP에서 쉽게 반복되므로 공개 출시 전 필수). 권고: 호스트가 아직 입장하지 않은 방의 TTL을 짧게(예: 2분, hostClaim 유효 60분과 별개), IP당 동시 미입장 방 상한(예: 3), 방 수 포화 시 로그 경고 |
| **DEF-09-06** | **TURN 임시 자격증명이 방을 만들 수 있는 누구에게나 발급**되어 relay 대역폭 무단 사용과 할당량 고갈이 가능하다(정적 분석, 미재현). 한 번의 입장·재접속마다 새 사용자명(`<만료>:<참가자ID>`)이 발급되어 `user-quota=12`는 사용자명 단위라 우회되고, `total-quota=300`을 25개 정도의 자격증명으로 채워 정상 사용자의 TURN을 막을 수 있으며, `bps-capacity=0`(총량 무제한)·`max-bps` 세션당 12Mbps로 총량이 크다. 거부된 사설 대역은 막히나 공인 주소 relay는 허용 | 정적 확인: `apps/server/src/security/turn.ts`(참가자 ID별 자격증명), `infra/coturn/turnserver.conf`(`user-quota`·`total-quota`·`bps-capacity`). 서버 로그·coturn 실부하 재현은 하지 않았다(제3자·비용 영향 방지) | **Medium** | **Open(수용 여부 사용자 결정)** | 근거: WebRTC 앱의 구조적 잔여 위험이고 자격증명 TTL 1시간·사설 대역 차단·할당량으로 완화되어 있으나 총량 상한이 없다. 권고: `TURN_TTL_SEC`를 10~15분으로, `bps-capacity`·호스트 대역폭 알림 설정, TURN 사용량 모니터링(로그 집계), 필요 시 ICE 실패 후에만 TURN 자격증명 요청. 배포 대상·비용 결정(규칙 E)과 함께 판단 |
| DEF-09-03 | **비밀번호 오답 5회 제한은 "검증이 끝난 실패"만 센다.** 실패는 bcrypt 검증이 끝난 뒤 기록되므로 한 IP가 연 소켓 수(`IP_MAX_CONNECTIONS`, 기본 20)만큼 동시에 보낸 오답은 모두 검증된다 | TC-534(`expected 12 <= 5`). 수동: 한 IP로 소켓 18개 연결 후 동시에 오답 `room:join` → 18건 모두 `WRONG_PASSWORD`. 이어서 `TOO_MANY_ATTEMPTS` | Low | Open | 근거: 창 한 번에 최대 소켓 수만큼 초과할 뿐이고 이후 차단된다(M3 확인). 권고: 검증 전에 "진행 중 시도"를 시도 수에 포함(예약 후 성공 시 취소). DEF-09-01 수정 시 함께 |
| DEF-09-04 | **예시 비밀값 거부가 `NODE_ENV=production`일 때만 동작하는데 `NODE_ENV` 기본값이 `development`다.** `.env.example`의 `SESSION_SECRET=change-me-…`를 그대로 두고 `NODE_ENV`를 빠뜨리면 공개된 값으로 서명하는 서버가 뜬다(Dockerfile은 production을 설정하므로 `npm start` 직접 실행 경로의 문제) | TC-535: `NODE_ENV` 없이 `SESSION_SECRET=change-me-change-me-change-me-change-me`로 `loadConfig` → 예외 없음 | Low | Open | 근거: 세션 위조에는 방 ID·참가자 ID를 알아야 하고, hostClaim 위조는 호스트 미입장 방에만 유효해 영향이 제한적. TURN_SECRET 예시값이면 relay 무단 사용(DEF-09-06 증폭). 권고: 접두 `change-me`는 `NODE_ENV`와 무관하게 거부(시험 시 `NODE_ENV=test`에서만 허용), 또는 `NODE_ENV` 기본값을 `production`으로 |
| DEF-09-07 | **CI·공급망 위생**: ① `.github/workflows/ci.yml`에 `permissions:` 블록이 없어 저장소 기본 토큰 권한(쓰기일 수 있음)을 따른다 ② 액션이 변경 가능한 태그(`checkout@v5`, `setup-node@v5`)로 고정 ③ Dependabot·Renovate 설정 없음 ④ `apps/server/package.json`의 `esbuild: "*"`(와일드카드) ⑤ Docker 기본 이미지가 `node:22-alpine`·`coturn/coturn:4.9` 태그만(다이제스트 고정 없음) ⑥ `@meetlite/shared·server·web` 이름이 npm에 미등록(404)이라 워크스페이스 링크가 풀리는 환경에서 `npm install`을 잘못 실행하면 의존성 혼동 위험(lockfile은 링크로 고정되어 `npm ci`는 안전) | 정적 확인: `ci.yml` 전체, `npm view @meetlite/shared` → E404, `apps/server/package.json` | Low | Open | 권고: `permissions: { contents: read }`, 필요 시 액션을 커밋 SHA로 고정, Dependabot 주간 설정, `esbuild`를 caret 범위로, 이미지 다이제스트 고정은 배포 시 결정, 스코프 `@meetlite` 예약(선택). 인프라 설정이므로 이번 단계에서 수정하지 않음 |
| DEF-09-08 | **CSP가 실제로 쓰지 않는 외부 호스트를 허용**한다: `style-src https://fonts.googleapis.com`, `font-src https://fonts.gstatic.com`. 처리방침 초안은 "외부 폰트 없음"이라 적었고 코드에도 사용처가 없다. 스타일 속성 `'unsafe-inline'`(`style-src-attr`)도 허용한다 | 소스 grep(`fonts.g` 0건, `apps/web/src`·`index.html`), `GET /` 응답 CSP | Low | Open | 권고: 두 호스트 제거(최소 권한), `style-src-attr 'unsafe-inline'`은 Tailwind·인라인 스타일 사용 여부 확인 후 판단. 스크립트 실행에는 영향이 없다(`script-src 'self'`, IT-110) |
| DEF-09-09 | **보안 사건이 로그에 남지 않는다.** 비밀번호 오답 차단(`TOO_MANY_ATTEMPTS`), 위반 15회로 인한 연결 종료, IP 상한 거부, 입장 거부가 로그가 아니다(08의 DEF-S-01과 같은 뿌리). 공격이 진행돼도 운영자가 알 수 없다. 개인정보 비식별 원칙 때문에 IP는 못 남기지만 사건 종류·방 ID 앞 6자는 남길 수 있다 | 4.3의 공격을 가한 뒤 서버 로그 확인: `participant joined`·`room created`·`http error`만 있음 | Low | Open | 권고: `info {event:'join-denied', code}`, `warn {event:'strike-disconnect'}` 등 종류별 한 줄 로그(IP·닉네임 제외), 집계 알림은 배포 대상 결정 후 |

- 결함 요약: **Critical 0, High 1, Medium 3, Low 5**(9건 모두 Open, DEF-09-06은 수용 여부를 사용자가 결정). 무결함이라고 말할 수 있는 항목은 4.1 "통과" 행이며 각 행에 근거 시험을 적었다
- **과거 단계에서 이연된 보안 관련 결함과의 관계**: DEF-S-03(IP 해시 강퇴의 같은 공인 IP 오차단 — 설계 A-05)은 이 감사에서도 유효(보안 > 편의, 현행 유지)하며 DEF-09-01과 방향이 반대(과차단 vs 과소차단)다. DEF-09-01 수정 시 /64 단위 차단이 같은 /64 사용자를 함께 막는 오차단이 늘 수 있음을 03에 명시해야 한다

### 6.1 관찰·설계 한계(결함 아님, 사용자가 알아야 할 것)
- OBS-09-01 **IPv4 주소 변경 우회**: 강퇴는 세션+IP 해시 차단이라 모바일 데이터·VPN으로 IP를 바꾸면 비밀번호·잠금 없는 방에 재입장할 수 있다(A-05, 계정 없음이 비목표이므로 구조적 한계). 호스트가 방 잠금을 쓰는 것이 유일한 완화. `privacy.md`/UX 안내에 한계를 적을 것을 권고
- OBS-09-02 등록되지 않은 소켓 이벤트 이름의 연타는 위반 집계 대상이 아니다(핸들러 없음). 5000개×1KB 연타에도 `/healthz` 2ms로 영향이 작았다. 연결당 CPU 상한은 프록시 수준에서 다루는 것이 현실적
- OBS-09-03 **화면공유 슬롯 점유**: 비호스트 참가자가 `screen:start`만 보내고 공유하지 않아도 슬롯을 잡아 다른 사람의 화면공유(`SCREEN_BUSY`)를 막을 수 있다. 호스트가 해당 참가자를 강퇴하는 수단뿐이며 호스트의 강제 해제는 없다(범위 판단은 사용자)
- OBS-09-04 링크 표시 문자열과 실제 `href`가 다를 수 있다(IDN은 `href`에서 퓨니코드). 가짜 링크(호모그래프)는 채팅의 본질적 한계이며 `rel`·http(s) 제한으로 스크립트 위험은 없다
- OBS-09-05 세션 토큰은 소켓·IP에 묶이지 않는 소지자 토큰이다(탈취 시 같은 참가자로 접속, 같은 토큰의 새 소켓이 이전 소켓을 종료). 토큰은 메모리에만 있고 `sessionStorage`에 저장하지 않는다(DEC-011). 설계 의도
- OBS-09-06 `TRUST_PROXY>0`인 서버를 프록시를 거치지 않고 직접 열어 두면 클라이언트가 `X-Forwarded-For`로 IP를 임의 지정해 **IPv4 포함 모든 IP 통제**를 우회할 수 있다(TC-422가 오른쪽 N번째만 신뢰함을 확인했지만 프록시가 없으면 의미 없음). 배포 시 앱 포트를 프록시에서만 접근 가능하게 해야 한다(runbook에 한 줄 명시 권고)
- OBS-09-07 문서 정합: `privacy.md` 표는 "IP 주소 원문 저장 안 함"이라 쓰지만 속도 제한용 원문 IP를 메모리에 최대 약 15분 보관한다(앱 내 처리방침 초안 `strings.ts`는 이미 이 사실을 정확히 적었다). `privacy.md`도 같은 표현으로 맞출 것
- OBS-09-08 이 환경에서는 실제 bcrypt 동시 18건 검증 중 `/healthz` 응답이 3ms로, bcryptjs가 이벤트 루프를 장시간 막지 않음을 확인했다(비용 10)

## 7. 의존성·라이선스·공급망 점검 상세
- **CVE**: `npm audit` 0건(전체·`--omit=dev`). 런타임 핵심: express 5.2.1, socket.io 4.8.4, engine.io 6.6.11, ws 8.21.3(최신 8.22.0, 취약 아님), socket.io-parser 4.2.7, helmet 8.3.0, bcryptjs 3.0.3, zod 4.6.5, pino 10.3.1. 웹 검색으로 2026 engine.io 권고 3건을 확인했고 설치 버전이 수정 버전 이상. `npm view`로 deprecated 표시 없음 확인
- **의존성 환각(slopsquatting) 점검**: package.json 직접(외부) 의존성 29개 전부와 lockfile 외부 패키지 400개를 `npm view`로 조회 — **400개 모두 공식 레지스트리에 실존**(미존재 0). 미조회 3개는 이 저장소의 워크스페이스(`@meetlite/*`, 레지스트리 404 정상). 최근 등록 패키지(2025-06 이후 등록 13개: `@pinojs/redact`, `obug`, `hashery`, `@cacheable/memory`, `@keyv/bigmap`, `@cacheable/utils`, `@jridgewell/remapping`, `@babel/helper-globals`, rolldown·esbuild·lightningcss 플랫폼 바이너리 등)는 모두 알려진 메인테이너·공식 저장소(pino·babel·evanw·rolldown·parcel·jaredwray·sxzz 등)이고 `@pinojs/redact`만 운영(prod) 의존성이다. 이름이 흔한 패키지의 오타·유사 이름으로 보이는 항목 없음. 5단계 이후 새로 도입된 직접 의존성은 확인되지 않음(저장소 `package.json` 변경 없음)
- **무결성**: lockfile 421개 항목 전부 `https://registry.npmjs.org/` 해석, `integrity` 누락 0, 비레지스트리 URL 0. 설치 스크립트가 있는 패키지는 `esbuild`·`fsevents`(dev, 정상)뿐
- **라이선스**: MIT 349, ISC 24, Apache-2.0 22, BSD 10, MPL-2.0 12(전부 `lightningcss` 계열 **dev 빌드 도구**, 배포 산출물에 포함되지 않아 파일 단위 카피레프트 영향 없음), CC-BY-4.0 1(`caniuse-lite`, dev 데이터), 0BSD·BlueOak 각 1(dev), 메타데이터 UNKNOWN 1(`xmlhttprequest-ssl` 2.1.2 — `LICENSE` 파일이 MIT, socket.io-client 경유). **강한 카피레프트(GPL/AGPL/LGPL/SSPL) 0건**. 프로젝트 자체 `LICENSE` 파일은 없다(사용자 결정 대기, 기존 미결)
- **Dockerfile(정적)**: 다단계 빌드, 런타임 `USER node`, `npm ci --omit=dev`(서버 워크스페이스만), `HEALTHCHECK`, `.dockerignore`가 `**/.env`·`.git`·`docs`·`e2e` 제외. 지적: 이미지 다이제스트 미고정(DEF-09-07), 읽기 전용 루트 파일시스템·`no-new-privileges`는 compose에 없음(배포 설정에서 권고). **이미지 빌드·실행은 미검증**
- **compose/coturn(정적+실측)**: coturn 설정은 실제 coturn 4.6.1에서 `coturnLive` 통과. 지적: `--static-auth-secret=${TURN_SECRET}`가 명령행에 들어가 `docker inspect`·프로세스 목록에서 보인다(Low, 같은 호스트의 권한자만 열람 가능, 개발용 compose). 운영에서는 파일·시크릿 마운트 권고. `network_mode: host`라 호스트 방화벽 정책이 TURN 노출을 결정한다(문서에 명시되어 있음)
- **CI**: DEF-09-07. 시크릿 사용 없음, 트리거는 `pull_request`(`pull_request_target` 아님)라 포크 PR에서 시크릿 노출 경로 없음, `npm audit --audit-level=high` 포함(낮음·중간은 게이트 아님)

## 8. 개인정보·컴플라이언스·이용약관·규제 항목
| 항목 | 결과 | 근거 |
|---|---|---|
| 수집 최소화 | **통과** | 계정·DB 없음. 닉네임(방 메모리), IP는 속도 제한용 원문(메모리 ≤약 15분, TC-343)과 강퇴 시에만 HMAC 해시(방 수명). 채팅·SDP는 저장·로그 없음(라이브 로그 grep 0건) |
| 보관기간·파기 구현 | **통과(문서 정합 지적 OBS-09-07)** | 방 소멸·빈 방 TTL·유예 만료로 메모리 파기(TC-440). IP 키 정리 타이머 unref(TC-343c). 로그 비식별(TC-342, IT-94, 이번 라이브 로그) |
| 제3자 제공·위탁 고지 | **통과(법령 판단은 미확인)** | STUN(`stun.l.google.com`)·TURN으로 IP가 전달됨을 대기실·처리방침 초안에 명시(`strings.ts`, `privacy.md`). 국외 이전 해당 여부·동의 필요 여부는 법률 판단 필요 → **미확인(U-04)** |
| 설계서 원칙과 구현 일치 | **부분** | 대부분 일치. 불일치: 03 §232·`security.md` T4의 "IP당 동시 연결 상한"이 엔진 연결에는 적용 안 됨(DEF-09-02), IPv6 단위 미명시(DEF-09-01) |
| 외부 데이터·API 이용약관 | **통과(약관 원문은 미확인)** | 외부 호출은 브라우저의 STUN 바인딩 요청뿐(연결당 소수 회, 크롤링·스크래핑·서버측 외부 API 호출 없음). Google STUN 이용약관·한도 원문은 확인하지 못했다 → 미확인(03 §R-2 이월) |
| 규칙 I(인허가·규제 업종) 반영 | **해당 없음(DEC-002·1단계 §72 결론)** | 금융·의료·법률·보험 업종이 아니며 등록된 인허가·면책 REQ-ID가 없다. 서비스 화면에도 조언·추천 성격 문구 없음. 규칙 I의 정신(개인정보 법령 확인)은 별도 항목(U-04, 법률 초안 `draft` 리본)으로 처리 중이며 미확정 |
| 규칙 J(AI/LLM) 반영 | **해당 없음(DEC-002·1단계 §152 결론)** | 소스에서 LLM·AI SDK·프롬프트·외부 모델 호출 grep 0건(`openai|anthropic|llm|gpt|gemini|langchain`). 프롬프트 인젝션·출력 기반 XSS 항목은 대상 기능이 없다. 단 채팅 출력 XSS는 일반 인젝션 항목으로 점검(IT-110 통과) |
| 법률 문구·운영자 정보 | **미완(사용자 결정)** | `S.legal.status='draft'`("초안·법률 검토 전" 리본), `OPERATOR_CONTACT`·`SECURITY.md` 신고 창구 미정(운영 기동 시 경고 로그) |

## 9. 테스트 환경 정리(Teardown) 확인 — 규칙 K
- 이번 테스트에서 생성한 임시 아티팩트(모두 `.harness-tmp/sec09/`): 공격 스크립트 4개(`attack1~4.mjs`), 서버 로그 4개, 레지스트리 조회 결과(`registry.txt`·`names.txt`·`created.txt`), lockfile 분석 스크립트, E2E 전체 실행 출력. 추가로 `apps/server/test/tmp09check.test.ts`(`it.fails`→`it` 전환 확인용 임시 복사본)를 만들었다가 바로 삭제했다
- 위 아티팩트를 전부 `.harness-tmp/` 하위에서만 생성했는가: [x] 예 (예외: 위 임시 시험 복사본은 시험 파일 위치 제약상 `apps/server/test/`에 잠시 있었고 삭제함. 저장소에 남긴 것은 의도한 시험 2개·문서)
- 정리(삭제) 완료 여부: **완료** — `.harness-tmp/sec09/` 삭제. 공격용 서버 프로세스(3911·3921·3931·3941)는 종료했고 `/proc` 환경 스캔으로 잔여 0개 확인(`pkill -f`·`pgrep -f` 미사용). 증거 보존용으로 `attack1.out`·`attack2.out`는 세션 스크래치패드에 복사했다(저장소 밖)
- 정리 후 `git status` 실행 결과(원문):
```
 M docs/05-qa/test-cases.md
 M docs/traceability.md
?? apps/server/test/security09.test.ts
?? docs/harness/09-security-audit.md
?? docs/harness/verify-log_09-security-audit.md
?? e2e/security09.spec.ts
(위 6개는 이 실행이 만든 의도한 산출물·재생성 문서이며 그 외 미추적·변경 파일 없음. `.harness-tmp/`는 비어 있음)
```
- 병렬 실행: 해당 없음(단독 실행)
- 이번 테스트 도중 강제 중단(TaskStop 등): [x] 없음 (공격 스크립트 1개가 `ss` 명령 부재로 비정상 종료해 서버 자식 프로세스가 남았으나 즉시 `/proc`으로 찾아 종료·재실행함)

## 10. 전체 회귀 실행 로그 (이 단계 마지막 실행)
| 명령 | 결과 |
|---|---|
| `npm run lint` | 통과(오류 0) |
| `npm run typecheck` | 통과(오류 0, 웹·서버·shared·e2e) |
| `npm test` | shared 21 통과 / server **235 통과**·**8 expected fail**·4 skipped(기존 233·1·4 + 신규 통과 2·expected fail 7) / web 433 통과·1 expected fail |
| `node scripts/check-docs.mjs --gen` 후 `npm run check:docs` | 통과 — 테스트 791개(기존 780 + 11), 테스트 미연결 요구 0건, FR/UX 미참조 0건 |
| `npm audit` / `--omit=dev` | 취약점 0건 / 0건 |
| `COTURN_LIVE=1 REQUIRE_COTURN=1 vitest run coturnLive coturnConfig` | 8 통과 |
| `npm run build` + `npm run test:e2e` | **100 통과**·1 skipped(IT-29 soak, `SOAK_MINUTES` 미지정) (기존 98 + 신규 IT-110·111) |
| `npx vitest run --root apps/server test/security09.test.ts` | 2 통과·7 expected fail |
| Docker 이미지 빌드·compose·GitHub Actions | **미검증**(Docker 데몬 없음, CI 실행 불가) |

## 11. 내부 검증 (최소 2회, `verification-log-template.md` 사용)
- 1차 검증 결과 요약: 점검 항목 체크리스트(인증·인가, 인젝션, 시크릿, CVE, **환각 의존성**, 암호화, 오류 노출, 설계 대비 불일치, 개인정보, 라이선스, 이용약관, 규칙 I·J, CLAUDE.md 보안 규칙 13항목)를 모두 수행. 1차에서 **DEF-09-01·02·03·04**를 찾았고, 내 시험 설계 오류 2건(IT-110에서 CDP `evaluate` 안의 `eval`은 CSP 검사를 받지 않아 CSP 실효 판정이 틀림→페이지 타이머 문자열 실행으로 교체, 본문 밖 아이콘 `svg`를 HTML 주입으로 오탐→본문 범위로 한정)를 고쳤다
- 2차 검증 결과 요약: "공격자라면 어디를 노릴까" 관점으로 재검토해 **DEF-09-05(방 수 고갈)·06(TURN 자격증명 대량 발급)·07~09**와 관찰 OBS-09-01~08을 추가 발견. **카테고리를 가로지르는 연쇄**를 별도 점검(아래). 환경 보정(attack4)에서 H5 판정 오류(내 시험이 강퇴된 루프백 주소로 입장해 `NOT_JOINED`가 나옴)를 바로잡아 재실행 통과
- 연쇄 공격 점검 결과:
  1. 방 링크 유출 + **IPv6 회전(DEF-09-01)** + 최소 4자 비밀번호 → 비밀번호 방 입장(영상·음성 열람) — 유효한 연쇄. 방 ID가 비밀로 남아 있어 ID 추측은 불가. 결과: DEF-09-01 심각도 High 유지
  2. **IPv6 회전 + 방 생성 제한 우회 + 입장 안 할 방(DEF-09-05)** → 한도 없이 방 수 고갈. IPv4만 쓰는 공격자는 1 IP당 분당 10개
  3. **IPv6 회전 + 방 생성·참가 + TURN 자격증명 발급(DEF-09-06)** → relay 총량·할당량 고갈의 비용이 거의 0
  4. **엔진 연결 무제한(DEF-09-02) + IP 연결 상한 신뢰**: 상한을 믿고 프록시 `limit_conn`을 두지 않은 배포라면 fd 고갈. 완성 연결 상한은 정상이라 영향은 엔진 연결에 한정
  5. 인증 우회 + 출력 새니타이즈 누락(예: 사칭 후 XSS) — **성립하지 않음**: 사칭은 zod strict·서버 부여 ID로 불가, 채팅 출력은 텍스트 전용(IT-110)
  6. 강퇴 우회(IPv6/IPv4 변경) + 채팅 괴롭힘 — 가능하나 XSS·권한 상승으로 이어지지 않음(호스트 권한은 서버 상태, TC-536 말미 확인)
  7. 로그 노출 + 토큰 탈취 — 성립하지 않음(로그 grep 0건)
  8. 프록시 오설정(`TRUST_PROXY`)+IP 통제 — OBS-09-06
- 검증 로그 파일 경로: `docs/harness/verify-log_09-security-audit.md`

## 12. 리스크 및 잔존 이슈
- 이번 테스트로 커버되지 않는 알려진 리스크: 2절 제외 범위 전부(실서버 헤더·TLS, 실환경 admin 비노출, IPv6 실소켓, Docker·CI 실행, coturn 실부하·IPv6 릴레이, 법률, 외부 약관)
- 후속 조치가 필요한 항목:
  1. **DEF-09-01(High)을 5단계(제품 수정)로 반려** — 고친 뒤 TC-530~532를 일반 시험으로 전환하고 09를 다시 실행(규칙 F). 같은 변경으로 DEF-09-03을 함께 처리하면 효율적
  2. DEF-09-02·05(Medium)는 공개 출시 전 수정 권고, DEF-09-06은 배포 대상·비용 결정 후 수용 또는 완화 결정
  3. DEF-09-04·07·08·09(Low)는 5단계 또는 10단계(배포 설정)에서 처리
  4. 11단계 문서: 03 §6에 IPv6 통제 단위, `security.md` T4 정정, `privacy.md` OBS-09-07, runbook에 프록시 직접 노출 금지·`limit_conn` 안내
- **사용자 결정 필요(규칙 A)**:
  1. DEF-09-01 수정 시 차단 단위를 IPv6 /64로 할 것인가(같은 /64 사용자 오차단 가능성 수용) — 권고: 예
  2. DEF-09-06 TURN 자격증명 TTL·총량 정책과 비용 상한(`bps-capacity`) — 배포 대상 결정(규칙 E)과 함께
  3. OBS-09-01·03(강퇴 우회 한계 고지, 화면공유 강제 해제) 범위 포함 여부
  4. 기존 미결 유지: 법률 검토(U-04), 운영자 연락처·`SECURITY.md` 신고 창구, 프로젝트 라이선스, 배포 대상
- **미검증 목록(사용자가 알아야 할 것)**: 실서버 응답 헤더(HTTPS·HSTS 실효), 실환경 admin 비노출(방화벽·프록시·Docker 포트 매핑), Docker 이미지·compose·CI 실행, IPv6 실소켓·coturn IPv6, 법률·약관 원문

## 13. 결론 및 판정
- [ ] PASS
- [ ] CONDITIONAL PASS
- [x] **FAIL** — 사유: **High 결함 1건(DEF-09-01, IPv6 주소 회전으로 비밀번호 시도 제한·강퇴 차단·속도 제한 우회)** 이 Open이다. 규칙상 Critical/High가 있으면 PASS 불가. 재작업 요청: 5단계에서 IP 키 정규화(IPv6 /64)와 DEF-09-03을 수정하고 TC-530~532·534를 일반 시험으로 전환한 뒤 09를 재실행한다. Medium 3건(DEF-09-02·05·06)은 공개 출시 전 필수 검토, 나머지 Low 5건은 비차단
- 판정 근거: 보안 규칙 13개 중 인증·토큰·사칭·서버 권한·XSS·CORS/CSP·로그·오류·admin·시크릿·의존성은 라이브 공격과 실브라우저 시험으로 **통과**를 확인했다. 실패는 IP 단위 통제(IPv6, 엔진 연결, 방 수 상한 남용)에 집중되어 있다. 10단계(배포 테스트)는 DEF-09-01 수정·재검증 전에는 착수하지 않는 것을 권고한다(어차피 배포는 규칙 E로 사용자 승인 대기)
- 규칙 K Teardown(9절) 확인 완료, 임시 잔여물 없음

## 14. 공유 문서 갱신 요청 (traceability.md·decisions.md는 직접 수정하지 않음)
- `docs/harness/traceability.md` "보안검증(09)" 열: SEC-01·03·04·05·07·08·10·11 → **통과(09, 단 SEC-05 강퇴는 DEF-09-01 Open)**, SEC-02·06 → **실패(DEF-09-01 High·02·03·05)**, SEC-09 → **통과(설정·자격증명), DEF-09-06 Open**, 새 TC·IT 연결: SEC-02·06·POL-11 → TC-530·532·534, SEC-05·POL-06 → TC-531, SEC-06 → TC-533·537·538, SEC-03·04 → TC-536, SEC-07·08 → IT-110·111, SEC-10·NFR-08 → TC-535
- `decisions.md` 추가 제안(**DEC-027**): "9단계 보안 검증 결과 처리" — ① 판정 FAIL(High 1: DEF-09-01) ② DEF-09-01·03을 5단계로 반려(IP 키 정규화 `clientIp()`, 동시 시도 계수) ③ DEF-09-02·05는 공개 출시 전 필수로 분류, DEF-09-06은 사용자 결정 ④ Low 5건 이연 ⑤ 사용자 결정 질문 4건(12절) ⑥ 미검증 목록. 결정자: 오케스트레이터 기록 + 사용자 응답 대기. 비가역성: Low(코드 수정은 가역)
- `docs/05-qa/test-cases.md`(행 11개 추가)·`docs/traceability.md`: `node scripts/check-docs.mjs --gen`으로 이미 재생성(사용자 지시의 "행 추가" 이행)
- `docs/05-qa/defects.md`, `docs/04-security/security-checklist.md`: DEF-09-01~09와 4.1 판정 반영 필요(11단계 문서 정리 때)
