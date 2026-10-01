# unit-0 공통 선행 구현 노트

속도 트랙: **L3**. 병렬 웨이브 W0 재시작, 동시 실행 단위: unit-18(infra·coturn·ci·server/test 신규), unit-20(문서). 이 단위는 두 단위의 파일을 건드리지 않았다.

## 구현 범위
- shared: `MetaResponse`, `ClientToServerEvents['metrics:path']`, `ServerToClientEvents['room:closed']`(`{v:1}`), `MetricsPathRequestSchema`(strict, `path: direct|relay`) 추가. `schemas.test.ts`에 TC-302.
- server `config.ts`/`.env.example`: `OPERATOR_CONTACT`(이메일 또는 https URL, 200자 이하), `PRIVACY_OFFICER`(100자 이하), `LEGAL_EFFECTIVE_DATE`(존재하는 YYYY-MM-DD), `ADMIN_PORT`(1~65535, `PORT`와 다름), `ADMIN_TOKEN`(32자 이상). 전부 선택, 빈 문자열은 "없음"(undefined). ADMIN 둘은 함께만 허용. 운영 모드에서 `ADMIN_TOKEN`의 `change-me` 접두도 거부(기존 규칙 확장). 미설정 시 `undefined`이며 `/api/meta`의 `null`·화면 "미정" 표시는 unit-15.
- `config.test.ts`에 TC-301(5개 케이스).
- web `strings.ts`: 04 §3.5 확정본 키 전부 — `legalLinks`(aria는 함수), `inApp`(steps 배열), `autoplay`, `background`(`mediaLost(kind)` 함수), `state.gone.operatorTitle/operator`, `legal`의 UI 크롬(`home, navLabel, tocLabel, draftRibbon, labels.*, meta.*`). 문서 제목·본문·status는 unit-15 몫.
- 컴포넌트: `LegalFooter.tsx`(링크 3개 `/privacy` `/terms` `/contact`, `_blank` + `rel="noopener noreferrer"`, aria "이름 (새 탭에서 열림)", testid `legal-footer`, `legal-link-*`), `InAppNotice.tsx`(null 스텁, props 계약 04 §4.2), `PageShell.tsx`(신규).
- `Landing.tsx`, `Lobby.tsx`: 루트를 `PageShell`로 감싸고 `main`의 `min-h-full`을 `w-full flex-1`로 변경(푸터로 인한 새 세로 스크롤 방지).

## 설계 대비 편차
- **DEC-015(앱 루트 래퍼 1곳)와 다름 — PageShell 채택**: 푸터는 랜딩·대기실에만 있고 회의실에는 없어야 하는데, 대기실/회의실 구분(phase)은 `RoomPage` 내부 상태라 `App.tsx` 루트 래퍼는 알 수 없다. `RoomPage.tsx`는 unit-17 범위라 건드리지 않았다. 대신 푸터 마크업과 레이아웃은 `PageShell` 한 곳에 두고 Landing·Lobby가 각각 이를 한 번 쓴다(원 03의 "각 1줄 마운트"에 F-7의 래퍼 변경을 합친 형태). `App.tsx` 변경 없음. 오케스트레이터 확인 필요(결정 기록 요청 아래).
- `S.legal`은 UI 크롬만 채웠다. `status`, `privacy/terms/contact`(title·sections)는 unit-15가 같은 블록에 추가한다.

## 게이트 1
- `npm run lint`: 오류 0. 경고 2건은 unit-18 신규 파일 `apps/server/test/turnProbe.ts`(non-null assertion) — 자기 범위 밖.
- `npm run typecheck`: web·shared 통과. server는 `test/turnProbe.ts(153)` 타입 오류 1건(unit-18 미완성 파일) — **내 변경 파일 기준 오류 0**, 판정을 통과로 바꾸지 않고 분리 보고.
- `npm test`: shared 15, server 96(4 skipped는 기존/타 단위의 조건부), web 14 모두 통과.
- `npm run test:e2e`: 30 passed, 1 skipped, 실패 0.

## 게이트 2
- [x] 설계서/UX 명세 일치(편차 위 기재)
- [x] 에러 처리: config 오류는 기존 ConfigError 경로로 시작 실패, 삼키는 코드 없음
- [x] 입력 검증: 환경변수 zod, `metrics:path` strict 스키마
- [x] 하드코딩 시크릿 없음(`.env.example` 예시값은 운영 거부)
- [x] 새 의존성 없음, package.json·lockfile 미변경
- [x] 범위 외 변경 없음(Prettier 재포맷 시도는 되돌림)

## 수동 확인 필요
- 1280×800 랜딩·대기실에서 새 세로 스크롤이 없는지, 360px에서 푸터 링크 한 줄 표시(자동 TC 없음, 미검증).
- `/privacy` 등은 unit-15 전까지 랜딩으로 폴백(04 F-8; 웨이브 사이 배포 금지).

## 인수 조건(6단계용)
1. 환경변수 없이도 기동 가능(`OPERATOR_CONTACT` 등 모두 없음 → undefined). 빈 문자열도 동일.
2. `OPERATOR_CONTACT=http://x`, `javascript:...`, 공백 포함, 201자 이상 → 시작 실패(메시지에 변수명). 이메일·https URL → 통과.
3. `LEGAL_EFFECTIVE_DATE=2026-02-30` 또는 형식 오류 → 실패, `2026-10-01` 통과. `PRIVACY_OFFICER` 101자 → 실패.
4. `ADMIN_PORT`만 또는 `ADMIN_TOKEN`만 → 실패. 둘 다 + `ADMIN_PORT===PORT` → 실패. 토큰 31자 → 실패. 포트 0·70000 → 실패.
5. `NODE_ENV=production` + `ADMIN_TOKEN=change-me...` → "예시 비밀값" 실패. 개발 모드는 허용.
6. `{v:1,path:'relay'|'direct'}`만 통과, 다른 값·추가 키(`peerId`)·`v:2` 거부.
7. 랜딩과 대기실 맨 아래에 `legal-footer`가 보이고 링크 3개가 순서대로(처리방침·이용약관·문의·신고) Tab 도달, 각 링크 `target=_blank`·`rel` 포함 `noopener noreferrer`, 접근 가능한 이름이 "… (새 탭에서 열림)". 회의실(live)에는 푸터 없음. InAppNotice는 아무것도 렌더링하지 않는다.
8. `S`의 키 목록이 04 §3.5와 일치(함수 `legalLinks.aria`, `background.mediaLost` 3종). 기존 TC-213(문구는 strings.ts에만) 통과 유지.
9. 기존 E2E 전부 통과.

## 공유 문서 갱신 요청
- decisions.md: 신규 DEC — "F-7/DEC-015 푸터는 `App.tsx` 루트가 아니라 `PageShell.tsx`(Landing·Lobby가 사용)에 둠. 사유: phase를 아는 `RoomPage`(unit-17 파일)를 건드리지 않고 회의실 제외를 보장". 영향 낮음.
- traceability.md: unit-0은 직접 커버 REQ 없음. 선행 전제로 POL-17·19·20, SEC-13, UX-13~15, NFR-15 행의 "작업 단위"에 unit-0 기반 준비 완료(구현 상태는 해당 단위 완료 시 갱신).
- 오케스트레이터 참고: `apps/server/test/turnProbe.ts(153)` 타입 오류가 unit-18 완료 전까지 `npm run typecheck`를 실패시킨다.
