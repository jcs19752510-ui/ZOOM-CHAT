> **이 문서의 용도** — 누가: 개발자(서버·웹 구현), 보안 담당자(검증 점검) / 언제: 이벤트나 페이로드를 바꾸기 전, 테스트를 쓰기 전 / 무엇을: 클라이언트와 서버가 주고받는 모든 메시지의 모양, 오류 코드, 권한, 속도 제한을 결정한다(단일 기준).

# 시그널링·REST 명세 (EVT)

| 항목 | 내용 |
|---|---|
| 버전 | 0.1 |
| 작성일 | 2026-10-01 |
| 상태 | 승인 (구현 기준, DEC-004) |
| 주도 | ② 개발자, ④ 아키텍트 |

## 변경 이력
| 버전 | 날짜 | 내용 |
|---|---|---|
| 0.1 | 2026-10-01 | 최초 작성 (속도 우선으로 구현과 함께 확정) |

스키마의 단일 출처는 `packages/shared/src/schemas.ts`(zod)다. 이 문서와 다르면 문서를 고친다.

## 1. 공통 규칙
- 모든 메시지에 `v: 1`(NFR-12). 클라이언트→서버 페이로드는 **strict**(모르는 키는 거부, `from` 같은 발신자 필드를 보내면 `INVALID_PAYLOAD`)(SEC-04).
- 모든 클라이언트→서버 이벤트는 ack 콜백으로 `{ ok: true, ... }` 또는 `{ ok: false, code, message }`를 받는다. `message`는 사용자에게 보여 줄 한국어가 아니라 개발용 짧은 영문이며 내부 정보를 담지 않는다(SEC-08). 화면 문구는 클라이언트 `strings.ts`가 `code`로 결정한다.
- 서버→클라이언트 이벤트에 들어가는 `from`/`id`는 **서버가 부여**한 참가자 ID다(SEC-04). 같은 방 참가자에게만 전달한다.
- 입장 이후의 모든 이벤트는 소켓에 묶인 세션(`room:join` 또는 `room:resume` 성공)이 있어야 한다. 없으면 `NOT_JOINED`(SEC-03).
- 전송 크기: Socket.IO `maxHttpBufferSize` 32 KB, SDP 16 KB, ICE 후보 2 KB, 채팅 500자(SEC-06).

## 2. REST
| ID | 경로 | 요청 | 응답 | 제한 |
|---|---|---|---|---|
| EVT-01 | `GET /healthz` | — | `{ status: "ok", uptimeSec }` | — |
| EVT-02 | `POST /api/rooms` | `{ v, password? }` (4~32자) | 201 `{ v, roomId, hostClaim }` | IP당 10회/분, 서버 방 수 `MAX_ROOMS` |
| EVT-03 | `GET /api/rooms/:roomId` | — | `{ v, exists, locked, needsPassword, full, hostPresent }` (없으면 `exists:false`만 의미) | IP당 60회/분 |

- `roomId`: 16바이트 난수의 base64url(22자, 128비트)(SEC-01). 형식이 맞지 않으면 `exists:false`.
- `hostClaim`: 방 생성자만 가진 서명 토큰. 첫 호스트 입장에 한 번만 쓸 수 있다(POL-13).
- 오류: 400 `INVALID_PAYLOAD`, 429 `RATE_LIMITED`, 503 `SERVER_BUSY`(방 수 상한).

## 3. 소켓 이벤트: 클라이언트 → 서버
| ID | 이벤트 | 페이로드 | 성공 ack | 권한 | 속도 제한(토큰 버킷: 용량/초당 보충) |
|---|---|---|---|---|---|
| EVT-10 | `room:join` | `{ v, roomId, nickname, password?, hostClaim? }` | `{ ok, selfId, token, hostId, locked, participants[], iceServers[], config }` | 누구나 | 소켓 5/0.1 + IP 방별 오답 5회/10분 |
| EVT-11 | `room:resume` | `{ v, token }` | EVT-10과 동일 | 유효 토큰 | 10/0.2 |
| EVT-12 | `room:leave` | `{ v }` | `{ ok }` | 참가자 | 3/1 |
| EVT-13 | `signal:send` | `{ v, to, description? , candidate? }` 중 하나만 | `{ ok }` | 같은 방의 `to` | 120/40 (6명 방의 새 참가자는 짧은 시간에 신호 50개 안팎을 보낸다) |
| EVT-14 | `chat:send` | `{ v, text }` (1~500자) | `{ ok }` | 참가자 | 5/1.67 |
| EVT-15 | `media:state` | `{ v, audio, video }` | `{ ok }` | 본인 | 10/5 |
| EVT-16 | `screen:start` | `{ v }` | `{ ok }` | 공유 중인 사람이 없을 때 | 4/1 |
| EVT-17 | `screen:stop` | `{ v }` | `{ ok }` | 공유자 본인 | 4/1 |
| EVT-18 | `host:lock` | `{ v, locked }` | `{ ok }` | **호스트만** | 5/2 |
| EVT-19 | `host:kick` | `{ v, targetId }` | `{ ok }` | **호스트만**, 자기 자신 불가 | 5/2 |
| EVT-20 | `host:muteAll` | `{ v }` | `{ ok }` | **호스트만** | 5/2 |

- `description`: `{ type: "offer"|"answer", sdp: string(≤16384) }`. `candidate`: `{ candidate: string(≤2048), sdpMid?, sdpMLineIndex?, usernameFragment? }`.
- `participants[]` 항목: `{ id, nickname, isHost, audio, video, screen, connection: "connected"|"reconnecting", joinSeq }`.
- `config`: `{ maxParticipants, reconnectGraceSec }`. `iceServers`: STUN과 (설정 시) TURN 임시 자격증명(EVT-30).
- 속도 제한을 넘기면 ack `RATE_LIMITED`. 짧은 시간 안에 반복해서 넘기면 서버가 소켓을 끊는다(POL-10).

## 4. 소켓 이벤트: 서버 → 클라이언트
| ID | 이벤트 | 페이로드 |
|---|---|---|
| EVT-21 | `room:participantJoined` | `{ v, participant }` |
| EVT-22 | `room:participantLeft` | `{ v, id, reason: "left"\|"timeout"\|"kicked" }` |
| EVT-23 | `room:participantUpdated` | `{ v, id, audio?, video?, screen?, connection? }` |
| EVT-24 | `room:hostChanged` | `{ v, hostId }` |
| EVT-25 | `room:locked` | `{ v, locked }` |
| EVT-26 | `signal:recv` | `{ v, from, description? \| candidate? }` — `from`은 서버가 채움 |
| EVT-27 | `chat:message` | `{ v, id, from, nickname, text, ts }` — 서버가 채움 |
| EVT-28 | `host:muteAll` | `{ v, by }` — 받은 클라이언트는 마이크를 끈다 |
| EVT-29 | `room:kicked` | `{ v, reason }` 후 서버가 소켓을 끊는다 |

## 5. 세션 토큰과 TURN
| ID | 항목 | 규칙 |
|---|---|---|
| EVT-30 | TURN 임시 자격증명 | `username = "<만료 UNIX초>:<참가자ID>"`, `credential = base64(HMAC-SHA1(TURN_SECRET, username))`, 유효 `TURN_TTL_SEC`(기본 3600). `room:join`/`room:resume` ack의 `iceServers`로 전달한다. `TURN_SECRET`/`TURN_URLS`가 없으면 STUN만 준다. `STUN_URLS`를 비우면 STUN 항목도 만들지 않는다(SEC-09). |
| EVT-31 | 세션 토큰 | `base64url(payload).base64url(HMAC-SHA256(SESSION_SECRET, payload))`, payload `{ t:"s", rid, pid, exp }`, 유효 4시간. 서명·만료·종류·방·참가자 존재를 모두 검증한다(SEC-03). |
| EVT-32 | 호스트 클레임 토큰 | 같은 방식, payload `{ t:"h", rid, exp }`, 유효 1시간. `t`로 세션 토큰과 구분하며 첫 호스트 입장에 한 번만 쓸 수 있다(POL-13). |

## 6. 오류 코드
`INVALID_PAYLOAD` · `RATE_LIMITED` · `NOT_JOINED` · `ALREADY_JOINED` · `ROOM_NOT_FOUND` · `ROOM_FULL` · `ROOM_LOCKED` · `WRONG_PASSWORD` · `TOO_MANY_ATTEMPTS` · `KICKED` · `HOST_NOT_PRESENT` · `TOKEN_INVALID` · `PARTICIPANT_GONE` · `FORBIDDEN` · `TARGET_NOT_FOUND` · `CANNOT_KICK_SELF` · `SCREEN_BUSY` · `SERVER_BUSY` · `INTERNAL`

## 7. 요구 매핑 (요약)
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
