> **이 문서의 용도** — 누가: 사용자(배포 결정자)·오케스트레이터·11단계 문서 담당 / 언제: 배포 대상을 정하고 12단계(실배포, 별도 승인)로 가기 전 / 무엇을: 빌드·실행·롤백·인프라 설정이 "배포해도 안전한가", 그리고 배포 전에 누가 무엇을 결정·수정해야 하는지를 정한다.

# 테스트 결과서 — 10단계 배포 전 검증 (MeetLite, 커밋 95ec4f8)

## 1. 개요
- 테스트 대상: 전체 시스템의 **배포 가능성**(빌드 재현성, 운영 모드 기동·종료, Dockerfile·compose·coturn 설정, 롤백·재시작 절차, 배포 체크리스트). 제품 기능은 8단계 소관이라 다시 검증하지 않았다.
- 테스트 유형: 배포 전
- 적용 Tier: Standard (DEC-002, 규칙 B 최소 2회)
- 적용 속도 트랙: N/A (10단계)
- 병렬 실행 정보: 단독 실행 (ORCHESTRATOR 1장: 10단계는 단일 스테이징 환경 공유라 병렬화 금지)
- 테스트 목적: ① 같은 커밋에서 같은 산출물이 나오는가 ② 운영 설정 실수(누락·예시 비밀값)를 기동 단계에서 막는가 ③ **롤백을 실제로 한 번 해 보고** 문서대로 되는가 ④ 알림·모니터링이 수신 채널까지 이어지는가 ⑤ 배포 대상 선택에 필요한 사실 정리
- 관련 산출물: `CLAUDE.md`, `docs/06-ops/runbook.md`, `docs/03-engineering/infra-deploy.md`·`observability.md`, `docs/05-qa/release-checklist.md`, `docs/harness/units/unit-13-test.md`·`unit-14-test.md`, `08-full-system-test.md`, `09-security-audit.md`, `decisions.md`(DEC-006~027)
- 테스트 수행자(에이전트): 10-deploy-tester (Claude Sonnet 5.5)
- 테스트 일시: 2026-10-02

### 1.1 입력 계약 점검 (규칙 D) — 먼저 밝혀 둘 사항
| 입력 | 상태 | 비고 |
|---|---|---|
| 08 전체 시스템 | **CONDITIONAL PASS** (Critical/High 없음) | 조건: DEF-S-01~04 처리 — DEC-026이 S-02~04는 수정·정정, S-01은 사용자 결정 대기 |
| 09 보안 감사 | 문서상 **FAIL**(High DEF-09-01 Open으로 판정). 이후 커밋 95ec4f8이 DEF-09-01·03을 수정(DEC-027)했으나 **09의 재판정(PASS)은 기록되지 않았다** | 입력 계약("둘 다 PASS") 불충족 |
| 처리 | 사용자·오케스트레이터가 10단계 수행을 지시했으므로 **사전 점검으로 수행**한다. 9절 판정은 이 불충족을 조건으로 건다. 09 재판정 없이는 11단계로 넘기지 않는다 |

## 2. 테스트 범위 및 제외 범위
- 범위(In-Scope): (a) `npm ci`+`npm run build` 재현성, 이미지 내용 재현성 (b) `NODE_ENV=production` 기동의 환경변수 검증·`/healthz`·보안 헤더·admin 비노출·SIGTERM/SIGINT·종료 코드 (c) Dockerfile·`.dockerignore`·compose·coturn 정적+실행 점검, hadolint·trivy (d) runbook §1·§2·§6의 시작·교체·롤백·재시작·방 폐쇄를 **실제 컨테이너로** 실행 (e) 배포 후보 비교용 사실 (f) release-checklist 판정, 마이그레이션 해당 여부, 모니터링·알림 연결
- 제외 범위 및 사유:
  - **실제 프로덕션·외부 서비스 배포 일체**(규칙 E, 12단계·사용자 승인 필요). 가입·결제·외부 배포 없음
  - **스테이징 환경은 없다.** 원격 환경이 정의돼 있지 않다(배포 대상 미결, U-02). 대안으로 이 샌드박스에서 `dockerd`를 직접 띄운 **로컬 컨테이너 재현**을 썼다(3절). "스테이징에서 검증했다"고 말하지 않는다
  - 실서버 HTTPS·리버스 프록시·인증서·방화벽·UDP 포트 개방, 실제 TURN 릴레이 통화, 도메인·DNS, 비용
  - GitHub Actions 실제 실행(`actionlint` 이미지는 Docker Hub 429로 받지 못함 — 미검증)
  - 제품 코드·Dockerfile·compose·`ci.yml`·`turnserver.conf` **수정 없음**(결함은 기록만). 하네스 복사본 수정 없음. 커밋·푸시 없음

## 3. 테스트 환경
- 실행 환경: Linux 6.18, Node 22.22.0(호스트), Docker Engine 29.6.2 / Compose v5.3.1. **Docker 데몬이 기본으로는 없어서**(`docker info`가 Server 연결 실패) `dockerd --iptables=false --bridge=none --data-root·--exec-root·--pidfile·-H` 전부 `.harness-tmp/d10/` 아래로 직접 기동했다(unit-13과 같은 방식). 컨테이너는 `--network=host`로 실행했다.
- 환경 한계용 우회(Dockerfile 수정 아님): Docker Hub 429·프록시 때문에 `mirror.gcr.io/library/node:22-alpine`(Node 22.23.3)에 프록시 CA만 얹은 로컬 베이스를 `node:22-alpine`으로 태그하고 `--build-arg HTTPS_PROXY`로 빌드. Dockerfile 본문은 그대로 빌드했다. coturn·hadolint·trivy는 Docker Hub/ghcr에서 직접 받았다.
- **운영과 다른 점(결과 해석에 반영)**: `-p 3001:3001` 포트 매핑·브리지 네트워크·TLS 종단 프록시·실도메인 없음 / 베이스 이미지에 프록시 CA 추가 / 호스트 네트워크라 admin 리스너 loopback이 호스트 loopback과 같음.
- 테스트 데이터: 임시 생성 난수 비밀값(`openssl rand`, `.harness-tmp/d10/stage.env`·`stage-admin.env`, 권한 600), 가짜 Origin `https://staging.example.test`. 실제 비밀값 사용 없음. **롤백 시험용 "나쁜 릴리스" 2종(v2-badhealth: `/healthz`가 503, v2-badconfig: 새 필수 환경변수 추가)은 저장소 복사본(`git archive HEAD`)을 `.harness-tmp/` 안에서 고쳐 빌드한 것**이며 저장소 파일은 바뀌지 않았다.
- 전제 조건: `git status` 깨끗(작업 시작 시 0건). 기준 커밋 `95ec4f8`(브랜치 PROD).

## 4. 테스트 케이스 및 결과
이번 단계는 수동·명령 기반 점검이다. 자동 시험(TC/IT)은 추가하지 않았다(TC-540·IT-120 미사용, `test-cases.md` 변경 없음). 이유는 8절 후속 조치에 둔다.

### 4.1 (a) 빌드 재현성
| ID | 시나리오 | 절차 | 예상 | 실제 | P/F |
|---|---|---|---|---|---|
| D-01 | 깨끗한 복사본 `npm ci` | `git archive HEAD`를 두 디렉터리(A·B)에 풀고 각각 `npm ci` | 성공, lockfile 일치 | 둘 다 376 패키지, A 7s·B 4s, 종료 0 | PASS |
| D-02 | `npm run build` | A·B에서 실행 | 성공 | 둘 다 종료 0 (서버 `index.js` 47.3kB, 웹 JS 455.97kB·CSS 20.47kB) | PASS |
| D-03 | 산출물 동일성(서로 다른 경로) | `apps/server/dist`·`apps/web/dist` 4개 파일 sha256 비교 | 동일 | **동일**(서버 `bf7f0f6d…`, 웹 JS `447ddc3f…`, CSS `3980792f…`, html `b07e013d…`) | PASS |
| D-04 | 같은 경로 재빌드(dist 삭제, 파일 mtime 변경 후) | A에서 `dist` 삭제·`package.json` mtime 2020으로 변경 후 재빌드 | 동일 | 4개 파일 해시 동일 | PASS |
| D-05 | 이미지 빌드 | 위 A로 `docker build`(캐시 있음 20s) → `meetlite:v1` 271MB | 성공 | 성공 | PASS |
| D-06 | 이미지 재현성 | B로 `docker build --no-cache` 후 두 이미지의 `/app` 파일 2,410개 sha256 비교 | 동일 | **파일 내용 동일**(`diff` 없음). 단 **레이어 digest는 다름**(13층 중 7층, 빌드 시각 등 메타데이터 차이로 추정) → 이미지 ID로 같음을 증명할 수 없고 내용 비교가 필요 | PASS(조건) |
| D-07 | 이미지 속 `dist` = 호스트 빌드 `dist` | D-03 해시와 비교 | 동일 | 동일 | PASS |
| D-08 | `npm audit --audit-level=high` | 저장소 | 0건 | `found 0 vulnerabilities` | PASS |
| D-09 | 시간에 따른 재현성 | 베이스 `node:22-alpine`이 부동 태그 | — | **보장되지 않음**(이번 베이스는 Node 22.23.3, 호스트는 22.22.0). 오늘 두 번 같았다는 뜻일 뿐 → DEF-10-07 | 관찰 |

### 4.2 (b) 운영 모드 기동·환경변수 검증 (`NODE_ENV=production`, 빌드 산출물로 실행)
| ID | 시나리오 | 결과 | P/F |
|---|---|---|---|
| E-01 | 환경변수 전부 누락 | 종료 1, `ALLOWED_ORIGINS`·`SESSION_SECRET` 누락 목록 + `.env.example` 안내 | PASS |
| E-02 | `SESSION_SECRET=change-me-…`(예시값) | 종료 1, "운영에서는 예시 비밀값을 쓸 수 없습니다" | PASS |
| E-03 | 짧은 비밀값 / `ALLOWED_ORIGINS=*` / 끝 `/` 붙은 origin / `PORT=abc` | 모두 종료 1, 항목별 메시지 | PASS |
| E-04 | `TURN_URLS`만 있고 `TURN_SECRET` 없음 / 예시 `TURN_SECRET` / 예시 `ADMIN_TOKEN` / `ADMIN_PORT`만 | 모두 종료 1, 원인 메시지 | PASS |
| E-05 | **운영인데 `ALLOWED_ORIGINS=http://localhost:5173`** | **기동 성공**(경고 없음). 스테이징·로컬 값이 운영에 섞여도 막지 않는다 | 관찰 → DEF-10-05 |
| E-06 | `NODE_ENV` 미지정 + 예시 비밀값 | 개발 모드로 기동(운영 거부 검사 우회). 09의 DEF-09-04와 같은 문제를 이미지 밖(`npm start`)에서 재현. 이미지는 `ENV NODE_ENV=production`을 박아 안전 | 관찰(기존 DEF-09-04) |
| E-07 | 정상 기동 | `/healthz` → `200 {"status":"ok","uptimeSec":N}`, `server listening`·`OPERATOR_CONTACT 미설정` 경고(미설정일 때) | PASS |
| E-08 | 보안 헤더(운영) | CSP(`connect-src`에 지정한 https/wss origin만), HSTS(`max-age=31536000; includeSubDomains`), `Permissions-Policy: camera=(self), microphone=(self), display-capture=(self)`, `X-Frame-Options`, `nosniff`, `Referrer-Policy: no-referrer` 확인. 알 수 없는 `/api/*`는 JSON 404 | PASS |
| E-09 | Origin 검증 | 잘못된 Origin의 방 생성 REST → `403 FORBIDDEN`, Socket.IO 연결 → `websocket error`로 거부, 허용 Origin은 연결 | PASS |
| E-10 | admin 리스너 | `/proc/net/tcp`로 확인: 공개 포트는 `0.0.0.0`, admin은 **`127.0.0.1`만**. 공개 포트로 `/admin/...` 요청은 404, 토큰 없음 401, 있음 404(방 없음) | PASS |
| E-11 | SIGTERM(유휴) / SIGINT | 종료 코드 **0**, 10~11ms | PASS |
| E-12 | SIGTERM(소켓 3개 연결, 응답함) | 종료 코드 0, 15ms, 클라이언트는 `transport close` | PASS |
| E-13 | SIGTERM 2회 연속 | `shutting down` 1회만 기록, 종료 0 | PASS |
| E-14 | 포트 충돌 | 두 번째 인스턴스 종료 1(`EADDRINUSE`), 첫 인스턴스 영향 없음 | PASS |
| E-15 | SIGKILL 후 재시작 | 종료 137, 새 프로세스 `/healthz` ok, 상태 없음 | PASS |
| E-16 | 로그에 비밀값 | `SESSION_SECRET`·`ADMIN_TOKEN` 문자열 로그 0회 | PASS |
| E-17 | **응답 없는 클라이언트(SIGSTOP한 소켓)가 붙은 채 종료** | **정확히 10.0초 후 종료 코드 1**(앱의 강제 종료 타이머). `docker stop` 기본 대기도 10초라 코드 1·137이 경합. 응답하는 클라이언트면 즉시(E-12). 처음에는 내 시험 클라이언트가 `execFileSync`로 막혀 있어 생긴 인위적 결과인 줄 알고 의심했고, 클라이언트를 SIGSTOP해 재현해 진짜 동작임을 확인 | 관찰 → DEF-10-06 |
| E-18 | `.env`·환경변수 설정 점검 | `.env.example` 키 22개 중 `RATE_LIMIT_SCALE`만 없음(의도: 시험용). **운영에서 `RATE_LIMIT_SCALE>1`이 거부되지 않음**(속도 제한 완화 가능). `npm start`는 `.env`를 읽지 않음(runbook 서술과 일치, 코드 확인) | 관찰 → DEF-10-05 |
| E-19 | 비밀값·저장소 위생 | `git ls-files`에 `.env*`는 `.env.example`만, 전체 이력(63 커밋)에서 `.env`·`.pem`·`.key` 추가 이력 없음, 비밀값 형태 문자열 추가 없음 | PASS |

### 4.3 (c) Dockerfile·compose·coturn 점검
| ID | 시나리오 | 결과 | P/F |
|---|---|---|---|
| C-01 | 실제 이미지 내용 | `uid=1000(node)`, `/app`에 `apps·node_modules(운영 의존성만)·package*.json·packages`, `.env`·`.git`·`docs`·`e2e` 없음, `docker history`에 비밀값 흔적 없음(grep 1건은 `process.env.PORT`의 문자열 일치로 확인) | PASS |
| C-02 | 이미지 구성 | `NODE_ENV=production`, `WEB_DIST`, `EXPOSE 3001`**만**(admin 포트 노출 없음), HEALTHCHECK `node -e fetch(/healthz)` 30s/3s, `restart` 정책 없음(실행자가 지정해야 함) | PASS |
| C-03 | hadolint(Dockerfile) | DL3066 info(`USER node`가 비숫자 — 쿠버네티스 `runAsNonRoot`는 숫자 UID가 아니면 검증 불가), DL3025 warning(HEALTHCHECK 셸 형식). 그 외 경고 없음 | 관찰 → DEF-10-12 |
| C-04 | trivy: 앱 이미지 | OS 패키지 HIGH/CRITICAL 0, 비밀값 0, 앱 의존성 0. HIGH 10건은 전부 **베이스 이미지에 번들된 npm**(`/usr/local/lib/node_modules/npm/...`: brace-expansion·ip-address·pacote·picomatch·sigstore). 런타임에서 npm을 쓰지 않으므로 실행 경로 밖이나 이미지에 존재함 | 관찰 → DEF-10-07 |
| C-05 | trivy: `coturn/coturn:4.9` | Debian 13.3 기반, **HIGH 248 + CRITICAL 21 = 269건**(수정 버전이 있는 것 199건). openssl·libgnutls·libevent·libxml2 등 포함. TURN은 인터넷에 직접 노출되는 서비스다 | **결함** → DEF-10-03 |
| C-06 | compose 구문·필수값 | `TURN_SECRET` 없으면 보간 오류로 거부, 있으면 `config -q` 유효 | PASS |
| C-07 | coturn 실행 | 기동, 프로세스 `nobody`(uid 65534), `privileged=false`, `restart=unless-stopped`, 로그 로테이션 10m×3, 설정 읽기 전용 마운트, 사설·루프백·IPv4-mapped 등 차단 대역 18개 `Black listing` 로그, 비밀값이 로그·파일에 0회, 명령행에는 노출(알려진 DEF-003) | PASS(+기존 관찰) |
| C-08 | **TLS(TURNS 5349) 불가** | 로그: `cannot find certificate file … cannot start TLS and DTLS listeners`. compose에 인증서·키 마운트와 설정이 **없다**. 실제로 `3478`만 리슨. `infra-deploy.md`는 5349를 "방화벽 환경 대비"로 적었으나 현재 구성으로는 켤 수 없다 | **결함** → DEF-10-04 |
| C-09 | **외부 IP 설정 경로 없음** | compose 주석이 "`EXTERNAL_IP`를 반드시 설정"이라 하나 저장소 어디에도 `EXTERNAL_IP`·`external-ip`가 없다(grep). NAT 뒤(대부분의 클라우드 VM)에서는 릴레이 주소가 잘못 알려질 수 있다 — 실망 시험 전 | **결함** → DEF-10-04 |
| C-10 | coturn 설정 경고 | `no-tlsv1`·`no-tlsv1_1` 인식 못함(기존 DEF-004) | 관찰(기존) |
| C-11 | 릴레이 포트 vs 할당량 | `min-port=49160`~`max-port=49200` = **41포트**인데 `total-quota=300`. 포트가 먼저 바닥나므로 동시 릴레이 상한은 약 41 할당(6명 방에서 릴레이를 쓰는 참가자 1명이 최대 5개 소비 → 추정 약 8명). 실측하지 않음 | 관찰(추정) → DEF-10-13 |
| C-12 | `.dockerignore`·시크릿 | `**/.env`, `**/.env.*`, `.git`, `docs`, `e2e`, `.harness-tmp` 제외(unit-13 DEF-002 수정분 반영). 이번에는 이미지에 `.env`가 없음만 확인했고 가짜 `.env` 주입 변이 시험은 하지 않았다(unit-13이 수행) | PASS |
| C-13 | CI가 Dockerfile을 빌드하는가 | `ci.yml`에 `docker build` **0건**(`docker pull`만). Dockerfile이 깨져도 CI는 초록 → 배포 당일 발견 | **결함** → DEF-10-02 |

### 4.4 (d) 롤백·재시작·백업·방 폐쇄 (실제 컨테이너 실행)
시험용 릴리스: v1 = 현재 커밋 이미지, v2-badhealth = `/healthz` 503, v2-badconfig = 새 필수 환경변수(옛 `.env`로는 시작 불가).

| ID | 시나리오 | 실행 | 결과 | P/F |
|---|---|---|---|---|
| R-01 | runbook §1 시작 | `docker run -d --name meetlite --env-file … meetlite:v1`(`-p`는 샌드박스 제약으로 `--network=host`) | `/healthz` ok. `user=node`, **`restart=no`**(runbook §3은 `restart: unless-stopped`를 조치로 적지만 §1 명령에는 없음) | PASS(+DEF-10-01) |
| R-02 | runbook §2-2 "새 컨테이너로 교체"를 **문서 그대로** | 같은 이름으로 `docker run --name meetlite … v2` | **실패**: `Conflict. The container name "/meetlite" is already in use`. 문서에 기존 컨테이너를 멈추고 이름을 바꾸거나 지우는 절차가 없다 | **FAIL** → DEF-10-01 |
| R-03 | 보완한 교체 순서로 나쁜 릴리스 배포 | `docker stop` → `docker rename meetlite meetlite-prev` → `docker run --name meetlite … v2-badhealth` | 교체 248ms. `/healthz`가 **503 `broken`**. Docker 상태는 `starting`(HEALTHCHECK 30초 간격, `start-period` 없음) → 자동 감지·자동 롤백 없음, 사람이 `/healthz`로 판단해야 한다 | PASS(+DEF-10-08) |
| R-04 | **롤백 A: 이전 태그 이미지로 재실행**(runbook §2-4) | `docker rm -f meetlite` → `docker run … meetlite:v1` | **679ms 만에 `/healthz` ok**, 이미지 `meetlite:v1`로 복귀 | **PASS** |
| R-05 | 시작 실패 릴리스(v2-badconfig, `--restart unless-stopped`) | v1을 stop·rename 후 v2 실행 | 컨테이너가 **재시작 루프**(4초 만에 `restarts=5`, exit 1), 로그에 `환경변수 오류: NEW_REQUIRED_SETTING` — 원인이 로그 마지막 줄에 읽기 쉽게 남음 | PASS |
| R-06 | **롤백 B: 보관해 둔 이전 컨테이너 되살리기** | `docker rm -f meetlite` → `docker rename meetlite-prev meetlite` → `docker start meetlite` | **619ms 만에 ok**. 이전 환경변수·restart 정책이 그대로 복원 | **PASS** |
| R-07 | 재시작 시 방 상태 | 방 생성 → `docker restart` → 같은 방 조회 | 전: `exists:true` / 후: `exists:false`. 연결돼 있던 소켓은 끊기고, 옛 세션 토큰으로 `room:resume` → `ROOM_NOT_FOUND`(웹은 이 코드를 "서비스가 재시작되어 회의가 종료되었습니다"로 안내 — 웹 쪽은 8절 IT로 검증된 것에 의존) | PASS(휘발 확인) |
| R-08 | `docker stop`/`restart` 시간 | 유휴 77ms~86ms, 응답하는 소켓이 있어도 0.3초 이내, **응답 없는 소켓이 있으면 10.1초·exit 1**(E-17) | PASS(+DEF-10-06) |
| R-09 | **배포 후 스모크**(임시 스크립트, 저장소에 없음) | `/healthz` → 방 생성 → 소켓 2명 입장 → 채팅 릴레이를 컨테이너 대상으로 실행 | 입장 2/2 성공, 채팅 relayed. 이 순서가 §6.1 스모크의 기초. **저장소에는 대상 서버를 가리키는 스모크 스크립트가 없다**(`scripts/load-smoke.mjs`는 자체 서버를 띄우는 부하 시험) | PASS(+DEF-10-09) |
| R-10 | runbook §6 방 폐쇄를 **컨테이너 안에서** | `docker exec`로 `wget --post-data=''` 실행(`$ADMIN_TOKEN`은 컨테이너 안 셸에서 확장) | `200 {"closed":true,"participants":0}` → 재호출 404 → 틀린 토큰 401. 로그에는 `operator action`(방 ID 앞 6자만), 토큰 0회. **runbook이 "미검증"이라 한 wget 형식이 실제로 동작함을 확인**(변수는 `sh -c '…$ADMIN_TOKEN…'`처럼 작은따옴표로 컨테이너 안에서 확장해야 한다) | PASS |
| R-11 | 마이그레이션 | 서버에 DB·파일 쓰기·외부 저장소 의존 없음(`apps/server/src` grep: sqlite·redis·pg·writeFile 0건, 의존성 7개 모두 라이브러리). 상태는 메모리뿐 | **해당 없음**(되돌릴 데이터 마이그레이션 없음). 환경변수 스키마가 바뀐 릴리스(R-05)가 사실상의 "마이그레이션"이며 롤백은 옛 `.env`와 옛 이미지 쌍으로 하면 된다 | N/A |
| R-12 | 백업 | 백업할 서버 데이터 없음. **다만** 롤백·복구에 필요한 것(운영 `.env`/비밀값, 직전 정상 이미지, coturn 설정과 `TURN_SECRET`)을 어디에 보관하는지 runbook에 없다 | 관찰 → DEF-10-11 | 
| R-13 | **coturn 롤백·교체** | 실행하지 않음 | **미검증** |
| R-14 | 무중단 배포 | 설계상 불가: 상태가 단일 프로세스 메모리(ADR-0002)라 교체 순간 모든 회의가 끝난다. 블루/그린도 소용없음 | **불가(설계 사실)** — 이용이 적은 시간대·사전 공지로 대응 |

### 4.5 이 시험으로 확인된 롤백 순서 (11단계 runbook 갱신의 근거 — 새벽에 따라 할 수 있는 형태)
아래는 R-03·R-04·R-06에서 **실행해 확인한 명령 순서**다. `-p 3001:3001`·`--network` 인자는 이 샌드박스에서 쓸 수 없어 `--network=host`로 시험했으므로 실제 환경에서는 달라지며, 그 차이는 **미검증**이다.
1. **배포 전**: 현재 이미지에 되돌아올 태그가 있는지 확인(`docker images meetlite`), 현재 `.env`를 안전한 곳에 사본 보관.
2. **교체**: `docker stop meetlite`(응답 없는 연결이 있으면 최대 10초) → `docker rename meetlite meetlite-prev`(지우지 않는다) → 같은 `--env-file`·`--restart unless-stopped`로 새 태그 실행.
3. **판정**: `curl -sf https://<도메인>/healthz`가 30초 안에 `{"status":"ok"}`가 아니거나 `docker logs meetlite`에 `환경변수 오류`가 보이면 롤백. 스모크(방 생성·2명 입장)는 사람이 한다.
4. **롤백(빠른 길, 약 0.6초)**: `docker rm -f meetlite && docker rename meetlite-prev meetlite && docker start meetlite`.
5. **롤백(이미지 길, 약 0.7초)**: `docker rm -f meetlite` 후 직전 태그로 `docker run`(태그를 지우지 않았을 때만 가능 — `docker image prune` 금지).
6. 롤백 후 진행 중이던 회의는 이미 끝났다(메모리 휘발). 이용자 공지는 필요하다.

### 4.6 모니터링·알림 채널 실제 연결 확인
| 항목 | 설계서 정의(`observability.md` §3) | 실측 | 판정 |
|---|---|---|---|
| 수신 채널(이메일·메신저·호출) | 정의 없음("제안, 배포 후 조정") | 저장소·문서·환경변수 어디에도 알림 수신처 설정이 없음. Sentry/Datadog/Slack 등 MCP는 **연결되지 않음**(DEC-001: 옵저버빌리티·알림 MCP 미연결) → 실제 조회 불가, **테스트 알림을 보낼 곳이 없어 발생시키지 못했다** | **미구성(미검증이 아니라 존재하지 않음)** |
| `/healthz` 실패 2분 감시 | 외부 감시기 필요 | 엔드포인트는 정상 동작(E-07). 이를 호출해 알리는 감시기는 없음. 컨테이너 HEALTHCHECK는 상태만 바꾸고 알리지 않음(R-03) | 연결 안 됨 |
| 메모리 2배 지속 | 호스트 모니터링 | 앱은 지표를 내지 않음(로그뿐). 호스트 에이전트 필요 | 연결 안 됨 |
| `SERVER_BUSY`(입장 실패) 증가 | 로그 집계 | **로그 이벤트가 없다**(`logger.*` 호출은 시작·종료·방 생성·참가·오류·admin·경로 계측뿐, 코드 grep). 방 수 상한 거부, IP 상한 거부, 입장 거부는 기록되지 않음 → 이 알람은 구현할 수 없다(08 DEF-S-01·09 DEF-09-09와 같은 뿌리). 또 방 소멸 로그가 없어 "현재 방 수"를 로그만으로 알 수 없다 | **측정 불가** |
| TURN 트래픽 급증 | coturn 통계 | 수집·알림 설정 없음. coturn 로그는 컨테이너 로그(10m×3)뿐 | 연결 안 됨 |
| 인증서 만료 14일 전 | 인증서 관리 도구 | 배포 대상 미정 | 해당 없음(대상 결정 후) |
→ 공개 전에는 **알림 수신 채널을 사용자가 정하고, 테스트 알림을 한 번 발생시켜 수신을 확인**해야 한다(사용자 결정 목록 U-1). 내부·지인 시험 단계라면 "운영자가 직접 `/healthz`를 본다"로 수용할지 사용자가 정한다.

### 4.7 (f) release-checklist 판정 (`docs/05-qa/release-checklist.md` 행별)
| 행 | 문서 상태 | 10단계 판정 |
|---|---|---|
| M 요구 TC 통과 | ✅ | ✅ 유지 — 이번에 lint 0·typecheck 0·단위(shared 21 / server 241+4 expected fail+4 skip / web 433+1 expected fail)·check:docs 통과·audit 0 재확인(11절). 문서의 "115·29"는 오래된 수치 → 갱신 요청 |
| 3인 mesh·재연결·TURN 통합 | ✅ | ✅ (이번 미실행, 8단계 근거) |
| 보안 점검표 | ✅ | ⚠ 09가 FAIL→수정 후 **재판정 대기**, 09 이연 필수 3건(DEF-09-02·05·06) Open |
| `npm audit` | ✅ | ✅ 0건 |
| 문서·추적성 | ✅ | ✅ `check:docs` 통과 |
| 성능 | ✅ | ✅(8단계 실측 승계) |
| **롤백 준비** | ⚠ 절차 있음, 실제 연습은 배포 후 | **로컬 컨테이너 리허설 수행(R-04·R-06 PASS)** — 단 문서대로는 실패(R-02), 실환경·coturn은 미검증. ⚠ 유지(문서 수정 후 재확인) |
| 출시 전 필수 #1 배포 대상·도메인·HTTPS·예산 | 사용자 | **미결**(차단) |
| #2 UAT | 사용자 | 미수행 |
| #3 실기기·타 브라우저 | 사용자 | 미검증 |
| #4 운영 TURN 구성·릴레이 확인 | 사용자+개발 | **미구성**(C-08·C-09: TURNS·외부 IP 경로 없음, C-05 이미지 취약점) |
| #5 법령·처리방침·연락처 | 사용자 | 미결 |
| #6 운영 알람·로그 보관 | 개발 | **미구성**(4.6) |
| #7 라이선스 | 사용자 | 미정 |
→ **판정: 내부·소규모 지인 시험은 조건부 Go 후보**(조건: 09 재판정 PASS, DEF-10-01 문서 수정 후 재리허설, HTTPS 프록시·도메인 결정). **불특정 다수 공개는 No-Go** — 위 표의 #1·#4·#5·#6·#7과 09 이연 필수 3건이 남아 있다.

### 4.8 (e) 배포 후보 비교에 필요한 사실 (선택하지 않는다 — 대상은 사용자가 정한다)
후보(VPS+Docker / PaaS / 관리형 TURN 병행)는 `infra-deploy.md` §4. 아래는 **이번에 실측했거나 코드·설정에서 확인한 사실**과 **미확인**만 적는다. 비용·각 플랫폼의 제약은 미확인이다.
| 항목 | 사실 | 근거·상태 |
|---|---|---|
| 실행 단위 | 컨테이너 1개(API+소켓+웹), 포트 `PORT`(기본 3001), 이미지 271MB, 빌드 약 20초(캐시 시), 시작 후 1초 이내 `/healthz` 응답 | 실측 |
| 상태·확장 | 방 상태는 프로세스 메모리, **인스턴스 1개 고정**(수평 확장은 비목표), 볼륨·DB 불필요, 재시작 = 회의 종료 | 설계·R-07 |
| 롤링·블루/그린 | 불가(위와 같은 이유). 교체 시간 0.3초대, 연결된 응답 없는 클라이언트가 있으면 10초 | R-08·E-17 |
| 종료 | SIGTERM·SIGINT 처리, 강제 종료 타이머 10초(고정). 플랫폼 stop 대기는 15초 이상 권장 | 실측 |
| 헬스체크 | `GET /healthz` → `{"status":"ok","uptimeSec":N}`. 이미지에 HEALTHCHECK 있음(30s/3s, start-period 없음). PaaS는 이미지 HEALTHCHECK 대신 자체 경로 설정이 필요할 수 있음(플랫폼별 **미확인**) | 실측 |
| 사용자 | `USER node`(이름, uid 1000). 숫자 UID를 요구하는 플랫폼은 설정 필요 | hadolint DL3066 |
| 설정 주입 | 환경변수(`--env-file`·플랫폼 시크릿). 앱은 `.env` 파일을 읽지 않음. 필수: `ALLOWED_ORIGINS`(https 실주소), `SESSION_SECRET`(32자+, 예시값 운영 거부). `TRUST_PROXY`는 프록시 단계 수(틀리면 IP 기반 제한 오동작) | 실측 |
| 프록시·TLS | 앱은 TLS를 하지 않음(종단 프록시 필요), **WebSocket 업그레이드 필수**(Socket.IO 폴링 폴백 사용 여부는 **미확인**), 앱이 HSTS(`includeSubDomains`) 직접 송출 | E-08, 8절 |
| 관리 기능 | 방 폐쇄 admin은 컨테이너 안 `127.0.0.1`에만 열림 → **컨테이너 안에서 명령을 실행할 수 있어야** 쓸 수 있음(`docker exec`/SSH). 셸 접근이 안 되는 PaaS는 이 절차를 쓰기 어렵다 | E-10·R-10 |
| 로그 | stdout JSON(pino), 로그 수집·보관은 플랫폼 의존. coturn 로그는 IP를 포함(처리방침과 연동) | C-07, DEC-019 |
| TURN | coturn은 `network_mode: host`, UDP·TCP 3478 + UDP 49160–49200(41포트), TURNS 5349는 **현재 구성으로는 불가**, 외부 IP 설정 경로 없음. UDP 범위 개방이 어려운 플랫폼은 TURN 별도 필요(대상별 **미확인**) | C-07~C-11 |
| 시작 실패 | 환경변수 오류 시 종료 코드 1과 원인 메시지(로그 마지막 줄) | E-01~E-04 |
| 이미지 보관 | 레지스트리 없음(로컬 `docker build`). 롤백 대상 보존은 운영자 책임 | U-7 |
| 비용 | **미확인**(U-2) | — |

## 5. 커버리지
- 커버리지 지표(기능 기준): 요청 (a)~(f) 6개 항목 모두 실행 근거가 있다. 단 (d)의 coturn 롤백(R-13)과 실환경 차이는 미검증. 코드 라인 커버리지는 해당 없음(배포·설정 점검).
- 커버되지 않은 부분과 사유:
  - 스테이징/실서버: HTTPS·리버스 프록시(WebSocket 업그레이드, `TRUST_PROXY` 단계 수)·인증서·방화벽·UDP 포트·실도메인에서의 헤더·admin 비노출. **미검증**
  - `docker run -p` 포트 매핑과 브리지 네트워크에서의 동작, 컨테이너 안 admin 접근은 `docker exec` 경로만 확인
  - TURN 실릴레이 통화·TURNS·외부 IP 환경, coturn 롤백. 미검증
  - GitHub Actions 실제 실행·`actionlint`(이미지 획득 실패). 미검증
  - **모니터링·알림 채널**(4.6): 수신 채널이 없어 연결 시험 불가
  - 이 단계에서 E2E(`npm run test:e2e`)는 실행하지 않았다(8·9단계가 커밋 95ec4f8 기준 100 통과·1 skip 기록). **미실행**
  - 배포 비용·실제 부하는 미확인

## 6. 결함(Defect) 목록
심각도 기준: 배포 당일 사고·복구 불능으로 이어지면 Medium 이상. Critical·High는 없다. 이번 단계는 제품·인프라 파일 수정이 금지돼 있어 **전부 Open(수정은 5단계/11단계/사용자 결정)** 이다.

| ID | 설명 | 재현 절차 | 심각도 | 상태 | 조치 내용(권고) |
|----|------|-----------|--------|------|-----------------|
| DEF-10-01 | **runbook §1·§2의 시작·교체·롤백 절차를 문서대로 하면 실패하거나 불완전하다.** ① §2-2대로 같은 이름으로 새 컨테이너를 띄우면 이름 충돌 ② `<태그>` 규칙(예: git 커밋 해시)과 "직전 정상 태그·컨테이너를 지우지 말 것"이 없어 롤백할 대상이 사라질 수 있음 ③ §1 `docker run`에 `--restart unless-stopped`가 없는데 §3 장애 대응은 그것을 전제 ④ 판정 기준(`/healthz`·스모크 시한)과 롤백 트리거가 없음 | 4.4 R-02 | **Medium** | Open | 11단계에서 runbook §2를 4.5 순서로 교체(stop→rename→run→판정→롤백). `-p`·네트워크 인자는 실환경에서 재확인 |
| DEF-10-02 | **CI가 Docker 이미지를 빌드하지 않는다**(`ci.yml`에 `docker build` 0건). Dockerfile·lockfile·`--omit=dev` 회귀를 배포 당일에야 알게 된다 | `grep -c "docker build" .github/workflows/ci.yml` → 0 | **Medium** | Open | ci.yml에 이미지 빌드(+`/healthz` 기동 확인) job 추가 권고. 인프라 파일이라 사용자 허락 후 5단계 |
| DEF-10-03 | **`coturn/coturn:4.9` 이미지에 HIGH 248·CRITICAL 21건**(trivy, 수정 버전 있는 것 199). 인터넷에 직접 노출되는 서비스이고 TLS·암호 라이브러리(openssl·gnutls) 포함 | 4.3 C-05 (`trivy image --input` 재현) | **Medium** | Open | 배포 직전 최신 패치 태그로 올리고 재스캔·실측(IT-21 coturn L2) 후 `infra-deploy`에 태그·스캔 일자 기록. 태그 변경은 사용자 허락(인프라) |
| DEF-10-04 | **운영 TURN 구성을 저장소로 만들 수 없다.** ① TURNS(5349): 인증서·키 설정·마운트가 없어 TLS 리스너가 시작되지 않음(실측 로그) ② `EXTERNAL_IP`는 주석에만 있고 설정 경로가 없음(`external-ip` 미설정, NAT 뒤 릴레이 주소 오류 가능) | 4.3 C-08·C-09 | **Medium** | Open | 개발용 compose와 별도로 운영용 구성(인증서, `external-ip`, 포트·방화벽 표)을 만들거나 관리형 TURN을 쓸지 사용자 결정(U-4) |
| DEF-10-05 | **운영 설정 혼용 방지 장치가 없다.** `NODE_ENV=production`에서도 `http://localhost…` Origin이 허용되고(경고 없음), `RATE_LIMIT_SCALE>1`(속도 제한 완화)도 거부되지 않으며, 환경이 스테이징인지 운영인지 알려 주는 표식이 없다. 개발 `.env`를 복사해 운영에 쓰는 사고를 기동 시점에 못 잡는다 | 4.2 E-05·E-18 | Low | Open | 운영에서 비-https·localhost Origin은 `warn`(또는 거부), `RATE_LIMIT_SCALE`은 운영에서 1만 허용 권고(config.ts 수정이라 5단계 승인) |
| DEF-10-06 | **응답 없는 클라이언트가 있으면 종료가 정확히 10초 걸리고 종료 코드가 1이다**(앱 강제 종료 타이머 10초 = `docker stop` 기본 10초). 모바일에서 네트워크가 끊긴 참가자는 흔하다. 코드 1은 "정상 종료" 판정 스크립트·플랫폼에서 실패로 읽힐 수 있다 | 4.2 E-17 (클라이언트를 SIGSTOP한 채 `docker stop`) | Low | Open | 배포 도구의 stop 대기를 15초 이상으로 두고 종료 코드 0·1·137을 모두 정상 범주로 취급하도록 runbook에 명시. 코드는 소켓 강제 종료 후 종료 고려(제안) |
| DEF-10-07 | **베이스 이미지 재현성·표면**: `node:22-alpine` 부동 태그(다이제스트 미고정, DEF-09-07 잔여)라 같은 커밋도 날짜에 따라 다른 Node·OS 패키지가 들어감(오늘 호스트 22.22.0과 이미지 22.23.3이 다름). 런타임 이미지에 불필요한 npm·yarn이 있고 npm 번들의 HIGH 10건이 스캔에 잡힘(앱 의존성·OS 0건) | 4.1 D-09, 4.3 C-04 | Low | Open | 배포 시 이미지 다이제스트를 기록, 베이스 다이제스트 고정 검토 |
| DEF-10-08 | **배포 실패를 자동으로 알 수 없다.** HEALTHCHECK가 30초 간격·`start-period` 없음이라 `unhealthy` 판정까지 최소 수 분이고, 단일 `docker run`은 `unhealthy`에 반응하지 않는다. 롤백 트리거는 사람이다 | 4.4 R-03 | Low | Open | `--start-period`·짧은 간격 검토, 배포 후 능동 `/healthz` 폴링을 스크립트화(DEF-10-09) |
| DEF-10-09 | **배포 후 스모크 스크립트가 저장소에 없다**(runbook은 "링크 열기, 2명 영상 확인" 수동). 새벽 롤백 판단 시간이 길어지고 사람마다 다르다 | 4.4 R-09 | **Medium** | Open | `/healthz`→방 생성→2명 입장→채팅을 대상 URL로 도는 스크립트(약 40줄, 이번 임시 스크립트가 근거)를 5단계/11단계에서 추가. 영상 확인은 사람 |
| DEF-10-10 | **모니터링·알림 채널이 없다**(4.6). 알림 수신처 미정, `SERVER_BUSY`·입장 실패·방 수 감소를 로그로 알 수 없어 설계서의 알람 조건 일부가 **구현 불가**(KPI-01·04 계측 이연과 같은 원인, DEC-022·026) | 4.6 | **Medium** | Open | 알림 수신처는 사용자 결정(U-1). 로그 이벤트 추가(입장 거부·방 소멸·상한 거부)는 DEF-S-01 결정과 함께 |
| DEF-10-11 | **롤백·복구에 필요한 보관 대상 안내가 없다**(운영 `.env`·비밀값 보관 위치, 직전 정상 이미지, `TURN_SECRET`·coturn 설정). 서버 데이터 백업은 불필요하지만, 새 서버로 옮기거나 비밀값을 잃으면 복구 불가 | 4.4 R-12 | Low | Open | runbook에 "보관 대상" 표 추가(비밀값 자체는 문서에 쓰지 않음) |
| DEF-10-12 | hadolint DL3066(`USER node` 비숫자 → 쿠버네티스 `runAsNonRoot` 검증 불가)·DL3025(HEALTHCHECK) | 4.3 C-03 | Low | Open | 배포 대상이 쿠버네티스 계열이면 `USER 1000` 검토 |
| DEF-10-13 | coturn 릴레이 포트 41개 vs `total-quota=300` 불일치(포트가 먼저 소진, 추정 동시 약 8명 릴레이, **미실측**) | 4.3 C-11 | Low | Open | NFR-04 정합 확인은 실망 측정 후(08 이연 항목과 함께) |
- 이전 단계에서 이연된 인프라 결함(unit-13 DEF-003~007: `TURN_SECRET` 명령행 노출, `no-tlsv1` 경고, `compose down` 시크릿 요구, 액션 SHA 고정·timeout 등)은 이번에도 **그대로 유효**함을 확인했다(C-07·C-10). 새 번호를 주지 않는다.
- Critical/High 0건. 판정 근거는 4절 표들이다. 결함 0건이 아니므로 완료 조건("결함 0건이거나 Fixed")을 충족하지 못한다 → 9절은 CONDITIONAL PASS.

## 7. 테스트 환경 정리(Teardown) 확인 — 규칙 K
- 이번 테스트에서 생성한 임시 아티팩트 목록: `.harness-tmp/d10/` 하나(A·B·C·D `git archive` 복사본과 `node_modules`·`dist`, `dd/`(dockerd 데이터 루트), `er/`(exec-root), `docker.sock`, `dockerd.pid`·`dockerd.log`, `base.Dockerfile`·`ca.crt`, `stage.env`·`stage-admin.env`(임시 난수 비밀값), 해시 목록, 이미지 tar(`v1.tar`·`c.tar`), trivy JSON, 임시 시험 스크립트(`sock*.mjs`·`smoke.mjs`·`restart.mjs`·`stopwith.mjs`·`hostrun.sh`), 로그). 도커: 컨테이너 `meetlite`·`meetlite-prev`·`nt`·`d10turn-coturn-1`, 이미지 `meetlite:{v1,v1-rebuild,v2-badhealth,v2-badconfig}`·`node:22-alpine`(우회 베이스)·`mirror.gcr.io/library/node:{22-alpine,22.22.0-alpine}`·`coturn/coturn:4.9`·`hadolint/hadolint`·`aquasec/trivy`·`rhysd/actionlint`(받기 실패)는 모두 위 로컬 데몬의 데이터 루트(`.harness-tmp/d10/dd`) 안에만 존재했다.
- 위 아티팩트를 전부 `.harness-tmp/` 하위에서만 생성했는가 (규칙 K 1번): [x] 예 / [ ] 아니오 — 테스트 서버는 임시 포트(3921·3922·3931·3932·3913·3914)에서 돌렸고 저장소 파일 쓰기는 이 문서와 검증 로그 둘뿐이다.
- 정리(삭제) 완료 여부: **완료** — 컨테이너 0·이미지 0 확인 후 `dockerd`를 PID 파일의 PID로 종료(`pkill`·`pgrep -f` 미사용)하고 하위 `containerd` 종료 확인, `ps`에 `dockerd`·`containerd`·`turnserver` 없음. `er/netns/default`에 남은 nsfs 마운트가 삭제를 막아 `umount` 후 `rm -rf .harness-tmp/d10` 완료, `.harness-tmp/`는 빈 디렉터리. (샌드박스 안 `npm test`는 기존 `node_modules`를 썼고 새로 설치하지 않았다.)
- 정리 후 `git status` 실행 결과 (그대로 첨부, 요약 금지): 이 문서 작성 직후의 실행 결과는 14절(문서 맨 끝)에 붙였다. 정리 직후(문서 작성 전) 결과:
```
$ git status --short
(출력 없음)
$ git status
On branch PROD
Your branch is up to date with 'origin/PROD'.

nothing to commit, working tree clean
```
- 병렬 실행이었다면: 해당 없음(단독 실행)
- 이번 테스트 도중 강제 중단(TaskStop 등)이 있었는가: [x] 없음 / [ ] 있음. (프로세스 종료는 전부 내가 시작한 PID에 대한 `kill`·`wait`. 시험 클라이언트 SIGSTOP은 해당 PID에 SIGCONT·kill로 복구.)
- 이 절이 완성됐고 `git status`는 정리 후 깨끗했다(문서 2건 추가 전). 규칙 K 2번 충족.

## 8. 리스크 및 잔존 이슈
- 이번 테스트로 커버되지 않는 알려진 리스크:
  1. **실환경 차이**: TLS 종단 프록시의 WebSocket 업그레이드·`TRUST_PROXY` 단계 수(틀리면 전 이용자가 같은 IP로 보여 속도 제한·강퇴가 오동작, runbook §3)·`-p` 매핑·실도메인 CORS·HSTS. 앱이 HSTS(`includeSubDomains`, 1년)를 직접 보내므로 **같은 도메인의 다른 서브도메인이 HTTPS가 아니면 막힌다** — 도메인 선택 시 주의(미검증)
  2. 롤백 리허설은 로컬 컨테이너·합성 나쁜 릴리스 기준. 쿠버네티스·PaaS의 롤백 기능, 이미지 레지스트리 사용 시 절차는 다르다
  3. coturn 교체·롤백, `TURN_SECRET` 교체의 서버·coturn 동시 반영은 실행하지 않았다
  4. 오늘 받은 외부 이미지·도구 버전(trivy DB 포함)은 날짜에 따라 결과가 달라진다. 스캔은 **배포 직전에 다시** 해야 한다
  5. 09 이연 필수 3건(DEF-09-02 엔진 연결 IP 상한, DEF-09-05 빈 방 점유, DEF-09-06 TURN 자격 발급 총량)은 이번 단계에서 수정되지 않았고 운영 리버스 프록시 `limit_conn` 등으로 완화하는 문서가 11단계에 남아 있다
  6. 방 상태 휘발 — 설계된 한계(재시작 = 회의 종료). 사용자에게 공지 방식 결정이 필요
- 후속 조치가 필요한 항목:
  - **자동 시험 추가를 하지 않은 이유**: 이번 발견은 문서·인프라 파일·외부 이미지·환경 의존이라 `infraGuard` 정적 시험(unit-13)으로 고정할 만한 것은 DEF-10-02(CI에 docker build가 있는지 TC-491 유형), DEF-10-05(config 시험)뿐이며 둘 다 수정과 한 묶음이어야 의미가 있다. 수정 시 TC-540 이상 번호로 함께 추가를 권고한다
  - 5인 검토(CLAUDE.md 규칙): ① 기획자 **[우려]** 공개 출시 조건(#1~#7, 알림 채널)이 모두 사용자 결정에 묶여 있다 ② 개발자 **[우려]** runbook 교체 절차가 문서대로 실패(DEF-10-01), 스모크 스크립트·CI 이미지 빌드 없음 ③ 디자이너 **[통과]** 이 단계 범위 밖(재시작 시 안내 문구는 R-07 서버 코드로 확인, 화면은 8단계) ④ 아키텍트 **[우려]** 무중단·블루/그린 불가가 설계 한계, 롤백은 0.6초대로 빠르지만 회의 소멸 전제, 운영 TURN 구성 없음 ⑤ 보안 **[우려]** coturn 이미지 CRITICAL 21건, 운영 설정 혼용 방지 부재, 09 재판정 대기; 이미지 내 비밀값·비루트·admin 비노출은 **[통과]**

## 9. 결론 및 판정
- [ ] PASS — 다음 단계 진행 가능
- [x] **CONDITIONAL PASS** — 조건:
  1. 입력 계약: **09 보안 감사 재판정 PASS**(DEC-027 수정분 검증)가 기록되어야 11단계로 넘긴다
  2. DEF-10-01(runbook 교체·롤백 절차)을 11단계가 4.5 순서로 고치고, 고친 절차로 **롤백 리허설을 한 번 더** 확인한다(수정 전엔 문서대로 하면 실패)
  3. DEF-10-02·09·10(CI 이미지 빌드, 스모크 스크립트, 알림 채널)은 인프라·제품 변경이라 사용자 허락 후 5단계에서 처리하거나, 처리하지 않고 수용한다는 사용자 결정을 DEC로 남긴다(공개 출시 전 필수 후보)
  4. 12단계(실배포)는 사용자의 별도 승인과 **배포 대상 결정(U-2)** 이후에만 가능하다. 이 문서는 12단계를 승인하지 않는다
- [ ] FAIL
- 근거: 빌드 재현성 PASS(산출물·이미지 내용 동일), 운영 모드 환경변수 검증·헬스체크·종료·admin 비노출 PASS, **롤백 2종을 실제 실행해 0.6~0.7초에 복귀 PASS**. 반면 Open 결함 13건(Medium 6, Low 7)과 입력 계약 불충족, 스테이징 부재, 알림 채널 부재가 있어 PASS로 판정할 수 없다. Critical·High는 없다.

## 10. 내부 검증 (최소 2회, `verification-log-template.md` 사용)
- 1차 검증 결과 요약: 체크리스트(빌드·설정·헬스체크·롤백·마이그레이션·모니터링) 전 항목 수행 여부 확인. 문서 수치·결과를 시험 로그와 대조해 정정(아래 로그 참조). 임시 시험 클라이언트의 `execFileSync` 때문에 생긴 인위적 종료 지연을 SIGSTOP 방식으로 재현해 진짜 동작으로 정정
- 2차 검증 결과 요약: "배포 당일 새벽에 이 문서만 보고 롤백할 수 있는가" 관점으로 재검토 → 4.5를 명령 순서로 정리하고 가정(`-p`·네트워크 미검증)을 명시. 판정 근거·미검증 분리 재점검
- 검증 로그 파일 경로: `docs/harness/verify-log_10-deploy-test.md`

## 11. 검증 실행 기록 (이 단계 마지막 실행, 커밋 95ec4f8, 작업 트리 변경 없음 상태)
| 명령 | 결과 |
|---|---|
| `npm run lint` | 오류·경고 0 (종료 0) |
| `npm run typecheck` | 오류 0 (종료 0) |
| `npm test` | shared 21 통과 / server 241 통과·4 expected fail·4 skipped (24파일 중 1 skipped) / web 433 통과·1 expected fail — 종료 0 |
| `npm run check:docs` | 점검 통과(FR/UX 미참조 0건), 종료 0. **이 문서·검증 로그 추가 후 재실행은 14절** |
| `npm audit --audit-level=high` | `found 0 vulnerabilities` |
| `npm run test:e2e` | **미실행**(8·9단계의 95ec4f8 기준 기록 100 통과·1 skipped에 의존) |
| hadolint / trivy / compose config | 4.3 참조. `actionlint`는 **미검증**(이미지 획득 429) |

## 12. 사용자 결정 필요 목록 (배포 대상은 정하지 않았다)
| # | 결정 | 이유·영향 |
|---|---|---|
| U-1 | **알림 수신 채널**(이메일·메신저 등)과 `/healthz` 외부 감시 도구, 알림을 받을 사람 | 없으면 새벽 장애를 아무도 모름. 정한 뒤 테스트 알림을 1회 발생시켜 수신 확인 필요 |
| U-2 | **배포 대상**(VM+Docker / PaaS / 관리형 TURN 병행), 도메인, TLS 방식, 월 예산 | 12단계의 선행 조건. 4.8 사실표가 비교 근거 |
| U-3 | **스테이징 환경을 따로 둘지**(원격) 또는 이번 같은 로컬 컨테이너 재현을 배포 전 표준으로 삼을지 | 현재는 스테이징이 없음 |
| U-4 | **운영 TURN 방식**: 자체 coturn(TURNS 인증서·외부 IP 구성 필요) vs 관리형, TURN 비용·자격 발급 상한(09 DEF-09-06 연결) | DEF-10-03·04 |
| U-5 | **인프라·제품 파일 수정 허락**(`ci.yml` 이미지 빌드, compose 운영 구성/이미지 태그 상향, `config.ts` 운영 검증 강화, 스모크 스크립트 추가) | 이 단계는 수정 금지라 기록만 함 |
| U-6 | 09 재판정 실행 지시, 이연 필수 3건(DEF-09-02·05·06)의 처리 순서 | 11단계 진행 조건 |
| U-7 | 이미지 보관 방식(서버 로컬 태그만 / 레지스트리 사용) | 롤백 대상 보존 기간·위치 |
| U-8 | 배포·재시작 허용 시간대와 이용자 사전 공지 방식(재시작 = 진행 중 회의 종료) | R-14 |
| U-9 | DEF-S-01(KPI 계측 로그) 결정 — 알림 일부가 이것에 의존 | DEF-10-10 |

## 13. 공유 문서 갱신 요청 (traceability.md·decisions.md·runbook 등은 직접 수정하지 않았다)
- `decisions.md` 추가 제안 **DEC-028**: "10단계 배포 전 검증 결과 처리" — ① 판정 CONDITIONAL PASS, 입력 계약(09 PASS) 불충족을 인지하고 사전 점검으로 수행 ② DEF-10-01~13 Open, 담당: DEF-10-01·11은 11단계 문서, DEF-10-02·05·09는 사용자 허락 후 5단계, DEF-10-03·04·10은 사용자 결정(U-1·U-4) ③ 스테이징 부재와 로컬 컨테이너 재현을 대안으로 사용 ④ 롤백 리허설 결과(0.6~0.7초, 회의 소멸 전제) ⑤ 사용자 결정 U-1~U-9
- `docs/harness/traceability.md`: NFR-07(단일 컨테이너)·NFR-08(graceful shutdown·`/healthz`)·SEC-10(비밀값·예시값 거부)·SEC-11(`npm ci`·audit) 행의 "전체테스트/배포" 증거에 "10단계: 로컬 컨테이너 리허설, 실서버 미검증" 추가, 신규 요구는 만들지 않음. DEF-10-10은 KPI-01·04·NFR-14 계측 이연 행과 연결
- `docs/05-qa/release-checklist.md`: 4.7 판정 반영("롤백 준비" 행 문구, 수치 갱신, 출시 전 필수 #4·#6 현황), `runbook.md` §1·§2 개정(4.5 순서, 보관 대상 표, 종료 대기 15초 권고), `infra-deploy.md` 5349·EXTERNAL_IP 서술 정정
- `docs/05-qa/test-cases.md`: 이번 단계 변경 없음(TC-540·IT-120 미사용)

## 14. 이 문서 작성 후 상태 (최종 `git status`·`check:docs`)
- 두 문서(이 결과서와 검증 로그)를 저장한 뒤 `npm run check:docs`: `점검 통과`(테스트 TC/IT 793개, 테스트 미연결 요구 0건, FR/UX 미참조 0건), 종료 0.
- 같은 시점의 `git status`(그대로):
```
$ git status --short
?? docs/harness/10-deploy-test.md
?? docs/harness/verify-log_10-deploy-test.md
$ git status
Your branch is up to date with 'origin/PROD'.

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	docs/harness/10-deploy-test.md
	docs/harness/verify-log_10-deploy-test.md

nothing added to commit but untracked files present (use "git add" to track)
```
- 해석: 남은 변경은 이 단계의 산출물 2개뿐이다. 임시 아티팩트·미추적 잔여물 없음, 추적 파일 수정 0(HANESS 복사본·제품 코드·인프라 파일 포함). 커밋·푸시는 하지 않았다(오케스트레이터 몫).
