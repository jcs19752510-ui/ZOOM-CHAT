# MeetLite (가칭)

설치 없이 **링크 하나로 입장하는 웹 화상회의**. 방당 최대 6명, 1인 운영·저비용을 목표로 만든 소규모 회의 도구입니다. 회원가입이 없고 영상·채팅을 서버에 저장하지 않습니다.

> 상태: **첫 구현 완료, 미배포.** 배포 대상은 사용자가 정합니다(`docs/03-engineering/infra-deploy.md`). 미검증 항목은 `docs/05-qa/release-checklist.md`를 보세요.

## 기능
방 만들기·링크 입장·대기실 · 그룹 영상/음성(WebRTC mesh) · 마이크·카메라 토글·장치 변경·발언자 강조 · 채팅 · 화면공유(PC) · 참가자 목록 · 호스트 기능(방 잠금, 강제 퇴장, 전체 음소거, 승계) · 자동 재연결 · 비밀번호 방

## 빠른 시작 (로컬)
```bash
node -v                        # 22 이상
npm ci
cp .env.example .env           # SESSION_SECRET 등 확인
npm run dev                    # 서버 http://localhost:3001 + 웹 http://localhost:5173
```
브라우저에서 `http://localhost:5173`을 열면 됩니다(localhost는 카메라 사용이 허용됩니다). 다른 기기에서 접속하려면 HTTPS가 필요합니다.

## 테스트
```bash
npm run lint && npm run typecheck
npm test                       # 단위·보안 테스트
npm run test:e2e               # Playwright E2E(Chromium 가짜 카메라·마이크)
npm run check:docs             # 문서 정합성·요구–테스트 추적성
```

## TURN(coturn) 설정
같은 네트워크가 아니거나 방화벽이 있으면 직접 연결이 실패할 수 있어 TURN 서버가 필요합니다.
1. `.env`에 `TURN_URLS=turn:<서버>:3478`, `TURN_SECRET=<긴 난수>`를 설정하고,
2. 같은 비밀값으로 coturn 실행: `TURN_SECRET=<같은 값> docker compose -f infra/docker-compose.yml up -d` (설정: `infra/coturn/turnserver.conf`),
3. 방화벽에서 3478(UDP/TCP), 5349(TLS), 49160–49200(UDP)을 엽니다.
서버가 1시간짜리 임시 자격증명을 발급하므로 고정 비밀번호가 브라우저에 노출되지 않습니다.

## 배포 개요
`Dockerfile` 하나로 API+소켓+웹을 함께 제공합니다. HTTPS(리버스 프록시)가 필수이며 `ALLOWED_ORIGINS`에 실제 주소를 넣습니다. 절차와 장애 대응은 `docs/06-ops/runbook.md`, 후보 비교는 `docs/03-engineering/infra-deploy.md`.

## 구조
`packages/shared`(메시지·스키마) · `apps/server`(Express+Socket.IO) · `apps/web`(React+Vite+Tailwind) · `e2e` · `infra` · `docs`

## 문서
`docs/README.md`가 인덱스입니다. 핵심: 요구 `docs/01-planning/prd.md` · 시그널링 명세 `docs/03-engineering/api-spec.md` · 보안 `docs/04-security/security.md` · 사용법 `docs/06-ops/user-guide.md`.

## 보안·한계
- 방 ID는 128비트 난수이며 링크를 아는 사람이 입장할 수 있습니다(비밀번호·잠금으로 보완). 보안 점검표와 남은 위험은 `docs/04-security/`.
- 서버 재시작 시 모든 방이 사라집니다(메모리 상태, 서버 1대 전제).
- mesh 방식은 6명 이하에 적합합니다. 더 큰 회의는 SFU 전환이 필요합니다(`docs/03-engineering/trd.md` §7).
- 취약점 신고: `SECURITY.md`.

## 라이선스
미정(운영자가 정합니다). 의존성 라이선스 요약은 `docs/03-engineering/dev-guide.md`.
