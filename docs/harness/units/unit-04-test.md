# 테스트 결과서 — unit-04 (방 도메인)

## 1. 개요
- 테스트 대상 (모듈/기능/업무단위/전체 시스템 중 명시): 모듈 — `apps/server/src/rooms/RoomManager.ts`와 `test/roomManager.test.ts`
- 테스트 유형: 단위 (소급 6단계: 인수 조건 추적 + 시험 실행 + 변이 시험 + 적대·경계 보강)
- 적용 Tier (Low/Standard/High, ORCHESTRATOR.md 1장 참고): Standard (DEC-001)
- 적용 속도 트랙 (L1~L5, 06/07 전용): L3(소급)
- 병렬 실행 정보: 병렬 웨이브에서 실행(소급 묶음 A; 동시에 unit-19 테스터, 소급 웹(06~12), 소급 인프라·E2E(13~14) 테스터가 돌았다. 이 호출은 unit-0N 하나만 검증하고 `apps/web/dist`는 건드리지 않았다)
- 테스트 목적: 방 상태 기계(입장·정원·호스트·강퇴·잠금·재접속 유예·화면공유·수명)가 요구(FR-05·14~18·23, POL-01~03·05·06·13, SEC-05)대로 동작하는지 증명하고, 기존 시험이 실제로 단언하는지 변이 시험으로 확인한다.
- 관련 산출물: `docs/harness/03-system-design.md` §1.3·§3·§4·§6, `docs/harness/02-planning.md`, `docs/harness/traceability.md`, `docs/harness/decisions.md`, `docs/05-qa/test-cases.md`, `docs/03-engineering/api-spec.md`, `CLAUDE.md` 보안 규칙
- 테스트 수행자(에이전트): 06 단위 테스터 (소급 묶음 A, 재시작 호출)
- 테스트 일시: 2026-10-01 (코드 커밋 `c2cc28c`(PROD) 기준)

## 2. 테스트 범위 및 제외 범위
- 범위 (In-Scope) — 03 §1.3·§3.1 불변식에서 도출한 인수 조건:
  - AC1 정원: `MAX_PARTICIPANTS` 정확히까지만 입장, 유예 중 참가자도 자리 차지, `full` 플래그 일치, 입장 성공만 `joinSeq` 증가 (POL-01, FR-06·07)
  - AC2 호스트 클레임은 1회만 유효, 호스트 첫 입장 전에는 다른 사람이 입장 불가, 이후 호스트가 나가도 "호스트 전" 상태로 되돌아가지 않음 (FR-23, POL-13, SEC-05)
  - AC3 비밀번호 방은 검증 통과 없이 입장 불가, 호스트 클레임 입장은 검증 면제 (FR-05, SEC-02)
  - AC4 닉네임 유일화(대소문자·NFC 무시, `(n)` 번호는 비어 있는 가장 작은 수) (POL-04, FR-03)
  - AC5 호스트 승계: 접속 중인 입장 순번 최선두, 끊긴 사람은 건너뜀, 모두 끊겼으면 공석이다가 복귀자가 승계, 알림 1회 (FR-17, POL-05)
  - AC6 방 수명: 마지막 퇴장 즉시 삭제, 생성 후 TTL 삭제, 삭제 후 타이머 잔여 없음, 방 수 상한 자리 반환, 방 ID 재사용 없음 (FR-18, POL-02, POL-15)
  - AC7 잠금: 신규 입장 거부·유예 재접속 허용, 같은 값 반복은 이벤트 없음, 승계 후에도 유지 (FR-14, POL-03)
  - AC8 강퇴: 호스트만, 자기 강퇴 불가, 강퇴 대상 IP 해시로 재입장 차단, 유예 중 강퇴 시 타이머 정리, 방 삭제 시 차단 목록도 소멸 (FR-15, POL-06, SEC-05)
  - AC9 전체 음소거: 호스트만, 호스트 제외·끄기만, 각자 다시 켤 수 있음 (FR-16, POL-05)
  - AC10 화면공유 방당 1명·선점 우선, 공유자 퇴장 시 해제, 비공유자 중지 요청은 무효 (FR-12, POL-12)
  - AC11 재접속 유예: 끊김·복귀 이벤트 1회, 중복 끊김 보고가 유예를 연장하지 않음, 복귀 시 타이머 해제, 모르는 방·참가자는 안전하게 거부 (FR-20, POL-08)
  - AC12 참가자 ID·미디어 상태는 서버가 부여/관리하며 무변화 갱신은 이벤트를 만들지 않음 (SEC-04, FR-08)
- 제외 범위 (Out-of-Scope) 및 사유: 소켓 연결·토큰(unit-05), `closeByOperator`의 운영자 인증(unit-16 — 타이머 정리만 공통 확인), 시간 경과의 실제 벽시계(가짜 타이머 사용).

## 3. 테스트 환경
- 실행 환경: Linux 샌드박스, Node v22.22.0, Vitest 5.0.3, 서버 시험은 `PORT=0`(무작위 포트)·`127.0.0.1`만 사용. 브라우저·Docker·외부 네트워크 미사용. DB 없음(메모리 상태).
- 소급 단위: **5단계 노트(`unit-0N-note.md`)가 없다.** 인수 조건(AC)은 `03-system-design.md` §1.3 확정표·§3·§4·§6, 요구(FR/NFR/SEC/POL), `docs/03-engineering/api-spec.md`, 기존 시험과 `CLAUDE.md` 보안 규칙에서 도출했다(아래 AC 표).
- 5단계 게이트 확인(노트가 없어 대체): 커밋 `c2cc28c`에서 `npm run lint`(오류·경고 0), `npm run typecheck`(오류 0)를 이번 실행에서 직접 재확인. CI 통과는 오케스트레이터 전달 사실이며 직접 확인하지 않았다(미검증으로 표기). "자체 코드 리뷰 체크리스트"는 소급이라 존재하지 않아 03 §6.2 코드 대조(보안 규칙 11행)로 대체했다.
- 테스트 데이터: 가짜 타이머(`vi.useFakeTimers`)와 합성 참가자. 순수 도메인 시험이라 서버·포트 불필요.
- 전제 조건 (Preconditions): 소스 무수정. 변이는 `.harness-tmp/mut_06_unit04/` 복사본에서만 적용.

## 4. 테스트 케이스 및 결과
### 4.1 인수 조건 ↔ 시험 추적
| AC | 요구 | 기존 TC(06 이전) | 기존 단언 강도 | 보강 TC(이번) |
|---|---|---|---|---|
| AC1 | POL-01, FR-06·07 | TC-01, 02, TC-33(소켓) | 중 — 정원 3명 한 가지. `full` 플래그(M4-22 생존)·정원 2/6 경계·joinSeq 미검증 | TC-434, 434b |
| AC2 | FR-23, POL-13, SEC-05 | TC-03, 04, TC-34·35·36 | 중 — 클레임 재사용 후 호스트 아님은 확인. 재사용 후 일반 규칙(잠금) 적용·호스트 이탈 후 상태 미검증 | TC-438b |
| AC3 | FR-05, SEC-02 | TC-06 | 중 | TC-438c |
| AC4 | POL-04 | TC-08 | 약 — 번호 재사용·NFC 미검증 | TC-440b |
| AC5 | FR-17, POL-05 | TC-09~13, TC-65 | 중 — **끊긴 참가자 건너뛰기(M4-12)·복귀 시 호스트 재지정(M4-14) 미검증** | TC-435, 435b |
| AC6 | FR-18, POL-02, POL-15 | TC-14~17, TC-07 | 중 — 타이머 누수(M4-27)·자리 반환·ID 재사용 미검증 | TC-440 |
| AC7 | FR-14, POL-03 | TC-18, 19, TC-61 | 중 | TC-438 |
| AC8 | FR-15, POL-06, SEC-05 | TC-20, 21, 13, TC-60·62·63 | 중 — 이벤트 순서·유예 중 강퇴·방 삭제 후 차단 목록 소멸 미검증 | TC-437, 437b |
| AC9 | FR-16, POL-05 | TC-22, TC-64 | 중 — 이미 꺼진 사람·영상 불변 미검증 | TC-439b |
| AC10 | FR-12, POL-12 | TC-23, 24, TC-72 | 중 — **비공유자의 중지 요청(M4-32)·멱등 시작 미검증** | TC-439 |
| AC11 | FR-20, POL-08 | TC-02, 10, 11, 12, TC-52·53 | 중 — **중복 끊김 보고 멱등(M4-17)** 미검증 | TC-436, 436b |
| AC12 | SEC-04, FR-08 | TC-73(소켓), TC-138 | 약 — 무변화 이벤트(M4-31)·ID 유일성 미검증 | TC-439, 440c |

### 4.2 보강 시험 실행 결과 (이번 실행: `npx vitest run test/unit04Adversarial.test.ts` → 16 passed)
| ID | 시나리오 | 사전조건 | 실행 절차 | 예상 결과 | 실제 결과 | Pass/Fail | 비고 |
|----|----------|----------|-----------|-----------|-----------|-----------|------|
| TC-434 | 정원 2(최소 설정): full 플래그 정확히 정원일 때만 true, 3번째 5회 ROOM_FULL, 자리 나면 입장, joinSeq 1·2·3(거부는 소모 안 함), 없는 방 상태 | maxParticipants=2 | join/leave/status | 명세대로 | 기대대로 | Pass | |
| TC-434b | 정원 6: 30회 입장 시도 → 성공 5(+호스트)·ROOM_FULL 25, 6명 초과 없음 | maxParticipants=6 | 루프 | 정확히 6명 | 기대대로 | Pass | |
| TC-435 | 호스트 이탈 시 끊긴 a를 건너뛰고 b 승계, hostChanged 1회, a 복귀 후에도 b 유지 | a 유예 중 | leave(host) | b가 호스트 | 기대대로 | Pass | |
| TC-435b | 남은 사람이 모두 끊긴 채 호스트 이탈 → 공석·알림 없음, 첫 복귀자(b)가 승계(알림 1회) | a·b 유예 중 | leave → resume(b) | b가 호스트 | 기대대로 | Pass | |
| TC-436 | 중복 disconnect는 이벤트·유예를 늘리지 않음(첫 끊김+GRACE에 퇴장, timeout 1회), 접속 중 resume은 이벤트 없음, 복귀는 connected 1회, 복귀 후 유예 타이머 없음 | 가짜 타이머 | 시계 이동 | 명세대로 | 기대대로 | Pass | |
| TC-436b | 모르는 방·참가자에 대한 disconnect/leave/resume/setMedia/startScreen/stopScreen은 예외 없이 거부 코드, 이벤트 없음 | 없음 | 호출 | 안전 | 기대대로 | Pass | |
| TC-437 | 강퇴 상세: 유예 중 강퇴 시 이벤트 순서(left→kick), 이후 timeout 퇴장이 또 나오지 않음, 같은 IP는 닉네임을 바꿔도 KICKED, 다른 IP 허용 | 가짜 타이머 | kick | 명세대로 | 기대대로 | Pass | |
| TC-437b | 비호스트의 강퇴·잠금·음소거·가짜 ID는 FORBIDDEN이며 상태·이벤트 불변, 방 삭제 후 새 방은 차단 목록이 비어 있음, 없는 방은 ROOM_NOT_FOUND | 없음 | 호출 | 안전 | 기대대로 | Pass | |
| TC-438 | 잠금 반복 설정은 이벤트 없음, 변경 시 locked 이벤트, 승계 후 옛 호스트는 해제 불가·새 호스트는 가능 | 없음 | setLocked | 명세대로 | 기대대로 | Pass | |
| TC-438b | 클레임 없는 입장은 호스트 전 항상 HOST_NOT_PRESENT, 호스트 이탈 후에도 hostPresent 유지, 클레임 재사용은 일반 규칙(ROOM_LOCKED)을 따름 | 없음 | join | 명세대로 | 기대대로 | Pass | |
| TC-438c | 비밀번호 방: 호스트 클레임 면제, 게스트 검증 실패 거부·통과 입장, 비밀번호 없는 방은 passwordOk 무관 | 없음 | join | 명세대로 | 기대대로 | Pass | |
| TC-439 | 미디어 무변화 이벤트 없음·patch만 전달, 화면공유 멱등 시작·SCREEN_BUSY가 기존 공유자 불변·비공유자 stop 무효·중복 stop 이벤트 없음 | 없음 | 호출 | 명세대로 | 기대대로 | Pass | |
| TC-439b | 전체 음소거: 호스트 마이크 유지·이미 꺼진 사람 개별 이벤트 없음·영상 불변·각자 다시 켬 | 없음 | muteAll | 명세대로 | 기대대로 | Pass | |
| TC-440 | 방 정리: 유예 둘만 남은 방은 유예 만료 후 삭제·타이머 잔여 0·이후 입장·재접속 거부, 강퇴 후 타이머 0, 방 수 상한 자리 반환·ID 재사용 없음, **운영자 폐쇄 후 유예 타이머 잔여 0** | 가짜 타이머, maxRooms=3 | 시계 이동 | 타이머 baseline 복귀 | 기대대로 | Pass | 초안에서 baseline 계산 실수로 1회 실패 → 시험 수정(제품 정상) |
| TC-440b | 중복 닉네임: 대소문자 무시, 번호 재사용(퇴장 후 `(2)` 다시), NFD 한글도 같은 이름 | maxParticipants=10 | join | 명세대로 | 기대대로 | Pass | 초안에서 정원 4라 실패 → 시험 수정 |
| TC-440c | 참가자 ID: 같은 닉네임·IP로 120명을 만들어도 전부 다른 12자 난수 | maxParticipants=12, maxRooms=100 | join | 유일 | 기대대로 | Pass | |

### 4.3 기존 시험 재실행
- `npx vitest run test/roomManager.test.ts` → 24개 통과. 보강 16개 포함 40개 통과. 소켓 경유 동작은 `signaling.test.ts` 35개 통과(TC-60~65 등).

### 4.4 변이 시험 결과 (임시 복사본 `.harness-tmp/mut_06_unit04/`, 총 34개)
| ID | 변이 내용 | 기존 시험(06 이전) | 보강 후 |
|---|---|---|---|
| M4-01 | 정원 off-by-one(>= -> >) | 검출 TC-01 | 검출 TC-01 |
| M4-02 | 강퇴 IP 차단 제거(재입장 허용) | 검출 TC-13 | 검출 TC-13 |
| M4-03 | 강퇴 시 IP 키 미기록 | 검출 TC-13 | 검출 TC-13 |
| M4-04 | 강퇴 호스트 권한 검사 제거 | 검출 TC-20 | 검출 TC-20 |
| M4-05 | 잠금 호스트 권한 검사 제거 | 검출 TC-18 | 검출 TC-18 |
| M4-06 | 전체 음소거 호스트 권한 검사 제거 | 검출 TC-22 | 검출 TC-22 |
| M4-07 | 자기 강퇴 허용 | 검출 TC-20 | 검출 TC-20 |
| M4-08 | 잠금 방 입장 허용 | 검출 TC-19 | 검출 TC-19 |
| M4-09 | 호스트 클레임 재사용 허용 | 검출 TC-04 | 검출 TC-04 |
| M4-10 | 비밀번호 검증 결과 무시 | 검출 TC-06 | 검출 TC-06 |
| M4-11 | 호스트 입장 전 입장 허용 | 검출 TC-03 | 검출 TC-03 |
| M4-12 | 호스트 승계 시 연결 끊긴(유예 중) 참가자도 후보 | **생존**(전체 시험에서도) | 검출 TC-435 |
| M4-13 | 호스트 승계 순서 역전 | 검출 TC-09 | 검출 TC-09 |
| M4-14 | 재접속 시 호스트 재지정 누락 | **생존**(전체 시험에서도) | 검출 TC-435b |
| M4-15 | 재접속 시 유예 타이머 미해제(복귀 후에도 퇴장) | 검출 TC-11 | 검출 TC-11 |
| M4-16 | 재접속 유예 3배 | 검출 TC-10 | 검출 TC-10 |
| M4-17 | disconnect 멱등성 제거(중복 이벤트·유예 연장) | **생존**(전체 시험에서도) | 검출 TC-436 |
| M4-18 | 마지막 참가자 퇴장 시 방 삭제 누락 | 검출 TC-14 | 검출 TC-14 |
| M4-19 | 퇴장 시 화면공유 상태 미해제 | 검출 TC-24 | 검출 TC-24 |
| M4-20 | 입장 시 빈 방 타이머 미해제 | 검출 TC-17 | 검출 TC-17 |
| M4-21 | 화면공유 동시 1명 제한 제거 | 검출 TC-23 | 검출 TC-23 |
| M4-22 | status.full off-by-one | **생존**(전체 시험에서도) | 검출 TC-434 |
| M4-23 | 방 수 상한 off-by-one | 검출 TC-07 | 검출 TC-07 |
| M4-24 | 전체 음소거가 호스트도 음소거 | 검출 TC-22 | 검출 TC-22 |
| M4-25 | 중복 닉네임 번호 시작값 변경 | 검출 TC-08 | 검출 TC-08 |
| M4-26 | 중복 닉네임 비교에서 대소문자 구분 | 검출 TC-08 | 검출 TC-08 |
| M4-27 | 퇴장 시 유예 타이머 미해제(타이머 누수) | **생존**(전체 시험에서도) | 검출 TC-440 |
| M4-28 | 방 삭제 시 타이머 미정리(방 정리 누락) | 다른 단위 시험만 검출 | 검출 TC-440 |
| M4-29 | 빈 방 TTL 10배 | 검출 TC-15 | 검출 TC-15 |
| M4-30 | 호스트 퇴장 시 승계 누락 | 검출 TC-09 | 검출 TC-09 |
| M4-31 | 미디어 상태 무변화에도 이벤트 발행 | **생존**(전체 시험에서도) | 검출 TC-439 |
| M4-32 | 화면공유 중지를 공유자 아닌 사람도 가능 | **생존**(전체 시험에서도) | 검출 TC-439 |
| M4-33 | 강퇴 시 kick 이벤트(소켓 종료) 누락 | 다른 단위 시험만 검출 | 검출 TC-437 |
| M4-34 | 재접속 시 없는 참가자 ID를 다른 참가자로 대체 | 검출 TC-12 | 검출 TC-12 |

- 요약: 변이 34개 중 **기존 시험 단독 검출 25개(74%)**, 다른 단위 시험이 추가 2개(M4-28, M4-33), **7개는 전체 시험에서도 생존**. 보강 후 **34개 전부 검출(100%)**. 동등 변이 없음.

## 5. 커버리지
- 커버리지 지표: 라인/브랜치 도구 미설치로 **미측정**. 대체: AC 12개 모두 TC 대응(100%), 변이 점수 기존 74%→보강 후 100%(34/34).
- 커버되지 않은 부분과 사유: ① `Room.banned.ids`는 값을 쓰기만 하고 어디서도 읽지 않는 죽은 상태다(아래 관찰). ② 벽시계 지연(가짜 타이머 사용)과 대규모 방 수의 메모리 사용은 MC-04 부하 스모크 소관.

## 6. 결함(Defect) 목록
| ID | 설명 | 재현 절차 | 심각도(Critical/High/Medium/Low) | 상태(Open/Fixed/Deferred) | 조치 내용 |
|----|------|-----------|-----------------------------------|----------------------------|-----------|
| DEF-001 | **시험 구멍**: 변이 7개(끊긴 참가자도 호스트 승계 후보, 복귀 시 호스트 재지정 누락, 중복 disconnect 멱등성, `status.full` off-by-one, 퇴장 시 유예 타이머 미해제, 무변화 미디어 이벤트, 비공유자의 화면공유 중지)가 기존 시험 전체에서 검출되지 않음. 제품 코드는 정상 | 복사본에서 M4-12·14·17·22·27·31·32 적용 후 기존 시험 실행 → 통과 | Medium (호스트 승계·재접속은 FR-17·20의 핵심 시나리오) | Fixed | TC-434~440c 추가 → 전부 검출 |
- 제품 코드 결함: **없음**. 근거: 상태 기계 불변식(정원·호스트·강퇴·잠금·유예·타이머·방 삭제)을 보강 16개와 기존 24개가 현재 코드에서 모두 통과했다.
- 관찰(결함 아님): ① `banned.ids`는 쓰기만 하고 읽지 않는다 — 강퇴된 참가자는 `participants`에서 삭제되고 참가자 ID가 재사용되지 않아 안전하나 죽은 데이터이므로 정리를 제안(범위 밖 리팩터링이라 제안만). ② 강퇴가 IP 해시로 막는다는 CGNAT 오차단 한계는 03 D-4에 이미 기록된 수용 사항이며 TC-437이 "같은 IP는 거부, 다른 IP 허용"을 고정한다.

## 7. 테스트 환경 정리(Teardown) 확인 — 규칙 K
- 이번 테스트에서 생성한 임시 아티팩트 목록 (경로 포함): `.harness-tmp/mut_06_unit04/`(변이 시험용 저장소 복사본 — 소스·시험 복사 + 루트 `node_modules` 심볼릭 링크 모음. 변이는 이 복사본에서만 적용하고 변이마다 원본 파일로 복구)와 변이 목록·결과 JSON·실행 스크립트(세션 scratchpad, 저장소 밖)
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
- 이번 테스트로 커버되지 않는 알려진 리스크: 방 수십 개·참가자 6명 동시 부하에서의 지연(MC-04), 실제 네트워크 단절 시 유예 타이밍(IT-20류 E2E, 다른 단위).
- 후속 조치가 필요한 항목: 없음(제품 변경 불필요). 선택 제안: `banned.ids` 정리.

## 9. 결론 및 판정
- [x] PASS — 다음 단계 진행 가능 (7절 Teardown 확인 완료가 전제조건)
- [ ] CONDITIONAL PASS — 조건:
- [ ] FAIL — 사유 및 재작업 요청 사항:

## 10. 내부 검증 (최소 2회, `verification-log-template.md` 사용)
- 1차 검증 결과 요약: AC 12개 ↔ TC 추적, 기존 단언 평가, 변이 7개 생존 확인, 내 시험 오류 2건(타이머 baseline 계산, 정원 설정) 수정.
- 2차 검증 결과 요약: 변이 M4-28이 방 삭제 경로(운영자 폐쇄)에서만 의미가 있음을 확인해 TC-440에 운영자 폐쇄 케이스 추가 후 34/34 재확인, 동등 변이 가능성 재검토. 추가 결함 없음.
- 검증 로그 파일 경로: `docs/harness/verify-log_unit-04-test.md`
