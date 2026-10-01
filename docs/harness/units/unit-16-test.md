# 테스트 결과서 — unit-16 운영자 방 폐쇄 (POL-19, DEC-009·DEC-020)

> 이 문서의 용도 — 누가: 오케스트레이터·5단계 개발자·7단계 통합 테스터 / 언제: unit-16 6단계 판정 직후 / 무엇을: 인수 조건 검증 결과, 적대·변이 시험 결과, 결함과 재작업 범위를 결정한다.

## 1. 개요
- 테스트 대상: unit-16(모듈) — `apps/server/src/http/admin.ts`, `server.ts`(admin 조립·종료), `rooms/RoomManager.ts#closeByOperator`, `socket/server.ts`(`room:closed`·소켓 정리), 웹 `MeetingController`·`RoomPage`(운영자 종료 화면), `docs/06-ops/runbook.md` §6. 코드는 커밋 `12d468f`(PROD)
- 테스트 유형: 단위 (+ 이 단위의 적대·변이·E2E 보강)
- 적용 Tier: Standard (DEC-002)
- 적용 속도 트랙: L4(권한 기능, 보안 인수 조건 전수). 07단계로 handoff
- 병렬 실행 정보: 단독 실행(웨이브 W2, 동시 단위 없음)
- 테스트 목적: 인수 조건 10개를 실제 실행으로 확인하고, 토큰 우회·경로·HTTP 수준·속도 제한·경합·로그·접근성·자원 정리를 적대적으로 시험하며, 기존 시험이 변이를 잡는지 확인한다.
- 관련 산출물: `docs/harness/units/unit-16-note.md`, `docs/harness/03-system-design.md`(unit-16, §6.3), `docs/harness/04-ux-design.md`(SCR-19 변형), `docs/harness/decisions.md`(DEC-009·020), `docs/06-ops/runbook.md` §6, `CLAUDE.md` 보안 규칙
- 테스트 수행자(에이전트): 06-unit-tester (Claude Sonnet 5.5)
- 테스트 일시: 2026-10-01

## 2. 테스트 범위 및 제외 범위
- 범위(In-Scope): note 인수 조건 1~10 전수, 적대 시험(헤더·경로·HTTP 수준·slowloris·속도 제한·시작 실패·경합·위조 `room:closed`·로그·타이머·종료), 변이 시험 30종(서버), 로그 캡처, runbook §6 명령 실행, 종료 화면 접근성(360/1280px)·자원 정리(트랙 중지·재연결 없음)
- 제외 범위: 실제 배포(docker/리버스 프록시)에서 ADMIN_PORT 비게시 확인(미실행, 이미지 구성은 아래 DEF-004 근거로만 확인), Firefox/Safari 종료 화면(E2E는 Chromium만), 응답 시간 측정 기반 타이밍 공격 시험(불안정 — 대신 `timingSafeEqual` 호출 형태를 관찰하는 TC-390), 웹 변이 시험(서버 중심, 아래 8절), 처리방침/연락처 문안의 법적 적합성

## 3. 테스트 환경
- 실행 환경: Linux 6.18(샌드박스), Node v22.22.0, Vitest 5.0.3, Playwright 1.63(Chromium fake media), Docker 29.6.2(`node:22-alpine` 단발 실행만)
- 테스트 데이터: 시험 전용 토큰(`admin-token-admin-token-admin-token-ZZ` 등, 실제 비밀 아님), 가짜 시계(요청마다 +1.5초; 속도 제한 시험은 실제 시계)
- 전제 조건: `npm ci` 완료, `npm run build` 통과(서버·웹). 임시 복사본·서버 프로세스·스크래치는 `.harness-tmp/mut_unit16/`와 세션 스크래치 디렉터리에만 두었다(7절)
- 5단계 게이트 확인(note 확인 + 06단계 독립 재실행): lint 0, typecheck 0(shared·server·web·e2e), `npm test` shared 16 / server 148 통과 5 skip(기존 4 + TC-393 재현용 1) / web 53, `npm run test:e2e` 65 통과·1 skip(기존), `npm run check:docs` 통과. note의 게이트 1·2 체크리스트는 확인됨(편차 4건은 DEC-020 승인 범위)

## 4. 테스트 케이스 및 결과

### 4.1 인수 조건 ↔ 케이스 추적 (1:1 이상)
| AC | 내용(요약) | 기존 TC/IT(5단계) | 6단계 추가 | 판정 |
|---|---|---|---|---|
| 1 | 토큰 없음/빈 값/틀림/길이/Basic/스킴 없음 401 동일 본문, 맞는 토큰 200 | TC-370 | TC-379(헤더 변형 25종), TC-390(해시 비교 호출 형태) | PASS |
| 2 | admin 127.0.0.1만, 127.0.0.2 불가(공개 포트 대조군) | TC-371 | TC-385(공개 포트의 /admin), 변이 M02 | PASS |
| 3 | ADMIN_* 없음→리스너 없음, 한쪽만→설정 오류, 공개 포트 /admin 무효 | TC-372 | TC-385(포트 충돌·빈 값·짧은 토큰·change-me), 변이 M24 | PASS |
| 4 | 형식 400·경로 404·GET 405·없는 방 404·1MB·20KB 헤더·깨진 HTTP 후 정상 | TC-373 | TC-380·381·382·389(경로 변형, 메서드, 밀수, 경계) | PASS (DEF-001·002 별도) |
| 5 | 40회 실패→429, 401/429 외 없음, 내부 정보 없음 | TC-374 | TC-384(맞는 토큰도 한도 적용·소진 시 잠김·복구) | PASS (DEF-003 한계) |
| 6 | 로그: operator action, 방 ID 앞 6자만, 토큰·전체 ID·IP 없음 | TC-375 | TC-388(로그 전체 캡처, 필드 집합 고정) | PASS |
| 7 | 3명 폐쇄→전원 `room:closed {v:1}`·끊김·방 삭제·재입장/resume/재호출 거부·다른 방 무영향 | TC-376 | TC-386(경합), TC-387(위조 릴레이) | PASS |
| 8 | 입장 전 빈 방·끊김 유예 포함 폐쇄, 유예 만료 후 오류·잔여 없음 | TC-377 | TC-391(타이머·이벤트 잔여), IT-44(E2E) | PASS |
| 9 | `closeByOperator` 단위 | TC-378 | 변이 M10·M19 | PASS |
| 10 | E2E 두 브라우저·4초·시각/사유 없음·재방문·/contact·360px 44px·Tab·Enter | IT-41, IT-42 | IT-43(1280px, alert, 트랙 중지, 복귀 이벤트), IT-44 | PASS |

### 4.2 실행 결과(기대 vs 실제)
| ID | 시나리오 | 실행 절차 | 예상 결과 | 실제 결과 | Pass/Fail | 비고 |
|----|----------|-----------|-----------|-----------|-----------|------|
| TC-370 | 기본 인증 8종+Basic+스킴 없음 | `npx vitest run test/adminClose.test.ts` | 전부 401 `{"code":"FORBIDDEN"}`, 맞는 토큰 200 `{closed:true,participants:1}` | 일치(9/9 통과) | Pass | 5단계 시험 재실행 |
| TC-371~378 | 5단계 시험 전부 | 위와 동일 | 인수 조건대로 | 일치(9/9) | Pass | |
| TC-379 | 헤더 변형: 스킴 소문자·대문자·공백 2칸·탭·값만·`Bearer`만·빈 값·Token/Basic·`xBearer`·`Token Bearer T`·쉼표 다중 스킴·잘못된 값이 앞선 중복 헤더·쿼리 토큰 2종·쿠키·X-Authorization·Proxy-Authorization·X-Admin-Token·메서드 오버라이드·유니코드·같은 길이 첫/끝 1자 다름·2배 길이 | raw TCP로 전송 | 모두 401 동일 본문, 방 유지. GET+오버라이드는 405. 헤더 이름 대소문자·값 뒤 공백(OWS)은 정상 200(양성 대조) | 일치 | Pass | 값 앞선 중복 헤더 반대 순서(`맞는 값`이 먼저)는 Node가 첫 값만 보존해 통과(표준 동작, 8절) |
| TC-380 | 경로 변형 24종+원시 3종(`..`·`.`·`%2e%2e`·`%2f`·이중 슬래시·빈 ID·대문자·끝 슬래시·`%zz`·`%`·`%41`·`%00`·`%0d%0a`·`%20`·`<script>`·3000자·추가 세그먼트·절대 URI·세미콜론, 원시 널/공백/개행) | raw 전송 | 200 불가(400/404/파서 거절), 방 유지, 인증 전 없는 경로·`/`도 401(경로 탐색 불가), 이후 정상 200 | 일치 | Pass | 방 ID는 디코드하지 않음(M17이 잡음) |
| TC-381 | 메서드 OPTIONS/HEAD/GET/PUT/DELETE/PATCH/TRACE/CONNECT, CORS, no-store, 큰 청크(2KiB), CL=1GB 무본문, `Expect: 100-continue`, 작은 청크 | raw 전송 | 무토큰 401(CONNECT는 Node가 연결 종료), 토큰 있으면 405, CORS·서버 정보 헤더 없음, 큰 청크 413/종료+방 유지, 100→200, 작은 청크 200 | 일치 | Pass | |
| TC-382 | CL+TE 혼합, TE 변조, CL 중복, 파이프라이닝(토큰 있는 요청 뒤 무토큰 요청), 8KB 요청줄·헤더, 헤더 800개 | raw 전송 | 밀수·인증 승계 없음, 400/431, 방 유지, 이후 정상 | 일치 | Pass | 무토큰 뒤에 토큰 있는 요청을 붙이면 두 번째는 자기 토큰으로 정상 처리됨(정상) |
| TC-383 | slowloris 16 연결(헤더 미완) | 16개 유지→공개 포트·방 확인→17번째 요청→정리 시간 측정 | 공개 포트·방 무영향. 17번째 요청 불가. 정리 시간 | 공개 `/healthz` 200·방 `exists:true`, 17번째 응답 없음(연결 한도), **정리까지 약 30초**(설계 의도 3~5초) | Pass(허용 한도 45초) | **DEF-002** |
| TC-384 | 속도 제한 실제 시계 | 맞는 토큰 25회→소진 직후 맞는 토큰→2.2초 뒤 | 맞는 토큰도 한도 적용, 소진 직후 429 `{"code":"RATE_LIMITED"}`, 보충 후 200, 공개 포트 무관 | 일치 | Pass | 틀린 요청이 소진시키면 운영자도 429(**DEF-003**) |
| TC-385 | ADMIN_PORT 사용 중 시작, 설정 오류들, 공개 포트의 /admin | `startServer` 거부 확인·공개 포트 재바인딩, 4메서드×토큰 유무 | EADDRINUSE로 시작 거부, 공개 포트 풀림, ADMIN=PORT·짧은 토큰·빈 값·change-me 거부, 공개 포트에서 200·`closed:true` 없음 | 일치. 실제 프로세스: 종료 코드 1, 공개 포트 해제 | Pass | 포트 충돌 시 서비스 전체가 시작하지 않음(설계상 fail-closed, 8절) |
| TC-386 | 같은 방 동시 폐쇄 2건+동시 입장 5+퇴장 | `Promise.all` | 200/404 한 쌍, 방·`rooms.size` 0, 폐쇄 전 입장 성공 소켓은 모두 끊김, resume ROOM_NOT_FOUND | 일치 | Pass | 입장 실패 소켓은 연결 유지(기존 동작) |
| TC-387 | 참가자가 `room:closed`·`room:kicked`·`closedByOperator`·`operator:close`·`admin:close` 송신 | 소켓 emit(ack 유무) | 타 참가자 미수신, 방 유지 3명, 채팅 대조 정상 | 일치 | Pass | 서버에 해당 수신 핸들러 없음 |
| TC-388 | 폐쇄 1회의 로그 전체(trace 수준) | pino 스트림 캡처 | 1줄: `{action:"close",room:"9Aygu-",size:2,msg:"operator action"}`+level/time/pid/hostname. 닉네임·토큰·IP·전체 ID 없음 | 일치(아래 4.3) | Pass | |
| TC-389 | 인증이 본문보다 먼저, 본문·헤더 경계 | raw 전송 | 무토큰+2KiB/1MB/선언만 한 본문 → 즉시 401, 1025B 413, 1024B 200, 헤더 3.9KB 통과·4.4KB 거절 | 일치 | Pass | M03·M12 변이를 잡음 |
| TC-390 | 해시 비교 호출 형태 | `node:crypto` 스파이 | 모든 요청(헤더 없음·빈·짧은·긴·3000자·같은 길이·Basic)에서 `timingSafeEqual(32B,32B)` 정확히 1회 | 일치 | Pass | M01(`===`) 변이를 잡음 |
| TC-391 | 폐쇄 후 유예·빈 방 타이머 잔여 | RoomManager 단위(grace 100ms, TTL 150ms) | 400ms 뒤 추가 이벤트 0 | 일치 | Pass | M09 변이를 잡음 |
| TC-392 | 서버 종료 시 admin 포트 해제 | `srv.close()` 후 연결 시도 | admin·공개 모두 거부 | 일치 | Pass | M21 변이를 잡음 |
| TC-393 | closeRoom 예외 시 500·서버 생존 | `REPRO_DEF001=1`로 자식 프로세스 실행 | `RESULT 500`, 프로세스 생존 | **프로세스 크래시(`Error: boom` 미처리 예외, 응답 없음)** | **Fail(결함 재현)** | **DEF-001**. 기본 실행은 skip |
| IT-41·42 | 5단계 E2E | `npx playwright test e2e/operatorClose.spec.ts` | 통과 | 2/2 통과 | Pass | 5단계 시험 재실행 |
| IT-43 | 1280px 종료 화면: alert+h1, 장치 트랙 전부 ended, `room` DOM·video 제거, Tab→[새 회의]→[문의·신고]→Shift+Tab, 포커스 표시, 가로 스크롤 없음, `lang=ko`, visibilitychange/online/focus/pageshow 후 6초 동안 새 WebSocket·getUserMedia 0, 콘솔 오류 0, Enter로 /contact | Playwright | 모두 충족 | 일치(입장 중 live 트랙 ≥2 확인 후 종료 시 전부 ended) | Pass | |
| IT-44 | 끊김 유예 중 게스트 + 폐쇄 + 복귀 | `setOffline`+`disconnectAll`→폐쇄→온라인 | 방 미재생성, 종료 안내 | 게스트 화면: "회의를 찾을 수 없습니다 / 서비스가 재시작되어 회의가 종료되었습니다…" 방 0개 | Pass | 문구가 사실과 다름(편차 4, DEF-006 Low) |

### 4.3 개인정보·로그 실제 캡처(④)
`TC-388` 출력(전부):
```
{"level":30,"time":1790870285791,"pid":5718,"hostname":"vm","action":"close","room":"9Aygu-","size":2,"msg":"operator action"}
```
- 폐쇄 1회가 남긴 로그는 위 1줄뿐(소켓 강제 종료·`room:closed` 전송은 로그 없음). 필드 집합을 `action,hostname,level,msg,pid,room,size,time`으로 고정해 검증한다.
- 인증 실패 1회: `{"level":40,...,"action":"auth-failed","msg":"operator action"}` (실제 서버 `npm start`에서도 확인, 토큰·IP·방 ID 없음). 실제 서버 로그에서 토큰 문자열 0개(grep).
- 방 ID 앞 6자(36비트)는 신고 대응 추적용으로 DEC-020 ③이 수용한 항목이며 사용자 확인 대기 상태(5단계 편차 3).

### 4.4 변이 시험(③) — 임시 복사본 `.harness-tmp/mut_unit16/`에서만 수행, 저장소 파일 수정 없음
기존 5단계 시험(`adminClose.test.ts`)만 vs 6단계 보강 후 전체(TC-379~392, TC-383 포함)를 모두 실행했다.
| 변이 | 5단계 시험만 | 보강 후 | 잡은 시험 |
|---|---|---|---|
| M01 토큰 비교를 `===`로 | **생존** | 사멸 | TC-390 |
| M02 루프백 바인딩을 `0.0.0.0`으로 | 사멸 | 사멸 | TC-371 |
| M03 본문을 다 받은 뒤 인증 | 사멸(TC-373) | 사멸 | TC-373·381·389 |
| M04 속도 제한 제거 | 사멸 | 사멸 | TC-374·384 |
| M05 속도 제한을 인증 뒤로 | 사멸 | 사멸 | TC-374·384 |
| M06 방 존재 확인 누락(없는 방도 200) | 사멸 | 사멸 | TC-373 외 |
| M07a 폐쇄 시 `disconnect` 누락 | 사멸 | 사멸 | TC-376·386 |
| M07b 채널 잔여 소켓 일괄 끊기 누락 | 생존 | **생존(동등 변이)** | 참가자 소켓은 모두 `participantIds`로 이미 끊기며 채널에 남는 비참가자 소켓이 존재할 수 없어 관측 불가한 방어적 코드 |
| M07c `room:closed` 전송 누락 | 사멸 | 사멸 | TC-376·386 |
| M07d `unbind` 누락 | 생존 | **생존(동등 변이)** | 뒤따르는 `disconnect` 핸들러가 같은 정리를 하고 닫힌 방에 `rooms.disconnect`는 무동작 |
| M08a 로그에 Authorization 헤더 | 사멸 | 사멸 | TC-375 |
| M08b 로그에 전체 방 ID | 사멸 | 사멸 | TC-375·388 |
| M08c 로그에 IP | 사멸 | 사멸 | TC-375·388 |
| M09 폐쇄 시 타이머 미정리 | **생존** | 사멸 | TC-391 |
| M10 이벤트 2회 | 사멸 | 사멸 | TC-378 |
| M11 메서드 검사를 인증 앞으로(경로 정보 누설) | **생존** | 사멸 | TC-380·381 |
| M12 본문 한도 1024→4096 | **생존** | 사멸 | TC-381·389 |
| M13 `maxConnections` 제거 | **생존** | 사멸 | TC-383 |
| M14a 정규식 앵커 제거(`xBearer T` 허용) | **생존** | 사멸 | TC-379(변이 후 변종 3개 추가) |
| M14b 스킴 대소문자 무시 | **생존** | 사멸 | TC-379 |
| M15 `no-store` 제거 | **생존** | 사멸 | TC-381 |
| M16 방 ID 형식 검증 제거 | 사멸 | 사멸 | TC-373·380 |
| M17 방 ID 디코드(`%41`) | **생존** | 사멸 | TC-380 |
| M18 401 본문 구분(헤더 없음) | 사멸 | 사멸 | TC-370·379 |
| M19 방 삭제 누락(이벤트만) | 사멸 | 사멸 | 9건 실패 |
| M20 admin 실패 시 공개 리스너 미해제 | **생존** | 사멸 | TC-385 |
| M21 종료 시 admin 미정리 | **생존** | 사멸 | TC-392 |
| M22 에러 본문에 스택 | 사멸 | 사멸 | TC-373 |
| M23 쿼리스트링 토큰 허용 | **생존** | 사멸 | TC-379 |
| M24 공개 리스너에 `/admin` 라우트 마운트 | 사멸(TC-372) | 사멸 | TC-372·385 (첫 시도는 404 폴백 뒤에 등록해 변이가 무효였음 → `app.ts`에서 라우트 앞에 마운트하도록 고쳐 재실행) |
- 5단계 시험만으로는 30종 중 **14종이 생존**(동등 변이 M07b·M07d 2종 포함, 이를 뺀 12종이 시험의 구멍). 보강 후 생존은 동등 변이 M07b·M07d 2종뿐이다.
- 웹 변이는 수행하지 않았다(8절).

## 5. 커버리지
- 지표: 인수 조건 10/10에 1:1 이상 케이스. 신규 시험 TC-379~393(15), IT-43~44(2). 라인 커버리지 도구는 이 저장소에 구성돼 있지 않아 측정하지 않았다(대신 변이 30종 사멸률 28/30, 나머지 2종은 동등 변이로 판정).
- 커버되지 않은 부분과 사유: 실제 docker 배포에서의 비게시 확인, Firefox/Safari, 응답 시간 측정, `admin` 서버의 런타임 `error` 이벤트(두 번째 이후 오류에 대한 리스너 없음 — 외부에서 유발할 방법을 만들지 못함, 8절), 웹 변이

## 6. 결함(Defect) 목록
| ID | 설명 | 재현 절차 | 심각도 | 상태 | 조치 내용 |
|---|---|---|---|---|---|
| DEF-001 | `admin.ts`의 `req.on('end', ...)` 콜백(실제 폐쇄 호출)이 `try/catch` 밖이라, `closeRoom`(→`closeByOperator`→소켓 계층 이벤트 처리)이 예외를 던지면 **처리되지 않은 예외로 프로세스 전체(공개 포트 포함)가 종료**된다. note의 "500 INTERNAL(핸들러 예외에도 서버 유지)"과 다르다. 현재 코드에서 예외를 유발하는 경로는 찾지 못했으므로 잠복 결함 | `cd apps/server && REPRO_DEF001=1 npx vitest run test/adminAdversarial.test.ts -t TC-393` (자식 프로세스에서 `createAdminServer`에 `closeRoom: () => { throw ... }`를 주고 인증된 POST → 응답 없이 `Error: boom` 미처리 예외로 종료) | **Medium** | Open | 5단계 재작업: `'end'` 콜백 본문을 `try/catch`로 감싸 500 `INTERNAL`을 보내고 로그에 `e.name`만 남긴다. 수정 후 TC-393의 skip 조건을 제거해 정식 시험으로 승격 |
| DEF-002 | `headersTimeout: 3000`·`requestTimeout: 5000`이 의도대로 작동하지 않는다. Node가 만료를 `connectionsCheckingInterval`(기본 30초) 주기로만 검사해 헤더를 끝내지 않거나 본문을 보내지 않는 연결(및 연결만 하고 무전송)이 **약 30초** 남는다. `maxConnections=16`이라 이 시간 동안 16개 연결로 admin이 막힌다(공개 포트는 영향 없음) | `TC-383`(약 30초 소요) 또는 실제 서버에 헤더 미완 연결 16개를 열고 17번째 요청 시도 → 응답 없음, 약 29초 뒤 400 후 종료 | Low (루프백 로컬 공격자 전제, 서비스·방 상태 영향 없음, 운영자는 30초 후 재시도) | Open | `http.createServer` 옵션에 `connectionsCheckingInterval: 1000` 추가(1줄). TC-383의 허용 한도(45초)를 8초로 조임 |
| DEF-003 | 속도 제한이 인증 전에 모든 요청에 적용되고 버킷이 전역 1개라, 같은 호스트의 누구든 초당 1회 이상 잘못된 요청을 보내면 **정상 토큰의 운영자도 계속 429**가 되어 방을 닫지 못한다(운영자가 자기 서비스에서 잠김). 토큰이 맞아도 한도가 적용되는 것은 TC-384로 확인 | `TC-384`: 틀린 요청 25회 직후 맞는 토큰 요청 → 429 | Low (루프백·SSH 전제. 공유 호스트·`--network host` 컨테이너에서는 위험 상승) | Open(수용 가능) | 선택지: 실패한 인증만 별도 버킷으로 세고 맞는 토큰 요청은 별도 예약 버킷을 둔다. 수용한다면 runbook §6에 "429가 계속되면 서버 호스트에서 admin 포트 접속 프로세스를 점검"을 추가 |
| DEF-004 | runbook §6의 닫기 명령은 `curl`을 쓰지만 컨테이너 이미지(`node:22-alpine`)에 `curl`이 없다(`docker run node:22-alpine which curl` → 없음, `wget`만 있음). 문서가 말한 `docker exec` 경로는 그대로는 실행되지 않는다. 또 `$ADMIN_TOKEN`을 호스트 셸에서 `docker exec ... "$ADMIN_TOKEN"`으로 확장하면 컨테이너 환경변수가 아니라 호스트 값(대개 비어 있음)이 쓰인다 | 위 `docker run` 명령. 문서의 `curl` 명령을 비-docker 환경에서 실행하면 401→200→404가 문서대로 나옴(확인됨) | Low (문서 오류, 비상 시 절차 지연) | Open | runbook §6에 컨테이너 안에서 실행하는 `docker exec meetlite sh -c 'wget -qO- --header="Authorization: Bearer $ADMIN_TOKEN" --post-data="" http://127.0.0.1:<ADMIN_PORT>/admin/rooms/<방ID>/close'` 형태(작은따옴표로 컨테이너 안에서 확장) 또는 `node -e fetch(...)` 대안을 추가. 비-docker `npm start`는 `.env`를 읽지 않으므로(환경변수 주입 필요) 같은 절에 명시 |
| DEF-005 | 운영(`NODE_ENV=production`)에서 `ADMIN_TOKEN`이 `change-me`로 시작해 거부될 때 오류 메시지가 `SESSION_SECRET: 운영에서는 예시 비밀값(change-me...)`로 **엉뚱한 변수명을 지목**한다(`config.ts`의 refine 경로가 `SESSION_SECRET` 고정) | `NODE_ENV=production ... SESSION_SECRET=<난수> ADMIN_PORT=3812 ADMIN_TOKEN=change-me-admin-token-change-me-admin node apps/server/dist/index.js` → `- SESSION_SECRET: 운영에서는 예시 비밀값...` | Low | Open | 위반한 변수별로 별도 refine(경로 `ADMIN_TOKEN`/`TURN_SECRET`) 또는 메시지에 변수명 포함 |
| DEF-006 | 끊김 유예 중이던 참가자는 `room:closed`를 못 받아 복귀 시 "서비스가 재시작되어 회의가 종료되었습니다"를 본다(IT-44 실측). 운영자가 닫은 것이므로 사실과 다른 문구 | IT-44 | Low (편차 4로 DEC-020이 수용, 사용자에게 보이는 안내가 부정확함을 기록) | Deferred(DEC-020 ④로 수용) | 필요하면 신고 접수 직후 닫는 경우의 영향이 작다는 점을 근거로 유지. 문구 개선은 별도 요청 시 |
- 직접 수정(Fixed)한 오탈자 수준 결함: 없음. 제품 코드(`apps/*/src`, `packages/*/src`)는 수정하지 않았다.
- 결함이 없다고 판단한 영역의 근거: 인증 우회(TC-379 25종·변이 M01·M14a/b·M18·M23), 경로 변형(TC-380 24종+원시 3종·M16·M17), HTTP 밀수·파이프라이닝(TC-382), 로그 누출(TC-388·M08a~c), 공개 포트 노출(TC-372·385·M24), 경합(TC-386), 위조 릴레이(TC-387).

## 7. 테스트 환경 정리(Teardown) 확인 — 규칙 K
- 이번 테스트에서 생성한 임시 아티팩트 목록: `.harness-tmp/mut_unit16/{pristine,run}/`(변이용 서버 소스·시험 복사본, 심볼릭 링크 1개 포함). 세션 스크래치 디렉터리(저장소 밖)의 보조 스크립트·로그. 서버 프로세스: 변이 시험 외 실제 서버 수동 실행 6회(`dist/index.js`, 포트 38xx·39xx 임시 포트), 모두 종료
- 위 아티팩트를 전부 `.harness-tmp/` 하위에서만 생성했는가 (규칙 K 1번): [x] 예 (저장소 안의 임시물은 `.harness-tmp/`뿐, 스크래치는 저장소 밖). `npm run build`가 만든 `apps/*/dist`는 `.gitignore` 대상 빌드 산출물
- 정리(삭제) 완료 여부: 완료 — `.harness-tmp/` 전체(이번에 새로 만든 디렉터리라 자체 삭제), `ps` 확인 결과 `dist/index.js`·vitest·playwright·chrome·tsx 프로세스 없음. 외부 부수 효과: `docker run`으로 `node:22-alpine` 이미지가 로컬 docker에 받아져 있을 수 있음(저장소 밖, 삭제하지 않음)
- 정리 후 `git status` 실행 결과:
```
On branch PROD
Your branch is up to date with 'origin/PROD'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   docs/05-qa/test-cases.md
	modified:   docs/traceability.md

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	apps/server/test/adminAdversarial.test.ts
	apps/server/test/adminTimingSafe.test.ts
	e2e/operatorClose-extra.spec.ts

no changes added to commit (use "git add <file>..." to update what will be committed)
```
  (위 변경은 모두 이 6단계의 의도된 산출물이며, 결과서 작성 직후 `docs/harness/units/unit-16-test.md`·`docs/harness/verify-log_unit-16-test.md`가 추가된다. 임시 아티팩트·잔여물 없음. `docs/05-qa/test-cases.md`·`docs/traceability.md`는 `node scripts/check-docs.mjs --gen`이 만든 생성물)
- 병렬 실행이었다면: 해당 없음(단독 실행)
- 이번 테스트 도중 강제 중단(TaskStop 등)이 있었는가: [x] 없음 (한 번 `pkill` 성격의 `kill $(pgrep -f ...)`가 자기 셸을 종료시킨 명령 오류가 있었으나 임시 서버 프로세스는 이미 정리돼 있었고 이후 `ps`로 재확인함)

## 8. 리스크 및 잔존 이슈
- 이번 테스트로 커버되지 않는 알려진 리스크:
  - 중복 `Authorization` 헤더에서 맞는 값이 먼저이면 Node가 첫 값만 보존해 통과(표준 동작, 방어 불필요하다고 판단). 스킴 소문자 `bearer`는 거절(RFC 7235보다 엄격, runbook은 `Bearer`로 안내). 값 뒤 공백은 HTTP 파서가 제거해 통과. 모두 보안 문제 아님
  - 413은 응답 직후 `req.destroy()`라 클라이언트에 도달하지 않을 수 있다(시험도 413 또는 연결 종료를 허용). 운영자 CLI에서는 "연결 끊김"으로 보임
  - `admin` 서버의 `error` 리스너가 `once`라 리스닝 성공 후 첫 런타임 오류는 삼키고 두 번째부터는 미처리 예외가 된다(외부에서 유발 방법을 만들지 못해 미검증, 낮은 위험)
  - ADMIN_PORT 충돌·설정 실수는 **공개 서비스까지 시작하지 않는다**(fail-closed, 의도된 설계로 보이나 runbook에 "admin 포트 충돌=전체 기동 실패" 문구는 없음)
  - 변이 M07b·M07d는 관측 불가한 방어 코드(동등 변이)
  - 웹 변이 시험 미수행: `room:closed` 핸들러·`end()` 정리는 IT-41~44(트랙 ended, 소켓·getUserMedia 0건)로 행동 검증만 함
  - 새 시험 TC-383이 서버 시험 시간을 약 35초 늘린다(전체 server 시험 약 90초 이상). DEF-002 수정 후 한도를 조이면 약 10초로 줄어든다
  - 실제 배포 환경·타 브라우저·타 OS(127.0.0.2 대조는 리눅스만) 미검증
- 후속 조치가 필요한 항목: DEF-001(Medium)은 5단계 재작업 필수. DEF-002·004·005 수정 권고. DEF-003·006은 수용 여부 결정(사용자·오케스트레이터). 편차 3(방 ID 앞 6자 로그)은 사용자 확인 대기(DEC-020 ③) 유지

## 9. 결론 및 판정
- [ ] PASS
- [x] CONDITIONAL PASS — 조건: DEF-001(Medium, 폐쇄 중 예외가 서버 전체를 죽일 수 있음)을 5단계에서 `try/catch`로 수정하고 TC-393을 정식 시험으로 승격한 뒤 해당 시험 재실행. 이 결함은 현재 코드에서 유발 경로를 찾지 못한 잠복 결함이고 인수 조건 10개와 보안 규칙 위반(토큰·바인딩·로그·권한)은 발견되지 않아 07단계 진행을 막지는 않으나, 07 착수 전 수정을 권고한다. DEF-002·004·005는 같은 재작업에 묶어 처리 권고(Low)
- [ ] FAIL

## 10. 내부 검증 (최소 2회, `verification-log-template.md` 사용)
- 1차 검증 결과 요약: 인수 조건 커버리지 10/10 확인, 결과서의 기대값이 명세(note·03·DEC-009/020)에 근거하는지 점검. 케이스 설계 오류 3건 발견·수정(OWS 공백 오판, 입장 실패 소켓의 연결 유지, 비소비 소켓의 close 미발생 측정 오류) — 시험 자체의 오류였고 제품 결함 아님
- 2차 검증 결과 요약: "이 시험을 통과했다고 07로 넘겨도 되는가"를 의심해 변이 시험 결과의 타당성(M24 무효 변이 재작성), 동등 변이 판정, 규칙 K 정리를 재확인. 추가 경계(절대 URI)와 문서 오류(DEF-004·005)를 발견
- 검증 로그 파일 경로: `docs/harness/verify-log_unit-16-test.md`
