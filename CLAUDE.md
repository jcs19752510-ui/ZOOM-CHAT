# MeetLite (가칭) — 프로젝트 규칙

설치 없이 브라우저 링크로 입장하는 소규모 화상회의 앱. 1인 운영, 저비용, 유지보수 용이성이 최우선.
UI 문구는 한국어 기본. 코드/주석/커밋은 영어 또는 한국어 중 하나로 일관되게(기본: 코드·식별자 영어, 주석·문서 한국어).

## 개발 하네스 (HANESS_AUTO 13단계 파이프라인)
이 저장소는 HANESS_AUTO(`jcs19752510-ui/HANESS_AUTO`, PROD 브랜치)의 하네스를 그대로 복사해 사용한다.
작업 시작 전 **[ORCHESTRATOR.md](ORCHESTRATOR.md)를 반드시 먼저 읽는다.** 전역 규칙 A~K, 13단계 정의, 병렬 모드가 모두 거기 있다.
- 단계별 서브에이전트: `.claude/agents/01-trend-analyst.md` ~ `13-post-deploy-verifier.md`
- 공통 양식: `templates/`, 자동화 예시: `automation/`, 원본 가이드: `docs/harness/` (HANESS-README.md, USAGE-GUIDE.md)
- 하네스 산출물(decisions.md, traceability.md 등)은 `docs/harness/`에 쌓는다. 임시 아티팩트는 `.harness-tmp/`만 사용한다(규칙 K, `.gitignore` 처리됨).
- 규칙 A(모르면 질문), 규칙 E(배포는 사용자 승인 없이 금지), 규칙 K(중단-안전 정리)는 어떤 경우에도 우회하지 않는다.
- 프로젝트 시작 시 1회 질문 3종(MCP 연동, 위험도 Tier, 병렬 모드 P0~P2)을 1단계 호출 전에 사용자에게 묻고 `docs/harness/decisions.md`에 기록한다. **아직 답변 전이다.**
- **충돌 시 우선순위**: 사용자의 직접 지시 > 아래 "작업 방식"(Phase 승인 게이트) > ORCHESTRATOR.md. 하네스의 단계 간 셀프 체이닝은 한 Phase 안에서만 적용하고, **Phase가 끝나면 반드시 멈춰 승인을 받는다.**
- 13단계와 Phase 0~5의 대응표는 사용자 확인 후 `docs/plan.md`에 기록한다(미확정).

## 의사결정 우선순위
충돌 시 **보안 > 정확성 > 단순함 > 편의**. 결정마다 기획/개발/디자인/아키텍처/보안 5관점을 짧게 점검한다.

## 작업 방식 (반드시 준수)
1. 한 번에 **한 Phase만** 진행한다. Phase가 끝나면 (a) 완료 기준 검증 결과 (b) 변경 파일 목록 (c) 남은 위험을 보고하고 **멈춘 뒤 승인**을 기다린다. 자동으로 다음 Phase로 넘어가지 않는다.
2. Phase 안에서도 작은 단위로 커밋한다.
3. 요구가 모호하면 추측 구현 금지. 질문은 최대 3개로 묶는다.
4. **직접 실행·테스트로 확인한 것만 "완료"**로 보고한다. 확인 못 한 것은 "미검증"으로 표시한다.
5. 범위를 벗어난 리팩터링·기능 추가는 하지 말고 **제안만** 한다.
6. 기술 스택 변경은 먼저 이유를 제시하고 승인받는다.

## 비목표 (하지 말 것)
서버 녹화, 회원가입/로그인, 결제, 네이티브 앱, 가상 배경, 요청 없는 기능, 과한 추상화.

## 기술 스택
- Node.js LTS + TypeScript(`strict`), npm workspaces: `apps/server`, `apps/web`, `packages/shared`
- 서버: Express + Socket.IO + zod + helmet
- 웹: React + Vite + Tailwind CSS
- 미디어: WebRTC mesh. 반드시 `MediaTransport` 인터페이스 뒤에 둔다(추후 SFU 교체용, 지금 SFU 구현 금지)
- NAT 통과: STUN + TURN(coturn, 개발용 docker compose)
- 테스트: Vitest(단위), Playwright(E2E, Chromium fake media 플래그)

## 폴더 구조
```
apps/server/      Express + Socket.IO (시그널링, 방 상태, TURN 자격증명 발급)
apps/web/         React + Vite UI, MediaTransport 구현(MeshTransport)
packages/shared/  메시지 타입 + zod 스키마 (서버/웹 단일 출처)
docs/             plan.md, security.md
infra/            docker-compose.yml, coturn 설정
```
자세한 내용은 `docs/plan.md`, 위협 모델은 `docs/security.md`.

## 명령어 (Phase 0에서 구성)
- `npm run lint` / `npm run typecheck` / `npm test` — 루트에서 전 워크스페이스 실행
- `npm run dev` — 서버+웹 동시 실행
- `npm audit` — Phase 5 및 의존성 변경 시

## 보안 규칙 (위반 시 완료 불인정)
- 방 ID: `crypto.randomBytes(16)` 이상(128비트) → base64url. `Math.random` 금지.
- 시그널링의 **발신자 ID는 서버가 부여한 `socket.id`/참가자 ID만 신뢰**. 클라이언트가 보낸 `from` 등은 무시/제거. 같은 방 참가자에게만 릴레이.
- **모든 소켓 이벤트**: zod 검증 + 페이로드 크기 제한 + 이벤트별 rate limit. 검증 실패는 무시하지 말고 에러 ack 반환.
- 닉네임: 길이 1~20, 허용 문자 제한(한글/영문/숫자/공백/`_-.`), 제어문자·유니코드 방향 제어문자 금지.
- 채팅: 최대 500자, **텍스트로만 렌더링**. `dangerouslySetInnerHTML` 금지. 자동 링크는 `rel="noopener noreferrer"` + `target="_blank"`, `http(s)`만 허용.
- Origin 허용 목록(CORS + Socket.IO 모두). helmet + CSP. HTTPS 전제(localhost 예외).
- TURN 자격증명: 서버가 HMAC 단기(기본 1시간) 임시값 발급. **고정 비밀번호를 클라이언트에 넣지 않는다.**
- 비밀값은 `.env`로만. `.env.example` 제공, `.env`는 커밋 금지(`.gitignore`).
- **호스트 권한은 서버에서 검증**. UI 숨김은 보조일 뿐.
- 로그에 개인정보(닉네임 포함 최소화), SDP, ICE, 토큰, 방 비밀번호를 남기지 않는다.
- 방 비밀번호는 평문 저장 금지(메모리에서도 해시: scrypt/argon2 계열, 비교는 `timingSafeEqual`).

## 코딩 규칙
- TypeScript `strict`, `any` 금지(불가피하면 사유 주석). 비-null 단언 `!` 최소화.
- 공유 타입/스키마는 `packages/shared`에서만 정의하고 서버·웹이 import. 중복 정의 금지.
- 서버 방 상태는 인메모리(`Map`). 영속 저장소 도입 금지(비목표). 서버 재시작 시 방은 사라지는 것이 설계.
- 함수는 작게, 이름은 의도를 드러내게. 주변 코드의 주석 밀도·명명·관용구를 따른다.
- 설정값(정원, 레이트리밋, TURN TTL 등)은 `.env` + 서버 `config.ts` 한 곳에서 zod로 파싱.
- 디자인 토큰(색/간격/폰트)은 `apps/web/src/design/tokens.ts`(+ Tailwind 설정) **한 곳**에서만 정의. 하드코딩 색상 금지.
- 사용자 오류 문구는 **원인 + 해결 방법**을 함께 제시.
- 접근성: 아이콘 버튼 `aria-label`, 키보드 조작, 대비 WCAG AA.

## 테스트 규칙
- 서버 로직(방/권한/검증/rate limit)은 Vitest 단위 테스트 필수. 사칭·잘못된 페이로드·정원 초과·권한 없음 케이스 포함.
- E2E는 Playwright + `--use-fake-device-for-media-stream --use-fake-ui-for-media-stream`.
- 버그 수정 시 재현 테스트를 먼저 추가한다.

## 커밋 규칙
- 한 커밋 = 한 의도. 메시지는 `type(scope): 요약` (feat/fix/docs/test/chore/refactor).
- 비밀값·`.env`·빌드 산출물·`node_modules` 커밋 금지.
- 개발 브랜치: `ccr-8ebb59a5-vgloup` (다른 브랜치로 푸시 금지). PR은 요청 시에만 생성.

## 현재 진행 상태
- Phase 0: 문서 3개 작성 완료, **승인 대기 중** (코드 미작성)
- 하네스: HANESS_AUTO PROD 브랜치 복사 완료(31개 파일). 시작 질문 3종 답변 대기
