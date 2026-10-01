# MeetLite 보안 위협 모델 (security.md)

> 상태: 초안 — 승인 대기. Phase 5에서 실제 구현·점검 결과로 갱신한다.
> 보안 변경 시 이 문서를 같이 갱신한다.

## 1. 범위와 전제
- 로그인이 없는 익명 서비스. **방 링크(128비트 난수 ID)를 아는 것이 곧 입장 권한**이며, 선택적 비밀번호로 2차 방어한다.
- 미디어는 브라우저 간 P2P(WebRTC, DTLS-SRTP 암호화). 서버는 미디어를 보지 못한다(TURN 릴레이도 암호화된 패킷만 전달).
- 서버는 시그널링·방 상태만 보관(인메모리). 채팅·SDP는 저장하지 않는다.
- 배포는 HTTPS/WSS 전제. (getUserMedia는 HTTPS 또는 localhost에서만 동작)

## 2. 자산
| 자산 | 설명 | 중요도 |
|---|---|---|
| 회의 내용 | 음성·영상·화면공유·채팅 | 높음 |
| 방 접근 권한 | 방 ID, 방 비밀번호 | 높음 |
| 참가자 신원 | 닉네임, IP, 장치 정보(SDP/ICE에 IP 포함) | 중간 |
| TURN 릴레이 자원 | 대역폭(비용) | 높음 |
| 서버 가용성 | 시그널링 서버, coturn | 중간 |
| 비밀값 | TURN shared secret, 허용 Origin 설정 | 높음 |

## 3. 공격자
| 공격자 | 능력 |
|---|---|
| 외부 익명 | 링크/ID 추측, 대량 요청, 임의 소켓 클라이언트 작성 |
| 악의적 참가자 | 정상 입장 후 사칭·스팸·XSS·강퇴 우회·타인 시그널링 조작 시도 |
| 링크 유출자 | 공유 채널에서 링크를 얻은 제3자(원치 않는 입장) |
| 네트워크 중간자 | 평문 구간 도청/변조 (HTTPS 미적용 시) |
| 리소스 남용자 | 공개 TURN을 무료 프록시로 사용 |

## 4. 위협과 대응

### T1. 무단 입장
- 위협: 방 ID 추측/열거, 링크 유출 후 입장.
- 대응:
  - 방 ID는 `crypto.randomBytes(16)`(128비트) → 추측·열거 불가. `GET /api/rooms/:id`는 존재 여부 외 정보 미노출, IP 단위 rate limit.
  - 선택적 방 비밀번호: scrypt 해시 저장, `timingSafeEqual` 비교, 실패 횟수 제한(방·IP별).
  - 호스트의 **방 잠금**(서버가 신규 입장 거부). 정원 제한(`MAX_PARTICIPANTS`).
  - 대기실 노출 정보 최소화: 입장 전에는 참가자 목록·닉네임을 주지 않는다.
- 테스트: 정원 초과/잠금/잘못된 비번/존재하지 않는 방 입장이 거부되는 단위 테스트(Phase 1, 3).

### T2. 사칭 (시그널링 위조)
- 위협: 다른 참가자 ID로 offer/answer/chat 전송, 타 방 참가자에게 릴레이.
- 대응:
  - 클라이언트 페이로드에 발신자 필드가 **없고**, 있어도 무시. `from`은 서버가 `socket.data`의 서버 발급 ID로 주입.
  - `to` 대상은 **같은 방 참가자**만 허용(다른 방/없는 ID는 에러). 릴레이는 서버가 소켓 룸 기준으로 수행.
  - 닉네임은 표시용일 뿐 식별자가 아님. 동일 닉네임 허용 시 UI에 구분 표시(Phase 4 검토).
- 테스트: 위조된 `from`·타 방 `to`·미입장 소켓의 이벤트가 거부/무시되는 단위 테스트(Phase 1).

### T3. 채팅 XSS / 링크 악용
- 위협: 닉네임·채팅에 스크립트/HTML 삽입, `javascript:` 링크, 탭내빙(reverse tabnabbing), 유니코드 방향 제어문자 스푸핑.
- 대응:
  - React 기본 이스케이프만 사용, **`dangerouslySetInnerHTML` 금지**(ESLint 규칙으로 차단).
  - 자동 링크는 `http:`/`https:`만 허용, `rel="noopener noreferrer"` + `target="_blank"`.
  - 길이 제한(닉네임 20, 채팅 500), 제어문자·방향 제어 문자(U+202A–202E, U+2066–2069) 제거/거부.
  - CSP(`script-src 'self'`, 인라인 스크립트 금지)로 2차 방어.
- 테스트: XSS 페이로드(`<img onerror>`, `<script>`, `javascript:`)가 텍스트로만 표시되는 Playwright/단위 테스트(Phase 3).

### T4. DoS / 자원 고갈
- 위협: 이벤트 폭주, 대용량 페이로드, 방 대량 생성, 소켓 연결 폭주, ICE/offer 스팸.
- 대응:
  - 모든 이벤트 zod 검증 + Socket.IO `maxHttpBufferSize` 소형(예: 16KB) + 이벤트별 SDP/ICE 크기 제한.
  - 이벤트별 토큰 버킷 rate limit(소켓+IP). 반복 위반 시 소켓 종료.
  - IP당 동시 연결 수·방 생성 수 제한, 서버 전체 최대 방 수(`MAX_ROOMS`) 및 빈 방 TTL 정리.
  - 방당 정원 상한으로 mesh 폭증 방지.
- 남은 위험: 대규모 분산 공격(DDoS)은 앱 계층만으로 방어 불가 → 앞단 프록시/CDN(Cloudflare 등) 필요(Phase 5 배포 시 논의).

### T5. TURN 남용
- 위협: 고정 자격증명 유출·재사용으로 TURN 서버를 무료 프록시/트래픽 증폭 용도로 악용.
- 대응:
  - **서버가 단기(기본 1시간) HMAC 임시 자격증명 발급**: `username=<expiry>:<random>`, `credential=HMAC(secret, username)`. 고정 비번 없음. secret은 서버·coturn의 `.env`에만 존재.
  - 발급 엔드포인트는 rate limit + (가능하면) 유효한 방 참가 세션에서만 발급.
  - coturn 하드닝: `no-multicast-peers`, 사설/루프백 대역 peer 거부(`denied-peer-ip`), `user-quota`·`total-quota`·`bps-capacity`, `no-cli`, 불필요 프로토콜 비활성.
- 남은 위험: TTL 내 유출된 자격증명은 만료 전까지 사용 가능 → TTL 단축·quota로 한도 제한.

### T6. 호스트 권한 우회
- 위협: 비호스트가 `host:*` 이벤트 직접 전송, 호스트 사칭.
- 대응: 모든 `host:*`는 **서버가 `room.hostId === socket.data.participantId` 검증**. UI 숨김은 보조. 자기 강퇴·타 방 대상 거부. 호스트 이탈 시 서버가 승계 결정.
- 테스트: 비호스트의 lock/kick/muteAll이 거부되는 서버 권한 검증 테스트(Phase 3).

### T7. 전송 구간·브라우저 보안
- 대응: HTTPS/WSS 전제, HSTS, helmet 보안 헤더, CSP, `Referrer-Policy: no-referrer`(방 링크가 외부로 새지 않게), `X-Content-Type-Options`, `frame-ancestors 'none'`, Permissions-Policy(camera/microphone은 self만).
- Origin 허용 목록: Express CORS와 Socket.IO `cors.origin`·`allowRequest` Origin 검사를 **같은 목록**에서 구성. 와일드카드 금지.
- 방 링크는 쿼리가 아닌 경로(`/r/:roomId`)를 사용하고, 비밀번호는 URL에 넣지 않는다.

### T8. 정보 노출·로그
- 대응: 로그에 SDP, ICE candidate, 토큰, 방 비밀번호, 채팅 본문, 불필요한 닉네임·IP를 남기지 않는다(구조화 로그, 허용 필드 화이트리스트). 오류 응답은 내부 정보(스택 등) 미포함. `.env`는 `.gitignore`, `.env.example`만 커밋.
- 의존성: `npm audit`(Phase 5 및 의존성 변경 시), lockfile 커밋, 최소 의존성 원칙.

### T9. IP 노출 (WebRTC 특성)
- 위협: P2P 연결 시 참가자 서로 공인/사설 IP가 ICE candidate로 노출.
- 대응: 사용자 고지 문구 제공(대기실). 옵션으로 `iceTransportPolicy: 'relay'`(TURN 강제) 설정 지원 검토(비용 증가 트레이드오프 → 질문 대상).
- 남은 위험: 기본 mesh에서는 완전 방지 불가.

### T10. 미디어 접근 남용 (화면공유·카메라)
- 대응: 권한은 브라우저 프롬프트에 의존, 화면공유는 사용자 제스처로만 시작. 호스트는 타인의 카메라/마이크를 **강제로 켜지 않는다**(전체 음소거는 끄기만 가능).

## 5. 보안 요구사항 체크리스트 (Phase 5에서 증거와 함께 점검)
| 항목 | 구현 Phase | 상태 |
|---|---|---|
| 방 ID 128비트 crypto 난수, 선택적 비번 | 1 | 미구현 |
| 서버 부여 발신자 ID, 같은 방 릴레이만 | 1 | 미구현 |
| 모든 이벤트 zod 검증·크기 제한·rate limit | 1 | 미구현 |
| 닉네임/채팅 길이·문자 제한 | 1, 3 | 미구현 |
| 채팅 텍스트 렌더링, 링크 rel 속성 | 3 | 미구현 |
| Origin 허용 목록(CORS+Socket.IO), CSP 등 헤더 | 1, 5 | 미구현 |
| TURN 단기 HMAC 자격증명 | 2 | 미구현 |
| .env 관리, .env.example, .gitignore | 0 | 미구현 |
| 호스트 권한 서버 검증 | 3 | 미구현 |
| 로그 민감정보 제외, npm audit | 1, 5 | 미구현 |

## 6. 남은 위험 (현 시점 기준, 수용 또는 추후 대응)
1. **링크 유출 = 입장 가능**(비번 미설정 시). 호스트 잠금·강퇴로 완화. 로그인 없는 설계의 본질적 한계.
2. **강퇴 우회**: 계정이 없으므로 새 탭/IP로 재입장 가능. 단기 차단·방 잠금으로만 완화.
3. **mesh에서 참가자 간 IP 노출**(T9).
4. **분산 DoS**는 앱 계층 방어 불가 → 앞단 보호 필요.
5. **TURN 임시 자격증명 TTL 내 재사용** 가능.
6. 단일 서버 인메모리 상태: 재시작 시 방 소멸(가용성 위험, 보안 영향 낮음).
7. Safari/Firefox 등 비-Chromium 브라우저 동작은 자동 테스트 범위 밖(미검증).
8. E2E 암호화(참가자 간 앱 계층 암호화)는 미구현 — 서버는 미디어를 보지 못하나, 채팅은 TLS 구간에서 서버를 거치는 평문(서버는 저장·로그 안 함).
