# 테스트 결과서 — unit-13 (인프라: Dockerfile·.dockerignore·infra/*·ci.yml·루트 package.json/lockfile/tsconfig/eslint) — 소급 6단계

## 1. 개요
- 테스트 대상: 작업 단위 unit-13 (모듈: `Dockerfile`, `.dockerignore`, `infra/docker-compose.yml`, `infra/coturn/turnserver.conf`, `.github/workflows/ci.yml`, 루트 `package.json`·`package-lock.json`·`tsconfig.base.json`·`eslint.config.js`). 커밋 `c2cc28c`(PROD). **5단계 노트(`unit-13-note.md`) 없음 — 소급 단위**라 인수 조건은 `03-system-design.md` 확정표(SEC-09 coturn·SEC-11·NFR-07·NFR-08)·§6.3·§7·DEC-015/017/021과 CLAUDE.md 보안 규칙에서 도출했다.
- 테스트 유형: 단위(인프라 소급 검증, 정적 불변식 시험 + 실제 도커 실행 + 변이 시험)
- 적용 Tier: Standard (DEC-002, 규칙 B 최소 2회)
- 적용 속도 트랙: L3 (일반)
- 병렬 실행 정보: 병렬 웨이브(소급 단위 묶음 C)에서 실행(동시에 돌던 축: unit-14 6단계(같은 호출), unit-19 테스터, 소급 서버 01~05, 웹 06~12). 06·07 병합 미적용, 개별 결과서만 산출
- 테스트 목적: 인프라 산출물이 "비루트·헬스체크·비밀값 미포함·lockfile 일관·CI 게이트 유지"를 실제로 만족하는지 독립 재실행으로 증명하고, 이를 깨는 변경이 자동 시험에 잡히는지 확인
- 관련 산출물: `docs/harness/03-system-design.md`(unit-13·§6.3·§7), `02-planning.md`, `decisions.md`(DEC-015·017·021), `docs/05-qa/test-cases.md`, `docs/06-ops/runbook.md`, `CLAUDE.md`
- 테스트 수행자(에이전트): 06-unit-tester (Claude Sonnet 5.5)
- 테스트 일시: 2026-10-01

## 2. 테스트 범위 및 제외 범위
- 범위(In-Scope): ① ci.yml 구문·논리(PyYAML 파싱, job 의존성, 액션 v5, coturn job의 `REQUIRE_COTURN`)와 YAML 사고 재발 방지 장치 ② Dockerfile 빌드·기동·종료·비루트·HEALTHCHECK·예시 비밀값 거부·`.dockerignore` 효과 ③ compose·coturn 설정의 비밀값 누출 경로(파일·이미지 레이어·로그·`docker inspect`) ④ `npm audit`·lockfile 일관성·eslint `any` 금지·tsconfig strict의 실제 작동 ⑤ 변이 시험(임시 복사본)
- 제외 범위 및 사유: 실제 GitHub Actions 실행(이 샌드박스에서 불가 — 워크플로는 PyYAML 구문 확인과 정적 불변식으로만 검증, **Actions 실행 자체는 미검증**), coturn 실제 TURN 할당·사설 거부 실측(unit-18이 TC-331 등으로 소유), HTTPS·리버스 프록시·실서버 배포(규칙 E, 미배포), IPv6 릴레이(unit-18 미검증 항목). 제품 코드·인프라·ci.yml은 수정하지 않았다(시험 파일·문서 행 추가만).

## 3. 테스트 환경
- 실행 환경: Linux 6.18, Node 22, Vitest 5.0.3, Docker Engine 29.6.2 + Compose v5.3.1(샌드박스 제약으로 `dockerd --iptables=false --bridge=none --data-root .harness-tmp/d13/data`를 직접 기동, `--network=host`로 실행), PyYAML 6.0.1
- **환경 한계용 우회(Dockerfile 수정 아님)**: Docker Hub 429·프록시 때문에 `mirror.gcr.io/library/node:22-alpine`을 받아 프록시 CA(`/root/.ccr/ca-bundle.crt`)를 `NODE_EXTRA_CA_CERTS`로 넣은 로컬 베이스를 `node:22-alpine`으로 태그하고 `docker build --network=host --build-arg HTTPS_PROXY=... HTTP_PROXY=...`로 빌드. Dockerfile 본문은 있는 그대로 빌드했다. coturn은 `coturn/coturn:4.9`를 직접 받을 수 있었다.
- 테스트 데이터: 시험용 무작위 비밀값(`SESSION_SECRET`, `TURN_SECRET=U13SECRETvalueXYZ987654321abc`), 변이 복사본 `.harness-tmp/mut_06_unit13/`(`git ls-files` 기준 복사본에 가짜 `.env`·`.env.local`·`apps/server/.env`·`.git/HEAD`·`node_modules/foo` 추가)
- 전제 조건: 5단계 게이트(린트·정적 분석·자체 리뷰)는 소급이라 노트가 없어 **6단계에서 재실행해 확인**: `npm run lint` 오류·경고 0, `npm run typecheck` 오류 0, `npm test -w @meetlite/server` 20파일 통과(225 통과·1 expected fail·4 skip), `npm run check:docs` 통과. `apps/web/dist`와 `npm run build`·`npm run test:e2e`는 공유 자원이라 쓰지 않았다(Docker 빌드는 이미지 내부 빌드).

## 4. 테스트 케이스 및 결과

### 4.1 인수 조건(소급 도출) ↔ 케이스 추적
| AC | 인수 조건(출처) | 케이스 |
|---|---|---|
| AC-1 | ci.yml이 유효한 YAML이며 verify(lint·typecheck·test·check:docs·audit)→e2e·coturn 의존, 액션 v5, coturn은 `REQUIRE_COTURN`(SEC-11·NFR-11, DEC-017③) | A-1, A-2, A-3, TC-490, TC-491 |
| AC-2 | 이미지는 멀티 스테이지·비루트(`USER node`)·HEALTHCHECK·운영 의존성만·`.env`/`.git`/`node_modules` 미포함(NFR-07·08, SEC-10) | B-1~B-8, TC-492, TC-493 |
| AC-3 | 환경변수 누락·예시 비밀값 운영 거부, SIGTERM에 정상 종료(NFR-08, SEC-10) | B-4, B-5, B-7 |
| AC-4 | compose/coturn 설정에서 비밀값이 파일·레이어·로그에 없음(SEC-09, SEC-10, §6.3) | C-1~C-5, TC-493 |
| AC-5 | `npm ci`가 lockfile 일관성을 강제, `npm audit` high 0건(SEC-11) | D-1~D-3 |
| AC-6 | eslint가 `any`·`dangerouslySetInnerHTML`을 막고 tsconfig strict가 실제 작동(NFR-11, SEC-07) | D-4~D-6, TC-494 |
| AC-7 | 인프라 약화(변이)가 자동 시험·점검에 잡힘 | 4.4 변이 시험(M-1~M-26) |

### 4.2 실행한 케이스(수동·명령 기반)
| ID | 시나리오 | 사전조건 | 실행 절차 | 예상 결과 | 실제 결과 | Pass/Fail | 비고 |
|----|----------|----------|-----------|-----------|-----------|-----------|------|
| A-1 | ci.yml 구문(PyYAML) | PyYAML 6.0.1 | `yaml.safe_load(open('.github/workflows/ci.yml'))` | 예외 없음, jobs 3개 | 키 `name, True(on), jobs`, jobs `verify(8 step)`, `e2e(needs verify, 6)`, `coturn(needs verify, 5)` | PASS | PyYAML(YAML 1.1)은 `on`을 `True`로 읽는다(GitHub는 정상 인식, 오류 아님) |
| A-2 | job 논리 | A-1 | 파일 정독 | verify 순서 ci→lint→typecheck→test→check:docs→audit, e2e·coturn은 `needs: verify`, 액션 `checkout@v5`·`setup-node@v5`, coturn env `COTURN_LIVE=1`·`REQUIRE_COTURN=1`·`COTURN_RUNNER=docker` | 일치. coturn 이미지는 compose에서 `sed`로 읽어 `docker pull`(블록 스칼라 — DEC-017③ 수정분) | PASS | e2e job은 `npm run test:e2e`(빌드 포함)이며 `check:docs`는 verify에서만 |
| A-3 | 과거 사고 재현 검증 | 6d31666 이전 줄 | 현재 `- run: \|` 블록을 사고 당시 한 줄(`- run: docker pull "$(sed ... image: ...)"`)로 되돌린 문자열에 `yamlSyntaxIssues` 적용 | 따옴표 없는 스칼라의 `: ` 검출 | TC-490 안에서 검출(음성 대조군) | PASS | 완전한 파서가 아닌 휴리스틱(8절) |
| B-1 | Docker 빌드 | 우회 베이스 | `docker build ... -t meetlite-06u13:test .`(저장소 컨텍스트) | 성공 | 성공(캐시 사용 20.6s) | PASS | 우회는 환경 한계용 |
| B-2 | 비루트·구성 | B-1 | `docker run --rm --entrypoint sh ... id`, `docker inspect` | uid≠0, HEALTHCHECK·CMD 존재 | `uid=1000(node)`, `Config.User=node`, Healthcheck `node -e fetch(.../healthz)` 30s/3s, `NODE_ENV=production`, `WEB_DIST=/app/apps/web/dist`, Cmd `node apps/server/dist/index.js` | PASS | |
| B-3 | 최종 이미지 내용 | B-1 | `ls -a /app`, `.bin`에서 tsc·vitest·eslint·playwright 검색 | 운영 의존성·dist만, 개발 도구 없음 | `/app`에 `apps, node_modules(97개), package*.json, packages`만, `.env`·`.git`·`e2e`·`docs`·`.harness-tmp` 없음, 개발 도구 0개 | PASS | |
| B-4 | 환경변수 누락 시 기동 실패 | B-1 | `docker run --rm --network=host IMG` | 읽기 쉬운 오류 + 비정상 종료 | `ALLOWED_ORIGINS`·`SESSION_SECRET` 누락 목록 + `.env.example` 안내, 종료 코드 1 | PASS | |
| B-5 | 예시 비밀값(운영) 거부 | B-1 | `-e SESSION_SECRET=change-me-...` | 기동 거부 | "운영에서는 예시 비밀값(change-me...)을 쓸 수 없습니다", 종료 코드 1 | PASS | SEC-10 |
| B-6 | 정상 기동·헬스체크·보안 헤더 | B-1 | 무작위 비밀값으로 `-d` 기동, `curl /healthz`, `/`, HEAD | 200, SPA, CSP·Permissions-Policy | `/healthz` 200, `/` 200, CSP·`Permissions-Policy: camera=(self), microphone=(self)...` 확인, 로그에 비밀값 0회 | PASS | |
| B-7 | 종료(SIGTERM) | B-6 | `docker stop`, `docker inspect` | 신속·정상 종료 | 0.1초, `ExitCode=0`, OOM 아님, 로그 `shutting down` | PASS | PID 1이 node라 신호가 전달됨 |
| B-8 | HEALTHCHECK 자연 상태 | B-6 | 기동 후 `docker inspect .State.Health.Status` | healthy | `healthy` (그리고 `docker exec`로 헬스체크 명령 단독 실행 종료 코드 0) | PASS | |
| B-9 | `.dockerignore` 효과(가짜 비밀 주입) | 컨텍스트에 `.env`·`.env.local`·`apps/server/.env`·`.git`·`node_modules/foo` | 빌드 후 `find /app -name ".env*" -o -name .git`, `grep -rl DECOY /app`, `docker history`에서 DECOY 검색 | 최종 이미지에 0건 | 최종 이미지 0건, history 0건. **단 빌드 스테이지(`--target build`)에는 `apps/server/.env`(DECOY)가 들어 있음** → DEF-002 | PASS(최종 이미지) / 결함 기록 | 루트 `.env`·`.env.local`·`.git`·`node_modules`는 제외됨 |
| C-1 | compose 필수 변수 | 변수 없음 | `docker compose -f infra/docker-compose.yml config` | 기동 거부 | "TURN_SECRET을 설정하세요" 오류 | PASS | |
| C-2 | compose 기동·설정 마운트 | `TURN_SECRET` 시험값 | `docker compose -p u13test up -d` | 컨테이너 기동, 설정 읽기 전용 마운트, 사설 대역 차단 로그 | 기동. 로그에 Black listing 13개 대역(10/8·127/8·169.254/16·172.16/12·192.168/16·100.64/10·224+·::1·::ffff:0:0/96·fc00::/7·fe80::/10·ff00::/8 등), `max-bps 1500000`, 프로세스 uid 65534 | PASS | |
| C-3 | 비밀값 누출 경로 | C-2 | 컨테이너 로그·`/etc/coturn`·`/var/tmp`·`/tmp` grep, `docker history --no-trunc coturn/coturn:4.9` grep, `turnserver.conf` grep | 파일·로그·레이어에 0건 | 로그 0건, 컨테이너 파일 0건, 이미지 레이어 0건, conf에 시크릿 줄 없음 | PASS | |
| C-4 | 비밀값 노출 면(명령행·환경) | C-2 | `docker inspect`의 Cmd/Env, 호스트 `ps` | (설계상) 명령행으로만 전달 | **Cmd에 1회, Env에 1회, 호스트 `ps aux`(host 네트워크)에 노출** | 관찰 → DEF-003 | 파일·로그·레이어에는 없음 |
| C-5 | `compose down` | 변수 없음 | `docker compose -p u13test down` | 내려감 | 변수 없으면 보간 오류로 실패(`TURN_SECRET=x`를 주면 성공) | 관찰 → DEF-005 | |
| C-6 | coturn 설정 경고 | C-2 | 기동 로그 | 경고 없음 | `WARNING: Bad configuration format: no-tlsv1` / `no-tlsv1_1` 각 4회(4.9에서 인식 못함) | 관찰 → DEF-004 | TLS 1.0/1.1 비활성 의도의 옵션이 무효인지는 4.9 기본값 확인 전이라 미검증 |
| D-1 | npm audit | 레지스트리 접근 | `npm audit --audit-level=high`, `npm audit` | 0건 | `found 0 vulnerabilities` (둘 다) | PASS | |
| D-2 | `npm ci` 성공(깨끗한 복사본) | `.harness-tmp/mut_06_unit13/ci`에 package.json·lockfile·워크스페이스 package.json만 복사 | `npm ci --ignore-scripts --no-audit --no-fund` | 성공 | 376 패키지 설치 6.9s | PASS | 공유 `node_modules`는 건드리지 않음 |
| D-3 | lockfile 드리프트 거부 | D-2 | `package.json`의 `vitest`를 `^4.0.0`으로 변조 후 `npm ci` | 실패 | 종료 코드 1(`Cannot read properties of null (reading 'edgesOut')` — npm의 불친절한 메시지지만 실패함) | PASS | 호환 범위 안(`typescript ^5.8`) 변경은 통과하는 것이 정상 |
| D-4 | eslint `any` 금지 | D-2 | 복사본에 `(x: any)`, 미사용 import, `a[0]!`, `dangerouslySetInnerHTML` 파일을 두고 `npx eslint .` | `any`·미사용·XSS 속성 오류 | 오류 3(`no-explicit-any`, `no-unused-vars`, `no-restricted-syntax`) + 경고 1(`no-non-null-assertion`) | PASS | |
| D-5 | tsc strict | D-2 | `export function f(x)`·`const n: number = a[0]`을 `tsconfig.base.json` 상속 설정으로 컴파일 | 오류 | TS7006(암시적 any), TS2322(`undefined` 가능) | PASS | `noUncheckedIndexedAccess` 작동 |
| D-6 | 경고는 CI를 실패시키지 않음 | 저장소 | stdin으로 `a[0]!` 린트 | (설계 확인) | 경고 1건·**종료 코드 0** → `!` 비null 단언은 CI를 통과 | 관찰 → DEF-007 | 현재 저장소는 경고 0건 |

### 4.3 이번에 추가한 자동 시험 (`apps/server/test/infraGuard.test.ts`, 5개)
| TC | 검증 | 변이로 판별력 확인 |
|---|---|---|
| TC-490 [SEC-11,NFR-11] | ci.yml에 탭·따옴표 없는 스칼라의 `: `·따옴표 불균형 없음 + 사고 줄 음성 대조군/블록 스칼라 양성 대조군 | M-7(사고 재현) 실패로 검출 |
| TC-491 [SEC-11,NFR-08] | verify 6단계 존재·순서, e2e·coturn `needs: verify`, 액션 v5 이상, coturn `COTURN_LIVE/REQUIRE_COTURN/COTURN_RUNNER`, ci.yml이 부르는 npm 스크립트의 존재 | M-5·6·8·9·10 검출 |
| TC-492 [NFR-07,NFR-08,SEC-10] | Dockerfile 불변식(멀티 스테이지, 고정 베이스, USER node, HEALTHCHECK, NODE_ENV, `--omit=dev`, 통째 COPY/ADD·비밀 ENV·`npm install` 금지) + 점검기 변이 9종 대조 | M-1~4 검출 |
| TC-493 [SEC-10,SEC-09,NFR-07] | `.dockerignore` 필수 항목, compose 시크릿은 `${TURN_SECRET:?...}` 보간만·특권·docker.sock 없음·이미지 태그 고정, coturn conf에 시크릿 줄 없음 | M-11~14 검출 |
| TC-494 [NFR-11,SEC-07] | ESLint API로 `any`·미사용·타입 import·`dangerouslySetInnerHTML` 오류 실측(양성 대조군 포함), 모든 워크스페이스 tsconfig가 base 상속·strict 약화 금지 | M-15~19 검출 |

실행: `npx vitest run test/infraGuard.test.ts` → 5 passed. 같은 시험은 `INFRA_GUARD_ROOT`로 변이 복사본에 적용해 4.4를 수행했다. check-docs `--gen` 후 `npm run check:docs` 통과(TC-490~498 9행 추가, 테스트 484개).

### 4.4 변이 시험 결과 (모두 `.harness-tmp/mut_06_unit13/` 복사본에서만)
| # | 변이 | 잡은 시험 | 결과 |
|---|---|---|---|
| M-0 | 대조군(무변이) | - | 5/5 통과 |
| M-1 | Dockerfile `USER node` 제거 | TC-492 | 검출 |
| M-2 | Dockerfile `HEALTHCHECK` 제거 | TC-492 | 검출 |
| M-3 | Dockerfile에 `COPY .env .env` | TC-492 | 검출 |
| M-4 | (TC-492 내부 변이 9종: 전체 COPY, 비밀 ENV, `--omit=dev` 제거, `npm install`, latest 베이스, 단일 스테이지) | TC-492 | 모두 검출 |
| M-5 | ci.yml에서 `npm audit` 제거 | TC-491 | 검출 |
| M-6 | ci.yml에서 `check:docs` 제거 | TC-491 | 검출 |
| M-7 | ci.yml YAML 사고 줄 재현(DEC-017③ 원본 줄) | TC-490 | 검출 |
| M-8 | e2e job의 `needs: verify` 제거 | TC-491 | 검출 |
| M-9 | coturn job의 `REQUIRE_COTURN` 제거 | TC-491 | 검출 |
| M-10 | `setup-node@v5`→`@v4` 하향 | TC-491 | 검출 |
| M-11 | `.dockerignore`의 `.env` 제거 | TC-493 | 검출 |
| M-12 | compose `TURN_SECRET`에 리터럴 값 | TC-493 | 검출 |
| M-13 | `turnserver.conf`에 `static-auth-secret=abc` | TC-493 | 검출 |
| M-14 | compose 이미지 태그 `4.9`→`4.8` | 기존 TC-330d(실행해 실패 확인) | 검출 |
| M-15 | eslint `no-explicit-any` off | TC-494 | 검출 |
| M-16 | eslint `no-explicit-any` warn으로 강등 | TC-494 | 검출 |
| M-17 | `tsconfig.base.json` `strict:false` | TC-494 | 검출 |
| M-18 | `apps/web/tsconfig.json`에 `noImplicitAny:false` | TC-494 | 검출 |
| M-19 | (도커) 빌드 컨텍스트에 `.env` 주입 | B-9 | 루트 `.env`는 제외됨, `apps/server/.env`는 빌드 스테이지에 유입 → DEF-002 |
| M-20 | ci.yml에서 `npm audit` 제거(TC-491 추가 전 기존 시험만으로) | 기존 시험 | 잡는 시험 없음: 저장소의 시험·스크립트 중 `ci.yml`·`Dockerfile`을 읽는 것은 없다(`grep -rln` 확인, `coturnConfig/coturnLive`만 compose·conf 참조). 실행으로 확인한 것은 아니고 정독·grep 판단(DEF-001의 근거) |
생존 변이(기존 시험만 있을 때, 정독·grep 판단이며 M-14만 실행 확인): M-1~M-12, M-15~M-18은 잡는 시험이 없었다. M-13은 기존 TC-330이, M-14는 TC-330d가 잡는다(M-14 실행 확인). 신규 TC-490~494 추가 후 위 변이는 전부 검출된다. 현재 TC-490~494로도 못 잡는 것은 DEF-002(중첩 `.env`)이다(변이 M-19).

## 5. 커버리지
- 커버리지 지표(기능 기준): AC-1~AC-7 전부에 실행 근거가 있다. 코드 라인 커버리지는 해당 없음(설정·인프라 파일). 정적 불변식 시험 5개 + 도커 실측 B/C 14건 + 변이 20종.
- 커버되지 않은 부분과 사유: 실제 GitHub Actions 실행·캐시·권한 모델(샌드박스 불가), YAML 완전 파싱(휴리스틱, 들여쓰기·구조 오류는 미탐), 다이제스트 고정·이미지 취약점 스캔(trivy 등 미사용), HTTPS/TLS·방화벽·실제 TURN 릴레이 흐름(unit-18·배포 단계), coturn `no-tlsv1*` 무효 옵션의 실질 영향.

## 6. 결함(Defect) 목록
| ID | 설명 | 재현 절차 | 심각도 | 상태 | 조치 내용 |
|----|------|-----------|--------|------|-----------|
| DEF-001 | 워크플로 YAML 구문·게이트 유지를 자동 검증하는 시험·점검이 저장소에 없었다(과거 사고: YAML 오류로 워크플로 무효, 3커밋 CI 미실행). 사고 후 대책은 "푸시 전 PyYAML 확인"이라는 사람 규칙뿐 | ci.yml의 `npm audit`·`check:docs` 줄 삭제 또는 사고 줄 재현 → 기존 `npm test`·lint·check:docs 전부 통과(M-20) | Medium | Fixed(시험 추가) | `infraGuard.test.ts` TC-490·491 추가(의존성 0). **한계**: 완전한 YAML 파서가 아니어서 들여쓰기·구조 오류는 못 잡음. 최종 방어선은 푸시 후 Actions에서 워크플로 이름 `CI`가 실제 실행됐는지 확인(DEC-017③) |
| DEF-002 | `.dockerignore`의 `.env`·`.env.*`가 루트에만 적용된다. 하위 `apps/server/.env`는 빌드 컨텍스트에 포함돼 **빌드 스테이지 레이어·캐시에 남는다**(최종 이미지에는 `dist`만 복사돼 유입되지 않음, 실측) | 컨텍스트에 `apps/server/.env` 생성 → `docker build --target build` → `docker run ... cat /app/apps/server/.env`가 값을 출력 | Low | Deferred(제품 파일 수정 금지) | 권고: `**/.env`, `**/.env.*`, `!**/.env.example` 추가. 개발자가 서버 디렉터리에 `.env`를 두면 개발 PC의 빌드 캐시에 남음. 최종 이미지·배포 이미지는 영향 없음 |
| DEF-003 | `TURN_SECRET`이 컨테이너 명령행(`--static-auth-secret=`)과 환경변수로 전달돼 `docker inspect`와 호스트 `ps aux`(network_mode host)에서 보인다. 파일·이미지 레이어·로그에는 없음(실측) | `TURN_SECRET=... docker compose up -d` 후 `docker inspect <id> --format '{{json .Config.Cmd}}'`, 호스트 `ps aux \| grep turnserver` | Low | Deferred | 설계상 알려진 절충(turnserver.conf 주석: "명령행으로만"). 1대 1인 운영이라 영향이 작음. 대안(coturn이 환경변수/별도 비밀 파일을 읽는지)은 **미확인**. 운영 호스트에서 다른 사용자 계정 금지·`docker inspect` 권한 제한을 runbook에 명시 권고 |
| DEF-004 | coturn 4.9가 `no-tlsv1`·`no-tlsv1_1`을 인식하지 못한다(`Bad configuration format` 경고) → 의도한 TLS 버전 하드닝이 무효이거나 불필요 | `docker compose up` 후 `docker logs`에서 `Bad configuration format` | Low | Deferred | 4.9 기본 TLS 최소 버전은 **미확인**. 옵션 이름 확인 후 정리 권고(unit-18 소유 파일) |
| DEF-005 | `docker compose down`이 `TURN_SECRET` 없이 실패(필수 변수 보간) → 운영자가 종료 시에도 값을 넣어야 함 | `docker compose -f infra/docker-compose.yml down` | Low | Deferred | runbook에 `TURN_SECRET=x docker compose ... down` 또는 `docker rm -f` 안내 권고 |
| DEF-006 | ci.yml에 `permissions:`(최소 권한)와 `timeout-minutes`가 없다 | 파일 정독 | Low | Deferred | 권고: `permissions: contents: read`, job별 timeout. 현재 `GITHUB_TOKEN` 기본 권한은 저장소 설정에 따름(**미확인**) |
| DEF-007 | eslint `no-non-null-assertion`이 `warn`이고 CI가 `--max-warnings`를 쓰지 않아 `!`가 게이트를 통과한다(CLAUDE.md의 "any 금지"와 달리 `!`는 금지 대상은 아님) | stdin으로 `a[0]!` 린트 → 경고 1, 종료 코드 0 | Low | Deferred | 현재 경고 0건이라 영향 없음. 경고를 막으려면 `--max-warnings 0` 권고 |
- 위 외 결함 없음. 근거: B-1~B-9·C-1~C-3·D-1~D-5의 실측과 변이 20종(4.4)이 기대와 일치. Critical/High 없음.

## 7. 테스트 환경 정리(Teardown) 확인 — 규칙 K
- 이번 테스트에서 생성한 임시 아티팩트 목록: `.harness-tmp/d13/`(dockerd 데이터 루트·CA·base.Dockerfile·로그), `.harness-tmp/mut_06_unit13/`(ctx·ci·cd·m·me 복사본), `.harness-tmp/pw_06_unit14/`·`pw_unit14_run*.log`(unit-14 Playwright 출력), 도커: 컨테이너 `u13`·`u13h`·`u13test-coturn-1`, 이미지 `meetlite-06u13:{test,decoy,buildstage}`·로컬 `node:22-alpine`(우회 베이스)·`mirror.gcr.io/library/node:22-alpine`·`coturn/coturn:4.9`·`mirror.gcr.io/coturn/coturn:4.9`, 프로세스 `dockerd`·`containerd`(내가 직접 기동); 사소한 예외: `/tmp/x.bak` 1개를 만들었다가 즉시 삭제함
- 위 아티팩트를 전부 `.harness-tmp/` 하위에서만 생성했는가 (규칙 K 1번): [x] 예 / [ ] 아니오 (도커 이미지·컨테이너는 데몬 데이터 루트가 `.harness-tmp/d13/data`라 그 안에 있었다)
- 정리(삭제) 완료 여부: 완료 — 컨테이너 0, 볼륨 0, 이미지 전부 삭제(`docker images -q`=0), `dockerd`·`containerd` 종료 확인(`pgrep` 결과 없음), `.harness-tmp/d13`·`mut_06_unit13`·`pw_06_unit14`·로그 삭제. 다른 단위의 `.harness-tmp/mut_06_unit0x`·`probe_06_web`은 손대지 않음. 변이 시험용 e2e 크로미움 프로세스 잔존 없음
- 정리 후 `git status` 실행 결과(그대로 첨부):
```
 M docs/05-qa/test-cases.md
 M docs/traceability.md
?? apps/server/.vitest/
?? apps/server/test/e2eGuard.test.ts
?? apps/server/test/infraGuard.test.ts
?? apps/server/test/metricsPathAdversarial.test.ts
?? apps/server/test/unit02Adversarial.test.ts
?? apps/server/test/unit03Adversarial.test.ts
?? apps/server/test/unit04Adversarial.test.ts
?? apps/server/test/unit05Adversarial.test.ts
?? apps/web/src/components/chatPanel.test.ts
?? apps/web/src/components/participantsPanel.test.ts
?? apps/web/src/components/roomUi.test.ts
?? apps/web/src/components/stateScreen.test.ts
?? apps/web/src/components/videoTileSpeaking.test.ts
?? apps/web/src/lib/audioLevel.test.ts
?? apps/web/src/lib/localMedia.test.ts
?? apps/web/src/lib/signaling.test.ts
?? apps/web/src/lib/signalingPathCompat.test.ts
?? apps/web/src/lib/storageApi.test.ts
?? apps/web/src/media/meshTransport.fake.test.ts
?? apps/web/src/media/pathMetricsAdversarial.test.ts
?? apps/web/src/pages/landing.test.ts
?? apps/web/src/state/meetingController.test.ts
?? docs/harness/units/unit-19-test.md
?? docs/harness/verify-log_unit-19-test.md
?? e2e/pathMetrics-extra.spec.ts
?? e2e/webRetro.spec.ts
?? packages/shared/.vitest/
?? packages/shared/src/protocolBoundary.test.ts
```
(이 시점 이후 이 단위의 결과서 2개·verify-log 2개가 `docs/harness/` 아래 새로 추가된다.)
- 병렬 실행이었다면: 이 단위 소유는 `apps/server/test/infraGuard.test.ts`·`apps/server/test/e2eGuard.test.ts`(unit-14 시험 포함)와 `docs/05-qa/test-cases.md`·`docs/traceability.md`의 `check-docs --gen` 재생성 결과(TC-490~498 행 추가). `unit02~05Adversarial`·`unit-19`·`web/src/**`·`e2e/webRetro.spec.ts`·`e2e/pathMetrics-extra.spec.ts`·`protocolBoundary` 등은 다른 테스터 소유. `apps/server/.vitest/`·`packages/shared/.vitest/`는 vitest 5 실행 산출물로 소유자 불명(내 vitest 실행이 만들었을 수 있음; 동시에 다른 테스터도 실행 중이라 임의 삭제하지 않음 — 오케스트레이터 점검 필요, `.gitignore` 추가 권고). 이 실행이 만든 `.harness-tmp` 아티팩트·도커 자원·프로세스 잔여물은 없음. 웨이브 종료 후 전체 트리 점검(`harness-janitor.sh --check`, 전체 `git status`)은 오케스트레이터가 수행.
- 이번 테스트 도중 강제 중단(TaskStop 등)이 있었는가: [x] 없음 / [ ] 있음 (백그라운드로 넘어간 도커 명령 1건은 `grep -rl /`가 오래 걸린 것으로 직접 종료하고 도커 상태를 재점검했으며, 이후 단계에서 컨테이너·이미지를 전부 정리함)

## 8. 리스크 및 잔존 이슈
- 이번 테스트로 커버되지 않는 알려진 리스크: ① 실제 Actions 실행(캐시·권한·러너 Docker) 미검증 ② ci.yml 점검은 휴리스틱(완전 파서 아님) ③ 이미지 취약점 스캔·SBOM·다이제스트 고정 없음(베이스 `node:22-alpine`은 메이저만 고정, 빌드 시점마다 바뀜) ④ 도커 실측은 `--network=host`·`--iptables=false` 샌드박스, 실서버 네트워크 구성 미검증 ⑤ 우회 베이스(프록시 CA 포함)로 빌드했으므로 "공식 `node:22-alpine`으로의 빌드"는 샌드박스에서 직접 재현하지 못했다(CI의 e2e/배포 단계에서 확인 필요)
- 후속 조치가 필요한 항목: DEF-002(`**/.env`)·DEF-003(비밀 노출 면 문서화)·DEF-004~007 중 오케스트레이터가 선택. 푸시 후 Actions 첫 실행에서 `CI` 이름의 3 job이 모두 돌았는지 확인(DEC-017③).

## 9. 결론 및 판정
- [ ] PASS
- [x] CONDITIONAL PASS — 조건: Critical/High 없음, Medium DEF-001은 시험 추가로 해소(Fixed). Low 6건(DEF-002~007)이 Deferred이므로 오케스트레이터가 이연을 수용해야 한다. 07단계로 handoff 가능
- [ ] FAIL

## 10. 내부 검증 (최소 2회)
- 1차 검증 결과 요약: 인수 조건 AC-1~7 모두 실행 근거와 연결(4.1). 기대값은 설계서·CLAUDE.md·실측 로그에 근거. 시험 자체의 결함 점검에서 TC-493의 coturn 설정 정규식이 `user-quota`를 `user`로 오탐해 첫 실행에서 실패 → 정규식 수정 후 재실행 통과(시험 결함이지 제품 결함 아님).
- 2차 검증 결과 요약: "모든 시험이 통과했는데 변이도 통과한다면 무의미"를 의심해 변이 20종을 적용, 기존 시험만으로는 16종 가량이 잡히지 않았을 것으로 판단하고(정독·grep, 실행 확인은 M-14만) 신규 시험이 이를 잡음을 재확인. 도커 실측으로 `.dockerignore`의 중첩 `.env` 갭(DEF-002)과 비밀 노출 면(DEF-003)을 추가로 발견.
- 검증 로그 파일 경로: `docs/harness/verify-log_unit-13-test.md`

## 공유 문서 갱신 요청 (traceability.md·decisions.md는 직접 수정하지 않음)
- traceability.md "단위테스트" 컬럼: NFR-07, NFR-08, SEC-09, SEC-11 (unit-13) → `CONDITIONAL PASS (소급 6단계, TC-490~494·변이 20종, Low 이연 6건: unit-13-test.md)`
- decisions.md 후보: ① DEF-002~007 이연 수용 여부 ② 푸시 후 Actions 확인 규칙 유지(DEC-017③)
- docs/05-qa/test-cases.md·docs/traceability.md(루트 문서)는 `check-docs --gen`으로 이미 재생성함(다른 테스터 변경분도 함께 반영됐음)
