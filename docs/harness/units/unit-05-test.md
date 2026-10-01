# 테스트 결과서 — unit-05 (서버 시그널링)

## 1. 개요
- 테스트 대상 (모듈/기능/업무단위/전체 시스템 중 명시): 모듈 — `apps/server/src/socket/{server,messages}.ts`와 `test/signaling.test.ts`
- 테스트 유형: 단위 (소급 6단계: 인수 조건 추적 + 시험 실행 + 변이 시험 + 적대·경계 보강)
- 적용 Tier (Low/Standard/High, ORCHESTRATOR.md 1장 참고): Standard (DEC-001)
- 적용 속도 트랙 (L1~L5, 06/07 전용): L3(소급) — 보안 단위라 L4 수준(변이·적대 시험 철저)으로 수행
- 병렬 실행 정보: 병렬 웨이브에서 실행(소급 묶음 A; 동시에 unit-19 테스터, 소급 웹(06~12), 소급 인프라·E2E(13~14) 테스터가 돌았다. 이 호출은 unit-0N 하나만 검증하고 `apps/web/dist`는 건드리지 않았다)
- 테스트 목적: 소켓 시그널링이 보안 규칙(zod 검증·크기·이벤트별 속도 제한·세션 토큰·사칭 방지·서버 권한·Origin·IP 연결 상한·내부 정보 비노출)과 요구(FR-03·06~08·11~13·16·19~20, SEC-04·06)대로 동작하는지 L4 수준으로 증명한다.
- 관련 산출물: `docs/harness/03-system-design.md` §1.3·§3·§4·§6, `docs/harness/02-planning.md`, `docs/harness/traceability.md`, `docs/harness/decisions.md`, `docs/05-qa/test-cases.md`, `docs/03-engineering/api-spec.md`, `CLAUDE.md` 보안 규칙
- 테스트 수행자(에이전트): 06 단위 테스터 (소급 묶음 A, 재시작 호출)
- 테스트 일시: 2026-10-01 (코드 커밋 `c2cc28c`(PROD) 기준)

## 2. 테스트 범위 및 제외 범위
- 범위 (In-Scope) — 03 §3.3·§3.4·§6.1·§6.2, api-spec §3~5, CLAUDE.md 보안 규칙에서 도출한 인수 조건:
  - AC1 입장 ack에 세션 토큰·서버 부여 ID·ICE·설정이 오고, 토큰은 (t=s, rid, pid, exp=+4h)에 묶이며 내부 필드(IP 키·비밀값·해시)가 없다 (FR-03, SEC-03, SEC-09)
  - AC2 모든 이벤트는 zod 검증을 거치며 잘못된 페이로드는 INVALID_PAYLOAD, 미입장은 NOT_JOINED (SEC-03, SEC-06)
  - AC3 정원 초과·호스트 대기·위조/타 방 호스트 클레임·잠금·강퇴 재입장은 서버가 거부 (FR-06, POL-01·13, SEC-05)
  - AC4 사칭 방지: 발신자는 서버 부여값, 같은 방 참가자에게만 릴레이, 자기·타 방 대상 거부, `from` 추가 키 거부 (SEC-04)
  - AC5 크기 제한: SDP 16KB, 소켓 메시지 32KB, 채팅 500자 (SEC-06)
  - AC6 세션 토큰·재접속: 위조·변조·종류 오류 TOKEN_INVALID, 만료 정각 무효, 유예 안 복구, 유예 후 PARTICIPANT_GONE, 서버 재시작 시 ROOM_NOT_FOUND, 같은 토큰의 새 소켓은 이전 소켓을 끊음 (FR-20, SEC-03)
  - AC7 호스트 기능은 서버 상태로만 판단(비호스트 FORBIDDEN), 강퇴 시 소켓 종료, 승계, 방 간 격리 (FR-14~17, SEC-05)
  - AC8 채팅은 같은 방에만, 발신자·닉네임은 서버 값, 정리(제어문자·길이) 적용 (FR-11, SEC-07)
  - AC9 이벤트별 속도 제한(api-spec §3 용량: join 5, resume 10, leave 3, signal 120, chat 5, media 10, screen 4, lock/kick/muteAll 5, metrics 10), 반복 거부 누적 시 연결 종료, IP별 입장 시도 제한 (SEC-06, POL-10)
  - AC10 비밀번호 방: 오답 5회/10분은 IP+방 단위 차단, 호스트 클레임·유효 토큰 재접속은 면제 (FR-05, SEC-02, POL-11)
  - AC11 연결 제한: Origin 허용 목록 정확 일치(없음·변형 거부), IP당 동시 연결 상한(끊기면 반환), websocket 전송만 (SEC-06, SEC-08)
  - AC12 핸들러 예외는 INTERNAL만 응답·로그에 예외 종류만, ack 없는 emit·비정상 인자에도 서버 생존, 오류 ack에 내부 정보 없음 (SEC-08, SEC-10)
  - AC13 동시성: 이미 입장한 소켓의 join/resume은 ALREADY_JOINED, 비밀번호 확인(await) 중 이중 join은 한 번만 성공 (SEC-03)
- 제외 범위 (Out-of-Scope) 및 사유: 웹 클라이언트의 소켓 사용(unit-06~12), WebRTC 미디어(unit-09), `metrics:path` 상세(unit-19 `metricsPath*.test.ts`), admin 폐쇄(unit-16), 대규모 부하(MC-04).

## 3. 테스트 환경
- 실행 환경: Linux 샌드박스, Node v22.22.0, Vitest 5.0.3, 서버 시험은 `PORT=0`(무작위 포트)·`127.0.0.1`만 사용. 브라우저·Docker·외부 네트워크 미사용. DB 없음(메모리 상태).
- 소급 단위: **5단계 노트(`unit-0N-note.md`)가 없다.** 인수 조건(AC)은 `03-system-design.md` §1.3 확정표·§3·§4·§6, 요구(FR/NFR/SEC/POL), `docs/03-engineering/api-spec.md`, 기존 시험과 `CLAUDE.md` 보안 규칙에서 도출했다(아래 AC 표).
- 5단계 게이트 확인(노트가 없어 대체): 커밋 `c2cc28c`에서 `npm run lint`(오류·경고 0), `npm run typecheck`(오류 0)를 이번 실행에서 직접 재확인. CI 통과는 오케스트레이터 전달 사실이며 직접 확인하지 않았다(미검증으로 표기). "자체 코드 리뷰 체크리스트"는 소급이라 존재하지 않아 03 §6.2 코드 대조(보안 규칙 11행)로 대체했다.
- 테스트 데이터: 시험 안에서 만든 방·호스트·게스트 소켓, 주입 시계(`boot(overrides, now)`), `X-Forwarded-For`로 흉내 낸 IP(TRUST_PROXY=1), 예외 주입(`rooms.setMedia` 교체), 로그 캡처 스트림.
- 전제 조건 (Preconditions): 소스 무수정, 서버는 시험마다 `PORT=0`으로 기동·종료. 변이는 `.harness-tmp/mut_06_unit05/` 복사본에서만 적용.

## 4. 테스트 케이스 및 결과
### 4.1 인수 조건 ↔ 시험 추적
| AC | 요구 | 기존 TC(06 이전) | 기존 단언 강도 | 보강 TC(이번) |
|---|---|---|---|---|
| AC1 | FR-03, SEC-03·09 | TC-30, 37 | 약 — ack 존재만. 토큰 본문 바인딩·4h 수명(M5-31 생존)·내부 필드 비노출(M5-44 생존) 미검증 | TC-442, TC-446c |
| AC2 | SEC-03·06 | TC-31, TC-32 | 강 — 11종 잘못된 페이로드, 7개 이벤트 NOT_JOINED. 단 leave 후 NOT_JOINED(M5-36) 미검증 | TC-444b |
| AC3 | FR-06, POL-01·13, SEC-05 | TC-33, 34, 35, 36, 61, 62 | 강 | — |
| AC4 | SEC-04 | TC-40, 41, 42, 44 | 강 — 단 candidate 내용 릴레이(M5-39)·수신자 외 비수신 미검증 | TC-446b |
| AC5 | SEC-06 | TC-43, 71 | 중 | (TC-420, 421b 공유) |
| AC6 | FR-20, SEC-03 | TC-50, 51, 52, 53, 54 | 중 — **만료(M5-31·43)·이중 소켓 evict(M5-30) 미검증** | TC-442, TC-444 |
| AC7 | FR-14~17, SEC-05 | TC-60, 61, 62, 63, 64, 65 | 강 — 방 간 격리 미검증 | TC-448 |
| AC8 | FR-11, SEC-07 | TC-70, 71 | 강 — 닉네임 정규화 값(M5-32 생존)만 미검증 | TC-446 |
| AC9 | SEC-06, POL-10 | TC-80, 81 | **약 — 채팅 하나만. 나머지 이벤트의 용량(M5-08~15 8개 생존)·IP별 입장 제한(M5-40·41 생존) 미검증** | TC-443, 443b, TC-447b |
| AC10 | FR-05, SEC-02 | TC-90, 91, 92 | 중 — 방/IP 단위 분리는 우연 검출(M5-20), **IP 제외 변이(M5-21) 생존** | TC-447 |
| AC11 | SEC-06·08 | TC-95, 96 | 중 — 변형 Origin·연결 반환·polling 미검증(M5-46) | TC-428b(unit-02 파일), TC-444c, TC-448b |
| AC12 | SEC-08·10 | (없음) | **없음 — 핸들러 예외 시험이 없었다(M5-37 생존)** | TC-445, TC-445b, TC-446d |
| AC13 | SEC-03 | (없음) | **없음 — ALREADY_JOINED·이중 join 경쟁(M5-27~29 생존)** | TC-441 |

### 4.2 보강 시험 실행 결과 (이번 실행: `npx vitest run test/unit05Adversarial.test.ts` → 17 passed, 3회 반복 통과)
| ID | 시나리오 | 사전조건 | 실행 절차 | 예상 결과 | 실제 결과 | Pass/Fail | 비고 |
|----|----------|----------|-----------|-----------|-----------|-----------|------|
| TC-441 | 입장한 소켓의 다른 방 join·resume은 ALREADY_JOINED(방 인원 불변), 비밀번호 방에서 같은 소켓이 join 2개를 동시 전송하면 정확히 1개만 성공(다른 쪽 ALREADY_JOINED), 방 인원 2 | 호스트 방 2개 | 동시 emit | 한 번만 입장 | 기대대로 | Pass | await 경쟁 보호(`joining` 플래그) 확인 |
| TC-442 | 세션 토큰 본문이 정확히 `{t:'s', rid, pid, exp=+4h}`, 만료 1ms 전 resume 성공·정각 TOKEN_INVALID | 주입 시계, 유예 300초 | 시계 이동 | 4시간 단기 토큰 | 기대대로 | Pass | |
| TC-443 | 11개 이벤트 각각 용량+9회 동시 전송: RATE_LIMITED ≥5건, 처리 건수 용량-1~용량+4 | 이벤트별 새 방 | 동시 emit | 용량에서 제한 | 기대대로 | Pass | 거부 수를 연결 종료 기준(15) 미만으로 유지 |
| TC-443b | `room:leave`(용량 3) 12회 동시: 제한 ≥5건, 처리 ≤4건, 이후 방에 없음 | 호스트 1명 | 동시 emit | 제한 | 기대대로(같은 틱 중복 leave는 멱등 ok) | Pass | 관찰 O-1 |
| TC-444 | 같은 토큰으로 새 소켓 resume → 이전 소켓 disconnect, 참가자는 reconnecting 알림 없이 connected 유지, 새 소켓 채팅 성공 | 호스트+게스트 | resume | 이중 세션 방지 | 기대대로 | Pass | |
| TC-444b | `room:leave` 후 같은 소켓의 채팅·신호·미디어·음소거는 NOT_JOINED, 같은 소켓 재입장은 새 ID, 옛 토큰은 PARTICIPANT_GONE | 호스트+게스트 | leave | 바인딩 해제 | 기대대로 | Pass | |
| TC-444c | IP당 동시 연결 2: 3번째 거부, 하나 끊으면 새 연결 허용, 다시 가득 차면 거부 | IP_MAX_CONNECTIONS=2 | 연결 | 상한 준수·반환 | 기대대로 | Pass | |
| TC-445 | 핸들러 예외 주입: ack `{ok:false,code:'INTERNAL',message:'internal error'}`뿐(내부 문구·경로 없음), 복구 후 정상, 로그에 `handler error`·예외 종류만(메시지·채팅 본문 없음) | 로그 캡처 서버 | `rooms.setMedia` throw | 일반 코드만 | 기대대로 | Pass | |
| TC-445b | ack 없는 emit·인자 없음·null·함수 아닌 ack·모르는 이벤트 8종 후에도 /healthz 200, 새 방 입장 성공 | 없음 | emit | 서버 생존 | 기대대로 | Pass | M5-38 검출 |
| TC-446 | 닉네임은 서버가 정규화한 값(`  민지   2  `→`민지 2`, NFD→NFC)으로 목록·채팅에 표시 | 호스트 방 | join | 정규화 값 | 기대대로 | Pass | |
| TC-446b | candidate·description 내용이 `{v:1,from,…}`로 정확히 릴레이, 제3자는 수신 안 함 | 3명 | signal:send | 서버 from·내용 보존 | 기대대로 | Pass | |
| TC-446c | 입장 ack·알림: 토큰 바인딩, 참가자 객체 키가 공개 8개뿐(IP 키 없음), TURN username=`만료:참가자`·credential=HMAC, ack 어디에도 비밀값·비밀번호·해시·`ipKey`·`hostClaim` 없음, config 일치 | TURN 설정 서버 | join | 내부 필드 없음 | 기대대로 | Pass | |
| TC-446d | 오류 ack 7종(INVALID_PAYLOAD·NOT_JOINED·ROOM_NOT_FOUND·WRONG_PASSWORD·TOKEN_INVALID·FORBIDDEN·ROOM_FULL) 키가 `{ok,code,message}`뿐, message는 소문자 짧은 문구 | 정원 2 | 각 오류 유발 | 일반 문구 | 기대대로 | Pass | |
| TC-447 | 비밀번호 오답 제한이 IP+방 단위: 같은 IP·방 차단, 같은 IP 다른 방 입장, 다른 IP 같은 방 입장 | TRUST_PROXY=1, 방 2개 | 오답 5회 | 분리 | 기대대로 | Pass | |
| TC-447b | IP별 입장 시도 30회 버스트 후 RATE_LIMITED(새 소켓으로 우회 불가), 다른 IP는 영향 없음 | RATE_LIMIT_SCALE=1 | 40회 | 30~36회 ROOM_NOT_FOUND 후 제한 | 기대대로 | Pass | |
| TC-448 | 다른 방 호스트는 타 방 참가자를 강퇴·음소거·잠금할 수 없고 상태 불변, 미디어 상태 위조는 자기 상태만 | 방 2개 | host:* | 격리 | 기대대로 | Pass | |
| TC-448b | HTTP polling 핸드셰이크는 허용·불허 Origin 모두 400이고 sid 없음 | 서버 1대 | GET /socket.io | websocket만 | 기대대로 | Pass | M5-46 검출 |
| (TC-426) | 호스트 클레임 만료 정각 무효(unit-02 파일에 있으나 소켓 입장 경로 검증) | 주입 시계 | — | HOST_NOT_PRESENT | 기대대로 | Pass | M5-42 검출 |

### 4.3 기존 시험 재실행
- `npx vitest run test/signaling.test.ts` → 35개 통과. 보강 17개와 함께 반복 실행(2회 병렬 부하 포함) 안정 통과.
- 06 이전 서버 전체: 154 passed·4 skipped(coturnLive는 Docker 필요로 skip). 이번 실행: 224 passed·1 expected fail·4 skipped(다른 테스터의 추가분 포함).

### 4.4 변이 시험 결과 (임시 복사본 `.harness-tmp/mut_06_unit05/`, 총 46개)
| ID | 변이 내용 | 기존 시험(06 이전) | 보강 후 |
|---|---|---|---|
| M5-01 | 신호 수신자 멤버십 검사 제거 | 검출 TC-42 | 검출 TC-42 |
| M5-02 | 자기 자신에게 신호 허용 | 검출 TC-44 | 검출 TC-44 |
| M5-03 | 신호 from을 잘못된 값으로(발신자 부정확) | 검출 TC-41 | 검출 TC-41 |
| M5-04 | 소켓 Origin 허용 목록 검사 제거 | 검출 TC-95 | 검출 TC-95 |
| M5-05 | Origin 헤더 없는 소켓 연결 허용 | 검출 TC-95 | 검출 TC-95 |
| M5-06 | 입장 전 이벤트 허용(NOT_JOINED 제거) | 검출 TC-32 | 검출 TC-32 |
| M5-07 | 이벤트별 속도 제한 제거 | 검출 TC-80 | 검출 TC-80 |
| M5-08 | host:kick 속도 제한 완화 | **생존**(전체 시험에서도) | 검출 TC-443 |
| M5-09 | host:lock 속도 제한 완화 | **생존**(전체 시험에서도) | 검출 TC-443 |
| M5-10 | host:muteAll 속도 제한 완화 | **생존**(전체 시험에서도) | 검출 TC-443 |
| M5-11 | room:join 소켓별 속도 제한 완화 | **생존**(전체 시험에서도) | 검출 TC-443 |
| M5-12 | room:resume 속도 제한 완화 | **생존**(전체 시험에서도) | 검출 TC-443 |
| M5-13 | signal:send 속도 제한 완화 | **생존**(전체 시험에서도) | 검출 TC-443 |
| M5-14 | media:state 속도 제한 완화 | **생존**(전체 시험에서도) | 검출 TC-443 |
| M5-15 | screen:start 속도 제한 완화 | **생존**(전체 시험에서도) | 검출 TC-443 |
| M5-16 | chat:send 속도 제한 완화 | 검출 TC-80 | 검출 TC-80 |
| M5-17 | 반복 거부 연결 종료 해제 | 검출 TC-81 | 검출 TC-81 |
| M5-18 | IP 동시연결 off-by-one | 검출 TC-96 | 검출 TC-96 |
| M5-19 | 연결 종료 시 IP 연결 수 미감소 | 우연 검출 TC-36(연결이 누적되어 한도 20 초과) | 검출 TC-36 및 TC-444c(의도적 검증) |
| M5-20 | 비밀번호 시도 제한 키에서 방 제외 | 우연 검출 TC-92(앞선 시험의 오답이 누적) | 검출 TC-92 및 TC-447(의도적 검증) |
| M5-21 | 비밀번호 시도 제한 키에서 IP 제외 | **생존**(전체 시험에서도) | 검출 TC-447 |
| M5-22 | 비밀번호 오답 기록 제거 | 검출 TC-91 | 검출 TC-91 |
| M5-23 | 비밀번호 방 비밀번호 검증 우회 | 검출 TC-90 | 검출 TC-90 |
| M5-24 | 호스트 클레임의 방 일치 검사 제거 | 검출 TC-36 | 검출 TC-36 |
| M5-25 | 호스트 클레임 서명 검증 제거(클라이언트 값 신뢰) | 검출 TC-35 | 검출 TC-35 |
| M5-26 | 재접속 토큰 종류 검사 제거 | 검출 TC-51 | 검출 TC-51 |
| M5-27 | resume의 ALREADY_JOINED 검사 제거 | **생존**(전체 시험에서도) | 검출 TC-441 |
| M5-28 | join 동시 요청 보호(joining) 제거 | **생존**(전체 시험에서도) | 검출 TC-441 |
| M5-29 | join의 ALREADY_JOINED 검사 전체 제거 | **생존**(전체 시험에서도) | 검출 TC-441 |
| M5-30 | 재접속 시 이전 소켓 종료 누락(이중 세션) | **생존**(전체 시험에서도) | 검출 TC-444 |
| M5-31 | 세션 토큰 수명 4h->400h | **생존**(전체 시험에서도) | 검출 TC-442 |
| M5-32 | 서버 측 닉네임 정규화 제거 | **생존**(전체 시험에서도) | 검출 TC-446 |
| M5-33 | 채팅 서버 측 정리·길이 검사 제거 | 검출 TC-71 | 검출 TC-71 |
| M5-34 | 채팅을 모든 방에 브로드캐스트 | 검출 TC-70 | 검출 TC-70 |
| M5-35 | 채팅 nickname 서버값 대신 임의값 | 검출 TC-70 | 검출 TC-70 |
| M5-36 | room:leave 후 소켓 바인딩 미해제 | **생존**(전체 시험에서도) | 검출 TC-444b |
| M5-37 | 핸들러 예외 시 ack에 내부 정보 노출 | **생존**(전체 시험에서도) | 검출 TC-445 |
| M5-38 | ack 콜백 없는 emit 방어 제거 | 다른 단위 시험(metricsPath 등)만 검출 | 검출 TC-445b(처리되지 않은 예외로 시험 실행 실패) |
| M5-39 | candidate 릴레이 누락 | **생존**(전체 시험에서도) | 검출 TC-446b |
| M5-40 | IP별 입장 시도 제한 완화 | **생존**(전체 시험에서도) | 검출 TC-447b |
| M5-41 | IP별 입장 시도 제한 제거 | **생존**(전체 시험에서도) | 검출 TC-447b |
| M5-42 | 호스트 클레임 만료 검사 무력화(now=0) | **생존**(전체 시험에서도) | 검출 TC-426(unit-02 보강 파일이지만 같은 소켓 입장 경로를 실행) |
| M5-43 | 세션 토큰 만료 검사 무력화(now=0) | **생존**(전체 시험에서도) | 검출 TC-442 |
| M5-44 | 입장 ack에 비밀값 노출 | **생존**(전체 시험에서도) | 검출 TC-446c |
| M5-45 | 전체 음소거 알림이 호스트에게도 전달(host? 대신 io) | (패턴 오류로 미평가) | 검출 TC-64 |
| M5-46 | 폴링 전송 허용(Origin 우회 표면 확대) | **생존**(전체 시험에서도) | 검출 TC-448b |

- 요약: 변이 46개 중 기존 시험이 단독 검출 20개(45개 평가 기준 44%, M5-45는 패턴 오류로 1차 미평가 후 보강 단계에서 평가), 다른 단위 시험 추가 1개, **24개는 전체 시험에서도 생존**. 보강 후 **46개 전부 검출(100%)**. 동등 변이 없음. 생존의 대부분은 **이벤트별 속도 제한 값**(8개), **ALREADY_JOINED/이중 입장**, **세션·클레임 만료**, **핸들러 예외 비노출**에 몰려 있었다.
- 주의: M5-19(IP 연결 수 미감소)·M5-20(비밀번호 시도 키에서 방 제외)은 기존 시험에서 TC-36·TC-92가 **우연히**(앞선 시험의 누적 효과로) 검출했다. 의도적 시험이 아니므로 순서가 바뀌면 사라질 수 있어 TC-444c·TC-447이 직접 검증한다.

## 5. 커버리지
- 커버리지 지표: 라인/브랜치 도구 미설치로 **미측정**. 대체: AC 13개 모두 TC 대응(100%), 변이 점수 기존 44%→보강 후 100%(46/46). 이벤트 12종 모두의 속도 제한을 TC-443(11종)·TC-443b(`room:leave`)로 직접 확인(`metrics:path`는 unit-19 시험 TC-406·414도 확인).
- 커버되지 않은 부분과 사유: ① 같은 틱에 파이프라인된 이벤트가 `room:leave` 뒤에 실행되는 경합(관찰 O-1; 효과 없음). ② 대규모 동시 접속(MC-04). ③ 실제 TLS·프록시 뒤 `wss`. ④ 소켓 서버의 `strike` 윈도(10초) 시간 경계는 TC-81이 개략만 확인.

## 6. 결함(Defect) 목록
| ID | 설명 | 재현 절차 | 심각도(Critical/High/Medium/Low) | 상태(Open/Fixed/Deferred) | 조치 내용 |
|----|------|-----------|-----------------------------------|----------------------------|-----------|
| DEF-001 | **시험 구멍(보안)**: 변이 24개(이벤트별 속도 제한 값 8종, 비밀번호 시도 키에서 IP 제외, ALREADY_JOINED·이중 join 경쟁, 이중 세션 evict 누락, 세션 토큰 수명 4h→400h·만료 검사 무력화, 호스트 클레임 만료 무력화, 서버 측 닉네임 정규화 제거, leave 후 바인딩 미해제, 핸들러 예외 시 내부 정보 노출, candidate 릴레이 누락, IP별 입장 제한 제거, 입장 ack 비밀값 노출, polling 전송 허용)가 기존 시험 전체에서 검출되지 않음. 제품 코드는 모두 정상(보강 시험이 현재 코드에서 통과) | 복사본에서 `m05.json`의 해당 변이 적용 후 기존 시험 실행 → 통과 | High (CLAUDE.md 보안 규칙의 이벤트별 rate limit·세션 토큰 단기성에 회귀 방지 시험이 없었음) | Fixed | TC-441~448b 추가 → 전부 검출 |
- 제품 코드 결함: **없음**. 근거: 사칭(`from` 추가·타 방 대상·자기 대상), 잘못된 페이로드 11+8종, 정원, 권한 없음(비호스트 lock/kick/mute, 타 방 호스트), 토큰 위조·변조·만료·종류, 크기 제한(SDP 16KB·소켓 32KB·채팅 500), 11개 이벤트 속도 제한, IP 연결·입장 제한, 비밀번호 5회 차단, 내부 예외 비노출 모두 현재 코드에서 기대대로 동작함을 TC-30~96과 TC-441~448b로 확인.
- 관찰(결함 아님):
  - O-1: 같은 TCP 청크로 파이프라인된 이벤트(`room:leave` 직후 다른 이벤트)는 입장 검사(동기)를 통과한 뒤 핸들러(마이크로태스크)에서 `me()`가 빈 값을 읽는다. `room:leave`가 용량 3까지 모두 ok로 응답하는 것(TC-443b)이 그 증거다. 결과는 `PARTICIPANT_GONE`/`TARGET_NOT_FOUND`/`ROOM_NOT_FOUND`로 안전하게 끝나며 권한 상승·상태 오염 경로는 찾지 못했다. 코드 변경 제안 없음(모니터링 사항).
  - O-2: 재접속 유예 중(끊긴) 참가자에게 `signal:send`를 보내면 `ok:true`이지만 전달되지 않는다(소켓이 없음). 클라이언트는 재접속 후 재협상하므로 영향 없음 — 문서화 사항.
  - O-3: 세션 토큰 수명 4시간의 "단기" 적정성은 03 D-5·§6.2 #3에서 보안 담당 확인 대기 중이며 TC-442가 현재 값(4시간)을 고정한다.

## 7. 테스트 환경 정리(Teardown) 확인 — 규칙 K
- 이번 테스트에서 생성한 임시 아티팩트 목록 (경로 포함): `.harness-tmp/mut_06_unit05/`(변이 시험용 저장소 복사본 — 소스·시험 복사 + 루트 `node_modules` 심볼릭 링크 모음. 변이는 이 복사본에서만 적용하고 변이마다 원본 파일로 복구)와 변이 목록·결과 JSON·실행 스크립트(세션 scratchpad, 저장소 밖)
- 위 아티팩트를 전부 `.harness-tmp/` 하위에서만 생성했는가 (규칙 K 1번): [x] 예 / [ ] 아니오
- 정리(삭제) 완료 여부: 완료 — `.harness-tmp/mut_06_unit01~05`를 모두 삭제했다. 다른 테스터의 `.harness-tmp/` 하위(작업 종료 시점에 `mut_06_unit06~12`, `mut_06_base`, `mut_06_head`, `probe_06_web` 등이 있었다)는 건드리지 않았다. `.harness-tmp/` 자체는 `.gitignore` 대상이다.
- 정리 후 `git status` 실행 결과 (그대로 첨부, 요약 금지):
```
 M docs/05-qa/test-cases.md
 M docs/traceability.md
?? apps/server/test/e2eGuard.test.ts
?? apps/server/test/infraGuard.test.ts
?? apps/server/test/metricsPathAdversarial.test.ts
?? apps/server/test/unit02Adversarial.test.ts
?? apps/server/test/unit03Adversarial.test.ts
?? apps/server/test/unit04Adversarial.test.ts
?? apps/server/test/unit05Adversarial.test.ts
?? apps/web/src/components/chatPanel.test.ts
?? apps/web/src/components/participantsPanel.test.ts
?? apps/web/src/components/roomUi.test.ts
?? apps/web/src/components/stateScreen.test.ts
?? apps/web/src/components/videoTileSpeaking.test.ts
?? apps/web/src/lib/audioLevel.test.ts
?? apps/web/src/lib/localMedia.test.ts
?? apps/web/src/lib/signaling.test.ts
?? apps/web/src/lib/signalingPathCompat.test.ts
?? apps/web/src/lib/storageApi.test.ts
?? apps/web/src/media/meshTransport.fake.test.ts
?? apps/web/src/media/pathMetricsAdversarial.test.ts
?? apps/web/src/pages/landing.test.ts
?? apps/web/src/state/meetingController.test.ts
?? docs/harness/units/unit-01-test.md
?? docs/harness/units/unit-02-test.md
?? docs/harness/units/unit-03-test.md
?? docs/harness/units/unit-04-test.md
?? docs/harness/units/unit-05-test.md
?? docs/harness/units/unit-13-test.md
?? docs/harness/units/unit-14-test.md
?? docs/harness/units/unit-19-test.md
?? docs/harness/verify-log_unit-01-test.md
?? docs/harness/verify-log_unit-02-test.md
?? docs/harness/verify-log_unit-03-test.md
?? docs/harness/verify-log_unit-04-test.md
?? docs/harness/verify-log_unit-05-test.md
?? docs/harness/verify-log_unit-13-test.md
?? docs/harness/verify-log_unit-14-test.md
?? docs/harness/verify-log_unit-19-test.md
?? e2e/pathMetrics-extra.spec.ts
?? e2e/webRetro.spec.ts
?? packages/shared/src/protocolBoundary.test.ts
(소유 주석: M docs/05-qa/test-cases.md·docs/traceability.md = --gen 재생성분(여러 테스터 행 혼재); apps/server/test/unit0{2,3,4,5}Adversarial.test.ts, packages/shared/src/protocolBoundary.test.ts, docs/harness/units/unit-0{1..5}-test.md, docs/harness/verify-log_unit-0{1..5}-test.md = 이 호출(묶음 A); apps/web/**, e2e/**, apps/server/test/{e2eGuard,infraGuard,metricsPathAdversarial}.test.ts, unit-13·14·19 문서 = 다른 테스터)
```
- 병렬 실행이었다면: 위 `git status`에서 이 호출(묶음 A)이 만든 것은 `packages/shared/src/protocolBoundary.test.ts`, `apps/server/test/unit0{2,3,4,5}Adversarial.test.ts`, `docs/harness/units/unit-0{1..5}-test.md`, `docs/harness/verify-log_unit-0{1..5}-test.md`, 그리고 `docs/05-qa/test-cases.md`·`docs/traceability.md`의 `--gen` 재생성분(다른 테스터의 행과 섞여 있음)이다. 나머지(`apps/web/**`, `e2e/**`, `apps/server/test/{e2eGuard,infraGuard,metricsPathAdversarial}.test.ts`, `docs/harness/units/unit-19-test.md`, `verify-log_unit-19-test.md`)는 다른 테스터 소유다. 이 호출이 만든 임시 아티팩트·미추적 잔여물(`.harness-tmp/mut_06_unit0*`)은 남아 있지 않다(위 `git status`에 `.harness-tmp`가 없고 `ls .harness-tmp`로도 확인). 웨이브 종료 후 전체 트리 점검(`harness-janitor.sh --check`)은 오케스트레이터 몫이다(미실행).
- 이번 테스트 도중 강제 중단(TaskStop 등)이 있었는가: [x] 없음 / [ ] 있음 (이 소급 단위의 이전 호출이 API 한도로 중단됐으나 저장소에 변경이 남지 않았음을 시작 시 확인했고, 시작 시 `.harness-tmp/`에 이 단위 잔여물이 없었다)
- **이 절이 미완성이거나 `git status`가 깨끗함을 확인하지 못했다면, 8절에서 PASS로 판정할 수 없다 (규칙 K 2번).** → 이 호출 소유분은 정리 완료, 위 판정 근거 충족.

## 8. 리스크 및 잔존 이슈
- 이번 테스트로 커버되지 않는 알려진 리스크: 실서버·HTTPS·프록시 뒤 IP 판정(TRUST_PROXY 홉 수), 6명 동시 대량 시그널링 부하(MC-04), 토큰 4시간 수명의 보안 담당 확정(D-5).
- 후속 조치가 필요한 항목: 없음(제품 변경 불필요). O-1은 이후 소켓 핸들러를 바꿀 때 입장 검사와 `me()` 읽기를 같은 시점으로 묶는 것을 권장.

## 9. 결론 및 판정
- [x] PASS — 다음 단계 진행 가능 (7절 Teardown 확인 완료가 전제조건)
- [ ] CONDITIONAL PASS — 조건:
- [ ] FAIL — 사유 및 재작업 요청 사항:

## 10. 내부 검증 (최소 2회, `verification-log-template.md` 사용)
- 1차 검증 결과 요약: AC 13개 ↔ TC 추적, 기존 단언 약함 5곳(AC1·6·9·12·13) 식별, 변이 24개 생존 확인, 내 시험 오류 1건(leave 속도 제한 단언이 같은 틱 중복 leave를 놓침 → 관찰 O-1로 기록·단언 수정).
- 2차 검증 결과 요약: 변이 M5-42·M5-46이 보강 후에도 남아 있음을 발견(M5-42는 TC-426이 검출함을 확인, M5-46은 TC-448b 추가) → 46/46 검출. 보강 시험의 반복 안정성(3회+병렬 2회) 확인. 추가 결함 없음.
- 검증 로그 파일 경로: `docs/harness/verify-log_unit-05-test.md`
