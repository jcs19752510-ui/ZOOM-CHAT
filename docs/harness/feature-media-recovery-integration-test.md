# 테스트 결과서 — 업무 단위 `미디어·연결 복구` 통합·회귀 (7단계)

## 1. 개요
- 테스트 대상: 업무 단위(feature) **미디어·연결 복구** — 구성 작업 단위: unit-07(웹 미디어), unit-09(웹 회의실 UI), unit-17(인앱·복귀·자동재생), unit-19 중 웹 경로 보고
- 테스트 유형: 통합 (단위 간 계약·회귀·업무 단위 시나리오). 기존 단위 시험을 반복하지 않고 **단위 사이 경계**만 추가 시험
- 적용 Tier: Standard (DEC-002, 규칙 B 최소 2회) / 적용 속도 트랙: L3(06·07 분리, 소급 단위 포함) / 병렬 실행 정보: 단독 실행(다른 에이전트 없음, 사용자 확인)
- 테스트 목적: 06단계가 각 작업 단위를 PASS로 만들었더라도 조립하면 깨지는 곳(이벤트·스키마·오류 코드·문구·설정 값의 어긋남)이 없는지 확인
- 관련 산출물: `03-system-design.md` §1.3·§3.4·§4, `docs/harness/units/unit-*-test.md`, `docs/03-engineering/api-spec.md`, `decisions.md`(DEC-016~024), 담당 요구: FR-07~10, FR-12, FR-19, FR-20, NFR-02·03·13, UX-05~07·13~15, NFR-15
- 테스트 수행자(에이전트): 07-integration-tester (Claude Sonnet 5.5)
- 테스트 일시: 2026-10-02 (기준 커밋 580a408 + 미커밋 시험 파일)
- 이 단계 입력 확인: 위 작업 단위의 06 결과서(`units/unit-*-test.md`)가 모두 존재하고 PASS 또는 CONDITIONAL PASS(제품 결함 수정 후 회귀 시험 포함)임을 확인했다. unit-15·17은 5단계 노트(`*-note.md`)가 있고 unit-01~14는 소급(노트 없음).

## 2. 테스트 범위 및 제외 범위
- 범위(In-Scope): ① 업무 단위 내부 통합 시험이 기존 시험(서버 통합·E2E)으로 이미 덮이는지 매핑 ② 덮이지 않은 경계에 시험 추가 ③ 회귀: 전체 단위 시험·lint·typecheck·check-docs·E2E 재실행 ④ 업무 단위 수준 시나리오(아래 4절)
- 제외 범위 및 사유: 단위 시험 반복(규칙), 실기기·iOS Safari·타 브라우저(UAT 소관), 도커 이미지 빌드·CI 실행(환경), 법률 검토(사용자), 부하·장시간(IT-29는 `SOAK_MINUTES` 없이 skip), 제품 코드 수정(이 단계 금지 — 결함은 기록과 `it.fails` 재현만)

### 2.1 기존 시험이 이미 덮는 부분 (매핑)
| 영역 | 기존 시험 | 한계 |
|---|---|---|
| MeshTransport·장치·오디오 레벨·경로 판정 단위 | `MeshTransport.test.ts`, `unit07*.test.ts`, `pathType.test.ts`, `pathMetricsAdversarial.test.ts`, `localMedia.test.ts` | RTCPeerConnection은 가짜 |
| 복귀·인앱·자동재생 정책 | `foreground*.test.ts`, `useForeground.hook.test.ts`, `inApp*.test.ts`, `videoTileEffects.test.ts` | 순수 함수·가짜 소켓 |
| 브라우저 실연결·복구 | E2E IT-01~03, 08, 13, 14, 20, 21, 22, 24, 29(soak: 이번에 SOAK_MINUTES 없이 skip), 30, 35~36c, 39, 40~40j, 45~47 | 실제 WebRTC. 서버 오류 코드·재시작 사유는 일부만 |

### 2.2 덮이지 않았던 경계 → 이번에 추가
| 경계(작업 단위 사이 계약) | 추가 시험 |
|---|---|
| 서버 소켓 끊김 → 컨트롤러 reconnecting → resume → 같은 자리·ICE 재시작·토스트(웹 전 구간, 실제 서버) | IT-68 |
| 서버 재시작/서명 비밀 변경/참가자 정리 후 복귀 → restarted·expired 종료와 호스트는 계속 복구 | IT-69 |
| 경로 보고 `metrics:path`: 컨트롤러→서버 스키마 통과, 로그에 방·참가자·IP 없음 | IT-70 |
| 마이크 연타 시 `media:state` 속도 제한(RATE_LIMITED)에 걸린 갱신이 버려져 표시·서버 상태가 어긋남 | IT-88 (it.fails, DEF-I-02) |

## 3. 테스트 환경
- 실행 환경: Linux 6.18, Node 22, Vitest 5.0.3(서버·웹 워크스페이스), Playwright 1.63 + 사전 설치 Chromium(`/opt/pw-browsers`), `workers=1`
- 시험 방식: 웹 시험(`apps/web/src/integration/`)이 **실제 서버**(`startServer`, 빈 포트)를 같은 프로세스에서 띄우고 웹의 **실제** `SignalingClient`·`MeetingController`·`api.ts`로 연결한다. 미디어 계층(`MeshTransport`)과 `LocalMedia`만 대역(RTCPeerConnection·장치는 node에 없음). 서버 시험은 소스·문서·설정 파일을 읽어 목록을 대조하거나 실제 소켓으로 이벤트를 발생시킨다
- 테스트 데이터: 시험 내 생성(ASCII 닉네임, 랜덤 방 ID, 테스트 전용 비밀값). 한글 문구는 시험 코드에 하드코딩하지 않고 `strings.ts`의 `S`로만 비교(TC-213)
- 전제 조건: 해당 작업 단위의 06 결과 PASS, `npm ci` 완료, 5·6단계 완료(커밋 580a408)

## 4. 테스트 케이스 및 결과
시험 ID는 IT-60부터(grep으로 미사용 확인, IT-73은 구상만 하고 쓰지 않아 결번). `docs/05-qa/test-cases.md`는 `node scripts/check-docs.mjs --gen`으로 행이 추가되었다.

| ID | 시나리오 | 사전조건 | 실행 절차 | 예상 결과 | 실제 결과 | Pass/Fail | 연결 요구 |
|----|----------|----------|-----------|-----------|-----------|-----------|------|
| IT-68 | 서버가 소켓을 끊으면 컨트롤러가 재연결 상태를 거쳐 토큰으로 같은 자리(selfId·호스트)를 복구하고 ICE를 재시작한다 | 단위 06 전부 PASS | `apps/web/src/integration/clientServerWire.test.ts` 실행 (실제 서버 기동 또는 소스·문서 대조) | 계약 일치 | 통과(1차·2차·3~5차 반복 동일) | Pass | FR-19,FR-20,NFR-03,SEC-03 |
| IT-69 | 재연결 실패 사유별 종료: 서버 재시작(방 없음)은 restarted, 서명 비밀이 바뀌면 expired, 서버가 이미 자리를 정리했으면 expired | 단위 06 전부 PASS | `apps/web/src/integration/clientServerWire.test.ts` 실행 (실제 서버 기동 또는 소스·문서 대조) | 계약 일치 | 통과(1차·2차·3~5차 반복 동일) | Pass | FR-20,FR-21,NFR-06,SEC-03 |
| IT-70 | 경로 보고(direct·relay)는 서버 스키마를 통과해 식별자 없는 로그 한 줄로만 남는다 | 단위 06 전부 PASS | `apps/web/src/integration/clientServerWire.test.ts` 실행 (실제 서버 기동 또는 소스·문서 대조) | 계약 일치 | 통과(1차·2차·3~5차 반복 동일) | Pass | NFR-15,KPI-05,POL-09 |
| IT-88 | 마이크를 짧은 시간에 연타해 서버 media:state 속도 제한(10회, 초당 5)에 걸려도 결국 컨트롤러 표시와 서버·다른 참가자가 보는 상태가 같아져야 한다 (DEF-I-02 재현) | 단위 06 전부 PASS | `apps/web/src/integration/clientServerWire.test.ts` 실행 (실제 서버 기동 또는 소스·문서 대조) | 계약 일치 | expected fail(결함 재현)(1차·2차·3~5차 반복 동일) | Pass(결함 재현 확인) | FR-08,FR-13,SEC-06 |

회귀(이 업무 단위 포함 전체): 5절 참조.

## 5. 커버리지
- 업무 단위 사용자 시나리오 ↔ 케이스: 위 2.1(기존)과 2.2·4절(추가)로 이 업무 단위의 모든 사용자 시나리오(입장·참여·복구·종료 등 해당 영역)가 단위 시험·통합 시험·E2E 중 하나 이상에 연결된다.
- 회귀 결과(2026-10-02, 마지막 실행): `npm run lint` 오류 0 / `npm run typecheck`(shared·server·web·e2e) 오류 0 / `npm test` shared 21 통과, 서버 233 통과·1 expected fail·4 skipped(coturnLive, COTURN_LIVE 미설정), 웹 431 통과·3 expected fail / `node scripts/check-docs.mjs` 점검 통과(TC/IT 764개, 요구 미연결 0) / `npm run test:e2e` 83 통과·1 skipped(IT-29 soak) — **회귀 없음**.
- 커버되지 않은 부분과 사유: 실제 WebRTC·장치·화면 렌더링은 E2E 소유(이번에 재실행 통과). 실기기·장시간·도커·CI는 미검증.

## 6. 결함(Defect) 목록
| ID | 설명 | 재현 절차 | 심각도 | 상태 | 조치 내용 |
|----|------|-----------|--------|------|-----------|
| DEF-I-02 | 컨트롤러가 `media:state`를 fire-and-forget으로 보내고(`pushMediaState`) 서버는 이벤트별 속도 제한(용량 10, 초당 5)을 건다. 입장 직후부터 마이크를 짧은 시간에 12번 눌러 속도 제한에 걸리면 마지막 갱신이 버려지고 재시도·재동기화가 없어, 내 화면은 마이크 켜짐인데 서버와 다른 참가자의 목록은 꺼짐으로 남는다(직접 확인: 클라이언트 micOn=true, 서버 audio=false). 오디오 전송 자체는 로컬 트랙 상태를 따르므로 표시 불일치이며, 호스트 전체 음소거 판단에는 영향 없음. 서버 상한(unit-05)과 클라이언트 전송(unit-06)이 서로의 한계를 가정하지 않은 경계 결함 | IT-88(`it.fails`: 거부가 실제로 있었음을 전제로 단언한 뒤 상태 불일치로 실패) | Low(연타 후에만, 표시 불일치) | Open | Open → 규칙 F: 5단계(unit-06 컨트롤러가 거부·실패 시 마지막 상태를 재전송하거나 디바운스) 반려 후보. 임의 봉합하지 않음 |

관찰(결함 아님, 현재 동작을 시험으로 고정하거나 기록만):
- 실제 RTCPeerConnection·미디어 품질·TURN 경유는 이 단계가 아니라 E2E(IT-21·22·46)가 소유한다. 이번에 E2E 전체를 다시 실행해 83건 통과를 확인했다.
- IT-29(6명 장시간 soak)는 `SOAK_MINUTES`가 없으면 skip되는 설계라 이번에도 skip(1건). 장시간 안정성은 미검증.

- 결함 판정 근거: 위 결함은 `it.fails`로 재현했다(수정되면 일반 시험으로 바꾸라는 신호). IT-68, IT-69, IT-70, IT-88 시험이 모두 실제 서버·실제 소스 대조에서 기대와 일치했고 3회 반복 실행에서도 결과가 같았으며(비결정성 없음), 감시 장치가 비어 있지 않음은 음성 대조군(IT-60, IT-80)으로 확인했다.

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
- 이번 테스트로 커버되지 않는 알려진 리스크: 8단계 접점: ① 복귀(foreground)·재연결은 채팅·호스트 상태 복원(참가자 목록 재수신)과 맞물린다 — IT-68이 목록·호스트 유지를 확인했다 ② 실기기(iOS Safari·인앱 브라우저)는 UAT 소관이라 미검증 ③ DEF-I-02는 호스트가 전체 음소거를 쓰는 시나리오(참가자 목록의 마이크 표시)에서 8단계가 만날 수 있다.
- 후속 조치가 필요한 항목: 결함은 위 6절 조치 내용 참조(규칙 F). 공유 문서 갱신은 아래 "공유 문서 갱신 요청".

## 9. 결론 및 판정
- [ ] PASS
- [x] CONDITIONAL PASS — 조건: 아래 Open 결함이 규칙 F로 5단계에 반려·처리되기 전까지 이 업무 단위의 해당 경계는 "결함 재현(`it.fails`)" 상태다. 결함은 Low~Medium이고 보안·데이터 영향이 없어 8단계 진행을 막지는 않으나 8단계가 결과를 확인해야 한다. 실기기·장시간·실서버·도커·CI 실행은 미검증.
- [ ] FAIL

## 10. 내부 검증 (최소 2회)
- 1차 검증 결과 요약: 이 업무 단위의 사용자 시나리오가 2.1(기존)·2.2(추가) 중 어디에 연결되는지 표로 확인, 추가 시험 전부 통과(결함 재현 시험은 의도대로 실패).
- 2차 검증 결과 요약: "8단계에서 다른 업무 단위와 만날 때 깨지지 않을까"를 의심해 추가 탐침(마이크 연타·종료 사유 전수·재시작 사유 3종)을 시도 → DEF-I-02 발견(재현 시험 IT-88 추가).
- 3~5차: 통합 시험 전체를 3회 추가 반복 실행해 비결정성 없음 확인(웹 integration 18 통과·1 expected fail ×3, 서버 featureContracts 7 통과·1 expected fail ×3).
- 검증 로그 파일 경로: `docs/harness/verify-log_feature-media-recovery-integration-test.md`

## 공유 문서 갱신 요청 (traceability.md·decisions.md는 직접 수정하지 않음)
- traceability.md "통합테스트" 열: FR-08, FR-19, FR-20, FR-21, NFR-03, NFR-06, NFR-15, KPI-05, POL-09, SEC-03 → `IT-68, 69, 70, 88(it.fails)` (feature `media-recovery`). `it.fails` 표시는 "결함 재현 시험, 수정 시 일반 시험으로 전환".
- traceability.md 비고: DEF-I-02(마이크 연타 시 상태 불일치, Open)를 FR-08·FR-13에 표시. 8단계 착수 전 확인 필요 항목으로 올릴 것.
- decisions.md 후보: ① 7단계 업무 단위 6개 구성(방·입장·세션 / 미디어·연결 복구 / 채팅 / 호스트 도구·권한 / 법적·메타·운영자 종료·계측 / 인프라·배포 설정)과 작업 단위 배치 ② 웹 통합 시험이 서버 소스를 상대 경로로 import하는 방식(e2e/fixtures.ts와 같은 관례, 의존성 추가 없음) ③ DEF-I-01·02의 5단계 반려 여부, DOC-I-01은 11단계 이연.
