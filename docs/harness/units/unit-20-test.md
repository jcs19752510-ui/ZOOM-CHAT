# 테스트 결과서 — unit-20 (NFR-14 mesh·TURN 실측 절차서, 문서 단위)

## 1. 개요
- 테스트 대상: 문서 `docs/05-qa/measurement-guide.md`(v0.1)와 `docs/README.md` 인덱스 한 줄. 코드 없음.
- 테스트 유형: 단위 (문서 검증: 사실 일치·따라 하기 가능성·미수행 표기)
- 적용 Tier: Standard (DEC-001)
- 적용 속도 트랙: L3
- 병렬 실행 정보: 병렬 웨이브 W0에서 실행(동시: unit-0, unit-18)
- 테스트 목적: 문서가 가리키는 저장소 요소가 실재하고 맞는지, 인수 조건 누락, 측정 안 한 것을 한 것처럼 쓴 곳, 비전문가 따라 하기, 보안 주의 문구를 확인한다.
- 관련 산출물: `docs/harness/units/unit-20-note.md`, `docs/harness/03-system-design.md` §3·§5.2·§5.4, `docs/05-qa/performance-test.md`, `docs/05-qa/phone-test-guide.md`
- 테스트 수행자: 06 단위 테스터(에이전트)
- 테스트 일시: 2026-10-01 (코드 커밋 a3eb1fc 기준)

## 2. 테스트 범위 및 제외 범위
- In-Scope: note 인수 조건 1~6 중 1~5, 지시된 ①~⑥ 점검.
- Out-of-Scope: 인수 조건 6(사람이 실제 절차를 수행, Chrome webrtc-internals 항목명·coturn 로그·Safari 통계)은 **미수행**. 실제 브라우저·실기기·인터넷 TURN이 없어 확인 불가. 문서 수정(오케스트레이터 몫).

## 3. 테스트 환경
- 실행 환경: Linux 샌드박스, 저장소 읽기 + grep + `npm run check:docs`. 브라우저·webrtc-internals 사용 불가.
- 테스트 데이터: 없음. 전제: 코드·문서 수정 없음.

## 4. 테스트 케이스 및 결과
| ID | 인수 조건 | 시나리오 | 실행 절차 | 예상 결과 | 실제 결과 | Pass/Fail | 비고 |
|---|---|---|---|---|---|---|---|
| TC-01 | AC1 | 첫 줄 용도, 버전·작성일·상태·주도·변경 이력·5인 검토 | 파일 읽기 | 모두 존재 | 1행 용도, 표(버전 0.1·2026-10-01·초안·주도), 변경 이력, §9 5인 검토 있음 | Pass | |
| TC-02 | AC2 | 측정값 칸 비어 있음, "실측했다" 서술 없음 | §5·§7 읽기, 수치 서술 검색 | 빈 칸, 미수행 | §5.1~5.3 빈 양식, §7 "미수행". 단 §3 표에 "루프백에서는 0.5초 수준" 수치 서술 있음 | **Fail** | DEF-001 |
| TC-03 | AC2 | 모든 합격 기준에 [코드]/[요구]/[미확인] | §3 표 12행 확인 | 전 행 표기, [미확인]에 수치 근거 주장 없음 | 표기는 전 행 있음. [요구]로 표기된 "체감 품질" 아님([미확인]). 그러나 체감 품질 행이 "UAT-06과 같은 평가"라고 하나 UAT-06 기준은 5점 척도가 아님 | **Fail** | DEF-002 |
| TC-04 | AC3 | 인원 2/4/6·화면공유·기기×망 | §2·§4.5 | 모두 있음 | 있음 | Pass | |
| TC-05 | AC3 | 업링크·fps·limitationReason·CPU·첫 영상·relay 비율 단계별 | §4.1~4.4 | 단계별 방법 | 모두 있음. 단 업링크 증분(§4.2-4)에 "시작 시점 bytesSent 기록" 단계가 없다(누적값 읽기만 안내) | **Fail** | DEF-004 |
| TC-04b | AC4 | 코드 상수 1.5M/700k/400k | `MeshTransport.ts` `qualityTier` 확인 | ≤2:1.5M, ≤4:700k/1.5, 그 외 400k/2, 화면 1.5M | 일치(`qualityTier`, `SCREEN_MAX_BITRATE=1_500_000`). 5·6명 2.0Mbps 계산도 TC-211과 일치 | Pass | |
| TC-06 | AC5 | README 링크·대상 존재 | `docs/README.md:84` 확인, 파일 존재 확인 | 링크 있고 파일 있음 | 있음 | Pass | |
| TC-07 | ① | 참조 ID·문서·경로 실재 | NFR-02/03/04/13, KPI-05, UAT-06, IT-20/29/30, TC-210/211, `runbook.md`, `phone-test-guide.md §7`, `performance-test.md §3`, `total-quota=300`(`infra/coturn/turnserver.conf:33`), `load-smoke`(`scripts/load-smoke.mjs`), `MeshTransport.ts` | 모두 실재·의미 일치 | 모두 실재. IT-20·29·30, TC-210·211 의미 일치. NFR-02(5초/p95 10초)·NFR-03(20초)·NFR-04 일치. 예외: DEF-002, DEF-003, DEF-005 | Pass(예외는 별도 결함) | |
| TC-08 | ① | §4.3-5 "명령은 runbook.md를 따른다" | runbook.md에서 coturn 로그·할당 확인 명령 검색 | 명령 존재 | runbook에는 "coturn 로그", "coturn 통계"라는 말뿐, 구체 명령 없음 | **Fail** | DEF-003 |
| TC-09 | ① | NFR-14 ID 추적 | prd.md·`docs/traceability.md`에서 NFR-14 검색 | 정의·행 존재 | `docs/` 정식 문서(01-planning, traceability.md)에 NFR-14 정의·행 없음(harness 문서에만 있음). §6.3이 "`docs/traceability.md`의 NFR-14 행"을 갱신하라고 안내 | **Fail** | DEF-005 |
| TC-10 | ① | 프로젝트 명령·환경변수 | 문서에서 `npm`·env 검색 | 존재하는 것만 | `npm`·환경변수 직접 언급 없음(phone-test-guide로 위임). 존재 확인할 대상 없음 | Pass(해당 없음) | |
| TC-11 | ① | webrtc-internals·candidate-pair 서술 | 실제 브라우저 확인 불가. 앱 코드 `getQuality`가 `candidate-pair`·`state==='succeeded'`·`nominated`를 쓰는지만 확인 | 용어 일치 | 코드 쪽 용어는 일치(`MeshTransport.ts:283`). 브라우저 화면 항목명은 **미수행** | 미수행(부분 Pass) | 문서 자체가 미확인 표기 |
| TC-12 | ③ | 측정 안 한 것을 한 것처럼 쓴 문장 | 문서 전체 훑기 | 없음 | DEF-001 외 없음. §0·§7·§8 모두 "미수행·미확인" | Pass(DEF-001 제외) | |
| TC-13 | ④ | 비전문가 단계 점프·용어 | §4 읽기 | 용어 설명 | DEF-004(시작값), DEF-006(host/srflx/prflx/relay, 업링크, CGNAT, PeerConnection 설명 부족) | **Fail** | |
| TC-14 | ⑤ | `npm run check:docs` | 실행 | 통과 | "점검 통과"(문서 60개, 미연결 요구 0, FR/UX 미참조 0). note가 말한 3건 실패는 현재 재현되지 않음(다른 단위가 해소한 것으로 추정, 미조사) | Pass | |
| TC-15 | ⑥ | 보안·개인정보 | §4.2-5, §6.4~5 | IP 노출 주의 | 덤프 공개 금지·커밋 금지·영상 개인정보 있음. 단 §4.3 후보 쌍 화면 **스크린샷**(IP 포함)과 `candidate-pair` 값을 §5.2 비고·메신저에 옮길 때의 경고가 §4.3에는 없음(§6.4는 "스크린샷 커밋 금지"만, 공유 금지 아님) | **Fail**(Low) | DEF-007 |
| TC-16 | 경계 | 6명을 한 컴퓨터로 만드는 경우 표기 | §1·§5.1 | 참가 방식 칸 | 있음 | Pass | |
| TC-17 | 예외 | 기기 없을 때/측정 불가 | §1 "미측정" 기록, §5.1 판정 "미측정" | 대안 존재 | 있음 | Pass | |

## 5. 커버리지
- 인수 조건 1~5 각각 1개 이상 TC에 대응(AC1=TC-01, AC2=TC-02·03, AC3=TC-04·05, AC4=TC-04b, AC5=TC-06). AC6 미수행.
- 커버되지 않은 부분: 실제 브라우저 화면·coturn 로그·Safari(수동 확인 필요, 사유: 환경 없음).

## 6. 결함(Defect) 목록
| ID | 설명(위치) | 재현 | 심각도 | 상태 | 제안 수정문 |
|---|---|---|---|---|---|
| DEF-001 | §3 "첫 원격 영상까지" 행의 "루프백에서는 0.5초 수준이라": 저장소 어디에도 근거(측정 기록)가 없는 수치. 측정하지 않은 값을 쓴 것 | `grep "0.5초" docs`에서 이 문서만 나옴 | Medium | Open | 괄호를 "(루프백 시험의 첫 영상 시간은 이 저장소에 기록된 값이 없어 미확인. 실망에서 처음 의미 있는 값이다)"로 바꾸거나 삭제 |
| DEF-002 | §3 "체감 품질 5점 만점 평균 3점 이상(UAT-06과 같은 평가)": UAT-06 기준은 "대부분의 참가자가 '쓸 만하다'고 평가"(uat.md:29)이고 5점 척도가 아님 | `docs/05-qa/uat.md:29` | Medium | Open | "5점 만점 평균 3점 이상(제안, UAT-06의 '쓸 만하다' 판단을 점수로 옮긴 것이며 UAT-06 자체는 점수 기준이 아니다)"로 수정, 근거 구분 [미확인] 유지 |
| DEF-003 | §4.3-5 "명령은 `docs/06-ops/runbook.md`를 따른다": runbook에 coturn 로그·할당 확인 명령이 없다(문구만). 존재하지 않는 명령 참조 | runbook.md grep(coturn/compose/logs) | Medium | Open | "coturn 컨테이너 로그를 보는 명령은 runbook.md에 아직 없다(미확인). 운영자가 `docker compose logs`로 보는 방식은 배포 환경 확정 후 runbook에 추가 필요"로 교체하거나, runbook에 명령 추가를 별도 작업으로 등록 |
| DEF-004 | §4.2-2~4: 5분 증분 계산에 필요한 "시작 시점 bytesSent 값 기록"과 "5분 후 값" 단계 없음(webrtc-internals 값은 누적). 비전문가는 증분을 못 구함 | 문서 §4.2 읽기 | Medium | Open | 4.2-2에 "통화 시작 1분 후 각 연결의 `bytesSent`를 적어 둔다(시작값). 시작값 시각에서 5분 뒤 다시 읽어 차이를 쓴다. 증분 ÷ 300초 × 8"로 보강. 또는 webrtc-internals가 제공하는 `bytesSent_in_bits/s` 그래프 평균을 읽는 대안 병기(항목명은 미확인) |
| DEF-005 | 제목 "(NFR-14)"와 §6.3 "`docs/traceability.md`의 NFR-14 행": 정식 요구 문서(prd)·`docs/traceability.md`에 NFR-14 정의·행이 없음. §6.3의 안내대로는 갱신할 행이 없다 | `grep NFR-14 docs/01-planning docs/traceability.md` 결과 없음 | Low | Open | §6.3을 "NFR-14는 하네스 문서(`docs/harness/02-planning.md`, 추적성)에 정의돼 있고 `docs/traceability.md`·prd에는 아직 없다. 반영 시 함께 추가"로 보정(또는 정식 문서 반영을 오케스트레이터 후속으로 등록) |
| DEF-006 | §4.2·4.3: 용어 설명 누락(업링크=내 기기에서 나가는 속도, host/srflx/prflx/relay 뜻, CGNAT, PeerConnection=참가자 한 명과의 연결) | 문서 읽기 | Low | Open | §4.3 앞에 한 줄 용어표 추가: host=같은 네트워크 직접 주소, srflx/prflx=공인 주소를 거친 직접 연결, relay=TURN 서버가 중계 |
| DEF-007 | §4.3: 후보 쌍 화면·값에 IP가 있는데 스크린샷·메신저 공유 금지 문구가 §4.2-5(덤프)에만 있다 | §4.3 읽기 | Low | Open | §4.3에 "이 화면 캡처에도 IP가 보이므로 공유하지 말고 값(host/srflx/relay)만 표에 적는다" 추가 |

- 결함이 0건이 아니므로 근거 문장은 불필요. 위 7건은 모두 문서 문장 수정(코드 변경 없음)이며 오케스트레이터 수정 대상. 직접 수정하지 않았다(지시).
- 단위 밖 원인 가능성: DEF-003(runbook 쪽 명령 부재), DEF-005(정식 요구 문서·`docs/traceability.md` 쪽 NFR-14 미반영)은 이 단위 밖 문서와 관련.

## 7. 테스트 환경 정리(Teardown) 확인 — 규칙 K
- 생성한 임시 아티팩트: 없음(해당 없음 — 읽기·grep·`npm run check:docs`만 사용, venv·임시 DB·임시 설정 없음). `.harness-tmp/`는 존재하지 않음.
- `.harness-tmp/` 하위에서만 생성했는가: [x] 예(생성물 없음)
- 정리 완료 여부: 해당 없음. 
- 정리 후 `git status` (`git status --short` 실행 결과): 출력 없음(작업 트리 깨끗; 이 결과서·verify-log 작성 전 시점). 결과서·verify-log 작성 후에는 이 두 신규 파일이 미추적으로 보이며 이것이 이 단위의 의도된 산출물이다.
- 병렬 실행: 실행 시점에 다른 단위(unit-0·unit-18)의 변경분은 보이지 않았다(a3eb1fc에 통합된 상태). 이 실행이 만든 임시 아티팩트·미추적 잔여물 없음(의도된 산출물 2건 제외). 웨이브 종료 후 전체 트리 점검은 오케스트레이터 몫.
- 강제 중단: [x] 없음

## 8. 리스크 및 잔존 이슈
- 커버되지 않는 리스크: webrtc-internals 실제 항목명, coturn 로그 문구, Safari/iPhone 통계, 실제 수행 가능성(사람이 따라 해 보는 시험)은 **미수행**.
- 후속: DEF-001~007 수정 후 재검증, 사용자 실기기 측정 수행, runbook coturn 로그 명령 추가, NFR-14 정식 문서 반영.

## 9. 결론 및 판정
- [x] PASS (3차 검증, 아래 "3차 재검증" 참조)
- [ ] CONDITIONAL PASS
- [ ] FAIL(2차까지의 판정, 3차에서 해소) — 사유: 근거 없는 수치 서술(DEF-001), 존재하지 않는 명령 참조(DEF-003), UAT-06 오인용(DEF-002), 증분 계산 단계 누락(DEF-004) 등 문서 수정 필요 7건. 오케스트레이터가 문서를 수정하면 재검증. (Teardown은 완료, 미수행 항목은 위에 명시)

## 10. 내부 검증
- 1차: 인수 조건 1~5 커버, 결함 7건 도출(상세는 로그).
- 2차: 테스트 누락 재검토 후 DEF 보강 없음, 판정 유지.
- 검증 로그: `docs/harness/verify-log_unit-20-test.md`

## 공유 문서 갱신 요청
| REQ-ID | 컬럼 | 값 |
|---|---|---|
| NFR-14 | 단위테스트 | unit-20: FAIL(문서 결함 7건, DEF-001~007), 수정 후 재검증 필요. 실측 미수행 |

## 3차 재검증 (오케스트레이터 문서 수정 후, 작업 트리 미커밋 상태)
| 결함 | 결과 | 확인 근거 |
|---|---|---|
| DEF-001 | Fixed | 문구가 IT-24 약 0.4~0.5초, `performance-test.md` §2 근거로 변경. performance-test.md에 "432–487ms, 실제 인터넷 값 아님" 있음, IT-24는 test-cases.md:48에 실재 |
| DEF-002 | Fixed | UAT-06 기준("쓸 만하다", 점수제 아님)과 일치, `uat.md` 링크 대상 존재 |
| DEF-003 | Fixed | runbook에 명령 없음을 인정, `infra/docker-compose.yml`와 서비스명 `coturn`(4행) 실재. 로그 문구는 미확인 표기. 명령 자체는 실행하지 않음(도커 없음, 미수행) |
| DEF-004 | Fixed | §4.2에 시작값·종료값·차이 계산 단계 추가 |
| DEF-005 | Fixed | 머리말과 §6.3이 `docs/harness/traceability.md`로 수정, 해당 파일에 NFR-14 행 존재 |
| DEF-006 | Fixed | 용어 표(업링크·PeerConnection·host/srflx/prflx/relay·CGNAT·TURN) 추가 |
| DEF-007 | Fixed | §4.3-6에 IP 캡처 공유 금지 추가 |
- 새 결함: 없음(참조·사실 오류 없음). 참고(결함 아님): §4.2-2의 "통화를 시작하고 5분 유지"와 시작값 기록 시점이 약간 다르나 §4.2-4가 명확히 설명.
- `npm run check:docs`: **실패 6건**, 모두 추적성 표 TC 열 불일치(NFR-10, SEC-06, SEC-10, UX-01, UX-03, UX-10). measurement-guide.md와 무관한 다른 단위의 진행 중 변경(--gen 필요)이며, 이 문서의 양식·ID 점검 오류는 없음. 이 단위의 판정에서 구분해 제외한다(2차 때는 통과였음).
- Teardown: 임시 아티팩트 없음. `git status --short`: ` M apps/server/test/config.test.ts`, ` M docs/05-qa/measurement-guide.md`(오케스트레이터 수정), ` M packages/shared/src/schemas.test.ts`, `?? apps/web/src/strings.test.ts`, `?? docs/harness/units/unit-20-test.md`, `?? docs/harness/verify-log_unit-20-test.md`, `?? e2e/legalfooter.spec.ts`, `?? e2e/zz_probe.spec.ts`. 코드·e2e 항목은 다른 병렬 단위 소유, 이 단위가 만든 잔여물 없음.
- 최종 판정: PASS (남은 결함 0건). 실제 webrtc-internals·coturn 화면 확인은 여전히 미수행.
