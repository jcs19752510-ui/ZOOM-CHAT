# 테스트 결과서 — 업무 단위 `방·입장·세션/시그널링` 통합·회귀 (7단계)

## 1. 개요
- 테스트 대상: 업무 단위(feature) **방·입장·세션/시그널링** — 구성 작업 단위: unit-01(공통 프로토콜), unit-02(서버 기반·REST), unit-03(서버 보안), unit-04(방 도메인), unit-05(서버 시그널링), unit-06(웹 시그널링·세션), unit-08(웹 랜딩·대기실), unit-12 중 문구·오류 화면
- 테스트 유형: 통합 (단위 간 계약·회귀·업무 단위 시나리오). 기존 단위 시험을 반복하지 않고 **단위 사이 경계**만 추가 시험
- 적용 Tier: Standard (DEC-002, 규칙 B 최소 2회) / 적용 속도 트랙: L3(06·07 분리, 소급 단위 포함) / 병렬 실행 정보: 단독 실행(다른 에이전트 없음, 사용자 확인)
- 테스트 목적: 06단계가 각 작업 단위를 PASS로 만들었더라도 조립하면 깨지는 곳(이벤트·스키마·오류 코드·문구·설정 값의 어긋남)이 없는지 확인
- 관련 산출물: `03-system-design.md` §1.3·§3.4·§4, `docs/harness/units/unit-*-test.md`, `docs/03-engineering/api-spec.md`, `decisions.md`(DEC-016~024), 담당 요구: FR-01~03, FR-05~07, FR-18~23, SEC-01~06, SEC-08, POL-01·04·13, NFR-12
- 테스트 수행자(에이전트): 07-integration-tester (Claude Sonnet 5.5)
- 테스트 일시: 2026-10-02 (기준 커밋 580a408 + 미커밋 시험 파일)
- 이 단계 입력 확인: 위 작업 단위의 06 결과서(`units/unit-*-test.md`)가 모두 존재하고 PASS 또는 CONDITIONAL PASS(제품 결함 수정 후 회귀 시험 포함)임을 확인했다. unit-15·17은 5단계 노트(`*-note.md`)가 있고 unit-01~14는 소급(노트 없음).

## 2. 테스트 범위 및 제외 범위
- 범위(In-Scope): ① 업무 단위 내부 통합 시험이 기존 시험(서버 통합·E2E)으로 이미 덮이는지 매핑 ② 덮이지 않은 경계에 시험 추가 ③ 회귀: 전체 단위 시험·lint·typecheck·check-docs·E2E 재실행 ④ 업무 단위 수준 시나리오(아래 4절)
- 제외 범위 및 사유: 단위 시험 반복(규칙), 실기기·iOS Safari·타 브라우저(UAT 소관), 도커 이미지 빌드·CI 실행(환경), 법률 검토(사용자), 부하·장시간(IT-29는 `SOAK_MINUTES` 없이 skip), 제품 코드 수정(이 단계 금지 — 결함은 기록과 `it.fails` 재현만)

### 2.1 기존 시험이 이미 덮는 부분 (매핑)
| 영역 | 기존 시험 | 한계 |
|---|---|---|
| 서버 입장·토큰·재접속·비밀번호·Origin·IP 상한 (소켓 직접) | TC-30~37, 40~44, 50~54, 90~96 (`signaling.test.ts`), `roomManager.test.ts`, `unit02~05Adversarial.test.ts` | 서버 내부. 웹 컨트롤러를 거치지 않는다 |
| 웹 컨트롤러·SignalingClient (가짜 소켓) | `meetingController.test.ts`, `meetingSession.gap.test.ts`, `signaling.test.ts`, `roomPage*.test.ts`, `landing*.test.ts`, `lobbyActions.test.ts` | 서버를 가짜로 둔다. 서버가 실제로 돌려주는 값과의 일치는 보지 않는다 |
| 브라우저 전 구간 (Chromium) | E2E IT-01, 06, 07, 15, 16, 19, 50, 51, 56, 59 | 화면 중심. 입장 거부 코드 전수·재접속 실패 사유 3종은 없음 |

### 2.2 덮이지 않았던 경계 → 이번에 추가
| 경계(작업 단위 사이 계약) | 추가 시험 |
|---|---|
| 컨트롤러가 보내는 모든 요청이 서버 zod 스키마를 통과하는가(fire-and-forget은 거부돼도 조용함) | IT-60 (+음성 대조군) |
| REST 응답 모양 ↔ api.ts 타입, JoinResult.config ↔ 웹 상태, joinSeq ↔ addPeers(initiate) 규칙 | IT-60 |
| 신호 릴레이: 웹 transport가 낸 offer·ICE가 서버를 거쳐 상대에 도착, from은 서버 부여 | IT-61 |
| ICE 서버·TURN 임시 자격증명이 변형 없이 transport.start로 전달, HMAC 규칙 일치 | IT-62 |
| 입장 거부 코드 ROOM_NOT_FOUND·HOST_NOT_PRESENT·INVALID_PAYLOAD×2·TOO_MANY_ATTEMPTS·ROOM_LOCKED·KICKED·NETWORK를 실제 서버로 만들고 컨트롤러 결과 확인, ROOM_FULL 별도 | IT-63, IT-64 |
| 오류 코드 20종(19+NETWORK) → 대기실 화면/문구 전수, 종료 사유 6종 → 종료 화면 전수 | IT-74, IT-76 |
| 재연결 실패 사유별 종료(restarted·expired×2)와 정상 복구(같은 selfId) | IT-68, IT-69 |
| 이벤트 이름 목록(shared↔서버↔웹), 오류 코드 목록, v:1 | IT-80, IT-81, IT-82, IT-87 |
| 입력 한도·안내 문구 숫자 ↔ shared LIMITS, 정규화 함수 공유 | IT-78, IT-79 |

## 3. 테스트 환경
- 실행 환경: Linux 6.18, Node 22, Vitest 5.0.3(서버·웹 워크스페이스), Playwright 1.63 + 사전 설치 Chromium(`/opt/pw-browsers`), `workers=1`
- 시험 방식: 웹 시험(`apps/web/src/integration/`)이 **실제 서버**(`startServer`, 빈 포트)를 같은 프로세스에서 띄우고 웹의 **실제** `SignalingClient`·`MeetingController`·`api.ts`로 연결한다. 미디어 계층(`MeshTransport`)과 `LocalMedia`만 대역(RTCPeerConnection·장치는 node에 없음). 서버 시험은 소스·문서·설정 파일을 읽어 목록을 대조하거나 실제 소켓으로 이벤트를 발생시킨다
- 테스트 데이터: 시험 내 생성(ASCII 닉네임, 랜덤 방 ID, 테스트 전용 비밀값). 한글 문구는 시험 코드에 하드코딩하지 않고 `strings.ts`의 `S`로만 비교(TC-213)
- 전제 조건: 해당 작업 단위의 06 결과 PASS, `npm ci` 완료, 5·6단계 완료(커밋 580a408)

## 4. 테스트 케이스 및 결과
시험 ID는 IT-60부터(grep으로 미사용 확인, IT-73은 구상만 하고 쓰지 않아 결번). `docs/05-qa/test-cases.md`는 `node scripts/check-docs.mjs --gen`으로 행이 추가되었다.

| ID | 시나리오 | 사전조건 | 실행 절차 | 예상 결과 | 실제 결과 | Pass/Fail | 연결 요구 |
|----|----------|----------|-----------|-----------|-----------|-----------|------|
| IT-60 | 방 생성 → 상태 조회 → 호스트 입장 → 참가자 입장이 실제 서버와 맞물리고 컨트롤러가 보낸 모든 요청이 서버 스키마를 통과한다 | 단위 06 전부 PASS | `apps/web/src/integration/clientServerWire.test.ts` 실행 (실제 서버 기동 또는 소스·문서 대조) | 계약 일치 | 통과(1차·2차·3~5차 반복 동일) | Pass | FR-01,FR-03,FR-06,FR-23,NFR-12 |
| IT-61 | 신호(offer·ICE)는 서버를 거쳐 상대 transport에 도착하고 from은 서버가 부여한 참가자 ID다 | 단위 06 전부 PASS | `apps/web/src/integration/clientServerWire.test.ts` 실행 (실제 서버 기동 또는 소스·문서 대조) | 계약 일치 | 통과(1차·2차·3~5차 반복 동일) | Pass | FR-07,SEC-04 |
| IT-62 | 서버가 발급한 ICE 서버(STUN + TURN 임시 자격증명)가 그대로 transport.start에 전달되고 자격증명이 HMAC 규칙과 일치한다 | 단위 06 전부 PASS | `apps/web/src/integration/clientServerWire.test.ts` 실행 (실제 서버 기동 또는 소스·문서 대조) | 계약 일치 | 통과(1차·2차·3~5차 반복 동일) | Pass | SEC-09,FR-07 |
| IT-63 | 입장 거부·실패 코드 8종(WRONG_PASSWORD 포함)이 실제 서버에서 만들어지고 컨트롤러는 idle로 돌아와 같은 코드를 호출자에게 돌려준다 | 단위 06 전부 PASS | `apps/web/src/integration/clientServerWire.test.ts` 실행 (실제 서버 기동 또는 소스·문서 대조) | 계약 일치 | 통과(1차·2차·3~5차 반복 동일) | Pass | FR-02,FR-05,FR-06,FR-07,FR-14,FR-15,FR-23,POL-06,SEC-02 |
| IT-64 | 정원이 찬 방의 입장은 ROOM_FULL이고 방 상태 조회의 full 플래그와 일치한다 | 단위 06 전부 PASS | `apps/web/src/integration/clientServerWire.test.ts` 실행 (실제 서버 기동 또는 소스·문서 대조) | 계약 일치 | 통과(1차·2차·3~5차 반복 동일) | Pass | FR-07,POL-01 |
| IT-68 | 서버가 소켓을 끊으면 컨트롤러가 재연결 상태를 거쳐 토큰으로 같은 자리(selfId·호스트)를 복구하고 ICE를 재시작한다 | 단위 06 전부 PASS | `apps/web/src/integration/clientServerWire.test.ts` 실행 (실제 서버 기동 또는 소스·문서 대조) | 계약 일치 | 통과(1차·2차·3~5차 반복 동일) | Pass | FR-19,FR-20,NFR-03,SEC-03 |
| IT-69 | 재연결 실패 사유별 종료: 서버 재시작(방 없음)은 restarted, 서명 비밀이 바뀌면 expired, 서버가 이미 자리를 정리했으면 expired | 단위 06 전부 PASS | `apps/web/src/integration/clientServerWire.test.ts` 실행 (실제 서버 기동 또는 소스·문서 대조) | 계약 일치 | 통과(1차·2차·3~5차 반복 동일) | Pass | FR-20,FR-21,NFR-06,SEC-03 |
| IT-74 | 입장 응답 코드 전부가 화면 전환 또는 입력 화면 문구로 연결되고, 매핑 없는 코드는 일반 오류 문구(원인 불명 안내)로 떨어진다 | 단위 06 전부 PASS | `apps/web/src/integration/joinErrorMapping.test.ts` 실행 (실제 서버 기동 또는 소스·문서 대조) | 계약 일치 | 통과(1차·2차·3~5차 반복 동일) | Pass | UX-02,UX-03,FR-06,FR-07,FR-23 |
| IT-75 | 대기실에서 올바른 닉네임과 너무 짧은 비밀번호를 보내면 서버 스키마가 INVALID_PAYLOAD로 거부하는데 화면은 닉네임 안내가 아니라 비밀번호 원인을 알려야 한다 (DEF-I-01 재현) | 단위 06 전부 PASS | `apps/web/src/integration/joinErrorMapping.test.ts` 실행 (실제 서버 기동 또는 소스·문서 대조) | 계약 일치 | expected fail(결함 재현)(1차·2차·3~5차 반복 동일) | Pass(결함 재현 확인) | UX-03,SEC-02,FR-05 |
| IT-76 | 컨트롤러가 내는 종료 사유 6종이 서로 다른 의도의 종료 화면으로 가고 restarted·operator는 본문이 다르다 | 단위 06 전부 PASS | `apps/web/src/integration/joinErrorMapping.test.ts` 실행 (실제 서버 기동 또는 소스·문서 대조) | 계약 일치 | 통과(1차·2차·3~5차 반복 동일) | Pass | FR-21,FR-22,POL-19,UX-02 |
| IT-78 | 입력 maxLength·검증식·안내 문구의 숫자가 LIMITS와 같다 | 단위 06 전부 PASS | `apps/web/src/integration/limitsContract.test.ts` 실행 (실제 서버 기동 또는 소스·문서 대조) | 계약 일치 | 통과(1차·2차·3~5차 반복 동일) | Pass | FR-03,FR-05,FR-11,POL-04,POL-07 |
| IT-79 | 웹이 쓰는 정규화 함수는 서버가 쓰는 것과 같은 shared 구현이다(경계값에서 서버·웹 판정이 갈릴 수 없다) | 단위 06 전부 PASS | `apps/web/src/integration/limitsContract.test.ts` 실행 (실제 서버 기동 또는 소스·문서 대조) | 계약 일치 | 통과(1차·2차·3~5차 반복 동일) | Pass | POL-04,POL-07 |
| IT-80 | 클라이언트→서버 이벤트 12종: shared 타입 = 서버 핸들러 = 서버 속도 제한 표 = 웹이 실제로 보내는 이벤트 | 단위 06 전부 PASS | `apps/server/test/featureContracts.test.ts` 실행 (실제 서버 기동 또는 소스·문서 대조) | 계약 일치 | 통과(1차·2차·3~5차 반복 동일) | Pass | NFR-12,SEC-06 |
| IT-81 | 서버→클라이언트 이벤트 10종: shared 타입 = 서버가 내보내는 이벤트 = 웹이 듣는 이벤트 | 단위 06 전부 PASS | `apps/server/test/featureContracts.test.ts` 실행 (실제 서버 기동 또는 소스·문서 대조) | 계약 일치 | 통과(1차·2차·3~5차 반복 동일) | Pass | NFR-12,SEC-04 |
| IT-82 | 서버·웹 소스가 쓰는 오류 코드 문자열은 모두 shared ERROR_CODES(또는 HTTP 전용 코드·NETWORK)에 있고 서버 message 표와 코드 목록이 일치한다 | 단위 06 전부 PASS | `apps/server/test/featureContracts.test.ts` 실행 (실제 서버 기동 또는 소스·문서 대조) | 계약 일치 | 통과(1차·2차·3~5차 반복 동일) | Pass | NFR-12,SEC-08 |
| IT-83 | DOC-I-01: api-spec.md(단일 기준)에 오류 코드 19종·metrics:path·room:closed·/api/meta·admin 이벤트가 모두 적혀 있다 (11단계 문서화 대기, DEC-020) | 단위 06 전부 PASS | `apps/server/test/featureContracts.test.ts` 실행 (실제 서버 기동 또는 소스·문서 대조) | 계약 일치 | expected fail(결함 재현)(1차·2차·3~5차 반복 동일) | Pass(결함 재현 확인) | NFR-12,SEC-08 |
| IT-87 | 10종 이벤트를 실제로 모두 발생시켜 모든 페이로드가 v:1이고, 발신자 필드(from·by·id)는 서버가 부여한 참가자 ID이며, 이벤트 목록이 shared와 같다 | 단위 06 전부 PASS | `apps/server/test/featureContracts.test.ts` 실행 (실제 서버 기동 또는 소스·문서 대조) | 계약 일치 | 통과(1차·2차·3~5차 반복 동일) | Pass | NFR-12,SEC-04,FR-13,FR-14,FR-15,FR-16,FR-17,POL-19 |

회귀(이 업무 단위 포함 전체): 5절 참조.

## 5. 커버리지
- 업무 단위 사용자 시나리오 ↔ 케이스: 위 2.1(기존)과 2.2·4절(추가)로 이 업무 단위의 모든 사용자 시나리오(입장·참여·복구·종료 등 해당 영역)가 단위 시험·통합 시험·E2E 중 하나 이상에 연결된다.
- 회귀 결과(2026-10-02, 마지막 실행): `npm run lint` 오류 0 / `npm run typecheck`(shared·server·web·e2e) 오류 0 / `npm test` shared 21 통과, 서버 233 통과·1 expected fail·4 skipped(coturnLive, COTURN_LIVE 미설정), 웹 431 통과·3 expected fail / `node scripts/check-docs.mjs` 점검 통과(TC/IT 764개, 요구 미연결 0) / `npm run test:e2e` 83 통과·1 skipped(IT-29 soak) — **회귀 없음**.
- 커버되지 않은 부분과 사유: 실제 WebRTC·장치·화면 렌더링은 E2E 소유(이번에 재실행 통과). 실기기·장시간·도커·CI는 미검증.

## 6. 결함(Defect) 목록
| ID | 설명 | 재현 절차 | 심각도 | 상태 | 조치 내용 |
|----|------|-----------|--------|------|-----------|
| DEF-I-01 | 대기실에서 올바른 닉네임 + 4자 미만(1~3자) 비밀번호를 입력해 입장하면, 서버 `JoinRequestSchema`(passwordMin 4)가 INVALID_PAYLOAD로 거부하고 RoomPage가 이를 닉네임 규칙 안내(`S.lobby.invalidNickname`)로 보여 준다. Lobby는 닉네임만 검증하고 비밀번호 길이는 검증하지 않는다(랜딩의 방 만들기는 검증함). 사용자는 닉네임이 틀렸다고 오해하고, 실제 원인(비밀번호 형식)을 알 수 없다. 두 작업 단위(unit-08 Lobby ↔ unit-06 RoomPage 매핑)가 서로 다른 가정을 한 경계 결함 | IT-63(실제 서버가 INVALID_PAYLOAD를 돌려줌을 확인) → 재현은 IT-75(`it.fails`) | Medium(Low~Medium: 오입력 시 안내 오류. 입장 자체는 막지 않으며 보안 영향 없음) | Open | Open → 규칙 F: 5단계(unit-08 Lobby에 비밀번호 길이 검증·문구 추가, 또는 unit-06 매핑 분기) 반려 후보. 임의 봉합하지 않음 |
| DOC-I-01 | `docs/03-engineering/api-spec.md`(문서상 단일 기준)가 오류 코드 11종만 적고(코드 19종), `metrics:path`·`room:closed`·`/api/meta`·`/admin/rooms/:id/close`가 없다. 코드는 정본이므로 동작 결함은 아니고 문서 드리프트. DEC-020이 이미 "11단계에서 정정"으로 이연한 항목의 범위를 넓혀 확인 | IT-83(`it.fails`, 문서가 고쳐지면 통과로 뒤집혀 `it.fails`를 일반 시험으로 바꾸라는 신호가 된다) | Low | Deferred | Deferred → 11단계 문서화 |

관찰(결함 아님, 현재 동작을 시험으로 고정하거나 기록만):
- OBS-I-03 `errorText`가 INVALID_PAYLOAD를 닉네임 안내로 매핑한다. 호스트 동작(강퇴 대상 ID 형식 오류)에서는 UI 경로로 만들 수 없어 영향 없음(IT-77이 현재 동작을 고정).
- 입장 시 응답 코드 중 SERVER_BUSY·INTERNAL·NETWORK는 일반 오류 문구(`S.state.error.body`)로 묶인다(IT-74가 현재 동작을 고정). 원인별 안내 분리는 요구에 없어 제안만.

- 결함 판정 근거: 위 결함은 `it.fails`로 재현했다(수정되면 일반 시험으로 바꾸라는 신호). IT-60, IT-61, IT-62, IT-63, IT-64, IT-68, IT-69, IT-74, IT-75, IT-76, IT-78, IT-79, IT-80, IT-81, IT-82, IT-83, IT-87 시험이 모두 실제 서버·실제 소스 대조에서 기대와 일치했고 3회 반복 실행에서도 결과가 같았으며(비결정성 없음), 감시 장치가 비어 있지 않음은 음성 대조군(IT-60, IT-80)으로 확인했다.

## 7. 테스트 환경 정리(Teardown) 확인 — 규칙 K
- 이번 테스트에서 생성한 임시 아티팩트: 없음. 서버는 시험 안에서 빈 포트로 기동·`close()`했고 DB·venv·임시 설정 파일을 만들지 않았다. E2E 실행 로그를 저장소 루트에 잠깐 `.harness-tmp-e2e.log`로 썼다가 삭제했다. `npm run test:e2e`가 갱신하는 `apps/web/dist`·`test-results/`는 기존 무시 경로(.gitignore)다.
- 위 아티팩트를 전부 `.harness-tmp/` 하위에만 생성했는가: [x] 예(임시 파일 자체가 없음, 루트에 둔 로그 1개는 삭제 확인)
- 정리(삭제) 완료 여부: 완료
- 정리 후 `git status` 실행 결과(원문, 6개 업무 단위 결과서를 모두 만든 뒤의 상태):
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
	apps/server/test/featureContracts.test.ts
	apps/web/src/integration/
	docs/harness/feature-chat-integration-test.md
	docs/harness/feature-host-tools-integration-test.md
	docs/harness/feature-infra-deploy-integration-test.md
	docs/harness/feature-legal-meta-operator-integration-test.md
	docs/harness/feature-media-recovery-integration-test.md
	docs/harness/feature-room-session-integration-test.md
	docs/harness/verify-log_feature-chat-integration-test.md
	docs/harness/verify-log_feature-host-tools-integration-test.md
	docs/harness/verify-log_feature-infra-deploy-integration-test.md
	docs/harness/verify-log_feature-legal-meta-operator-integration-test.md
	docs/harness/verify-log_feature-media-recovery-integration-test.md
	docs/harness/verify-log_feature-room-session-integration-test.md

no changes added to commit (use "git add" and/or "git commit -a")
```
- 병렬 실행이었다면: 해당 없음(단독 실행). 위 항목 중 `docs/05-qa/test-cases.md`·`docs/traceability.md`는 `check-docs --gen`의 갱신 산출물, `apps/*/` 신규 시험 파일과 `docs/harness/` 신규 문서가 이번 7단계 산출물이다.
- 강제 중단(TaskStop 등): [x] 없음
- 이 실행이 만든 임시 아티팩트·미추적 잔여물 없음 → Teardown 확인 완료.

## 8. 리스크 및 잔존 이슈
- 이번 테스트로 커버되지 않는 알려진 리스크: 8단계(전체 테스트)에서 다른 업무 단위와 만나는 지점: ① 채팅·호스트 도구가 같은 `MeetingController`·`socket/server.ts`를 쓰므로 이벤트 목록 변경은 IT-80·81이 막아 준다 ② 비밀번호 방은 호스트 도구(강퇴) 후 재입장 경로와 겹친다(IT-63 KICKED). ③ DEF-I-01은 8단계 사용자 시나리오(비밀번호 방 참가) 시험 시 다시 나타날 수 있으니 반려 결과를 확인해야 한다.
- 후속 조치가 필요한 항목: 결함은 위 6절 조치 내용 참조(규칙 F). 공유 문서 갱신은 아래 "공유 문서 갱신 요청".

## 9. 결론 및 판정
- [ ] PASS
- [x] CONDITIONAL PASS — 조건: 아래 Open 결함이 규칙 F로 5단계에 반려·처리되기 전까지 이 업무 단위의 해당 경계는 "결함 재현(`it.fails`)" 상태다. 결함은 Low~Medium이고 보안·데이터 영향이 없어 8단계 진행을 막지는 않으나 8단계가 결과를 확인해야 한다. 실기기·장시간·실서버·도커·CI 실행은 미검증.
- [ ] FAIL

## 10. 내부 검증 (최소 2회)
- 1차 검증 결과 요약: 이 업무 단위의 사용자 시나리오가 2.1(기존)·2.2(추가) 중 어디에 연결되는지 표로 확인, 추가 시험 전부 통과(결함 재현 시험은 의도대로 실패).
- 2차 검증 결과 요약: "8단계에서 다른 업무 단위와 만날 때 깨지지 않을까"를 의심해 추가 탐침(마이크 연타·종료 사유 전수·재시작 사유 3종)을 시도 → DEF-I-01을 시험 설계 과정에서 확인하고 실제 서버로 교차 확인(IT-63↔IT-75).
- 3~5차: 통합 시험 전체를 3회 추가 반복 실행해 비결정성 없음 확인(웹 integration 18 통과·1 expected fail ×3, 서버 featureContracts 7 통과·1 expected fail ×3).
- 검증 로그 파일 경로: `docs/harness/verify-log_feature-room-session-integration-test.md`

## 공유 문서 갱신 요청 (traceability.md·decisions.md는 직접 수정하지 않음)
- traceability.md "통합테스트" 열: FR-01, FR-02, FR-03, FR-05, FR-06, FR-07, FR-18~FR-23(연결된 것만), SEC-02, SEC-03, SEC-04, SEC-06, SEC-08, NFR-06, NFR-12, POL-01, POL-04, POL-06 → `IT-60, 61, 62, 63, 64, 68, 69, 74, 75(it.fails), 76, 78, 79, 80, 81, 82, 83(it.fails), 87` (feature `room-session`). `it.fails` 표시는 "결함 재현 시험, 수정 시 일반 시험으로 전환".
- traceability.md 비고: DEF-I-01(대기실 짧은 비밀번호 안내 오류, Open)을 FR-05·SEC-02·UX-03에 표시. DOC-I-01(api-spec 드리프트)은 NFR-12·SEC-08에 11단계 대기로 표시. 8단계 착수 전 확인 필요 항목으로 올릴 것.
- decisions.md 후보: ① 7단계 업무 단위 6개 구성(방·입장·세션 / 미디어·연결 복구 / 채팅 / 호스트 도구·권한 / 법적·메타·운영자 종료·계측 / 인프라·배포 설정)과 작업 단위 배치 ② 웹 통합 시험이 서버 소스를 상대 경로로 import하는 방식(e2e/fixtures.ts와 같은 관례, 의존성 추가 없음) ③ DEF-I-01·02의 5단계 반려 여부, DOC-I-01은 11단계 이연.
