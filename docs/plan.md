> ⚠ **구 체계 초안(대체 예정)**: 2026-10-01 새 지시서 이전에 작성됨. 세션 토큰, 방 수명 등 새 요구와 다를 수 있으므로 기준으로 쓰지 말 것. 새 기준은 `docs/README.md`와 `docs/01-planning/prd.md`. Gate 0-C에서 `03-engineering/`으로 흡수 후 삭제.

# MeetLite 설계 계획 (plan.md)

> 상태: 초안 — 승인 대기. 승인 전에는 코드를 작성하지 않는다.

## 1. 목표와 제약
- 브라우저 링크만으로 입장하는 그룹 화상회의. 방당 최대 6명(설정값 `MAX_PARTICIPANTS`), 동시 방 수십 개.
- 1인 운영·저비용·유지보수 용이. UI 한국어 기본.
- 비목표: 서버 녹화, 회원/로그인, 결제, 네이티브 앱, 가상 배경.

## 2. 아키텍처

```
 Browser A ──┐                          ┌── Browser B
   React UI  │   HTTPS / WSS            │
   MediaTransport(Mesh) ◄── P2P media (SRTP) ──► MediaTransport(Mesh)
             │        ▲                 │
             └────────┼─────────────────┘
                      │ Socket.IO (시그널링만: join/offer/answer/ice/chat/host)
                ┌─────▼──────┐        ┌──────────┐
                │ apps/server│        │  coturn  │ ← STUN/TURN (미디어 릴레이)
                │ Express+SIO│─HMAC──►│          │   임시 자격증명 검증
                └────────────┘ secret └──────────┘
```

- **미디어는 브라우저끼리 직접(P2P mesh)**. 서버는 시그널링·방 상태·TURN 자격증명 발급만 한다 → 서버 비용·부하 최소.
- mesh는 N명일 때 각자 N-1개 업로드. 6명이 상한인 이유(업로드 대역폭·CPU). 6명 초과 수요가 생기면 SFU로 교체(§6).
- 서버 상태는 **인메모리**. 채팅은 저장·로그하지 않고 릴레이만 한다. 서버 1대 가정(수평 확장은 비목표; 필요 시 Redis adapter 제안).

### 2.1 폴더 구조
```
.
├─ CLAUDE.md
├─ package.json                 # npm workspaces, 공통 scripts
├─ tsconfig.base.json           # strict
├─ eslint.config.js / .prettierrc
├─ .env.example / .gitignore
├─ docs/{plan.md, security.md}
├─ infra/
│  ├─ docker-compose.yml        # coturn (+ 개발용)
│  └─ coturn/turnserver.conf
├─ packages/shared/src/
│  ├─ events.ts                 # 이벤트 이름·방향별 payload 타입
│  ├─ schemas.ts                # zod 스키마 (단일 출처)
│  └─ limits.ts                 # 길이/크기 상수
├─ apps/server/src/
│  ├─ index.ts                  # 부트스트랩
│  ├─ config.ts                 # env → zod
│  ├─ http/{app.ts, health.ts, turn.ts}   # /healthz, /api/rooms, /api/turn
│  ├─ socket/{server.ts, handlers.ts, guard.ts}  # 검증+rate limit 미들웨어
│  ├─ rooms/{RoomManager.ts, Room.ts}     # 순수 로직(소켓 비의존 → 테스트 쉬움)
│  └─ security/{roomId.ts, password.ts, turnCredentials.ts, rateLimit.ts}
└─ apps/web/src/
   ├─ design/tokens.ts          # 디자인 토큰 단일 출처
   ├─ pages/{Landing, Lobby, Room}.tsx
   ├─ components/{VideoGrid, ControlBar, SidePanel, Chat, Participants, ...}
   ├─ media/{MediaTransport.ts, MeshTransport.ts, devices.ts}
   ├─ signaling/client.ts       # Socket.IO 래퍼 (shared 타입 사용)
   └─ lib/{errors.ts(한국어 오류 문구), linkify.ts}
```

### 2.2 MediaTransport 인터페이스 (SFU 교체 지점)
```ts
interface MediaTransport {
  join(ctx: { roomId: string; selfId: string; iceServers: RTCIceServer[] }): Promise<void>;
  leave(): Promise<void>;
  setLocalStream(s: MediaStream | null): Promise<void>;       // 카메라/마이크 트랙 교체
  startScreenShare(s: MediaStream): Promise<void>;
  stopScreenShare(): Promise<void>;
  on(event: 'remoteStream' | 'remoteStreamRemoved' | 'connectionState' | 'stats', cb): () => void;
}
```
- UI는 `MediaTransport`만 안다. `MeshTransport`가 시그널링 이벤트(offer/answer/ice)를 직접 사용. SFU로 바꾸면 구현체만 교체한다.
- 시그널링 서버는 "방 상태 + 메시지 릴레이" 역할이므로 SFU 도입 후에도 방/채팅/호스트 로직은 재사용된다.

## 3. 메시지 프로토콜 (Socket.IO)

원칙: 클라이언트 → 서버 페이로드에는 **발신자 필드가 없다.** 서버가 `socket.data.participantId`를 부여/주입한다. 모든 이벤트는 ack 콜백으로 `{ ok: true, ... } | { ok: false, code, message }` 반환.

### 3.1 HTTP
| 메서드/경로 | 설명 |
|---|---|
| `GET /healthz` | 헬스체크 `{status:"ok", uptime}` (내부 정보 미노출) |
| `POST /api/rooms` | 방 생성 `{password?}` → `{roomId}` (128비트 base64url). rate limit |
| `GET /api/rooms/:id` | 존재/잠금/비번 필요/정원 여부만 반환 (참가자 정보 미노출) |
| `GET /api/turn` | 임시 ICE 서버 목록 발급 (HMAC, TTL 1h). 방 참가 전 토큰 필요 여부는 §3.4 |

### 3.2 클라이언트 → 서버 이벤트
| 이벤트 | payload (zod) | 서버 검증 |
|---|---|---|
| `room:join` | `{roomId, nickname, password?}` | 방 존재, 잠금, 정원, 비번(timingSafeEqual), 닉네임 규칙 |
| `room:leave` | `{}` | — |
| `signal:offer` | `{to, sdp}` | `to`가 **같은 방** 참가자, sdp 크기 ≤ 16KB |
| `signal:answer` | `{to, sdp}` | 동일 |
| `signal:ice` | `{to, candidate}` | 동일, candidate ≤ 2KB |
| `chat:send` | `{text}` | 1~500자, 제어문자 제거, rate limit |
| `media:state` | `{audio:boolean, video:boolean, screen:boolean}` | 본인 상태만 갱신 |
| `host:lock` | `{locked:boolean}` | **호스트만** |
| `host:kick` | `{targetId}` | 호스트만, 자기 자신 불가, 대상은 같은 방 |
| `host:muteAll` | `{}` | 호스트만 (개별 강제 해제는 불가: 사용자가 직접 켜야 함) |

### 3.3 서버 → 클라이언트 이벤트
| 이벤트 | payload |
|---|---|
| `room:joined` | `{selfId, hostId, participants:[{id,nickname,audio,video,screen}], locked}` |
| `room:participantJoined` / `room:participantLeft` | `{participant}` / `{id}` |
| `room:hostChanged` | `{hostId}` (호스트 이탈 시 가장 먼저 입장한 참가자로 승계) |
| `room:locked` | `{locked}` |
| `signal:offer/answer/ice` | `{from, ...}` — **`from`은 서버가 주입** |
| `chat:message` | `{from, nickname, text, ts}` — 서버가 주입 |
| `media:state` | `{id, audio, video, screen}` |
| `host:muteAll` | `{by}` → 클라이언트는 마이크 끄기 |
| `room:kicked` | `{reason}` 후 서버가 소켓 disconnect |

### 3.4 참가자 ID·재연결
- 참가자 ID: 서버가 `room:join` 성공 시 발급하는 불투명 랜덤 ID(`randomBytes(9)` base64url). 소켓 `data`에 저장.
- 재연결: 네트워크 단절 시 Socket.IO가 자동 재연결. 짧은 유예(기본 20초) 동안 같은 `participantId`로 `room:resume`(서버가 발급한 resume 토큰 필요)하면 자리를 유지한다. 유예 초과 시 새 참가자로 재입장. **(Phase 2에서 확정; 모호하면 질문)**
- 강퇴된 참가자는 해당 방에 대해 resume 토큰 무효 + 일정 시간(기본 10분) 동일 소켓 IP+닉네임 입장 거부(완전한 차단은 불가 — security.md 남은 위험).

### 3.5 Rate limit (기본값, 설정 가능)
토큰 버킷, 소켓 단위 + IP 단위 병행.
- `room:join` 5회/분, `chat:send` 5회/3초, `signal:*` 60회/초(ICE 폭주 고려), `host:*` 5회/초, `media:state` 10회/초.
- 초과 시 이벤트 거부 + 에러 ack. 반복 초과 시 소켓 강제 종료.

## 4. 화면 설계
- **랜딩**: 닉네임 입력 → [방 만들기] / 링크·코드 붙여넣기로 [입장]. 선택적 비밀번호.
- **대기실**: 카메라 미리보기, 마이크 레벨 미터, 장치 선택(카메라/마이크/스피커 지원 브라우저), 권한 오류 안내, [입장].
- **회의실**: 비디오 그리드(1~6명 자동 배치), 발언자 강조(오디오 레벨), 하단 컨트롤바(마이크/카메라/화면공유/채팅/참가자/나가기, 호스트 메뉴), 우측 사이드 패널(채팅/참가자; 모바일은 바텀시트). 화면공유 시 공유 화면 크게 + 참가자 썸네일 스트립.
- **상태 표시**: 연결 상태 배지(연결됨/재연결 중/불안정), 통계(`getStats`의 패킷 손실·RTT 기반) 불량 시 "네트워크가 불안정합니다. 카메라를 끄면 개선될 수 있습니다." 안내.
- 모바일 브라우저: `getDisplayMedia` 미지원 감지 시 화면공유 버튼 비활성 + "모바일에서는 화면공유를 지원하지 않습니다. PC 브라우저를 이용해 주세요."
- **디자인 토큰**: `tokens.ts` 단일 출처(색·간격·반경·폰트·그림자) → Tailwind `theme.extend`로 주입. 다크 기본, 대비 AA 이상. 360px부터 반응형.

## 5. Phase 계획 및 완료 기준

| Phase | 범위 | 완료 기준 |
|---|---|---|
| 0 | 문서 3개, 모노레포, lint/typecheck/test 스크립트, docker compose(coturn), 헬스체크 | lint·typecheck·test 통과 |
| 1 | 방 생성/입장/퇴장, 호스트 지정/승계, 정원 제한, 입력 검증, rate limit | 사칭 시도·잘못된 페이로드·정원 초과 거부 단위 테스트 통과 |
| 2 | 대기실, mesh 연결, 음소거/카메라 토글, 장치 변경, 재연결, TURN 임시 자격증명 | Playwright: 3명 입장 후 서로의 비디오 트랙 수신 확인 |
| 3 | 채팅, 화면공유, 방 잠금/강퇴/전체 음소거 | XSS 페이로드가 텍스트로만 표시되는 테스트, 서버 권한 검증 테스트 통과 |
| 4 | 디자인/접근성/반응형 | 360px·1280px 스크린샷 확인, 키보드만으로 입장~퇴장 가능 |
| 5 | npm audit, 보안 헤더 확인, security.md 갱신, README(로컬 실행, TURN 설정) | audit·헤더 점검 통과. **배포 대상은 이 단계에서 질문** |

각 Phase 종료 시 (a) 검증 결과 (b) 변경 파일 (c) 남은 위험을 보고하고 승인 대기. 미검증 항목은 "미검증"으로 명시.

## 6. 핵심 설계 결정과 근거
1. **WebRTC mesh + MediaTransport 추상화**: 6명 이하에서 서버 미디어 비용 0. 교체 지점이 한 인터페이스로 고정되어 SFU 이전 비용이 한정됨.
2. **방 상태 인메모리**: 저장소·운영 복잡도 제거, 채팅 비저장 요구와 일치. 대가: 서버 재시작 시 방 소멸, 단일 인스턴스 한정.
3. **서버 부여 ID + 서버 주입 `from`**: 사칭 방지를 프로토콜 구조로 강제(스키마에 발신자 필드 자체가 없음).
4. **TURN 임시 자격증명(coturn `use-auth-secret`)**: `username = <만료 UNIX시각>:<랜덤>`, `credential = base64(HMAC-SHA1(secret, username))`. coturn이 shared secret으로 검증 → 서버가 coturn과 통신할 필요 없음.
5. **shared 패키지에 zod 단일 출처**: 서버 검증·클라이언트 타입이 항상 일치.

## 7. 기술 스택 관련 알려진 이슈 (승인 요청 사항 없음, 참고)
- Node 22 LTS(현 환경 v22) 기준. ESLint 9 flat config + typescript-eslint, Prettier.
- HMAC-SHA1은 coturn `use-auth-secret` 표준 방식이라 사용(보안 수준 영향 낮음: 단기 크리덴셜 서명 용도).
- Playwright는 Chromium만 사용(요구사항). Safari/Firefox는 수동 점검 대상(미검증으로 표기).
