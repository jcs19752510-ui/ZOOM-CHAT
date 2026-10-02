> **이 문서의 용도** — 누가: 개발자(서버·웹 구현), 보안 담당자, 이 서버의 API를 연동하려는 개발자 / 언제: 이벤트나 페이로드를 바꾸기 전, 테스트를 쓰기 전, 서버에 접속하는 클라이언트를 만들 때 / 무엇을: 클라이언트와 서버가 주고받는 모든 메시지의 모양, 인증·토큰, 오류 코드, 권한, 속도 제한, 버전 규칙을 결정한다(단일 기준).

# 시그널링·REST 명세 (EVT)

| 항목 | 내용 |
|---|---|
| 버전 | 0.2 |
| 작성일 | 2026-10-01 |
| 상태 | 초안 (0.2 개정분은 사용자 검토 대기. 0.1은 승인, DEC-004) |
| 주도 | ② 개발자, ④ 아키텍트 |

## 변경 이력
| 버전 | 날짜 | 내용 |
|---|---|---|
| 0.1 | 2026-10-01 | 최초 작성 (속도 우선으로 구현과 함께 확정) |
| 0.2 | 2026-10-02 | 11단계: 실제 코드(`protocol.ts`·`schemas.ts`·`socket/server.ts`·`http/*`)와 대조해 정정(DOC-I-01). `GET /api/meta`(EVT-04), `metrics:path`(EVT-33), `room:closed {v:1}`(EVT-34, 03의 `reason:'operator'` 폐기 — DEC-020), admin 폐쇄(EVT-35) 추가. 오류 코드 19종 의미·발생 위치, HTTP 전용 코드, 인증·토큰·속도 제한·버전 정책 절 추가. 실행 서버로 확인한 응답 상태 코드 반영(§9) |

스키마의 단일 출처는 `packages/shared/src/schemas.ts`(zod)와 `protocol.ts`다. 이 문서와 다르면 문서를 고친다(IT-80~83이 이벤트·오류 코드 목록의 일치를 시험한다).

## 0. 이 API를 쓰기 전에 알아야 할 것
- **소비자는 이 저장소의 웹 클라이언트다.** 외부 개발자용 공개 API로 기획·시험된 적이 없고(기획 문서에 외부 연동 요구 없음), 외부에 대한 버전 보증·SLA는 없다. 아래 명세는 "같은 규칙으로 직접 접속하는 클라이언트(시험 도구 포함)를 만들 수 있는" 수준을 목표로 한다.
- **로그인이 없다.** 신원은 서버가 입장 때 발급한 참가자 ID와 세션 토큰이 전부다(비목표: 회원가입/로그인).
- 서버는 베이스 URL 하나(`PORT`, 기본 3001)로 REST와 Socket.IO를 함께 제공한다. 운영은 TLS 종단 리버스 프록시 뒤(`https://`/`wss://`)를 전제한다. 이 문서의 예시는 로컬 `http://127.0.0.1:3001` 기준이다.
- 이 문서의 **상태 코드·응답은 2026-10-02 실행 중인 서버(운영 빌드)에 요청해 확인한 것**이다(§9). 실서버(HTTPS·프록시 뒤) 동작은 미검증이다.

## 1. 인증·접근 통제
| 대상 | 방식 | 설명 |
|---|---|---|
| `GET /healthz`, `GET /api/meta`, `GET /api/rooms/:id`, `POST /api/rooms` | 인증 없음 | 공개. 접근은 Origin 허용 목록과 IP 속도 제한으로만 통제한다 |
| Origin 허용 목록 | `ALLOWED_ORIGINS`(쉼표 목록, 와일드카드 금지) | **REST**: `Origin` 헤더가 있으면 목록에 있어야 하며 없으면 `403 {code:"FORBIDDEN"}`(CORS 헤더도 없음). `Origin` 헤더가 없는 요청(서버 간 호출·curl)은 이 검사를 통과한다. **소켓**: `Origin` 헤더가 **반드시** 있어야 하고 목록에 있어야 한다(없으면 연결 거부). 브라우저가 아닌 클라이언트는 허용된 Origin 값을 헤더로 직접 지정해야 한다. 이것은 브라우저 교차 출처 방어이지 인증이 아니다(비브라우저 클라이언트는 헤더를 위조할 수 있다) |
| 방 접근 | 방 ID(22자, 128비트 난수) + (설정 시) 방 비밀번호 | 방 ID를 아는 것이 입장 권한이다. 비밀번호는 입장 요청 본문에만 실리고 URL에는 없다 |
| 호스트 권한 | 호스트 클레임 토큰(EVT-32) | 방 생성 응답으로만 받으며 첫 호스트 입장에 한 번만 쓸 수 있다 |
| 입장 이후 모든 소켓 이벤트 | 소켓에 묶인 세션 | `room:join`/`room:resume` 성공 시 서버가 소켓을 참가자 ID에 묶는다. 이벤트마다 토큰을 보내지 않으며, 입장하지 않은 소켓의 이벤트는 `NOT_JOINED` |
| 재접속 | 세션 토큰(EVT-31) | `room:resume {v, token}`만으로 자리를 복구한다. 토큰은 소지자 토큰이라 탈취되면 같은 참가자로 접속된다(설계 의도, 보관은 메모리만) |
| Admin(EVT-35) | `Authorization: Bearer <ADMIN_TOKEN>` | 별도 리스너(127.0.0.1 전용). 공개 포트에서는 `/admin/...`이 `404 NOT_FOUND` |

## 2. 공통 규칙
- 모든 메시지에 `v: 1`(NFR-12). 클라이언트→서버 페이로드는 **strict**(모르는 키는 거부, `from` 같은 발신자 필드를 보내면 `INVALID_PAYLOAD`)(SEC-04).
- 모든 클라이언트→서버 소켓 이벤트는 마지막 인자로 ack 콜백을 받는다. 응답은 `{ ok: true, ... }` 또는 `{ ok: false, code, message }`. `message`는 사용자에게 보여 줄 한국어가 아니라 개발용 짧은 영문이며 내부 정보를 담지 않는다(SEC-08). 화면 문구는 클라이언트 `strings.ts`가 `code`로 정한다.
- 서버→클라이언트 이벤트의 `from`/`id`는 **서버가 부여**한 참가자 ID다(SEC-04). 같은 방 참가자에게만 전달한다.
- 서버 처리 순서: **속도 제한 → zod 검증 → 입장 여부 → 핸들러**. 앞 단계에서 거부되면 뒤 단계는 실행되지 않는다. 핸들러 예외는 `INTERNAL`로 격리된다.
- 전송 크기: Socket.IO `maxHttpBufferSize` 32 KB, SDP 16 KB, ICE 후보 2 KB, 채팅 500자(SEC-06). REST 본문 2 KB.
- 소켓 전송은 **WebSocket만** 허용한다(`transports: ['websocket']`, ADR-0006). HTTP 롱폴링 폴백은 없다. 서버 핑 5초·타임아웃 5초.
- 클라이언트 참고: 웹 클라이언트는 8초 안에 ack가 없으면 로컬에서 `{ok:false, code:'NETWORK'}`로 처리한다(서버 코드가 아니다).

## 3. REST
| ID | 경로 | 요청 | 성공 응답 | 제한 |
|---|---|---|---|---|
| EVT-01 | `GET /healthz` | — | 200 `{ status: "ok", uptimeSec }` | 없음 |
| EVT-02 | `POST /api/rooms` | `Content-Type: application/json`, `{ v: 1, password? }` (비밀번호 4~32자, strict) | 201 `{ v: 1, roomId, hostClaim }` | IP당 용량 10·분당 10회 보충, 서버 방 수 `MAX_ROOMS` |
| EVT-03 | `GET /api/rooms/:roomId` | — | 200 `{ v: 1, exists, locked, needsPassword, full, hostPresent }` | IP당 용량 60·초당 1회 보충 |
| EVT-04 | `GET /api/meta` | — | 200 `{ v: 1, operator: { contact, privacyOfficer }, legal: { effectiveDate }, network: { stunHosts[], turnHosts[] } }`, 헤더 `Cache-Control: public, max-age=60` | EVT-03과 같은 버킷을 공유 |

- `roomId`: 16바이트 난수의 base64url(22자, 128비트)(SEC-01). 형식이 맞지 않거나 없는 방이면 EVT-03은 `exists:false`(나머지 필드는 모두 `false`)로 **200**을 준다(방 존재 열거를 어렵게 하려고 오류가 아니다).
- `hostClaim`: 방 생성자만 가진 서명 토큰. 첫 호스트 입장에 한 번만 쓸 수 있다(POL-13). 유효 1시간.
- EVT-04 값: 설정되지 않은 항목은 `null`이다(`OPERATOR_CONTACT`·`PRIVACY_OFFICER`·`LEGAL_EFFECTIVE_DATE`). `stunHosts`/`turnHosts`는 `STUN_URLS`/`TURN_URLS`의 호스트명만이다(포트·자격 정보 없음). 비밀값·IP는 싣지 않는다.
- IP 속도 제한과 강퇴 키의 IP는 IPv4는 주소 그대로, IPv6는 **/64 접두**, IPv4-mapped IPv6는 IPv4로 정규화한 값이다(9단계 DEF-09-01). 프록시 뒤에서는 `TRUST_PROXY`(프록시 단계 수)로 `X-Forwarded-For`의 오른쪽 N번째 값을 쓴다.

### 3.1 REST 오류 응답
본문은 항상 `{ "code": "<코드>" }` 한 줄이며 스택·내부 정보는 없다(SEC-08).
| 상태 | code | 언제 |
|---|---|---|
| 400 | `INVALID_PAYLOAD` | 본문이 JSON이 아니거나 스키마 위반(`v` 누락, 모르는 키, 비밀번호 길이 4~32 밖) |
| 403 | `FORBIDDEN` | `/api/*`에서 `Origin` 헤더가 허용 목록에 없음 |
| 404 | `NOT_FOUND` | 알 수 없는 `/api/*` 경로(웹 정적 파일을 서빙 중이면 `/api`·`/socket.io` 밖의 GET은 SPA 첫 페이지) |
| 413 | `INVALID_PAYLOAD` | 본문이 2 KB 초과(상태는 413이고 코드는 `INVALID_PAYLOAD`다. `PAYLOAD_TOO_LARGE` 코드는 admin 전용) |
| 429 | `RATE_LIMITED` | 위 표의 IP 제한 초과 |
| 503 | `SERVER_BUSY` | `POST /api/rooms`에서 서버 방 수 상한(`MAX_ROOMS`) 도달 |
| 500 | `INTERNAL` | 처리되지 않은 예외 |

## 4. 소켓 이벤트: 클라이언트 → 서버 (12종)
| ID | 이벤트 | 페이로드 | 성공 ack | 권한 | 속도 제한(토큰 버킷: 용량/초당 보충) |
|---|---|---|---|---|---|
| EVT-10 | `room:join` | `{ v, roomId, nickname, password?, hostClaim? }` | `{ ok, selfId, token, hostId, locked, participants[], iceServers[], config }` | 누구나 | 소켓 5/0.1 + IP 입장 시도 30/0.5 + IP·방별 오답 5회/10분 |
| EVT-11 | `room:resume` | `{ v, token }` | EVT-10과 동일 | 유효 세션 토큰 | 10/0.2 |
| EVT-12 | `room:leave` | `{ v }` | `{ ok }` | 참가자 | 3/1 |
| EVT-13 | `signal:send` | `{ v, to, description? , candidate? }` 중 하나만 | `{ ok }` | 같은 방의 `to` | 120/40 (6명 방의 새 참가자는 짧은 시간에 신호 50개 안팎을 보낸다) |
| EVT-14 | `chat:send` | `{ v, text }` (1~500자) | `{ ok }` | 참가자 | 5/1.67 |
| EVT-15 | `media:state` | `{ v, audio, video }` | `{ ok }` | 본인 | 10/5 |
| EVT-16 | `screen:start` | `{ v }` | `{ ok }` | 공유 중인 사람이 없을 때 | 4/1 |
| EVT-17 | `screen:stop` | `{ v }` | `{ ok }` | 공유자 본인 | 4/1 |
| EVT-18 | `host:lock` | `{ v, locked }` | `{ ok }` | **호스트만** | 5/2 |
| EVT-19 | `host:kick` | `{ v, targetId }` | `{ ok }` | **호스트만**, 자기 자신 불가 | 5/2 |
| EVT-20 | `host:muteAll` | `{ v }` | `{ ok }` | **호스트만** | 5/2 |
| EVT-33 | `metrics:path` | `{ v, path: "direct"\|"relay" }` | `{ ok }` | 입장한 소켓 | 10/0.5, 소켓당 로그 20회까지만 기록 |

- `description`: `{ type: "offer"|"answer", sdp: string(≤16384) }`. `candidate`: `{ candidate: string(≤2048), sdpMid?, sdpMLineIndex?, usernameFragment? }`(strict).
- `nickname`: 서버가 정규화한다(길이 1~20, 한글·영문·숫자·공백·`_ - .`). 같은 방에 같은 닉네임이 있으면 `이름 (2)`처럼 접미사로 유일하게 만들어 돌려준다(확인: 두 번째 `host` → `host (2)`).
- `participants[]` 항목: `{ id, nickname, isHost, audio, video, screen, connection: "connected"|"reconnecting", joinSeq }`.
- `config`: `{ maxParticipants, reconnectGraceSec }`. `iceServers`: STUN과 (설정 시) TURN 임시 자격증명(EVT-30). `hostId`는 호스트가 없으면 `null`.
- `metrics:path`: 연결된 피어당 `direct`/`relay` 한 값을 보고하는 계측용이다(KPI-05, 로그 집계). 서버는 `info {kpi:'path', path}` 한 줄만 로그에 남기고 방·참가자·IP는 남기지 않는다. 구 서버(롤백)에는 핸들러가 없어 ack가 오지 않으므로 클라이언트는 기다리지 않는다.
- 속도 제한·검증·입장 오류로 **10초 안에 15회** 거부되면 서버가 소켓을 끊는다(POL-10).
- 등록되지 않은 이벤트 이름은 처리되지 않고 ack도 오지 않는다(9단계 OBS-09-02).

## 5. 소켓 이벤트: 서버 → 클라이언트 (10종)
| ID | 이벤트 | 페이로드 |
|---|---|---|
| EVT-21 | `room:participantJoined` | `{ v, participant }` |
| EVT-22 | `room:participantLeft` | `{ v, id, reason: "left"\|"timeout"\|"kicked" }` |
| EVT-23 | `room:participantUpdated` | `{ v, id, audio?, video?, screen?, connection? }` (바뀐 항목만) |
| EVT-24 | `room:hostChanged` | `{ v, hostId }` |
| EVT-25 | `room:locked` | `{ v, locked }` |
| EVT-26 | `signal:recv` | `{ v, from, description? \| candidate? }` — `from`은 서버가 채움 |
| EVT-27 | `chat:message` | `{ v, id, from, nickname, text, ts }` — 서버가 채움, 보낸 사람에게도 전달됨 |
| EVT-28 | `host:muteAll` | `{ v, by }` — 호스트를 뺀 같은 방 소켓에 전달. 받은 클라이언트는 마이크를 끈다(서버도 각자 `audio:false`로 `participantUpdated`를 보낸다) |
| EVT-29 | `room:kicked` | `{ v, reason }`(현재 값 `"host"`) 후 서버가 그 소켓을 끊는다 |
| EVT-34 | `room:closed` | `{ v: 1 }` — **다른 필드는 없다**(사유·시각·운영자 신원 비표시 원칙). 운영자가 방을 닫을 때 같은 방 모든 소켓에 보낸 직후 서버가 소켓을 끊는다. 끊김 유예 중(소켓 없음)인 참가자는 받지 못한다 |

## 6. 세션 토큰과 TURN
| ID | 항목 | 규칙 |
|---|---|---|
| EVT-30 | TURN 임시 자격증명 | `username = "<만료 UNIX초>:<참가자ID>"`, `credential = base64(HMAC-SHA1(TURN_SECRET, username))`, 유효 `TURN_TTL_SEC`(기본 3600). `room:join`/`room:resume` ack의 `iceServers`로 전달한다. `TURN_SECRET`/`TURN_URLS`가 없으면 STUN만 준다. `STUN_URLS`를 비우면 STUN 항목도 만들지 않는다(SEC-09) |
| EVT-31 | 세션 토큰 | `base64url(payload).base64url(HMAC-SHA256(SESSION_SECRET, payload))`, payload `{ t:"s", rid, pid, exp }`, 유효 4시간. 서명·만료·종류·방·참가자 존재를 모두 검증한다(SEC-03). `SESSION_SECRET`이 바뀌면 기존 토큰은 모두 `TOKEN_INVALID` |
| EVT-32 | 호스트 클레임 토큰 | 같은 방식, payload `{ t:"h", rid, exp }`, 유효 1시간. `t`로 세션 토큰과 구분하며 첫 호스트 입장에 한 번만 쓸 수 있다(POL-13). 세션 토큰을 `hostClaim`으로 내면 거부된다 |

## 7. Admin 인터페이스 (운영자 전용)
| ID | 경로 | 인증 | 응답 |
|---|---|---|---|
| EVT-35 | `POST /admin/rooms/:roomId/close` | `Authorization: Bearer <ADMIN_TOKEN>` | 200 `{ closed: true, participants: N }` |

- **`127.0.0.1`에만 바인딩한 별도 리스너**(`ADMIN_PORT`)다. `ADMIN_PORT`와 `ADMIN_TOKEN`이 **둘 다** 설정된 때만 열린다. 공개 포트·리버스 프록시에 연결하지 않는다. 호출자는 서버 안(SSH·`docker exec`)의 운영자뿐이므로 외부 개발자용 API가 아니다. 사용 절차는 `docs/06-ops/admin-manual.md`.
- 오류(본문 `{code}`): 401 `FORBIDDEN`(토큰 없음·틀림·길이 다름을 구분하지 않음), 400 `INVALID_PAYLOAD`(방 ID가 22자 `A-Za-z0-9_-` 형식이 아님), 404 `ROOM_NOT_FOUND`(방 없음), 404 `NOT_FOUND`(다른 경로), 405 `METHOD_NOT_ALLOWED`(`Allow: POST`), 413 `PAYLOAD_TOO_LARGE`(본문 1 KB 초과), 429 `RATE_LIMITED`(**인증에 실패한** 요청만 센다: 전체 공통 용량 20·초당 1회 보충, 올바른 토큰은 한도에 걸리지 않음), 500 `INTERNAL`.
- 인증은 양쪽을 SHA-256으로 해시한 뒤 `timingSafeEqual`로 비교한다. 응답에 `Cache-Control: no-store`.
- 요청 본문은 쓰지 않는다. 방을 지우고 같은 방 소켓에 `room:closed`(EVT-34)를 보낸 뒤 끊는다. 닫힌 방 ID는 다시 쓰이지 않는다.

## 8. 오류 코드 (ack·REST 공통 19종 + HTTP 전용)
`ERROR_CODES`(`packages/shared/src/protocol.ts`)와 같은 19종이다.
| 코드 | 의미 | 주로 발생하는 곳 | 호출자가 할 일 |
|---|---|---|---|
| `INVALID_PAYLOAD` | 스키마 위반(모르는 키 포함), 정규화 후 빈 닉네임·채팅, 형식 오류 | 모든 이벤트, REST 400/413 | 페이로드 수정(재시도 무의미) |
| `RATE_LIMITED` | 속도 제한 초과 | 모든 이벤트, REST 429, `room:join`의 IP 입장 시도 한도 | 잠시 뒤 재시도(15회 누적 시 연결 종료) |
| `NOT_JOINED` | 입장(`join`/`resume`) 전에 입장 필요 이벤트를 보냄 | 입장 이외 이벤트 | 먼저 `room:join` |
| `ALREADY_JOINED` | 이미 입장한 소켓(또는 입장 처리 중)이 다시 join/resume | `room:join`, `room:resume` | 소켓을 새로 연결 |
| `ROOM_NOT_FOUND` | 방이 없음(만료·종료·서버 재시작·운영자 폐쇄) | `room:join`, `room:resume`, 호스트 이벤트 | 새 방 만들기 |
| `ROOM_FULL` | 정원(`MAX_PARTICIPANTS`) 초과 | `room:join` | 나중에 재시도 |
| `ROOM_LOCKED` | 방이 잠김(호스트 클레임 입장은 예외) | `room:join` | 호스트가 해제할 때까지 대기 |
| `WRONG_PASSWORD` | 비밀번호 방에서 비밀번호 없음·틀림 | `room:join` | 비밀번호 재확인 |
| `TOO_MANY_ATTEMPTS` | 같은 IP+방에서 10분 안에 5회 오답 → 10분 차단 | `room:join` | 10분 대기 |
| `KICKED` | 호스트가 내보낸 사람(세션·IP 해시)이 재입장 | `room:join` | 재입장 불가(방 단위 영구, 방이 있는 동안) |
| `HOST_NOT_PRESENT` | 호스트가 아직 입장하지 않은 방에 일반 참가자가 입장 | `room:join` | 호스트 입장 후 재시도 |
| `TOKEN_INVALID` | 세션 토큰의 서명·만료·종류가 올바르지 않음 | `room:resume` | 새로 `room:join` |
| `PARTICIPANT_GONE` | 방은 있으나 해당 참가자가 정리됨(유예 20초 만료·강퇴·퇴장) | `room:resume`, `media:state`, `screen:*`, `chat:send` | 새로 `room:join` |
| `FORBIDDEN` | 호스트가 아님(소켓), Origin 거부(REST 403), admin 인증 실패(401) | `host:*`, REST, admin | 권한 확인 |
| `TARGET_NOT_FOUND` | 신호·강퇴 대상이 같은 방에 없거나 자기 자신(신호) | `signal:send`, `host:kick` | 참가자 목록 갱신 |
| `CANNOT_KICK_SELF` | 호스트가 자기 자신을 강퇴 | `host:kick` | — |
| `SCREEN_BUSY` | 다른 참가자가 이미 화면공유 중(방당 1명) | `screen:start` | 공유 종료 후 재시도 |
| `SERVER_BUSY` | 서버 방 수 상한 도달 | `POST /api/rooms`(503) | 잠시 뒤 재시도 |
| `INTERNAL` | 처리되지 않은 서버 오류 | 모든 이벤트, REST 500 | 재시도, 반복되면 운영자 |

**HTTP 전용 코드**(소켓 ack에는 없고 `ERROR_CODES`에도 없음): `NOT_FOUND`(404), `METHOD_NOT_ALLOWED`(405, admin), `PAYLOAD_TOO_LARGE`(413, admin).

**ack가 아닌 연결 단계 거부**: Origin이 허용 목록에 없거나 없는 소켓은 연결이 거부되고(`connect_error`, 메시지 `websocket error`), IP당 동시 연결 상한(`IP_MAX_CONNECTIONS`, 기본 20)을 넘으면 `connect_error` 메시지 `too many connections`로 거부된다. 웹 클라이언트는 이를 "서버가 붐비거나 이 네트워크에서 연결이 너무 많다"로 안내한다(DEF-S-02).

## 9. 실행으로 확인한 응답 (2026-10-02, 운영 빌드 로컬 실행)
| 요청 | 결과 |
|---|---|
| `POST /api/rooms {"v":1}` | 201, `roomId` 22자 |
| `POST /api/rooms {"v":1,"password":"ab"}` / 깨진 JSON | 400 `INVALID_PAYLOAD` |
| `POST /api/rooms`, 본문 3 KB | **413** `INVALID_PAYLOAD` |
| `GET /api/meta`(운영 정보 미설정) | `operator`·`legal` 값이 `null`, `stunHosts:["stun.l.google.com"]` |
| `GET /api/meta`, `Origin: https://evil.test` | 403 |
| `GET /api/nope` | 404 `NOT_FOUND` |
| `GET /api/rooms/abc` | 200 `exists:false` |
| admin: 토큰 없음/틀림 | 401 `FORBIDDEN` |
| admin: 짧은 방 ID / GET / 다른 경로 | 400 `INVALID_PAYLOAD` / 405 `METHOD_NOT_ALLOWED` / 404 `NOT_FOUND` |
| admin: 닫기 → 다시 닫기 → 공개 포트의 `/admin/...` | 200 `{closed:true,participants:0}` → 404 `ROOM_NOT_FOUND` → 404 `NOT_FOUND` |
| 소켓: join(호스트 클레임) → 응답 키 | `ok,selfId,token,hostId,locked,participants,iceServers,config`(TURN 설정 시 `iceServers`에 STUN 1개 + TURN 1개와 임시 `username`·`credential`) |
| 소켓: 입장 전 `chat:send`, 추가 키 `from` 포함, 호스트 아닌 `host:lock`, 잠긴 방 입장, 두 번째 `screen:start`, 자기 강퇴, 없는 대상, 잘못된 `metrics:path`, 잘못된 토큰 resume, 두 번째 join, 없는 방 join, 호스트 입장 전 일반 입장, 비밀번호 방 오답·미입력 | 각각 `NOT_JOINED`, `INVALID_PAYLOAD`, `FORBIDDEN`, `ROOM_LOCKED`, `SCREEN_BUSY`, `CANNOT_KICK_SELF`, `TARGET_NOT_FOUND`, `INVALID_PAYLOAD`, `TOKEN_INVALID`, `ALREADY_JOINED`, `ROOM_NOT_FOUND`, `HOST_NOT_PRESENT`, `WRONG_PASSWORD` |
| 소켓: admin 폐쇄 | 남은 소켓이 `room:closed {v:1}`를 받고 연결이 끊김 |

확인하지 못한 것(미검증): `ROOM_FULL`·`TOO_MANY_ATTEMPTS`·`KICKED`·`PARTICIPANT_GONE`·`SERVER_BUSY`·`RATE_LIMITED`·`INTERNAL`은 이번에 직접 호출하지 않았다(단위·통합·E2E 시험이 덮는다: IT-60~88, TC-530~539). 실서버·프록시 뒤 동작, 비브라우저 클라이언트의 장시간 연결, 외부 개발자의 연동 경험은 미검증이다.

## 10. 버전·호환 정책
- 모든 메시지는 `v: 1`이다. **추가만 한다**: 신규 REST·소켓 이벤트·응답 필드는 추가하고 기존 필드의 의미를 바꾸거나 지우지 않는다. 모르는 이벤트·필드는 무시하는 클라이언트를 가정한다(단 클라이언트→서버 페이로드는 strict라 서버가 모르는 **키**를 보내면 거부된다).
- 롤백 호환: 새 이미지가 옛 `.env`로, 옛 이미지가 새 `.env`로 뜬다(신규 환경변수는 선택). 구 서버는 `metrics:path`를 무시하고 `/api/meta`는 404다(웹 클라이언트는 이를 허용한다, 03 §7.4).
- `v: 2` 이행 규칙, 폐기(deprecation) 공지 기간, 외부 연동자에 대한 변경 통지 방법은 **정해지지 않았다**(미정). 외부 연동을 공식 지원하기로 하면 먼저 정해야 한다.
- 소켓의 `iceServers`·세션 토큰 형식은 서버가 정한 값이며 클라이언트가 해석하지 않는다(불투명 값으로 다룰 것).

## 11. 요구 매핑 (요약)
| 요구 | 이벤트 |
|---|---|
| FR-01, FR-02, FR-05, FR-23 | EVT-02, EVT-03, EVT-10 |
| FR-03, FR-06, FR-14, FR-15, FR-16, FR-17 | EVT-10, EVT-18~20, EVT-24, EVT-25, EVT-29 |
| FR-07, FR-08, FR-09, FR-12 | EVT-13, EVT-15~17, EVT-23, EVT-26 |
| FR-02, FR-04, FR-10 | 클라이언트 전용 (링크 복사, 장치 미리보기, 오디오 레벨 분석) |
| FR-13 | EVT-21~23 |
| FR-11 | EVT-14, EVT-27 |
| FR-18, FR-19, FR-20, FR-21, FR-22 | EVT-11, EVT-12, EVT-22, EVT-23 |
| SEC-01~06, SEC-09 | 전 이벤트 공통 규칙, EVT-30~32 |
