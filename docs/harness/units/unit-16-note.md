# unit-16 구현 노트 — 운영자 방 폐쇄 (POL-19, DEC-009)

- 속도 트랙: **L4**(권한·보안 기능). 실행: 웨이브 W2 단독(동시 실행 단위 없음).
- 구현 방식은 트랙과 무관(게이트 1·2 적용). 06단계는 L4 절차(보안 인수 조건 전수)를 따른다.

## 구현 범위
서버
- `apps/server/src/http/admin.ts`(신규): `127.0.0.1`에만 바인딩하는 별도 `http` 리스너. `POST /admin/rooms/:roomId/close`만 처리.
  - 토큰: `Authorization: Bearer <ADMIN_TOKEN>`, 양쪽 SHA-256 후 `timingSafeEqual`(길이도 새지 않음). 없음·틀림·형식 오류는 모두 `401 {"code":"FORBIDDEN"}` 동일 본문.
  - 요청 속도 제한: 전체 하나의 토큰 버킷(용량 20, 초당 1) → 초과 시 `429 RATE_LIMITED`(인증 비교 전에 적용).
  - 본문 1KiB 초과 → 413 후 연결 파괴. 헤더 4KiB 초과·깨진 HTTP는 Node가 400으로 거절(`clientError` 처리). `requestTimeout 5s`, `maxConnections 16`. CORS 헤더 없음, `Cache-Control: no-store`.
  - 응답: 200 `{closed:true,participants:n}`, 404 `ROOM_NOT_FOUND`, 400 `INVALID_PAYLOAD`(roomId 형식), 404 `NOT_FOUND`(다른 경로), 405(다른 메서드, 인증 통과 후), 500 `INTERNAL`(핸들러 예외에도 서버 유지). 오류 본문에 내부 정보 없음.
  - 로그: 성공 `info 'operator action' {action:'close', room:앞6자, size}`, 인증 실패 `warn {action:'auth-failed'}`. 토큰·전체 방 ID·IP 없음.
- `apps/server/src/server.ts`: `ADMIN_PORT`·`ADMIN_TOKEN`이 모두 있을 때만 리스너 시작(config가 한쪽만 있으면 이미 시작 실패시킴). `RunningServer.adminPort` 추가, `close()`가 admin도 정리. admin 리스닝 실패 시 공개 리스너를 닫고 예외 전파.
- `apps/server/src/rooms/RoomManager.ts`: `closeByOperator(roomId)` + `RoomEvent 'closedByOperator'{roomId, participantIds}`. 타이머 정리 후 방 삭제, 이벤트 1회.
- `apps/server/src/socket/server.ts`: 해당 이벤트에서 방 채널에 `room:closed {v:1}` 전송 → 참가자 소켓 unbind·`disconnect(true)` → 남은 채널 소켓 `disconnectSockets(true)`.

웹
- `MeetingController`: `EndReason`에 `'operator'`, `room:closed` 수신 시 `end('operator')`(leaving=true, 소켓 close라 뒤따르는 disconnect가 재연결·resume을 시작하지 않음. unit-17 복귀 경로는 `status==='ended'`/`signaling` 가드로 영향 없음 확인).
- `RoomPage.tsx`: `gone` 사유 `operator` 화면. 제목/본문은 기존 `S.state.gone.operatorTitle/operator`, 버튼 [새 회의 만들기](`data-testid=operator-closed`), [문의·신고](`/contact`, 같은 탭, `operator-closed-contact`, 기존 `S.legalLinks.contact`). 사유·시각·신원 표시 없음. strings.ts 변경 없음.

문서·설정: `docs/06-ops/runbook.md` §6(실제 실행 확인한 `curl` 절차), `.env.example` 보강, `docs/05-qa/test-cases.md`·`docs/traceability.md`는 `check-docs.mjs --gen`으로 재생성(수기 편집 없음).

## 설계서 대비 편차
1. 03 EVT-34는 `{v:1, reason:'operator'}`이나 unit-0의 shared 타입은 `room:closed: {v:1}`(reason 없음)이고 지시도 `{v:1}`. reason은 값이 하나뿐이라 shared 타입을 바꾸지 않았다(범위 밖). 03/api-spec 문구 정정 필요(아래 요청).
2. 03은 응답에 401만 정의했으나 429·413·404 `NOT_FOUND`·405·500을 추가(지시의 rate limit·본문 제한 반영).
3. 로그 필드는 03의 `room(앞6자)`을 따랐다(지시의 "방 ID를 로그에 남기지 않음"을 전체 ID로 해석). 앞 6자도 금지라면 알려 달라(1줄 수정).
4. 끊김 유예 중인 참가자는 소켓이 없어 `room:closed`를 못 받는다 → 복귀 시 `ROOM_NOT_FOUND`로 '서비스 재시작' 안내(runbook에 명시). 별도 처리는 과설계로 판단.

## 수동 확인이 필요한 부분(미검증)
- 실제 배포 환경(docker, 리버스 프록시)에서 ADMIN_PORT가 외부에 게시되지 않는지(미실행).
- 응답 시간 차이 없음은 구현(고정 길이 해시 + timingSafeEqual)으로 보장하며 타이밍 측정 시험은 만들지 않았다(불안정).
- Firefox/Safari에서의 종료 화면(E2E는 Chromium만).
- TC-371의 127.0.0.2 대조는 리눅스에서만 실행(다른 OS는 건너뜀).

## 인수 조건(06 테스터용)
1. 토큰 없음/빈 값/틀림/길이 다름(±1자, 3000자)/Basic 스킴/스킴 없음 → 모두 401 `{"code":"FORBIDDEN"}`, 방 유지. 올바른 토큰 → 200 `{closed:true,participants:n}`. (TC-370)
2. admin 포트: `127.0.0.1` 접속 가능, `127.0.0.2` 접속 불가(공개 포트는 127.0.0.2 접속 가능 = 대조군). (TC-371)
3. `ADMIN_*` 없음 → `adminPort` 없음, 한쪽만 → 설정 오류, 공개 포트로 `/admin/...` 호출해도 방이 닫히지 않음. (TC-372)
4. roomId 형식 오류 400, 없는 경로 404, GET 405, 없는 방 404, 1MB 본문 거절(413/연결종료), 20KB 헤더 거절, 깨진 HTTP 후에도 서버 정상(이후 닫기 성공). (TC-373)
5. 실패 요청 40회 → 429 발생, 401/429 외 상태 없음, 응답에 스택·경로·토큰 문자열 없음. (TC-374)
6. 로그에 `operator action`, 방 ID 앞 6자만, 전체 방 ID·토큰(맞는/틀린)·IP 없음. (TC-375)
7. 3명 방 폐쇄 → 3명 모두 `room:closed {v:1}` 수신 후 소켓 끊김, 방 삭제, 상태 API `exists:false`, 기존 토큰 `room:resume` → ROOM_NOT_FOUND, 재입장 → ROOM_NOT_FOUND, 재호출 404, 다른 방의 소켓·채팅·인원은 그대로. (TC-376)
8. 입장 전 빈 방(participants 0)·끊김 유예 중 참가자 포함 방도 닫히고 유예 만료 후 오류·잔여 방 없음. (TC-377)
9. `RoomManager.closeByOperator` 단위: 이벤트 1회·참가자 ID 순서, 없는 방은 이벤트 없이 실패. (TC-378)
10. E2E: 두 브라우저가 "운영자가 이 회의를 종료했습니다"를 보고 4초 뒤에도 재연결 배지·방 재생성 없음, 시각/사유 표시 없음, 같은 링크 재방문은 "회의를 찾을 수 없습니다", [문의·신고]가 `/contact`로 이동(IT-41). 360px에서 버튼 44px 이상, 가로 스크롤 없음, Tab 첫 포커스가 [새 회의 만들기], Enter로 랜딩 이동(IT-42).

## 게이트 1 — 정적 분석/린트
`npm run lint` 통과, `npm run typecheck`(server·web) 통과, `npm test` 통과(server 134 통과·4 skip(기존), web 53, shared 16), `npm run test:e2e` 63 통과·1 skip(기존), `npm run check:docs` 통과.

## 게이트 2 — 자체 코드 리뷰
- [x] 설계서/디자인서와 일치(편차는 위 1~4에 기록)
- [x] 에러 처리: 핸들러 try/catch→500, `clientError`, 리스닝 실패 시 정리·전파, 예외 삼킴 없음
- [x] 시스템 경계 검증: 토큰, 경로의 roomId(`RoomIdSchema`), 본문·헤더 크기, 메서드
- [x] 하드코딩 시크릿 없음(테스트 토큰은 시험 전용 값, `.env.example`은 주석 예시)
- [x] 새 의존성 없음(`package.json`/lockfile 변경 없음)
- [x] 범위 밖 변경 없음(`strings.ts`·shared·ci.yml 미변경)

## 병렬 여부
단독 실행(W2). 실제 CLI 확인: 빌드한 서버에 `curl`로 401 → 200 → 404, 상태 API `exists:false`, 로그 확인(runbook에 반영).

## 공유 문서 갱신 요청
- traceability.md: POL-19 → 작업 단위 `unit-16`(신고 채널은 unit-15), 구현 상태 `구현됨(06단계 검증 대기)`; EVT-34·EVT-35 → unit-16. (TC/IT 열은 `--gen`이 이미 TC-370~378, IT-41·42로 갱신)
- 문서 정정(통합 단계): 03 §4.2 EVT-34와 api-spec의 `room:closed`를 `{v:1}`(reason 없음)으로 정정. EVT-35 응답에 429·413 추가.
- decisions.md 기록 요청(DEC-020 후보): admin 리스너는 단일 전역 버킷(20, 초당 1)으로 속도 제한, 로그에는 방 ID 앞 6자만. 편차 3(앞 6자 허용 여부)은 사용자 확인 필요.
- 변경 파일: `apps/server/src/{http/admin.ts(신규),server.ts,rooms/RoomManager.ts,socket/server.ts}`, `apps/server/test/adminClose.test.ts`(신규), `apps/web/src/{state/MeetingController.ts,pages/RoomPage.tsx}`, `e2e/operatorClose.spec.ts`(신규), `docs/06-ops/runbook.md`, `.env.example`, `docs/05-qa/test-cases.md`, `docs/traceability.md`(생성물).
