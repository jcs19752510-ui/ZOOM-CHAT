# 테스트 결과서 — unit-11 (웹 참가자·호스트 도구: components/ParticipantsPanel.tsx) — 소급 6단계

## 1. 개요
- 대상: `ParticipantsPanel.tsx`(FR-13 참가자 목록, FR-14 잠금, FR-15 강퇴, FR-16 전체 음소거, FR-17 승계 후 표시, SEC-05 도구 숨김은 보조). **5단계 노트 없음 — 소급 단위**라 인수 조건은 `prd.md` FR-13~17 인수 조건, `screen-spec.md` 참가자 패널(SCR), CLAUDE.md 접근성·보안 규칙에서 도출했다.
- 유형: 단위(소급 검증 + 변이 시험으로 기존 시험 품질 점검 + 시험 보강). Tier Standard(DEC-002, 규칙 B 2회 이상) / L3 / 병렬 웨이브(소급 웹 06~12). 06·07 병합 미적용.
- 수행: 06-unit-tester (Claude Sonnet 5.5) / 2026-10-02. 이전 중단 실행의 잔여물 `.harness-tmp/mut_06_unit11`을 확인(제품 파일 변경 없음, 시험 파일 없음)한 뒤 삭제하고 새 복사본에서 이어서 수행.
- 제외(미검증): 실제 브라우저 렌더·포커스·스크린샷·터치, e2e(`meeting.spec.ts`·`states.spec.ts`·`a11y.spec.ts` 등 — 금지 사항이라 실행하지 않음), 서버 권한 판정(unit-05 계열 소유).

## 2. 시험 방식
기존 `participantsPanel.test.ts`(TC-470~475, `renderToStaticMarkup` 문자열 검사)는 **핸들러 배선·줄별 상태·입력 불변성**을 못 본다. 훅이 없는 함수 컴포넌트를 직접 호출해 엘리먼트 트리를 `testUtil.ts`(`findAll/findOne/byTestId/textOf`)로 검사하는 신규 `participantsPanelActions.test.ts`(TC-470b~470k, 10개)를 추가했다. 제품 코드 무수정. 한글 문구는 `S`(strings)로만 참조(TC-213 통과).

## 3. 요구 ↔ 시험 추적
| 요구 | 인수 조건(요지) | 기존 | 신규 |
|---|---|---|---|
| FR-13 | 이름·호스트·마이크/카메라/화면공유 표시, 입장 순서 | TC-473, 474 | 470f(1인·빈 목록), 470g(입력 불변·순서), 470h(줄별 독립·나/호스트 구분), 470i(이니셜·빈 닉네임·HTML 주입 경로 없음), 470k(원문 표시·testid) |
| FR-14 | 호스트 잠금/해제, 상태 표시 | TC-472 | 470b(콜백 배선), 470e(pressed·문구), 470k(아이콘 반영) |
| FR-15 | 강퇴 도구, 자기 자신 불가 | TC-471 | 470c(그 줄의 객체로만 onKick), 470f |
| FR-16 | 전체 음소거 도구 | TC-470 | 470b |
| FR-17 | 승계 후 호스트 표시 | TC-473 | 470g(호스트가 뒤 순번이어도 왕관은 hostId에만) |
| SEC-05 | 비호스트에게 도구 숨김(표시는 보조) | TC-470 | 470d(selfId 'b'/불명/빈 문자열, hostId null) |
| UX-10 | 버튼 이름·터치 크기·장식 아이콘 | TC-471, 475 | 470j(type=button, 아이콘 aria-hidden, 제목 숨김 아님), 470k |
- 확인창(FR-15/16)과 서버 호출 연결은 Room 쪽(`pages/room.test.ts` TC-466o/p, unit-09 결과서)이 소유 — 이번 변이 시험에서 함께 돌려 연결을 확인했다.

## 4. 결과
- 신규 10개 PASS(TC-470b~k). 기존 TC-470~475 6개 PASS. `ParticipantsPanel` 대상 변이 시험은 아래.
- **변이 시험(복사본 `.harness-tmp/mut_06_unit11r`, 제품 파일 불변)**: 1차 39종 + 2차 독립 14종 = 53종(M01~M53). 판정 기준 두 가지: 기존 TC-470~475만 / 전체(신규 + room.test + roomUi.test).
  - 기존 6개만으로 죽는 변이: 약 22/53(M01~05,07,08,13,14,22~26,29,31~34,36,38,40,48,50,52 등). **나머지 31종은 기존 시험으로 생존**(핸들러 배선 M09~12, 줄별 상태 M16~21, 입력 배열 변경 M06, 아이콘 등).
  - 1차 결과: 생존 6종(M15 잠금 아이콘 뒤바뀜, M28, M30 호스트 도구 묶음 이름 제거, M37 `people-list` testid 변경(e2e 4개 스펙이 사용), M39 닉네임 trim, M28 무해 속성 추가) → TC-470k 추가로 M15·M30·M37·M39 사망. M28(`data-x` 속성 추가)은 **동등 변이**.
  - 2차 결과: 생존 6종 중 M41·M42(`onClick={() => cb()}` 래핑, 동일 호출)·M51(`isHost && p.id !== hostId`, isHost 하에서 selfId=hostId라 동일)은 **동등 변이**. 실제 공백 3종 — M44((나) 표시를 hostId 줄에 붙임: 시험이 self=host인 설정만 써서 못 잡음), M49(제목 aria-hidden), M53(닫기 아이콘 aria-hidden 제거) → TC-470h를 self≠host로 바꾸고 왕관 위치 확인 추가, TC-470j에 제목·아이콘 aria 확인 추가 → 모두 사망, 앞선 변이(M09·M15·M16·M17) 재확인 사망.
  - 최종: 53종 중 **49종 사망, 동등 생존 4종**(M28·M41·M42·M51).
- 시험 설계 중 정정: lucide 아이콘이 `forwardRef` 객체라 `typeof type === 'function'` 판별이 실패 → `'size' in props`로 수정(제품 결함 아님). 타입 오류(`vi.fn` 타입) 수정.

## 5. 결함(Defect) 목록
| ID | 설명 | 심각도 | 상태 |
|---|---|---|---|
| (제품 결함) | **없음** — 신규 시험이 요구와 어긋나는 동작을 발견하지 못함 | - | - |
| OBS-1 | `isHost = selfId === hostId` — selfId와 hostId가 둘 다 빈 문자열이면 호스트로 판정(도구 표시). 서버가 빈 id를 부여하지 않으므로 실제 경로 없음, 도구 표시는 보조이며 권한은 서버 판단. 현재 TC-470d는 selfId=''·hostId='a'만 확인 | Low(관찰) | 기록만 |
| OBS-2 | 목록 `key`는 `p.id`뿐이라 같은 joinSeq 동률 시 순서는 입력 순서(안정 정렬)에 의존. 서버가 joinSeq를 유일하게 부여하므로 무해 | Low(관찰) | 기록만 |
| OBS-3 | 닉네임 이니셜은 코드포인트 첫 글자라 결합 이모지(ZWJ·국기 등)는 첫 조각만 나온다. 장식(aria-hidden)이라 접근성 영향 없음 | Low(관찰) | 기록만 |

## 6. 커버리지 및 한계
- FR-13~17 UI 부분, SEC-05(표시), UX-10 일부에 시험 연결. TC 행 9+1개를 `docs/05-qa/test-cases.md`에 추가(`check-docs` 통과, 미연결 요구 0).
- **미검증**: 실제 클릭·포커스·스크롤(`overflow-y-auto`)·6명 이상 긴 목록 레이아웃, Tailwind 클래스의 실제 효과(문자열로만 확인), 색 대비, 360px 화면, 서버 권한(강퇴 후 재입장 거부 등은 서버 시험 소유), e2e 전체.
- 시험 의존: 엘리먼트 트리 직접 호출 방식은 컴포넌트가 훅을 쓰기 시작하면 깨진다(변경 알림 역할).

## 7. 테스트 환경 정리(Teardown) — 규칙 K
- 이 단위가 만든 `.harness-tmp/mut_06_unit11r/`와 이전 중단 잔여 `.harness-tmp/mut_06_unit11/` 삭제. 남은 `.harness-tmp/`(mut_06_base, mut_06_head, mut_06_unit12, probe_06_web)는 다른 테스터 소유로 손대지 않음. 서버·프로세스·DB·venv 없음.
- 제품 코드 원복 확인: `git diff --stat -- apps/web/src/components/ParticipantsPanel.tsx apps/web/src/pages apps/web/src/lib` 출력 없음(변이는 복사본에서만 수행해 작업 트리 제품 파일은 한 번도 바뀌지 않음).
- `git status`: 추적 파일 변경은 `docs/05-qa/test-cases.md`(내 10행 포함, 타 단위 행 공동)·`docs/traceability.md`(타 단위 `--gen`)이고, 이 단위의 미추적 파일은 `apps/web/src/components/participantsPanelActions.test.ts`와 이 결과서·verify-log 뿐. 그 외 미추적(testUtil.ts, testing/, 타 `*.test.ts`, unit-06~10 문서)은 다른 테스터 소유.

## 8. 최종 점검 명령 결과 (2026-10-02)
- `npm run lint`: 통과(오류 0). `npm run typecheck`(server·web): 통과(수정 후; 첫 실행에서 내 시험 파일 타입 오류 1건을 고침). 전체 오류 원인 중 다른 테스터 파일 때문인 것은 없었다.
- `npm run test -w @meetlite/web`: 51파일 통과, 372 통과·2 expected fail(타 단위 `it.fails`). (typecheck 수정 전 실행 — 수정 후엔 해당 파일 10/10 재실행 PASS)
- `node scripts/check-docs.mjs`: 점검 통과(TC/IT 697개, 미연결 요구 0).
- 미실행(미검증): e2e·build·실브라우저(지시상 금지).

## 9. 판정
- [ ] PASS
- [x] CONDITIONAL PASS — 제품 결함 0, Low 관찰 3건, 조건: e2e·실브라우저·서버 권한 연동 미검증.

## 10. 내부 검증
- 1차: 요구 FR-13~17·SEC-05별 인수 조건 ↔ TC 추적(§3). 변이 39종으로 기존 시험이 핸들러 배선·줄별 상태·불변성을 못 잡음 확인 → TC-470b~k 추가, 생존 공백 4종 사망.
- 2차: "통과해도 되는가"를 의심해 독립 변이 14종 + 약한 시험 점검 → 시험 자체 약점 3건(self=host만 쓴 설정, 제목·아이콘 aria) 발견·강화.
- 검증 로그: `docs/harness/verify-log_unit-11-test.md`

## 11. 5인 검토
- ① 기획자 [통과]: 호스트 이탈 후 승계·재연결 중 표시·1인 방·빈 목록 등 엣지 케이스를 시험에 반영. 실사용 UAT 미검증.
- ② 개발자 [통과]: 변이 53종으로 판별력 확인, 동등 생존 4종 근거 기록. 훅 도입 시 시험 유지 비용 있음.
- ③ 디자이너 [우려]: 장식 아이콘 aria·버튼 이름·터치 클래스는 확인했으나 실제 크기·대비·360px 배치는 미검증.
- ④ 아키텍트 [통과]: 제품 코드 무수정, 변이는 복사본에서만, 시험 보조는 기존 `testUtil.ts` 재사용.
- ⑤ 보안 [통과]: 비호스트에게 도구 비노출·강퇴 대상 객체 정확성·닉네임 HTML 주입 경로 없음 확인. 표시는 보조이며 서버 권한 판정은 서버 시험 소유(미검증 항목으로 분리).

## 공유 문서 갱신 요청
- traceability.md "단위테스트": FR-13, FR-14, FR-15, FR-16, FR-17 (unit-11) → `CONDITIONAL PASS (소급 6단계, 신규 10개·변이 53종, 제품 결함 0, Low 관찰 3건: unit-11-test.md)`
- decisions.md 후보: OBS-1~3 이연 수용.
