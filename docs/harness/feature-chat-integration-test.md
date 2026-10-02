# 테스트 결과서 — 업무 단위 `채팅` 통합·회귀 (7단계)

## 1. 개요
- 테스트 대상: 업무 단위(feature) **채팅** — 구성 작업 단위: unit-10(웹 채팅), unit-05의 chat:send, unit-01의 text(sanitizeChatText)
- 테스트 유형: 통합 (단위 간 계약·회귀·업무 단위 시나리오). 기존 단위 시험을 반복하지 않고 **단위 사이 경계**만 추가 시험
- 적용 Tier: Standard (DEC-002, 규칙 B 최소 2회) / 적용 속도 트랙: L3(06·07 분리, 소급 단위 포함) / 병렬 실행 정보: 단독 실행(다른 에이전트 없음, 사용자 확인)
- 테스트 목적: 06단계가 각 작업 단위를 PASS로 만들었더라도 조립하면 깨지는 곳(이벤트·스키마·오류 코드·문구·설정 값의 어긋남)이 없는지 확인
- 관련 산출물: `03-system-design.md` §1.3·§3.4·§4, `docs/harness/units/unit-*-test.md`, `docs/03-engineering/api-spec.md`, `decisions.md`(DEC-016~024), 담당 요구: FR-11, SEC-07, POL-07, UX-03
- 테스트 수행자(에이전트): 07-integration-tester (Claude Sonnet 5.5)
- 테스트 일시: 2026-10-02 (기준 커밋 580a408 + 미커밋 시험 파일)
- 이 단계 입력 확인: 위 작업 단위의 06 결과서(`units/unit-*-test.md`)가 모두 존재하고 PASS 또는 CONDITIONAL PASS(제품 결함 수정 후 회귀 시험 포함)임을 확인했다. unit-15·17은 5단계 노트(`*-note.md`)가 있고 unit-01~14는 소급(노트 없음).

## 2. 테스트 범위 및 제외 범위
- 범위(In-Scope): ① 업무 단위 내부 통합 시험이 기존 시험(서버 통합·E2E)으로 이미 덮이는지 매핑 ② 덮이지 않은 경계에 시험 추가 ③ 회귀: 전체 단위 시험·lint·typecheck·check-docs·E2E 재실행 ④ 업무 단위 수준 시나리오(아래 4절)
- 제외 범위 및 사유: 단위 시험 반복(규칙), 실기기·iOS Safari·타 브라우저(UAT 소관), 도커 이미지 빌드·CI 실행(환경), 법률 검토(사용자), 부하·장시간(IT-29는 `SOAK_MINUTES` 없이 skip), 제품 코드 수정(이 단계 금지 — 결함은 기록과 `it.fails` 재현만)

### 2.1 기존 시험이 이미 덮는 부분 (매핑)
| 영역 | 기존 시험 | 한계 |
|---|---|---|
| 서버 채팅 검증·정규화·속도 제한 | TC-70, 71, 80 (`signaling.test.ts`) | 서버 단독 |
| 웹 ChatPanel·linkify 단위 | `chatPanel*.test.ts`, `linkify*.test.ts` | 가짜 onSend |
| 브라우저 채팅·XSS·경계 | E2E IT-04, 57, 57b, 57c | 화면 중심 |

### 2.2 덮이지 않았던 경계 → 이번에 추가
| 경계(작업 단위 사이 계약) | 추가 시험 |
|---|---|
| 컨트롤러 sendChat ↔ 서버: 발신자 정보 서버 부여, HTML 문자열 그대로, mine/unread, 보이지 않는 글자·501자 → INVALID_PAYLOAD, 연타 → RATE_LIMITED가 컨트롤러 반환 코드로 그대로 전달 | IT-65 |
| 웹 입력 한도(500)·정규화 함수가 서버와 같은 shared 구현, 이모지 코드 포인트 경계 | IT-78, IT-79 |

## 3. 테스트 환경
- 실행 환경: Linux 6.18, Node 22, Vitest 5.0.3(서버·웹 워크스페이스), Playwright 1.63 + 사전 설치 Chromium(`/opt/pw-browsers`), `workers=1`
- 시험 방식: 웹 시험(`apps/web/src/integration/`)이 **실제 서버**(`startServer`, 빈 포트)를 같은 프로세스에서 띄우고 웹의 **실제** `SignalingClient`·`MeetingController`·`api.ts`로 연결한다. 미디어 계층(`MeshTransport`)과 `LocalMedia`만 대역(RTCPeerConnection·장치는 node에 없음). 서버 시험은 소스·문서·설정 파일을 읽어 목록을 대조하거나 실제 소켓으로 이벤트를 발생시킨다
- 테스트 데이터: 시험 내 생성(ASCII 닉네임, 랜덤 방 ID, 테스트 전용 비밀값). 한글 문구는 시험 코드에 하드코딩하지 않고 `strings.ts`의 `S`로만 비교(TC-213)
- 전제 조건: 해당 작업 단위의 06 결과 PASS, `npm ci` 완료, 5·6단계 완료(커밋 580a408)

## 4. 테스트 케이스 및 결과
시험 ID는 IT-60부터(grep으로 미사용 확인, IT-73은 구상만 하고 쓰지 않아 결번). `docs/05-qa/test-cases.md`는 `node scripts/check-docs.mjs --gen`으로 행이 추가되었다.

| ID | 시나리오 | 사전조건 | 실행 절차 | 예상 결과 | 실제 결과 | Pass/Fail | 연결 요구 |
|----|----------|----------|-----------|-----------|-----------|-----------|------|
| IT-65 | 채팅은 서버가 채운 발신자 정보와 함께 모두에게 가고(HTML은 문자열 그대로) 길이·보이지 않는 글자·속도 제한 오류 코드가 컨트롤러에 그대로 전달된다 | 단위 06 전부 PASS | `apps/web/src/integration/clientServerWire.test.ts` 실행 (실제 서버 기동 또는 소스·문서 대조) | 계약 일치 | 통과(1차·2차·3~5차 반복 동일) | Pass | FR-11,SEC-07,POL-07 |
| IT-78 | 입력 maxLength·검증식·안내 문구의 숫자가 LIMITS와 같다 | 단위 06 전부 PASS | `apps/web/src/integration/limitsContract.test.ts` 실행 (실제 서버 기동 또는 소스·문서 대조) | 계약 일치 | 통과(1차·2차·3~5차 반복 동일) | Pass | FR-03,FR-05,FR-11,POL-04,POL-07 |
| IT-79 | 웹이 쓰는 정규화 함수는 서버가 쓰는 것과 같은 shared 구현이다(경계값에서 서버·웹 판정이 갈릴 수 없다) | 단위 06 전부 PASS | `apps/web/src/integration/limitsContract.test.ts` 실행 (실제 서버 기동 또는 소스·문서 대조) | 계약 일치 | 통과(1차·2차·3~5차 반복 동일) | Pass | POL-04,POL-07 |

회귀(이 업무 단위 포함 전체): 5절 참조.

## 5. 커버리지
- 업무 단위 사용자 시나리오 ↔ 케이스: 위 2.1(기존)과 2.2·4절(추가)로 이 업무 단위의 모든 사용자 시나리오(입장·참여·복구·종료 등 해당 영역)가 단위 시험·통합 시험·E2E 중 하나 이상에 연결된다.
- 회귀 결과(2026-10-02, 마지막 실행): `npm run lint` 오류 0 / `npm run typecheck`(shared·server·web·e2e) 오류 0 / `npm test` shared 21 통과, 서버 233 통과·1 expected fail·4 skipped(coturnLive, COTURN_LIVE 미설정), 웹 431 통과·3 expected fail / `node scripts/check-docs.mjs` 점검 통과(TC/IT 764개, 요구 미연결 0) / `npm run test:e2e` 83 통과·1 skipped(IT-29 soak) — **회귀 없음**.
- 커버되지 않은 부분과 사유: 실제 WebRTC·장치·화면 렌더링은 E2E 소유(이번에 재실행 통과). 실기기·장시간·도커·CI는 미검증.

## 6. 결함(Defect) 목록
| ID | 설명 | 재현 절차 | 심각도 | 상태 | 조치 내용 |
|----|------|-----------|--------|------|-----------|
| - | 결함 없음 | - | - | - | - |

관찰(결함 아님, 현재 동작을 시험으로 고정하거나 기록만):
- 웹 ChatPanel의 오류 문구 매핑(RATE_LIMITED/INVALID_PAYLOAD/그 외)은 기존 `chatPanelActions.test.ts`·E2E IT-57b·57c가 소유한다. 이 단계는 서버가 실제로 그 코드들을 돌려주는지만 확인했다.

- 결함 판정 근거: 결함 0건. 근거 — IT-65, IT-78, IT-79 시험이 모두 실제 서버·실제 소스 대조에서 기대와 일치했고 3회 반복 실행에서도 결과가 같았으며(비결정성 없음), 감시 장치가 비어 있지 않음은 음성 대조군(IT-60, IT-80)으로 확인했다.

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
- 이번 테스트로 커버되지 않는 알려진 리스크: 8단계 접점: 채팅은 재연결(F2) 중 메시지 유실이 가능하다(서버 저장 없음, 의도된 설계 — emptyHint 문구가 이를 고지). 재연결 직후 과거 채팅 복구는 요구가 아니다.
- 후속 조치가 필요한 항목: 없음(관찰 항목은 6절). 공유 문서 갱신은 아래 "공유 문서 갱신 요청".

## 9. 결론 및 판정
- [x] PASS — 다음 단계 진행 가능 (7절 Teardown 확인 완료). 단 아래 "미검증" 항목은 이 단계 범위 밖
- [ ] CONDITIONAL PASS
- [ ] FAIL

## 10. 내부 검증 (최소 2회)
- 1차 검증 결과 요약: 이 업무 단위의 사용자 시나리오가 2.1(기존)·2.2(추가) 중 어디에 연결되는지 표로 확인, 추가 시험 전부 통과(결함 재현 시험은 의도대로 실패).
- 2차 검증 결과 요약: "8단계에서 다른 업무 단위와 만날 때 깨지지 않을까"를 의심해 추가 탐침(마이크 연타·종료 사유 전수·재시작 사유 3종)을 시도 → 새 결함 없음(다른 업무 단위에서 DEF-I-02 발견).
- 3~5차: 통합 시험 전체를 3회 추가 반복 실행해 비결정성 없음 확인(웹 integration 18 통과·1 expected fail ×3, 서버 featureContracts 7 통과·1 expected fail ×3).
- 검증 로그 파일 경로: `docs/harness/verify-log_feature-chat-integration-test.md`

## 공유 문서 갱신 요청 (traceability.md·decisions.md는 직접 수정하지 않음)
- traceability.md "통합테스트" 열: FR-11, SEC-07, POL-07, UX-03 → `IT-65, 78, 79` (feature `chat`). `it.fails` 표시는 "결함 재현 시험, 수정 시 일반 시험으로 전환".
- traceability.md 비고: 8단계 착수 전 확인 필요 항목으로 올릴 것.
- decisions.md 후보: ① 7단계 업무 단위 6개 구성(방·입장·세션 / 미디어·연결 복구 / 채팅 / 호스트 도구·권한 / 법적·메타·운영자 종료·계측 / 인프라·배포 설정)과 작업 단위 배치 ② 웹 통합 시험이 서버 소스를 상대 경로로 import하는 방식(e2e/fixtures.ts와 같은 관례, 의존성 추가 없음) ③ DEF-I-01·02의 5단계 반려 여부, DOC-I-01은 11단계 이연.
