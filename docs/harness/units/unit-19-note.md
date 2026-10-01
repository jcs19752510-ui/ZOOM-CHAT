# unit-19 구현 노트: TURN 릴레이 비율 계측과 KPI 로그 (NFR-15)

- 속도 트랙: **L3** (개인정보 비식별 계측이므로 보안 인수 조건은 L4 수준으로 시험)
- 실행: W3 단독 실행(동시 단위 없음)

## 구현 범위
- 웹 `media/pathType.ts`(신규, 순수 함수 `classifyPath`): `getStats()` 결과에서 `transport.selectedCandidatePairId` 우선, 없으면 `nominated && succeeded` 쌍을 고르고 로컬·원격 `candidateType`으로 판정. 하나라도 `relay`면 `relay`, 둘 다 host/srflx/prflx면 `direct`, 쌍 없음·후보 누락·알 수 없는 타입은 `null`(보고 안 함).
- `MediaTransport.ts`: `MediaTransportEvents.pathType(id, path)` 추가(기존 멤버 불변).
- `MeshTransport.ts`: ICE `connected/completed` 때 `probePath`. 피어별 `lastPath`와 다를 때만 보고(연결당 1회, ICE restart 뒤 경로가 바뀌면 1회 더). 통계가 아직 반영 전이면 1초 간격 최대 2회 재시도. `getStats` 미지원·예외는 조용히 건너뜀. `removePeer`에서 타이머 정리.
- `MeetingController.ts`: `pathType` → `signaling.request('metrics:path', {v:1, path}, 3000)`를 기다리지 않고(fire-and-forget) 전송. peerId·IP·SDP는 보내지 않는다.
- 서버 `socket/server.ts`: `metrics:path` 핸들러(공통 `on()` 경로: rate limit 버킷 10/0.5s, zod strict, 입장 필수). `logger.info({kpi:'path', path}, 'peer path')` 한 줄만 기록. 소켓당 로그 상한 20회(초과분은 ack ok만 하고 기록 생략). 카운터·엔드포인트는 03 §5.4대로 만들지 않음.
- 새 의존성·package.json·lockfile·ci.yml 변경 없음.

## 설계서 대비 편차
- 03 §4.3은 "피어당 1회"를 말하고 본 지시는 "경로가 바뀌면 1회 더"를 요구 → 후자를 따름(03과 모순 아님, 확장).
- 03 §7.1의 `participant join rejected`·`participant resumed`·`resume failed` 로그(KPI-01·04)는 이번 지시 범위(NFR-15 경로 계측)에 포함되지 않아 **구현하지 않음**. 별도 단위/후속 필요 여부는 오케스트레이터 판단.
- 03 §6의 TC-350~352 / IT-36 제안 번호 대신 지시에 따라 TC-400~406, IT-45~46 사용.
- 소켓당 로그 상한(20)은 03에 없는 추가 방어이며 속도 제한과 별개로 둠.
- 테스트 편의: `e2e/fixtures.ts`의 `extraServer`에 선택 인자 `logLines`(로그 캡처) 추가. 제품 동작에 영향 없음.

## 자동 시험 (TC/IT)
- TC-400~402(`apps/web/src/media/pathType.test.ts`): 판정 경계.
- TC-403~406(`apps/server/test/metricsPath.test.ts`): 정상+로그 필드·식별자 부재(실제 로그 캡처), 잘못된 값/추가 키/버전, 미입장, 속도 제한.
- IT-45(`e2e/pathMetrics.spec.ts`): 루프백 통화에서 `direct` 2건(참가자당 1회), 로그에 방 ID·닉네임·IP 없음.
- IT-46(`e2e/turn.spec.ts`): FORCE_RELAY+coturn에서 `relay` 2건, direct 없음.
- 문서: `docs/05-qa/test-cases.md` 행 추가, `check-docs --gen` 후 `npm run check:docs` 통과.

## 게이트 1 (정적 분석)
`npm run lint` 통과(처음 `no-useless-assignment` 1건 수정), `npm run typecheck` 통과, `npm test` 통과(server 154 passed/4 skipped, web 56, shared 16), `npm run test:e2e` 67 passed/1 skipped(IT-29 soak은 SOAK_MINUTES 지정 시에만), `npm run check:docs` 통과.

## 게이트 2 (자체 리뷰)
- [x] 설계서 명세와 구현 일치(위 편차 외)
- [x] 에러 처리: 통계 실패는 의도적으로 무시(요구), 서버 예외는 공통 `on()`이 격리
- [x] 경계 검증: 서버 zod strict + 입장 확인 + rate limit
- [x] 시크릿 없음
- [x] 새 패키지 없음
- [x] 범위 밖 변경 없음(fixtures 로그 캡처 인자만 시험 보조)

## 수동 확인 필요
- 실제 NAT/CGNAT 환경에서의 `direct`/`relay` 비율과 Safari/Firefox의 선택 쌍 통계 형식(`selectedCandidatePairId` 지원 차이)은 미검증. 지원 안 되면 `nominated` 폴백 또는 null(미보고).
- 로그 집계 명령(runbook)은 이번 단위에서 작성하지 않음: `grep '"msg":"peer path"'`의 `path` 값 비율.

## 6단계 테스터 인수 조건
1. 루프백 2인 통화 후 서버 로그에 `peer path`가 정확히 2줄, 각 `{"kpi":"path","path":"direct"}`, 이 외 식별 키(room, id, ip, nickname 등) 없음.
2. TURN 강제(IT-21 방식)에서 2줄 모두 `relay`.
3. `metrics:path`에 `{v:1,path:'relay',peerId|ip:...}`, `v:2`, 대소문자 다른 값, 비객체 → `INVALID_PAYLOAD`, 로그 없음.
4. 입장 전 소켓 → `NOT_JOINED`. 10회 초과 연속 전송 → `RATE_LIMITED`(15회 거부 시 연결 종료는 기존 규칙).
5. 구 서버(핸들러 없음) 상황에서도 클라이언트 통화에 영향 없음(응답 비대기, 미검증: 자동 시험 없음).
6. 사용자 화면에 변화·알림 없음.

## 공유 문서 갱신 요청
- traceability.md: NFR-15 — 작업 단위 `unit-0, unit-19`, 구현 상태 "구현됨(로그 집계까지, 수집기 없음)", 단위테스트 `TC-400~406`, 통합 `IT-45·46`(기존 제안 TC-350~352·IT-36 대체).
- traceability.md: KPI-05 — 계측 구현됨(`peer path` 로그). KPI-01·04 로그(03 §7.1)는 미구현.
- decisions.md: 기록 요청 없음(DEC-012 이행). 단, 03 §7.1의 KPI-01·04 로그를 별도 단위로 둘지 결정 요청.
