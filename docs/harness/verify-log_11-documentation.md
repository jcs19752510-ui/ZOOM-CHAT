# 내부 검증 로그 (Internal Verification Log) — 11-documentation (11단계)

## 대상 산출물
- 결과서 `docs/harness/11-documentation.md`, 문서 4종(`docs/06-ops/runbook.md`, `user-guide.md`, `admin-manual.md`, `docs/03-engineering/api-spec.md`)과 함께 정정한 `infra-deploy.md`·`security.md`·`privacy.md`·`release-checklist.md`·`docs/harness/03-system-design.md`·`docs/README.md`, 시험 1줄(`featureContracts.test.ts` IT-83)
- 작성 에이전트: 11-documentation-writer (Claude Sonnet 5.5) / 적용 Tier: Standard (규칙 B 최소 2회) / 이전 시도(사용량 한도로 중단)의 작업 트리 변경분을 이어받아 검토·보완
- 임시 실행물: `.harness-tmp/doc11/`(로컬 dockerd·이미지·스크립트). 사용 후 전부 삭제(5절)

## 1차 검증 (08/09/10 및 실제 코드와의 일치, 민감정보 점검)
- 일시: 2026-10-02
- [x] 입력 읽음: CLAUDE.md, ORCHESTRATOR 11단계 행·5-4, decisions DEC-001~028, 08·09·10 결과서 전체
- [x] **코드 대조(M-1)**: `config.ts` zod 스키마 ↔ admin-manual §2 환경변수 표(이름·기본값·범위·필수 여부) 일치. `.env.example`은 `OPERATOR_CONTACT` 로컬 파트에 `%`를 허용한다고 적지만 코드는 거부 → 문서는 코드 기준(admin-manual에 명시)
- [x] **코드 대조(A-0)**: `protocol.ts`의 `ERROR_CODES` 19종·C→S 12종·S→C 10종, `socket/server.ts`의 `RATE_SPECS`(12종 용량/보충)·15회/10초 종료·`maxHttpBufferSize` 32KB·WebSocket 전용·핑 5초, `http/app.ts`의 REST 한도(방 생성 10/분, 조회 60·초당 1)·CORS·2KB, `http/admin.ts`의 상태 코드(401·400·404·405·413·429·500)·인증 실패에만 속도 제한·SHA-256+`timingSafeEqual`, `clientIp.ts`의 IPv6 /64·IPv4-mapped 처리 — api-spec·03·security·privacy 서술과 일치
- [x] **IT-83**: `it.fails`→일반 `it`로 바뀐 상태에서 `npx vitest run --root apps/server test/featureContracts.test.ts` → **8 passed**
- [x] **실제 서버 응답(A-1~A-4)**: 운영 빌드 서버(`NODE_ENV=production`, 임시 난수 비밀값)에 요청해 api-spec §9 표를 확인 — 방 생성 201(roomId 22자), 비밀번호 2자·깨진 JSON 400, 3KB 본문 **413 `INVALID_PAYLOAD`**, 나쁜 Origin 403, 알 수 없는 `/api/*` 404, `/api/meta` 미설정 시 `null`·`stunHosts:["stun.l.google.com"]`, admin 토큰 없음/틀림 401·짧은 방 ID 400·GET 405·다른 경로 404·닫기 200→404·공개 포트 `/admin/...` 404, 소켓 join 응답 키(`ok,selfId,token,hostId,locked,participants,iceServers,config`)·닉네임 중복 `host (2)`·`NOT_JOINED`·`INVALID_PAYLOAD`·`FORBIDDEN`·`ROOM_LOCKED`·`SCREEN_BUSY`·`CANNOT_KICK_SELF`·`TARGET_NOT_FOUND`·`TOKEN_INVALID`·`ALREADY_JOINED`·`ROOM_NOT_FOUND`·`HOST_NOT_PRESENT`·`WRONG_PASSWORD`, admin 폐쇄 시 남은 소켓이 `room:closed {v:1}` 수신 후 끊김. 로그에 토큰 0회, SIGTERM 종료 코드 0. (이 항목은 이전 시도가 실행한 기록 `run1.out`·`sock.out`을 이번에 열어 확인했다)
- [x] **컨테이너 절차 재실행(R-1~R-7, 이번 단계에서 직접 실행)** — 로컬 dockerd(`--iptables=false --bridge=none`, 데이터 루트 `.harness-tmp/doc11/d`), `--network=host`, 임시 난수 `stage.env`(권한 600):
  - R-1 `docker build --network=host --build-arg HTTPS_PROXY=… -t meetlite:11doc .` → **성공, 22.7초**, 271MB (runbook "약 20초"와 일치)
  - R-2 §5-2 순서(`rm -f meetlite-prev`→`stop -t 15`→`rename`→`run`)로 v1→v1b 교체: 첫 줄은 prev가 없어 `No such container`만 출력(문서 설명대로 무시), `/healthz` 즉시 `{"status":"ok","uptimeSec":0}`
  - R-3 **prev가 남은 채 다시 `rename`**: `failed to rename container: … Conflict. The container name "/meetlite-prev" is already in use` — runbook §5-2 두 번째 불릿의 서술과 일치
  - R-4 합성 불량(`/healthz` 503 `{"status":"broken"}`) 릴리스 교체 후 §5-3 판정 루프가 6회 모두 실패(exit 1)해 불량 감지
  - R-5 롤백 A(`rm -f && rename && start`): `healthz` 응답이 올 때까지 폴링해 **641ms**, 이미지·`restart=unless-stopped` 복원. (첫 시도는 `docker start` 직후 단발 `curl`이라 빈 응답 — 폴링으로 재측정. 이전 문서의 "약 1.2초"는 근거를 재현할 수 없어 0.64초로 교체)
  - R-6 시작 실패 릴리스(`환경변수 오류: NEW_REQUIRED_SETTING`) + `--restart unless-stopped`: 6초 후 `Restarting (1)`, `restarts=6`, 로그 마지막 줄에 원인 → 롤백 B(`rm -f` 후 직전 태그 `run`) **586ms**에 `healthz` ok. 현재 저장소 이미지(`meetlite:11doc`)로 교체: stop 148ms, 교체~`healthz` ok 합계 743ms, `--log-opt`가 `max-file:3 max-size:10m`으로 적용됨(`docker inspect`)
  - R-7 방 폐쇄(runbook §6·admin-manual §4-3): 방 생성(roomId 22자) → `docker exec meetlite sh -c 'wget -qO- --header="Authorization: Bearer $ADMIN_TOKEN" --post-data="" http://127.0.0.1:$ADMIN_PORT/admin/rooms/<ID>/close'` → `{"closed":true,"participants":0}` exit 0, 재호출 `404 Not Found` exit 1, 틀린 토큰 `401`, 호스트 셸이 변수를 확장한 형태(큰따옴표 바깥)는 빈 토큰이라 `401`. 컨테이너 로그에 `close`(방 ID 앞 6자)·`auth-failed`만 남고 **`ADMIN_TOKEN` 값 0회**
- [x] **관리자 토큰 생성 명령**: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url').length)"` → 43 (admin-manual 서술 일치)
- [x] **사용자 매뉴얼 문구(U-1)**: 인용한 「…」 화면 문구 약 60개를 `apps/web/src/strings.ts`에서 문자열 검색 — **누락 0건**
- [x] **민감정보·독자 분리(S-1)**: 사용자 매뉴얼에서 `ADMIN|docker|SESSION_|3001|TURN|coturn|.env|토큰|서버 로그|runbook|127.0` 검색 → 0건. 4개 문서에서 40자 이상 영숫자 문자열 검색 → 0건. 실제 비밀값·키 원문 없음(시험에 쓴 값은 임시 난수이고 어떤 문서에도 옮기지 않음)
- [x] **회귀(L-1)**: `npm run lint` 0 / `npm run typecheck` 0 / `npm test` shared 21, server 242 통과·3 expected fail·4 skipped, web 433 통과·1 expected fail / `npm run check:docs` 점검 통과(793개, 미연결 0)
- 1차에서 발견·정정한 것:
  1. runbook의 롤백 A 소요 "약 1.2초(대기 1초 포함)"와 "이번 리허설" 서술은 이전 시도의 기록이 남아 있지 않아 근거를 확인할 수 없었다 → 위 R-1~R-7을 다시 실행해 0.64초·0.59초·0.74초로 교체하고 증거 위치를 이 로그로 연결
  2. 이전 시도가 남긴 `.harness-tmp/doc11/`(638MB, 정지된 dockerd 데이터 포함)을 발견 → 같은 데이터 루트로 dockerd를 다시 띄워 재사용(이미지 재획득 없이) 후 5절대로 정리
  3. 결과서 초안의 "화면 문구 61개"는 정확한 개수가 아니어서 "약 60개"로 정정
- 조치 내용: 위 정정 후 v1.0

## 2차 검증 (독립 심사자 관점 — 문서별 "처음 그 역할을 맡은 사람이 추가 질문 없이 할 수 있는가")
- 일시: 2026-10-02
- **신규 온콜 운영자(runbook)**: ① "지금 상태"(0절)에서 배포된 환경이 없고 리허설이 로컬 컨테이너였음을 먼저 읽는다 ② 환경변수 이름·필수 여부·**값은 문서에 없고 보관 위치는 미정**임이 표로 드러난다 ③ 첫 시작·교체·판정·롤백이 복사 가능한 명령으로 있고 각 명령의 실행 결과를 R-2~R-6으로 확인 ④ 롤백 조건(30초 내 healthz 실패·`환경변수 오류`·스모크 실패)과 "`docker ps`의 health만 믿지 않는다"가 있다 ⑤ 알림이 **없다**는 사실, 에스컬레이션 표가 **미정으로 비어 있고 채워야 한다**는 점을 숨기지 않는다. → 새벽에 롤백 가능. 남은 공백(미검증): 실환경 `-p`·프록시, coturn 롤백 — 6절에 명시. **판정: 가능(단 연락 체계·알림은 사용자 입력 필요)**
- **첫 이용자(user-guide)**: 준비물→닉네임→새 회의→허용→링크 복사 순서가 화면 문구 그대로이고, 호스트 탭을 닫지 말라·새로고침하면 새 참가자가 된다는 주의, 같은 IP 강퇴 오차단과 우회, 휴대폰 화면공유 불가·iPhone 백그라운드, 카카오톡 앱 내 브라우저 우회가 평이한 말로 있다. 기술 용어(IP는 괄호 설명, TURN·서버 이름은 없음). 한계는 "실제 기기 확인 전"으로 표시. **판정: 가능**
- **신규 관리자(admin-manual)**: "관리자 화면은 없다"를 첫 절에서 못 박고 권한 체계를 표로 제시, 환경변수 표(필수·기본·바꾸면)가 있고, 방 폐쇄는 **되돌릴 수 없는 작업**으로 확인 체크리스트 4개(신고 기록·방 ID 22자·폐쇄 필요성·토큰 취급) → 정확한 명령과 따옴표 규칙 → 결과 코드표 → 닫은 뒤 처리를 제공. 환경변수 변경·재시작·시크릿 교체가 회의를 끝낸다는 경고가 반복된다. 미구현(알림·KPI 로그·보안 사건 로그)은 §8에 분리. **판정: 가능**
- **처음 연동하는 개발자(api-spec)**: §0에서 "외부 공개 API로 기획·시험된 적 없음, SLA 없음"을 먼저 밝히고, 인증(Origin 규칙의 REST/소켓 차이, 비브라우저는 Origin 헤더를 직접 지정해야 함), 이벤트별 페이로드·ack·권한·속도 제한, 오류 코드 19종 의미와 "호출자가 할 일", HTTP 전용 코드, 연결 단계 거부(`websocket error`·`too many connections`), 버전 정책(`v:1`, 추가만)이 있다. 불명확했던 점: 소켓 `connectTimeout`·롱폴링 폴백 부재 → §2에 WebSocket 전용 명시 확인. 공백: `v:2` 이행·폐기 공지 기간은 **정해지지 않음**으로 표시. **판정: 가능(내부 연동 기준, 외부 공식 지원은 미정)**
- 교차 점검
  - [x] 서로를 참조하지 않아도 되는 독립성: 사용자 매뉴얼은 다른 3개 문서를 참조하지 않는다(grep 0건). 운영 문서끼리의 참조(runbook↔admin-manual)는 정본 위치 표시용이며 값을 복제하지 않는다
  - [x] 10단계 절차를 "재검증 중복"으로 만들지 않았다: 4.5 순서를 인용하고, 10이 §9 조건 2로 요구한 "고친 절차로 롤백 리허설 1회"만 수행(R-2~R-6)
  - [x] 과장 점검: "스테이징에서 검증"이라 쓰지 않음, E2E 미실행 명시, 09 PASS 재판정이 없음을 PASS로 덮지 않음, 접근성은 "실제 화면 읽기 프로그램 미검증"
  - [x] 비가역·외부 영향: 외부 배포·가입·결제 없음. 외부 접근은 베이스 이미지·npm 패키지를 받는 읽기 전용 빌드뿐(기존 로컬 이미지 재사용)
- 2차에서 발견·정정한 것:
  1. 결과서에서 "하네스 4종 파일명"과 실제 파일의 대응이 없어 독자가 찾기 어려움 → 11-documentation.md 2절에 대응표와 사유(같은 내용 이중 보관 금지)를 추가
  2. 결과서 §6 미확인 목록에 "이어받은 서술 중 확인 못 한 것"(리허설 수치)이 빠져 있어 12번으로 추가
  3. `.env.example`과 코드의 `OPERATOR_CONTACT` 불일치는 제품 설정 파일이라 수정하지 않고 사용자 결정 5번으로 올림
- 조치 내용: 위 반영 후 v1.0 최종

## 3. 실행 명령 기록 (그대로)
| 명령 | 결과 |
|---|---|
| `npx vitest run --root apps/server test/featureContracts.test.ts` | 1 file, 8 passed |
| `npm run lint` | 종료 0 |
| `npm run typecheck` | 종료 0 |
| `npm test` | 종료 0 — shared 21 / server 242 passed·3 expected fail·4 skipped / web 433 passed·1 expected fail |
| `npm run check:docs` | 점검 통과(테스트 793, 미연결 0) — 문서 저장 뒤 재실행 결과는 4절 |
| `docker build …`, 교체·롤백·방 폐쇄 | R-1~R-7(위) |
| `npm run test:e2e` | **미실행** |
| 실행하지 못한 문서 속 명령 | 실서버의 `curl https://<도메인>/…`(도메인 없음), `docker run -p 3001:3001`(샌드박스 제약), nginx `limit_conn`(프록시 없음), `docker stats`·`trivy`(미설치/불필요) — 모두 문서에 "미검증"으로 표기 |

## 4. 최종 상태 (문서 저장 후)
- 정리 후 `npm run check:docs`: `점검 통과`(FR/UX 미참조 0건), 종료 0. `ls -A .harness-tmp` 출력 없음(빈 디렉터리).
- 같은 시점의 `git status --short`(그대로): ` M apps/server/test/featureContracts.test.ts`, ` M docs/03-engineering/{api-spec,infra-deploy}.md`, ` M docs/04-security/{privacy,security}.md`, ` M docs/05-qa/{release-checklist,test-cases}.md`, ` M docs/06-ops/{runbook,user-guide}.md`, ` M docs/README.md`, ` M docs/harness/03-system-design.md`, `?? docs/06-ops/admin-manual.md`, `?? docs/harness/11-documentation.md`, `?? docs/harness/verify-log_11-documentation.md`. 그 외 변경 없음.

## 5. 정리(규칙 K) 확인
- 생성물: `.harness-tmp/doc11/`(이전 시도분 + 이번 `rehearse*.sh`·`*.out`, dockerd 데이터 루트·exec-root), 컨테이너·이미지(`meetlite:{v1,v1b,v2-badhealth,v2-badconfig,11doc}`, `node:22-alpine` 등)는 모두 그 데이터 루트 안에만 존재
- 정리: 컨테이너·이미지 전부 삭제 → dockerd를 PID 파일의 PID로 종료(`pkill`·`pgrep -f` 미사용) → 남은 nsfs 마운트(`d/er/netns/default`)를 `umount` → `rm -rf .harness-tmp/doc11`. `ps`에 dockerd·containerd 없음, `.harness-tmp/`는 빈 디렉터리. 증거 출력은 세션 스크래치패드에 사본(저장소 밖)
- 제품 코드·인프라 설정(Dockerfile, compose, ci.yml, turnserver.conf)·HANESS 복사본 수정 0, 커밋·푸시 없음

## 최종 판정
- [x] **PASS** — 문서 4종 작성 완료, 규칙 B 2회 수행. 남은 항목은 문서 결함이 아니라 대상 시스템의 미결(결과서 6·8절)이며 문서가 이를 숨기지 않는다
