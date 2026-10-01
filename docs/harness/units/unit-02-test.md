# 테스트 결과서 — unit-02 (서버 기반)

## 1. 개요
- 테스트 대상 (모듈/기능/업무단위/전체 시스템 중 명시): 모듈 — `apps/server/src/{config,logger,server,index}.ts`, `http/{app,clientIp}.ts`와 `test/{config,http}.test.ts`
- 테스트 유형: 단위 (소급 6단계: 인수 조건 추적 + 시험 실행 + 변이 시험 + 적대·경계 보강)
- 적용 Tier (Low/Standard/High, ORCHESTRATOR.md 1장 참고): Standard (DEC-001)
- 적용 속도 트랙 (L1~L5, 06/07 전용): L3(소급)
- 병렬 실행 정보: 병렬 웨이브에서 실행(소급 묶음 A; 동시에 unit-19 테스터, 소급 웹(06~12), 소급 인프라·E2E(13~14) 테스터가 돌았다. 이 호출은 unit-0N 하나만 검증하고 `apps/web/dist`는 건드리지 않았다)
- 테스트 목적: 환경변수 검증·시작/종료·REST 방 생성·조회·보안 헤더·CORS·오류 응답·클라이언트 IP 판정이 요구(NFR-08, SEC-08·10, NFR-04 상한 설정)대로 동작하고 기존 시험이 이를 실제로 단언하는지 증명한다.
- 관련 산출물: `docs/harness/03-system-design.md` §1.3·§3·§4·§6, `docs/harness/02-planning.md`, `docs/harness/traceability.md`, `docs/harness/decisions.md`, `docs/05-qa/test-cases.md`, `docs/03-engineering/api-spec.md`, `CLAUDE.md` 보안 규칙
- 테스트 수행자(에이전트): 06 단위 테스터 (소급 묶음 A, 재시작 호출)
- 테스트 일시: 2026-10-01 (코드 커밋 `c2cc28c`(PROD) 기준)

## 2. 테스트 범위 및 제외 범위
- 범위 (In-Scope) — 노트가 없어 03 §1.3·§3.3·§6.2와 요구에서 도출한 인수 조건:
  - AC1 환경변수는 zod로 검증하며 누락·오류면 읽기 쉬운 메시지로 시작이 실패한다(종료코드 1, 스택·비밀값 미노출) (NFR-08, SEC-10)
  - AC2 설정 범위와 운영 기본값: 정원 2~12(기본 6), 방 1~10000(기본 100), 유예 1~300초(기본 20), 빈 방 TTL, IP 연결 1~1000(기본 20), TRUST_PROXY 0~5(기본 0), TURN TTL 60~86400, 포트 0~65535, 예시 비밀값은 운영 거부 (NFR-04, SEC-10)
  - AC3 `/healthz`는 상태만 돌려주고 graceful shutdown(소켓·포트 정리, 방 상태 비움, SIGTERM→종료코드 0) (NFR-08)
  - AC4 REST: `POST /api/rooms`(128비트 ID, 비밀번호는 bcrypt 해시만 보관, 400/413/429/503), `GET /api/rooms/:id`(플래그만 노출, 형식 오류는 exists=false, 속도 제한), 호스트 클레임 1시간 수명 (SEC-01·02·06, FR-06·23)
  - AC5 보안 헤더(CSP·Permissions-Policy·Referrer-Policy·nosniff, x-powered-by 없음) (SEC-08)
  - AC6 CORS는 허용 Origin과 정확히 일치할 때만(와일드카드 금지, OPTIONS 포함), 소켓 Origin도 동일 (SEC-08)
  - AC7 오류 응답은 코드만 담고 내부 정보(메시지·스택·경로)를 싣지 않는다 (SEC-08)
  - AC8 클라이언트 IP는 TRUST_PROXY>0일 때만 X-Forwarded-For 오른쪽에서 N번째를 신뢰한다(왼쪽 위조 값 무시) — 속도 제한·강퇴 키의 신뢰 근거 (SEC-06)
  - AC9 웹 정적 제공(경로 순회·숨김 파일 차단, SPA 폴백은 GET/HEAD만) (NFR-07, SEC-08)
- 제외 범위 (Out-of-Scope) 및 사유: `GET /api/meta`·로그 비식별(unit-15), admin 리스너(unit-16), TURN 설정 파일(unit-18), 실제 HTTPS·프록시 환경(운영 배포 단계, 규칙 E), D-3(CSP의 Google Fonts 허용 — 03 §8.3에 이미 기록된 낮은 심각도 제안, 이번에도 CSP에 남아 있음을 코드로 확인만 하고 시험은 추가하지 않음).

## 3. 테스트 환경
- 실행 환경: Linux 샌드박스, Node v22.22.0, Vitest 5.0.3, 서버 시험은 `PORT=0`(무작위 포트)·`127.0.0.1`만 사용. 브라우저·Docker·외부 네트워크 미사용. DB 없음(메모리 상태).
- 소급 단위: **5단계 노트(`unit-0N-note.md`)가 없다.** 인수 조건(AC)은 `03-system-design.md` §1.3 확정표·§3·§4·§6, 요구(FR/NFR/SEC/POL), `docs/03-engineering/api-spec.md`, 기존 시험과 `CLAUDE.md` 보안 규칙에서 도출했다(아래 AC 표).
- 5단계 게이트 확인(노트가 없어 대체): 커밋 `c2cc28c`에서 `npm run lint`(오류·경고 0), `npm run typecheck`(오류 0)를 이번 실행에서 직접 재확인. CI 통과는 오케스트레이터 전달 사실이며 직접 확인하지 않았다(미검증으로 표기). "자체 코드 리뷰 체크리스트"는 소급이라 존재하지 않아 03 §6.2 코드 대조(보안 규칙 11행)로 대체했다.
- 테스트 데이터: 합성 설정값, 가짜 `IncomingMessage` 객체(IP 판정), 서버 내부 예외 주입(`rooms.createRoom`을 throw로 교체), 임시 정적 디렉터리(`os.tmpdir()`, 시험 안에서 삭제).
- 전제 조건 (Preconditions): `apps/web/dist` 미사용·미수정, `npm run build`·`test:e2e` 미실행.

## 4. 테스트 케이스 및 결과
### 4.1 인수 조건 ↔ 시험 추적
| AC | 요구 | 기존 TC(06 이전) | 기존 단언 강도 | 보강 TC(이번) |
|---|---|---|---|---|
| AC1 | NFR-08, SEC-10 | TC-120, 121, 123, 125, TC-301* | 중 — 메시지에 변수 이름이 있는지만. 종료코드 1·비밀값 미반복·스택 없음은 미검증 | TC-424b, TC-427b |
| AC2 | NFR-04, SEC-10 | TC-124, 122, 301d·303c | 약 — 기본값은 5개 중 일부만, 정원·방 수·유예·IP 연결·포트·TURN TTL 경계는 미검증(M2-02~07·09·10 생존) | TC-424 |
| AC3 | NFR-08 | TC-100, MC-03(수동) | 약 — healthz 형태만. 종료 시 소켓 정리·SIGTERM 종료코드는 시험 없음(M2-26은 다른 단위 시험이 우연히 검출) | TC-427, TC-427b |
| AC4 | SEC-01·02·06, FR-06·23 | TC-101, 102, 105, 106, 107, 108 | 중 — 방 상태 조회 속도 제한(M2-18)·호스트 클레임 수명(M2-20) 미검증, 오류 본문 정확성 약함 | TC-423, TC-425, TC-426 |
| AC5 | SEC-08 | TC-103 | 강 — CSP·PP·RP·nosniff·x-powered-by | — |
| AC6 | SEC-08 | TC-104, TC-95 | 중 — POST 나쁜 Origin 1종만. OPTIONS·변형 Origin(대소문자·후행 슬래시·접미 도메인·null) 미검증 | TC-428, TC-428b |
| AC7 | SEC-08 | TC-105, TC-109 | 약 — 본문이 `/stack|node_modules|.../`와 안 맞는지만 확인(예: `detail: String(err)`를 추가해도 통과), 500 경로는 시험 없음 | TC-423 |
| AC8 | SEC-06 | (직접 시험 없음) | 없음 — XFF 위조 방지가 속도 제한·강퇴 키의 전제인데 시험이 없었음(M2-21·22) | TC-422, TC-422b |
| AC9 | NFR-07, SEC-08 | TC-111 | 약 — 정상 GET/HEAD만. 경로 순회·숨김 파일·POST 대체 미검증(M2-28 생존) | TC-429, TC-429b |

### 4.2 보강 시험 실행 결과 (이번 실행에서 직접 실행: `npx vitest run test/unit02Adversarial.test.ts` → 12 passed, 1 expected fail)
| ID | 시나리오 | 사전조건 | 실행 절차 | 예상 결과 | 실제 결과 | Pass/Fail | 비고 |
|----|----------|----------|-----------|-----------|-----------|-----------|------|
| TC-422 | IP 판정: TRUST_PROXY=0이면 XFF 무시, N>0이면 오른쪽 N번째, 배열 헤더·빈 헤더·홉 수 초과·주소 없음 | 가짜 req | `clientIp(req, n)` 호출 | 소켓 주소 또는 오른쪽 N번째, 주소 없으면 'unknown' | 기대대로 | Pass | 처음 작성 시 주소 없음 케이스를 기본 매개변수 때문에 잘못 만들어 실패 → 시험 수정(제품 정상) |
| TC-422b | 속도 제한이 판정 IP 기준: 왼쪽 XFF를 바꿔도 11번째 방 생성이 429, 오른쪽 값이 다르면 별도 버킷, TRUST_PROXY=0이면 XFF를 바꿔도 제한 | 서버 2대(TRUST_PROXY 1/0, 배율 1) | 방 생성 12회 연속 | 10회 201 후 429 | 기대대로 | Pass | |
| TC-423 | 오류 본문 정확성: 400 5종·413·404는 `{code}` 정확 일치, 내부 예외(`createRoom` throw)는 500 + `{code:'INTERNAL'}`뿐, 이후 /healthz 정상 | 서버 1대 | 잘못된 본문 전송, 예외 주입 | 본문에 메시지·`.ts`·stack 없음 | 기대대로 | Pass | |
| TC-424 | 설정 경계 10개 키 × 안/밖, TURN TTL 59/60/86400/86401, TURN_SECRET 15/16, SESSION_SECRET 31/32, 운영 기본값 | 없음 | `makeConfig` | 경계 안만 통과 | 기대대로 | Pass | |
| TC-424b | 설정 오류 메시지에 잘못된 비밀값 미반복·스택 없음 | 없음 | 3종 잘못된 비밀값 | 변수 이름만 | 기대대로 | Pass | |
| TC-425 | 방 상태 조회 75회 연속 → 429 발생, 200은 64회 이하, 본문 `{code:'RATE_LIMITED'}` | RATE_LIMIT_SCALE=1 | 반복 GET | 제한 작동 | 기대대로 | Pass | |
| TC-426 | 호스트 클레임 수명: 발급+1시간-1ms 호스트 입장, 정확히 1시간·+1ms는 HOST_NOT_PRESENT | 주입 시계 | 시계를 옮겨 입장 | 경계에서 만료 | 기대대로 | Pass | 소켓 입장 경로의 만료 검사(M5-42)도 함께 검출 |
| TC-427 | 서버 `close()`: 열린 소켓 끊김, 포트 반납, `rooms.size`=0 | 입장한 소켓 | close 후 fetch | 소켓 disconnect, 연결 거부 | 기대대로 | Pass | M2-26(io.close 누락)을 검출 |
| TC-427b | 프로세스: 환경변수 누락 시 종료코드 1·한국어 오류·스택 없음, 정상 기동 후 SIGTERM이면 종료코드 0·`shutting down` 로그·비밀값 로그 없음 | `node --import tsx src/index.ts` 자식 프로세스 2개 | spawn | 위와 같음 | 기대대로 | Pass | PORT=0, 시험 안에서 종료 확인 |
| TC-428 | CORS: 7종 변형 Origin × GET/OPTIONS/POST 모두 403·ACAO 헤더 없음·`{code:'FORBIDDEN'}`, Origin 없음은 CORS 헤더 없이 200, 허용 Origin은 ACAO·Vary·허용 메서드 | 서버 1대 | fetch | 정확 일치만 통과 | 기대대로 | Pass | |
| TC-428b | 소켓 연결의 변형 Origin 4종 거부, 정상 Origin 연결 | 서버 1대 | socket.io 연결 | 변형 거부 | 기대대로 | Pass | |
| TC-429 | 정적 파일: 경로 순회 8종(`..%2f`·`%2e%2e`·`%5c`·`/.hidden` 등)에서 dist 밖·숨김 파일 내용 미노출, POST /는 404, `/socket.io/` 폴링 경로는 index.html로 대체 안 됨, 딥링크 SPA 폴백 유지 | `os.tmpdir()`의 임시 dist | raw http 요청 | 비밀 문자열이 본문에 없음 | 기대대로 | Pass | |
| TC-429b | (알려진 결함 DEF-001) 점(.) 디렉터리가 포함된 WEB_DIST에서도 SPA 폴백이 index.html을 돌려준다 | `.harness-tmp/static_06_unit02_*`(finally 삭제) | GET /r/<id> | 이상적으로 index.html | **현재는 404 `{"code":"INVALID_PAYLOAD"}`** → `it.fails`로 등록(결함이 고쳐지면 이 시험이 실패해 일반 `it`으로 전환하라는 신호) | Pass(예상 실패로 등록) | 아래 DEF-001 |

### 4.3 기존 시험 재실행
- `npx vitest run test/config.test.ts test/http.test.ts …` → 통과(2회 반복, 병렬 부하 포함). 기존 `config.test.ts` 18개 + `http.test.ts` 11개 + 보강 13개(12 + 예상 실패 1).
- 전체 서버 시험(이번 실행): Test Files 19 passed·1 failed(TC-497, unit-14 소유·병렬 문서 변경과 겹침, 단독 재실행 통과)·1 skipped, Tests 224 passed·1 expected fail·4 skipped.

### 4.4 변이 시험 결과 (임시 복사본 `.harness-tmp/mut_06_unit02/`, 총 29개)
| ID | 변이 내용 | 기존 시험(06 이전) | 보강 후 |
|---|---|---|---|
| M2-01 | SESSION_SECRET 길이 검증 제거 | 검출 TC-121 | 검출 TC-121 |
| M2-02 | 정원 설정 상한 12->13 | **생존**(전체 시험에서도) | 검출 TC-424 |
| M2-03 | 정원 설정 하한 2->1 | **생존**(전체 시험에서도) | 검출 TC-424 |
| M2-04 | 방 수 상한 설정 범위 해제 | **생존**(전체 시험에서도) | 검출 TC-424 |
| M2-05 | 재접속 유예 범위 해제 | **생존**(전체 시험에서도) | 검출 TC-424 |
| M2-06 | IP 동시연결 기본값 20->2000 | **생존**(전체 시험에서도) | 검출 TC-424 |
| M2-07 | PORT 상한 해제 | **생존**(전체 시험에서도) | 검출 TC-424 |
| M2-08 | TRUST_PROXY 기본값 0->1(XFF 위조 허용) | 다른 단위 시험만 검출 | 검출 TC-424 |
| M2-09 | TURN 자격증명 수명 상한 해제 | **생존**(전체 시험에서도) | 검출 TC-424 |
| M2-10 | TURN_SECRET 최소 길이 제거 | **생존**(전체 시험에서도) | 검출 TC-424 |
| M2-11 | Origin 형식 검증 약화(와일드카드·경로 허용) | 검출 TC-122 | 검출 TC-122 |
| M2-12 | 운영 예시 비밀값 거부 제거 | 검출 TC-125 | 검출 TC-125 |
| M2-13 | CSP script-src unsafe-inline 허용 | 검출 TC-103 | 검출 TC-103 |
| M2-14 | CORS 허용 목록 검사 제거 | 검출 TC-104 | 검출 TC-104 |
| M2-15 | CORS 와일드카드 | 검출 TC-104 | 검출 TC-104 |
| M2-16 | JSON 본문 상한 2KB->10MB | 검출 TC-105 | 검출 TC-105 |
| M2-17 | 방 생성 속도 제한 10->1000 | 검출 TC-106 | 검출 TC-106 |
| M2-18 | 방 상태 조회 속도 제한 제거 | 다른 단위 시험만 검출 | 검출 TC-425 |
| M2-19 | 오류 응답에 내부 정보(메시지·스택) 추가 | 검출 TC-105 | 검출 TC-105 |
| M2-20 | 호스트 클레임 수명 1h->1000h | **생존**(전체 시험에서도) | 검출 TC-426 |
| M2-21 | XFF 맨 왼쪽(위조 가능) 값 신뢰 | **생존**(전체 시험에서도) | 검출 TC-422 |
| M2-22 | TRUST_PROXY=0 이어도 XFF 신뢰 | **생존**(전체 시험에서도) | **생존** — 동등 변이(TRUST_PROXY=0이면 parts[len-0]이 undefined라 어차피 소켓 주소로 폴백) |
| M2-23 | Permissions-Policy 완화 | 검출 TC-103 | 검출 TC-103 |
| M2-24 | 비밀번호 평문 보관 | 검출 TC-107 | 검출 TC-107 |
| M2-25 | 방 수 상한 초과 시 오류코드 변경 | 검출 TC-108 | 검출 TC-108 |
| M2-26 | 종료 시 소켓 서버 미종료(graceful shutdown 누락) | 다른 단위 시험만 검출 | 검출 TC-427 |
| M2-27 | x-powered-by 노출 | **생존**(전체 시험에서도) | **생존** — 동등 변이(helmet이 X-Powered-By를 이미 제거 — 명시적 disable은 중복 방어) |
| M2-28 | SPA 폴백이 POST 등 모든 메서드에 응답 | **생존**(전체 시험에서도) | 검출 TC-429 |
| M2-29 | 방 ID 형식 검증 없이 조회 | **생존**(전체 시험에서도) | **생존** — 동등 변이(검증 없이도 Map 조회가 형식 오류 ID에 항상 miss — 형식 검증은 다층 방어) |

- 요약: 변이 29개 중 **기존 시험이 단독으로 검출 12개(41%)**, 다른 단위 시험이 추가 3개, **14개는 전체 시험에서도 생존**. 보강 후 **26개 검출 + 동등 변이 3개**(실질 100%). 동등 변이 3개의 근거: M2-22는 `parts[len-0]`이 undefined라 소켓 주소로 폴백해 관찰 가능한 차이가 없음, M2-27은 helmet이 `X-Powered-By`를 이미 제거해 명시적 `disable`이 중복 방어, M2-29는 형식이 틀린 ID는 어차피 Map 조회에서 miss.

## 5. 커버리지
- 커버리지 지표: 라인/브랜치 도구 미설치로 **미측정**. 대체: AC 9개 모두 TC 대응(100%), 변이 점수 기존 41%→보강 후 26/26(동등 3 제외, 100%).
- 커버되지 않은 부분과 사유: ① 실제 HTTPS·프록시(X-Forwarded-Proto 등) 환경은 배포 단계(규칙 E). ② `index.ts`의 10초 강제 종료 타이머(종료가 걸릴 때만 작동) 미시험 — 종료 정상 경로만 확인. ③ D-3 CSP 폰트 허용은 시험하지 않음(03에서 제안만).

## 6. 결함(Defect) 목록
| ID | 설명 | 재현 절차 | 심각도(Critical/High/Medium/Low) | 상태(Open/Fixed/Deferred) | 조치 내용 |
|----|------|-----------|-----------------------------------|----------------------------|-----------|
| DEF-001 | **제품 결함**: `http/app.ts`의 SPA 폴백이 `res.sendFile(path.join(dist,'index.html'))`을 `root` 옵션 없이 호출해, `WEB_DIST`의 절대 경로에 `.`으로 시작하는 디렉터리가 있으면(예: 홈의 숨김 폴더 아래 체크아웃) `send`가 dotfile로 보고 404를 낸다. 본문은 `{"code":"INVALID_PAYLOAD"}`로 오류 코드도 부적절. 정적 파일(`/assets/*`)은 `express.static`이 root 기준이라 정상이라 "앱이 일부만 뜨는" 증상이 된다 | `WEB_DIST`를 `/tmp/.dotdir/w-xxx`처럼 점 디렉터리 아래 dist로 두고 `GET /r/abc` → 404. 같은 dist를 점 없는 경로로 두면 200(`apps/server/test/unit02Adversarial.test.ts`의 TC-429b가 재현) | Low (Docker 기본 경로 `/app/apps/web/dist`와 `.env.example` 기본 `apps/web/dist`는 영향 없음; 운영 배치가 숨김 폴더 아래일 때만) | Open (제품 코드 수정 금지 범위, 5단계 재작업 요청) | 권고: `res.sendFile('index.html', { root: dist })` 사용. 수정되면 TC-429b(`it.fails`)가 실패하니 일반 `it`으로 바꿀 것 |
| DEF-002 | **시험 구멍**: 변이 14개(설정 경계 6종, TRUST_PROXY 기본값, 방 상태 조회 제한, 호스트 클레임 수명, XFF 위조 값 신뢰, io.close 누락, SPA 폴백 메서드 등)가 기존 시험 전체에서 검출되지 않거나 다른 단위 시험이 우연히 잡음. 특히 **IP 판정(XFF 위조 방지)은 직접 시험이 없었다** — 속도 제한·강퇴 키가 모두 이 함수에 의존 | 위 변이 표의 `생존` 행을 복사본에서 적용 | High (SEC-06의 신뢰 근거에 시험이 없음) | Fixed | TC-422~429 추가 → 전부 검출(동등 변이 3 제외) |
- 이 단위의 제품 코드 결함은 DEF-001(Low) 1건. 나머지 기능은 TC-422~429와 기존 시험으로 확인(보안 헤더·CORS·오류 본문·설정 경계·종료 처리).
- 관찰(결함 아님): ① 에러 핸들러가 모든 4xx를 `INVALID_PAYLOAD`로 바꿔 404(sendFile)·413도 같은 코드가 된다(문서 api-spec §2의 오류 코드 설명과 비교 필요, 현재 클라이언트는 `code`로 분기). ② `ALLOWED_ORIGINS` 검증은 `new URL(o).origin === o`라 대문자 스킴·후행 슬래시를 거부한다(TC-428이 요청 쪽도 같은 규칙으로 거부함을 확인).

## 7. 테스트 환경 정리(Teardown) 확인 — 규칙 K
- 이번 테스트에서 생성한 임시 아티팩트 목록 (경로 포함): `.harness-tmp/mut_06_unit02/`(변이 시험용 저장소 복사본 — 소스·시험 복사 + 루트 `node_modules` 심볼릭 링크 모음. 변이는 이 복사본에서만 적용하고 변이마다 원본 파일로 복구)와 변이 목록·결과 JSON·실행 스크립트(세션 scratchpad, 저장소 밖), `.harness-tmp/static_06_unit02_*`(TC-429b가 시험 안에서 만들고 `finally`로 삭제)
- 위 아티팩트를 전부 `.harness-tmp/` 하위에서만 생성했는가 (규칙 K 1번): [x] 예 / [ ] 아니오 (단, TC-429는 `os.tmpdir()`에 임시 정적 디렉터리를 만들고 시험 안에서 `finally`로 삭제한다 — 기존 TC-111과 같은 방식이며 점(.)으로 시작하는 경로 조각을 피해야 해서(DEF-001) `.harness-tmp`를 쓰지 않았다. 저장소 밖이라 `git status`에 나타나지 않는다)
- 정리(삭제) 완료 여부: 완료 — `.harness-tmp/mut_06_unit01~05`를 모두 삭제했다. 다른 테스터의 `.harness-tmp/` 하위(작업 종료 시점에 `mut_06_unit06~12`, `mut_06_base`, `mut_06_head`, `probe_06_web` 등이 있었다)는 건드리지 않았다. `.harness-tmp/` 자체는 `.gitignore` 대상이다.
- 정리 후 `git status` 실행 결과 (그대로 첨부, 요약 금지):
```
 M docs/05-qa/test-cases.md
 M docs/traceability.md
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
?? docs/harness/units/unit-01-test.md
?? docs/harness/units/unit-02-test.md
?? docs/harness/units/unit-03-test.md
?? docs/harness/units/unit-04-test.md
?? docs/harness/units/unit-05-test.md
?? docs/harness/units/unit-13-test.md
?? docs/harness/units/unit-14-test.md
?? docs/harness/units/unit-19-test.md
?? docs/harness/verify-log_unit-01-test.md
?? docs/harness/verify-log_unit-02-test.md
?? docs/harness/verify-log_unit-03-test.md
?? docs/harness/verify-log_unit-04-test.md
?? docs/harness/verify-log_unit-05-test.md
?? docs/harness/verify-log_unit-13-test.md
?? docs/harness/verify-log_unit-14-test.md
?? docs/harness/verify-log_unit-19-test.md
?? e2e/pathMetrics-extra.spec.ts
?? e2e/webRetro.spec.ts
?? packages/shared/src/protocolBoundary.test.ts
(소유 주석: M docs/05-qa/test-cases.md·docs/traceability.md = --gen 재생성분(여러 테스터 행 혼재); apps/server/test/unit0{2,3,4,5}Adversarial.test.ts, packages/shared/src/protocolBoundary.test.ts, docs/harness/units/unit-0{1..5}-test.md, docs/harness/verify-log_unit-0{1..5}-test.md = 이 호출(묶음 A); apps/web/**, e2e/**, apps/server/test/{e2eGuard,infraGuard,metricsPathAdversarial}.test.ts, unit-13·14·19 문서 = 다른 테스터)
```
- 병렬 실행이었다면: 위 `git status`에서 이 호출(묶음 A)이 만든 것은 `packages/shared/src/protocolBoundary.test.ts`, `apps/server/test/unit0{2,3,4,5}Adversarial.test.ts`, `docs/harness/units/unit-0{1..5}-test.md`, `docs/harness/verify-log_unit-0{1..5}-test.md`, 그리고 `docs/05-qa/test-cases.md`·`docs/traceability.md`의 `--gen` 재생성분(다른 테스터의 행과 섞여 있음)이다. 나머지(`apps/web/**`, `e2e/**`, `apps/server/test/{e2eGuard,infraGuard,metricsPathAdversarial}.test.ts`, `docs/harness/units/unit-19-test.md`, `verify-log_unit-19-test.md`)는 다른 테스터 소유다. 이 호출이 만든 임시 아티팩트·미추적 잔여물(`.harness-tmp/mut_06_unit0*`)은 남아 있지 않다(위 `git status`에 `.harness-tmp`가 없고 `ls .harness-tmp`로도 확인). 웨이브 종료 후 전체 트리 점검(`harness-janitor.sh --check`)은 오케스트레이터 몫이다(미실행).
- 이번 테스트 도중 강제 중단(TaskStop 등)이 있었는가: [x] 없음 / [ ] 있음 (이 소급 단위의 이전 호출이 API 한도로 중단됐으나 저장소에 변경이 남지 않았음을 시작 시 확인했고, 시작 시 `.harness-tmp/`에 이 단위 잔여물이 없었다)
- **이 절이 미완성이거나 `git status`가 깨끗함을 확인하지 못했다면, 8절에서 PASS로 판정할 수 없다 (규칙 K 2번).** → 이 호출 소유분은 정리 완료, 위 판정 근거 충족.

## 8. 리스크 및 잔존 이슈
- 이번 테스트로 커버되지 않는 알려진 리스크: 실제 리버스 프록시 뒤에서 TRUST_PROXY 홉 수가 맞는지(배포 환경 의존; 홉 수가 틀리면 XFF 위조 방지가 깨지거나 모든 사용자가 한 IP로 묶임) — 배포 전 점검 항목. CI 통과·실서버·HTTPS는 미검증.
- 후속 조치가 필요한 항목: DEF-001(Low) 5단계 수정 또는 Deferred 승인. TC-429b의 `it.fails` 전환. 03 §8.3 D-3(CSP 폰트) 결정.

## 9. 결론 및 판정
- [ ] PASS — 다음 단계 진행 가능 (7절 Teardown 확인 완료가 전제조건)
- [x] CONDITIONAL PASS — 조건: 제품 결함 DEF-001(Low, 비차단)을 5단계에서 수정하거나 사용자가 Deferred로 승인할 것. 시험 구멍 DEF-002는 Fixed, 나머지 AC는 모두 통과.
- [ ] FAIL — 사유 및 재작업 요청 사항:

## 10. 내부 검증 (최소 2회, `verification-log-template.md` 사용)
- 1차 검증 결과 요약: AC 9개 ↔ TC 추적, 기존 단언 강도 평가, 변이 14개 생존 확인, 내 시험의 오류 3건(주소 없음 케이스·`.harness-tmp` 점 디렉터리로 인한 오탐→결함 발견·타입 오류) 처리.
- 2차 검증 결과 요약: 동등 변이 3개의 근거 재확인, DEF-001이 시험 환경 탓이 아닌 제품 동작임을 `/tmp` 정상 경로 대조로 재확인, 보강 시험의 반복 실행 안정성 확인. 결함 추가 없음.
- 검증 로그 파일 경로: `docs/harness/verify-log_unit-02-test.md`
