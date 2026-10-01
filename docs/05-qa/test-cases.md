> **이 문서의 용도** — 누가: 개발자, 기획자 / 언제: 어떤 요구가 어떤 테스트로 확인되는지 볼 때 / 무엇을: 모든 TC/IT/UAT/MC와 연결된 요구를 한눈에 보게 한다. **표는 테스트 코드에서 자동 생성**한다.

# 테스트 케이스 목록

| 항목 | 내용 |
|---|---|
| 버전 | 0.1 |
| 작성일 | 2026-10-01 |
| 상태 | 승인 (구현·검증 반영, DEC-004) |
| 주도 | ② 개발자 |

## 변경 이력
| 버전 | 날짜 | 내용 |
|---|---|---|
| 0.1 | 2026-10-01 | 최초 작성, 표는 자동 생성 |


- 요구 대비 TC 매핑(요구 → 테스트)은 [`../traceability.md`](../traceability.md), 테스트 → 요구는 아래 표다.
- 갱신: `node scripts/check-docs.mjs --gen`
- 유형: 서버(단위·통합·보안), 공유(단위), 웹(단위), E2E(Playwright), UAT(사용자 수행, 미수행), MC(수동·명령 점검)

<!-- BEGIN GENERATED -->
| ID | 제목 | 연결 요구 | 유형 | 파일 | 실행 |
|---|---|---|---|---|---|
| IT-01 | 3명이 입장해 서로의 비디오·오디오 트랙을 수신한다 | FR-01, FR-03, FR-04, FR-07, NFR-01 | E2E | `e2e/meeting.spec.ts` | 자동 |
| IT-02 | 마이크·카메라를 끄면 다른 참가자의 목록과 타일에 반영된다 | FR-08, FR-13, UX-05 | E2E | `e2e/meeting.spec.ts` | 자동 |
| IT-03 | 네트워크가 끊겼다 복구되면 같은 자리로 돌아오고 영상이 다시 흐른다 | FR-20, FR-19, NFR-03 | E2E | `e2e/meeting.spec.ts` | 자동 |
| IT-04 | 채팅의 XSS 페이로드는 텍스트로만 표시되고 http 링크만 안전하게 열린다 | FR-11, SEC-07 | E2E | `e2e/meeting.spec.ts` | 자동 |
| IT-05 | 호스트가 방을 잠그고, 전체 음소거하고, 참가자를 내보낸다(재입장 차단) | FR-14, FR-15, FR-16, SEC-05 | E2E | `e2e/meeting.spec.ts` | 자동 |
| IT-06 | 호스트가 입장하기 전에는 대기 화면이 보이고, 호스트가 입장하면 자동으로 진행된다 | FR-23, POL-13 | E2E | `e2e/meeting.spec.ts` | 자동 |
| IT-07 | 비밀번호 방: 틀린 비밀번호는 거부되고 올바르면 입장한다 | FR-05, SEC-02 | E2E | `e2e/meeting.spec.ts` | 자동 |
| IT-08 | 화면공유: 공유 화면은 크게, 다른 사람은 시작할 수 없고, 중지하면 그리드로 돌아온다 | FR-12, POL-12, UX-06 | E2E | `e2e/meeting.spec.ts` | 자동 |
| IT-09 | 호스트가 나가면 다음 참가자가 호스트가 되어 호스트 도구를 쓸 수 있다 | FR-17 | E2E | `e2e/meeting.spec.ts` | 자동 |
| IT-10 | ${size.width}px: 화면별 스크린샷, 가로 스크롤 없음, 터치 타깃 44px 이상 | NFR-10, UX-02, UX-05 | E2E | `e2e/responsive.spec.ts` | 자동 |
| IT-11 | 키보드만으로 랜딩 → 방 만들기 → 입장 → 채팅 → 참가자 → 나가기까지 할 수 있다 | UX-10, NFR-09 | E2E | `e2e/a11y.spec.ts` | 자동 |
| IT-12 | 모든 아이콘 버튼에 접근 가능한 이름이 있고, 상태 화면은 스크린리더에 알려진다 | UX-10, NFR-09 | E2E | `e2e/a11y.spec.ts` | 자동 |
| IT-13 | 통화 중 마이크 장치를 바꿔도 통화가 유지되고 상대가 계속 소리를 받는다 | FR-09, FR-04 | E2E | `e2e/states.spec.ts` | 자동 |
| IT-14 | 말하는 참가자의 타일이 강조되고, 말이 멈추면 강조가 풀린다(임계값 + 디바운스) | FR-10, UX-07 | E2E | `e2e/states.spec.ts` | 자동 |
| IT-15 | 서버가 재시작되어 방이 사라지면 이유와 다시 시작하는 방법을 안내한다 | FR-21, NFR-06 | E2E | `e2e/states.spec.ts` | 자동 |
| IT-16 | 정원이 차면 세 번째 사람은 "방이 가득 찼습니다"를 본다 | FR-06, FR-07, POL-01 | E2E | `e2e/states.spec.ts` | 자동 |
| IT-17 | 카메라·마이크 권한이 거부돼도 원인과 해결 방법을 안내하고 장치 없이 입장할 수 있다 | FR-04, UX-03, UX-02 | E2E | `e2e/states.spec.ts` | 자동 |
| IT-18 | 지원하지 않는 환경(WebRTC 없음)은 안내 화면과 링크 복사를 보여 준다 | NFR-05, POL-14, FR-06 | E2E | `e2e/states.spec.ts` | 자동 |
| IT-19 | 나간 뒤 "다시 입장"으로 같은 링크에 다시 들어갈 수 있다 | FR-22, FR-03 | E2E | `e2e/states.spec.ts` | 자동 |
| IT-20 | 정원 6명이 모두 입장해 서로 5개씩 영상·오디오를 받고, 7번째는 거부된다 | FR-07, NFR-04, NFR-13, UX-05 | E2E | `e2e/mesh6.spec.ts` | 자동 |
| IT-21 | 서버가 발급한 HMAC 임시 자격증명으로 TURN 릴레이 연결이 되고 영상·오디오가 흐른다 | SEC-09, FR-07 | E2E | `e2e/turn.spec.ts` | 자동 |
| IT-22 | TURN 공유 비밀이 다르면(자격증명 위조·불일치) 릴레이 연결이 만들어지지 않는다 | SEC-09 | E2E | `e2e/turn.spec.ts` | 자동 |
| IT-23 | 링크 복사 버튼은 링크를 클립보드에 복사하고 결과를 알린다. 클립보드가 막히면 선택 가능한 링크를 보여 준다 | FR-02, UX-12 | E2E | `e2e/ux.spec.ts` | 자동 |
| IT-24 | 입장 버튼을 누른 뒤 첫 원격 영상까지 걸리는 시간(로컬 루프백 기준, 중앙값 5초·최대 10초 이내) | NFR-02, KPI-03 | E2E | `e2e/ux.spec.ts` | 자동 |
| IT-25 | 컨트롤바 순서는 마이크, 카메라, 화면공유, 채팅, 참가자, 나가기이고 나가기는 분리되어 위험색이다 | UX-04 | E2E | `e2e/ux.spec.ts` | 자동 |
| IT-26 | 대기실에 네트워크 정보(IP) 노출 가능성 고지가 보인다 | UX-09 | E2E | `e2e/ux.spec.ts` | 자동 |
| IT-27 | prefers-reduced-motion이면 전환·애니메이션이 사실상 꺼진다 | UX-11 | E2E | `e2e/ux.spec.ts` | 자동 |
| IT-28 | 입장·퇴장 알림은 aria-live 영역에 표시된다 | UX-12, FR-13 | E2E | `e2e/ux.spec.ts` | 자동 |
| TC-01 | 정원을 넘는 입장은 ROOM_FULL로 거부된다 | FR-07, POL-01 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-02 | 재접속 유예 중인 참가자도 정원을 차지한다 | POL-01, FR-20 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-03 | 호스트가 입장하기 전에는 다른 사람이 입장할 수 없다 | FR-23, POL-13 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-04 | 호스트 클레임은 한 번만 유효하다(재사용해도 호스트가 되지 않는다) | FR-23, SEC-05 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-05 | 없는 방 입장은 ROOM_NOT_FOUND | FR-06, POL-02 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-06 | 비밀번호 방은 검증 통과 없이 입장할 수 없다 | FR-05, SEC-02 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-07 | 서버 방 수 상한을 넘으면 SERVER_BUSY | POL-15, SEC-06 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-08 | 중복 닉네임에는 번호를 붙인다(대소문자 무시) | FR-03, POL-04 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-09 | 호스트가 나가면 입장 순번이 가장 앞선 접속자가 승계한다 | FR-17 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-10 | 호스트가 끊기면 유예 동안 승계를 보류하고, 유예 후 승계한다 | FR-17, POL-05 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-11 | 유예 안에 호스트가 복귀하면 호스트를 유지한다 | FR-17, POL-05 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-12 | 승계된 뒤 복귀한 원 호스트는 일반 참가자다 | FR-17, POL-05 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-13 | 승계 뒤에도 잠금과 강퇴 목록이 유지된다 | FR-17, POL-05 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-14 | 마지막 참가자가 나가면 방이 즉시 삭제된다 | FR-18 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-15 | 생성 후 아무도 입장하지 않으면 TTL 뒤 삭제된다 | FR-18 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-16 | 유예 중인 참가자만 남으면 유예가 끝날 때 방이 삭제된다 | FR-18, POL-02 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-17 | 호스트 입장 후에는 빈 방 TTL 타이머가 취소된다 | FR-18 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-18 | 비호스트의 방 잠금은 FORBIDDEN | FR-14, SEC-05 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-19 | 잠긴 방은 신규 입장을 거부하고 유예 중 재접속은 허용한다 | FR-14, POL-03 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-20 | 비호스트의 강퇴는 FORBIDDEN, 호스트 자신 강퇴는 불가 | FR-15, SEC-05 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-21 | 강퇴된 사람은 같은 네트워크로 재입장할 수 없다 | FR-15, POL-06 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-22 | 전체 음소거는 호스트를 제외한 참가자의 마이크만 끈다 | FR-16, POL-05 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-23 | 방당 동시 1명만 화면공유할 수 있다 | FR-12, POL-12 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-24 | 공유자가 나가면 공유가 즉시 해제된다 | FR-12, POL-12 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-30 | 호스트 클레임으로 입장하면 ack에 세션 토큰·참가자 ID·ICE 서버가 온다 | FR-03, SEC-03 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-31 | 잘못된 페이로드는 모두 INVALID_PAYLOAD로 거부된다 | SEC-06 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-32 | 입장하지 않은 소켓의 모든 이벤트는 NOT_JOINED로 거부된다 | SEC-03 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-33 | 정원을 넘은 입장은 ROOM_FULL로 거부된다 | FR-07, POL-01 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-34 | 호스트 입장 전 일반 참가자는 HOST_NOT_PRESENT | FR-23, POL-13 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-35 | 위조된 호스트 클레임으로는 호스트가 될 수 없다 | SEC-05 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-36 | 다른 방의 호스트 클레임은 쓸 수 없다 | SEC-05 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-37 | 같은 닉네임은 번호가 붙는다 | FR-03, POL-04 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-40 | signal에 발신자(from)를 넣어 보내면 거부된다 | SEC-04 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-41 | 정상 신호의 from은 서버가 부여한 발신자 ID다 | SEC-04, FR-07 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-42 | 다른 방 참가자에게는 릴레이되지 않는다 | SEC-04 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-43 | SDP 16KB 초과와 소켓 메시지 32KB 초과는 거부된다 | SEC-06 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-44 | 자기 자신에게 보내는 신호는 거부된다 | SEC-04 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-50 | 위조·변조·형식 오류 토큰은 TOKEN_INVALID | SEC-03 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-51 | 호스트 클레임 토큰은 세션 토큰으로 쓸 수 없다 | SEC-03 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-52 | 유예 안에 세션 토큰으로 재접속하면 같은 자리(ID·호스트)를 복구한다 | FR-20, SEC-03 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-53 | 유예가 지나면 퇴장 처리되어 재접속할 수 없다 | FR-20, POL-08 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-54 | 서버가 재시작되어 방이 없으면 ROOM_NOT_FOUND(재접속 안내용) | SEC-03 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-60 | 비호스트의 lock/kick/muteAll 위조 요청은 FORBIDDEN | FR-14, FR-15, FR-16, SEC-05 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-61 | 호스트가 잠그면 신규 입장은 ROOM_LOCKED, 해제하면 입장 가능 | FR-14, POL-03 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-62 | 강퇴된 사람은 소켓이 끊기고 토큰·재입장 모두 거부된다 | FR-15, POL-06, SEC-05 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-63 | 호스트는 자기 자신을 강퇴할 수 없다 | FR-15 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-64 | 전체 음소거 알림은 호스트를 제외한 참가자에게만 가고 목록 상태가 갱신된다 | FR-16 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-65 | 호스트가 나가면 다음 참가자가 호스트가 되고 알림이 간다 | FR-17 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-70 | 채팅은 같은 방에만 가고 발신자 정보는 서버가 채운다 | FR-11, SEC-07 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-71 | 500자 초과·빈 메시지는 거부, 제어·방향 문자는 제거, HTML은 그대로(텍스트로만 표시) | FR-11, SEC-07 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-72 | 이미 공유 중이면 SCREEN_BUSY, 공유자가 나가면 해제 | FR-12, POL-12 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-73 | 마이크·카메라 상태 변경이 다른 참가자에게 전달된다 | FR-08 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-80 | 채팅을 짧은 시간에 반복하면 RATE_LIMITED | SEC-06 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-81 | 거부가 반복되면 서버가 연결을 끊는다 | SEC-06, POL-10 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-90 | 올바른 비밀번호만 입장하고 틀린 시도는 제한된다 | FR-05, SEC-02 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-91 | 오답이 5회를 넘으면 올바른 비밀번호도 TOO_MANY_ATTEMPTS | FR-05, SEC-02, POL-11 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-92 | 호스트는 비밀번호 없이 입장하고, 유효 토큰 재접속은 비밀번호를 다시 묻지 않는다 | FR-05, E-12 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-95 | 허용 목록에 없거나 없는 Origin의 소켓 연결은 거부된다 | SEC-08 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-96 | IP당 동시 연결 수를 넘으면 연결이 거부된다 | SEC-06 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-100 | /healthz는 내부 정보 없이 상태만 돌려준다 | NFR-08 | 서버 | `apps/server/test/http.test.ts` | 자동 |
| TC-101 | 방 ID는 128비트 난수(base64url 22자)이고 서로 다르다 | FR-01, SEC-01 | 서버 | `apps/server/test/http.test.ts` | 자동 |
| TC-102 | 방 상태 조회: 없는 방·형식 오류는 exists=false, 있는 방은 플래그만 노출 | FR-06, FR-23 | 서버 | `apps/server/test/http.test.ts` | 자동 |
| TC-103 | 보안 헤더(CSP, Permissions-Policy, Referrer-Policy 등)가 붙고 서버 정보는 숨긴다 | SEC-08 | 서버 | `apps/server/test/http.test.ts` | 자동 |
| TC-104 | CORS: 허용 Origin만 통과하고 와일드카드를 쓰지 않는다 | SEC-08 | 서버 | `apps/server/test/http.test.ts` | 자동 |
| TC-105 | 잘못된 본문은 400, 너무 큰 본문은 413으로 거부하고 내부 정보를 싣지 않는다 | SEC-06, SEC-08 | 서버 | `apps/server/test/http.test.ts` | 자동 |
| TC-106 | 방 생성은 IP당 속도 제한이 있다(429) | SEC-06 | 서버 | `apps/server/test/http.test.ts` | 자동 |
| TC-107 | 방 비밀번호는 평문이 아닌 해시로만 보관한다 | SEC-02 | 서버 | `apps/server/test/http.test.ts` | 자동 |
| TC-108 | 서버 전체 방 수 상한을 넘으면 503 | SEC-06, POL-15 | 서버 | `apps/server/test/http.test.ts` | 자동 |
| TC-109 | 알 수 없는 경로는 JSON 404 | SEC-08 | 서버 | `apps/server/test/http.test.ts` | 자동 |
| TC-111 | 웹 빌드를 함께 제공하고 SPA 경로·HEAD 요청도 index.html로 응답한다(API·소켓 경로는 제외) | NFR-07, NFR-08 | 서버 | `apps/server/test/http.test.ts` | 자동 |
| TC-120 | 필수값이 없으면 읽기 쉬운 오류로 시작이 실패한다 | NFR-08 | 서버 | `apps/server/test/config.test.ts` | 자동 |
| TC-121 | 짧은 시크릿은 거부한다 | SEC-10 | 서버 | `apps/server/test/config.test.ts` | 자동 |
| TC-122 | Origin 와일드카드와 형식 오류를 거부한다 | SEC-08 | 서버 | `apps/server/test/config.test.ts` | 자동 |
| TC-123 | TURN_URLS는 TURN_SECRET 없이 쓸 수 없다 | SEC-09 | 서버 | `apps/server/test/config.test.ts` | 자동 |
| TC-124 | 기본값: 방당 6명, 방 100개, 유예 20초, 빈 방 10분 | FR-07, NFR-04 | 서버 | `apps/server/test/config.test.ts` | 자동 |
| TC-125 | 운영 모드에서는 .env.example의 예시 비밀값을 거부한다 | SEC-10 | 서버 | `apps/server/test/config.test.ts` | 자동 |
| TC-130 | 서명·만료·종류를 모두 검증한다 | SEC-03 | 서버 | `apps/server/test/security.test.ts` | 자동 |
| TC-131 | username=만료:참가자, credential=HMAC-SHA1(base64), 만료=now+TTL | SEC-09 | 서버 | `apps/server/test/security.test.ts` | 자동 |
| TC-132 | TURN을 설정하지 않으면 자격증명이 만들어지지 않는다(고정 비밀번호 없음) | SEC-09 | 서버 | `apps/server/test/security.test.ts` | 자동 |
| TC-132b | STUN_URLS를 비우면 빈 urls 항목을 만들지 않는다 | SEC-09 | 서버 | `apps/server/test/security.test.ts` | 자동 |
| TC-133 | 같은 비밀번호도 매번 다른 bcrypt 해시이고 검증은 정확하다 | SEC-02 | 서버 | `apps/server/test/security.test.ts` | 자동 |
| TC-134 | 72바이트를 넘는 긴 한글 비밀번호도 끝부분까지 검증한다(잘림 방지) | SEC-02 | 서버 | `apps/server/test/security.test.ts` | 자동 |
| TC-135 | 토큰 버킷은 용량까지 허용하고 시간이 지나면 보충된다 | SEC-06 | 서버 | `apps/server/test/security.test.ts` | 자동 |
| TC-136 | 오답 5회/10분이면 10분간 차단, 성공하면 초기화 | SEC-02, POL-11 | 서버 | `apps/server/test/security.test.ts` | 자동 |
| TC-137 | 방 ID는 base64url 22자(128비트)이며 중복되지 않는다 | SEC-01 | 서버 | `apps/server/test/security.test.ts` | 자동 |
| TC-138 | 참가자 ID는 서버가 만든 12자 난수이다 | SEC-04 | 서버 | `apps/server/test/security.test.ts` | 자동 |
| TC-139 | 차단 키는 IP 원문을 담지 않고 비밀값에 의존한다 | POL-06 | 서버 | `apps/server/test/security.test.ts` | 자동 |
| TC-200 | http/https 링크만 링크로 만들고 나머지는 텍스트다 | FR-11, SEC-07 | 웹 | `apps/web/src/lib/linkify.test.ts` | 자동 |
| TC-201 | javascript:, data:, 상대 경로, HTML 태그는 링크가 되지 않는다 | SEC-07 | 웹 | `apps/web/src/lib/linkify.test.ts` | 자동 |
| TC-202 | 문장부호는 링크에서 떼어 낸다 | SEC-07 | 웹 | `apps/web/src/lib/linkify.test.ts` | 자동 |
| TC-203 | 모든 조각을 이어 붙이면 원문이 보존된다(텍스트로 표시) | SEC-07 | 웹 | `apps/web/src/lib/linkify.test.ts` | 자동 |
| TC-204 | 링크 또는 방 코드에서 방 ID를 뽑는다 | FR-03 | 웹 | `apps/web/src/lib/linkify.test.ts` | 자동 |
| TC-205 | 잘못된 입력은 null | FR-03 | 웹 | `apps/web/src/lib/linkify.test.ts` | 자동 |
| TC-210 | 인원이 늘수록 비트레이트 상한이 낮아지고 해상도가 줄어든다 | NFR-13 | 웹 | `apps/web/src/media/MeshTransport.test.ts` | 자동 |
| TC-211 | 6명 mesh의 총 업링크는 약 2Mbps 이하(5개 스트림 × 400kbps)다 | NFR-13, RISK-01 | 웹 | `apps/web/src/media/MeshTransport.test.ts` | 자동 |
| TC-212 | 색상 코드는 design/tokens.ts 밖에 하드코딩하지 않는다 | UX-08 | 웹 | `apps/web/src/design/design.test.ts` | 자동 |
| TC-213 | 화면에 보이는 한글 문구는 strings.ts에만 있다(컴포넌트·페이지에 직접 쓰지 않는다) | UX-01 | 웹 | `apps/web/src/design/design.test.ts` | 자동 |
| TC-214 | 본문·보조 글자는 모든 배경에서 4.5:1 이상이다 | NFR-09, UX-08 | 웹 | `apps/web/src/design/design.test.ts` | 자동 |
| TC-215 | 버튼(기본·호버) 위 흰 글자는 4.5:1 이상이다 | NFR-09, UX-08 | 웹 | `apps/web/src/design/design.test.ts` | 자동 |
| TC-216 | 경고 배지(어두운 글자/경고색)와 아이콘·링크 색은 어두운 면 위에서 4.5:1 이상이다 | NFR-09, UX-08 | 웹 | `apps/web/src/design/design.test.ts` | 자동 |
| TC-217 | 비텍스트 요소(포커스 링, 말하는 사람 강조, 성공 아이콘)는 3:1 이상이다 | NFR-09 | 웹 | `apps/web/src/design/design.test.ts` | 자동 |
| TC-230 | 한글, 영문, 숫자, 공백, _-. 를 허용한다 | FR-03, POL-04, SEC-06 | 공유 | `packages/shared/src/text.test.ts` | 자동 |
| TC-231 | 빈 값, 21자, 기호, 이모지, 제어/방향 문자를 거부한다 | FR-03, POL-04, SEC-06 | 공유 | `packages/shared/src/text.test.ts` | 자동 |
| TC-232 | 20자는 허용하고 원문이 너무 길면 거부한다 | POL-04, SEC-06 | 공유 | `packages/shared/src/text.test.ts` | 자동 |
| TC-233 | 중복 비교 키는 대소문자를 구분하지 않는다 | FR-03, POL-04 | 공유 | `packages/shared/src/text.test.ts` | 자동 |
| TC-234 | 일반 텍스트와 HTML 문자는 그대로 둔다(렌더링은 텍스트로만) | FR-11, SEC-07 | 공유 | `packages/shared/src/text.test.ts` | 자동 |
| TC-235 | 제어·방향 문자를 제거한다 | FR-11, SEC-07 | 공유 | `packages/shared/src/text.test.ts` | 자동 |
| TC-236 | 빈 값과 500자 초과를 거부한다 | FR-11, POL-07, SEC-06 | 공유 | `packages/shared/src/text.test.ts` | 자동 |
| TC-237 | 줄바꿈은 유지한다 | FR-11, POL-07 | 공유 | `packages/shared/src/text.test.ts` | 자동 |
| TC-240 | 정상 입장 요청을 통과시킨다 | FR-03, SEC-06 | 공유 | `packages/shared/src/schemas.test.ts` | 자동 |
| TC-241 | 버전이 다르면 거부한다 | NFR-12, SEC-06 | 공유 | `packages/shared/src/schemas.test.ts` | 자동 |
| TC-242 | 발신자 필드(from)처럼 모르는 키는 거부한다 | SEC-04, SEC-06 | 공유 | `packages/shared/src/schemas.test.ts` | 자동 |
| TC-243 | signal은 description과 candidate 중 정확히 하나만 허용한다 | SEC-04, SEC-06 | 공유 | `packages/shared/src/schemas.test.ts` | 자동 |
| TC-244 | SDP 16KB 초과를 거부한다 | SEC-06 | 공유 | `packages/shared/src/schemas.test.ts` | 자동 |
| TC-245 | 방 ID 형식이 아니면 거부한다 | SEC-01, SEC-06 | 공유 | `packages/shared/src/schemas.test.ts` | 자동 |
| UAT-01 | 가입·설치 없이 링크 클릭 후 3번 이내 조작(닉네임 입력, 권한 허용, [입장])으로 입장해 서로 영상이 보인다 | NFR-01, FR-03, FR-04 | 사용자 수행 | `05-qa/uat.md` | 미수행 |
| UAT-02 | 스마트폰(iPhone Safari, Android Chrome)에서 링크로 입장해 영상·소리·채팅이 동작한다 | NFR-05, NFR-10, FR-07 | 사용자 수행 | `05-qa/uat.md` | 미수행 |
| UAT-03 | 카메라/마이크 권한을 일부러 차단했을 때 안내 문구만 보고 스스로 해결할 수 있다 | UX-03, FR-04 | 사용자 수행 | `05-qa/uat.md` | 미수행 |
| UAT-04 | 메신저(카카오톡 등) 인앱 브라우저에서 링크를 열었을 때 동작 또는 안내가 적절하다 | NFR-05 | 사용자 수행 | `05-qa/uat.md` | 미수행 |
| UAT-05 | 실제 네트워크(Wi-Fi/LTE 전환, 엘리베이터 등)에서 끊겼다 복구될 때 자리가 유지되고 안내가 이해된다 | FR-20, FR-19, NFR-03 | 사용자 수행 | `05-qa/uat.md` | 미수행 |
| UAT-06 | 6명이 실제 기기·네트워크로 20분 통화했을 때 품질(끊김, 소리, 발열)이 받아들일 만하다 | FR-07, NFR-13, NFR-04 | 사용자 수행 | `05-qa/uat.md` | 미수행 |
| UAT-07 | 스크린리더(VoiceOver/TalkBack)로 입장부터 나가기까지 조작할 수 있다 | NFR-09, UX-10 | 사용자 수행 | `05-qa/uat.md` | 미수행 |
| MC-01 | 코드 품질 게이트: lint, 타입 검사(strict)가 CI와 같은 명령으로 통과한다 | NFR-11, NFR-08 | 수동/명령 | `05-qa/manual-checks.md` | 수행 기록 참조 |
| MC-02 | 의존성 취약점 점검과 lockfile 사용(`npm ci`) | SEC-11 | 수동/명령 | `05-qa/manual-checks.md` | 수행 기록 참조 |
| MC-03 | 운영 빌드 번들이 운영 의존성만 설치한 환경에서 기동하고 HEAD/GET, 정상 종료, 환경변수 누락 시 기동 실패를 만족한다 | NFR-07, NFR-08 | 수동/명령 | `05-qa/manual-checks.md` | 수행 기록 참조 |
| MC-04 | 부하 스모크: 100방×6명(600소켓) 신호 3.9만 건 | NFR-04, NFR-07 | 수동/명령 | `05-qa/manual-checks.md` | 수행 기록 참조 |
| MC-05 | 시크릿 스캔: 저장소에 비밀값·토큰이 커밋되지 않았다 | SEC-10 | 수동/명령 | `05-qa/manual-checks.md` | 수행 기록 참조 |
<!-- END GENERATED -->
