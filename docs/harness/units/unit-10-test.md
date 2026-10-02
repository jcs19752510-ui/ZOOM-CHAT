# 테스트 결과서 — unit-10 (웹 채팅: components/ChatPanel.tsx, lib/linkify.ts) — 소급 6단계

## 1. 개요
- 테스트 대상: 작업 단위 unit-10. 5단계 노트(`unit-10-note.md`) 없음 — 소급 단위라 인수 조건은 `03-system-design.md` unit-10 행과 PRD(FR-11), POL-07, SEC-07에서 도출했다.
- 테스트 유형: 단위(소급 보강: 동작 시험 + 변이 시험). Tier Standard(규칙 B 2회 이상), 속도 트랙 L3, 병렬 웨이브(소급 웹 06~12), 06·07 병합 미적용.
- 목적: 기존 시험(`chatPanel.test.ts` 정적 마크업 4개, `linkify.test.ts` 4개)이 보지 못한 **전송 동작(trim·길이 경계·코드포인트·오류 문구 분기·글 복원·스크롤·닫기)** 과 **linkify 경계·악용 입력**을 직접 구동해 증명하고, 변이로 판별력을 확인.
- 수행자: 06-unit-tester (Claude Sonnet 5.5), 2026-10-02.

## 2. 범위
- 범위: ChatPanel(전송·오류 표시·목록·스크롤·닫기·링크 렌더), linkify(스킴 제한·구분 문자·문장부호·원문 보존).
- 제외/미검증: 실제 DOM·스크롤·포커스, 서버 측 검증(`sanitizeChatText`, rate limit 자체: 서버 단위 소유), `MeetingController.sendChat`, 색 대비·터치 크기(e2e), 타 브라우저, **e2e 재실행 미검증**(금지 지시).

## 3. 환경·도구
- Node 22, Vitest 5.0.3(`--root apps/web`, 환경 node). unit-08의 `testing/hookHarness.ts`를 재사용(`vi.mock('react')`로 훅 대체, 이벤트 핸들러 직접 호출). 정적 렌더는 `react-dom/server`.
- 변이 시험은 `.harness-tmp/mut_06_unit10/`의 `apps/web/src` 복사본에서 수행(제품 파일 무수정, 다른 테스터와 작업 트리 공유 충돌 없음). 종료 후 삭제.
- 잔여 확인: 시작 시 이 단위 이름의 `.harness-tmp/` 잔여물 없음.

## 4. 케이스와 결과
### 4.1 인수 조건 ↔ 케이스
| AC | 인수 조건(출처) | 케이스 |
|---|---|---|
| AC-1 | 본문은 항상 텍스트로만 그린다, HTML/이벤트 속성/위험 스킴이 요소가 되지 않는다(SEC-07) | 기존 TC-450·203, 신규 TC-450n·450u |
| AC-2 | 링크는 http/https만, 새 탭, `rel="noopener noreferrer"`, URL 속 따옴표·꺾쇠로 속성이 새지 않는다(SEC-07) | 기존 TC-451·200·201, 신규 TC-450o·450p·450w |
| AC-3 | 링크 표시는 원문, 이동은 정규화된 href(FR-11) | TC-450o, TC-450w |
| AC-4 | 문장부호(전각 포함)는 링크에서 떼고 원문 순서 보존(FR-11) | 기존 TC-202, 신규 TC-450q·450r·450s·450t |
| AC-5 | 최대 500자(코드포인트), 초과 시 서버 호출 없이 안내·글 보존, 공백만이면 전송 안 함(POL-07, SEC-07) | TC-450b·450c·450d·450e·450f |
| AC-6 | 서버 오류 안내: RATE_LIMITED / INVALID_PAYLOAD / 기타, 글은 입력창에 복원, 오류는 role=alert(FR-11, POL-07, UX-10) | TC-450g·450h·450i |
| AC-7 | 목록·빈 상태·aria-live·닫기·스크롤(FR-11, UX-10, UX-12) | 기존 TC-452·453, 신규 TC-450k·450l·450m |
| AC-8 | 입력 자동완성 끔, 본문 무가공 전달(서버가 정리)(SEC-07) | TC-450j |
| AC-9 | 매우 긴 입력에서 처리 지연 없음(정규식 폭주 없음) | TC-450v |

### 4.2 신규 자동 시험(22개 TC, 파일 3개)
- `apps/web/src/components/chatPanelActions.test.ts` (12): TC-450b~450m
- `apps/web/src/lib/linkifyEdge.test.ts` (9): TC-450n~450v
- `apps/web/src/components/chatPanelHref.test.ts` (1): TC-450w
- 기존 8개(`chatPanel.test.ts` 4 + `linkify.test.ts` 4)와 합쳐 이 단위 시험 30개. TC ID는 grep으로 미사용(450b~w) 확인, `docs/05-qa/test-cases.md`에 본인 행 22개만 추가. 시험 파일에 한글 문구 하드코딩 없음(문구는 `S`·`LIMITS` 사용, 이름의 설명 문자열 제외, `design.test.ts` TC-213 통과 확인).

### 4.3 실행 결과
- 이 단위 5파일: 통과(신규 3파일 22개 + 기존 8개 = 30 통과, 실패 0).
- 웹 전체 `npx vitest run --root apps/web`: **51파일 통과, 372 통과 + 2 expected fail**(실행 시점 기준).
- 게이트: 신규 3파일 `eslint` 0건. `tsc --noEmit`(apps/web)에서 이 단위 파일 오류 0건(1회 발견한 `unknown[]` 타입 오류는 수정). 다른 테스터의 `participantsPanelActions.test.ts` 타입 오류는 그쪽 소유이며 이 단위와 무관.
- `node scripts/check-docs.mjs --gen` 후 `check-docs` 통과(요구 59, 테스트 697).

### 4.4 변이 시험(복사본에서, 57종)
- ChatPanel 37종(공백 검사·trim·preventDefault·길이 경계·코드포인트·입력 비우기·복원 조건·오류 분기 3·rel·target·스크롤 의존성·옵션·버튼 비활성·autoComplete·onClick·key·정렬·카운터 색·alert/log 역할·`dangerouslySetInnerHTML`·href 대신 label·빈 상태·닉네임·aria-label·링크 색), linkify 20종(프로토콜 가드·정규식 플래그·구분 문자 4종 제거·문장부호 집합·트림 적용·텍스트 보존·꼬리 처리).
- 1라운드 생존 6종 → 보강 후 검출: `href={seg.label}`(TC-450w 신설), 링크 색 클래스(TC-450w), 구분 문자 `<>`·백틱 제거(TC-450p에 label 정확 비교 추가), 전각 쉼표 `，` 미트림(TC-450q에 쉼표·`、` 추가). 
- 남은 생존 2종은 **등가 변이**: ① `u.protocol` 검사 제거(정규식이 이미 http(s)만 통과시켜 `URL`이 다른 스킴을 만들 수 없음 → 방어 심층, 도달 불가), ② `if (tail)` → `if (false)`(마지막 `last < text.length` 분기가 같은 텍스트를 이어 붙여 출력 동일).
- 2라운드(독립 심사): 생존 변이 5종을 재실행해 4종 검출 확인, 전각 쉼표 1종은 첫 수정이 파일에 적용되지 않은 것을 발견해(편집 불일치) 재수정 후 검출 확인. 상세는 verify-log.
- 제품 2파일 diff 없음(`git diff --stat` 출력 없음).

## 5. 커버리지
- ChatPanel의 submit(빈·공백·초과·성공·실패 3종·경합), 길이 카운터, 효과(스크롤), 닫기·목록 분기와 linkify 전 분기를 직접 구동. 라인 커버리지 수치는 미측정.
- 미커버: 실제 DOM 스크롤·포커스, 실제 `Intl` 시간 표기(`toLocaleTimeString`은 환경 의존이라 값 비교 안 함), 서버 응답 코드 실제 발생, 타 브라우저.

## 6. 결함
| ID | 설명 | 재현 | 심각도 | 상태 |
|----|------|------|--------|------|
| - | 제품 결함 없음 | - | - | - |
| OBS-001 | 보이지 않는 글자만 있는 메시지(예: 제로폭 공백만)는 클라이언트 `trim()`을 통과해 서버(`sanitizeChatText`)가 거부한다. 이때 `INVALID_PAYLOAD` 안내가 뜨는 설계이며 서버 거부 경로는 이 단위에서 모의(onSend 반환값)로만 검증 | `onSend`가 `INVALID_PAYLOAD`를 반환하는 TC-450g | Low(관찰) | 설계대로, 서버 실경로는 e2e 소유로 미검증 |
| OBS-002 | `MeetingController.sendChat`은 `NETWORK`를 돌려줄 수 있어(제품 코드) ChatPanel은 이를 "기타 오류(failed)"로 안내한다. 별도 문구 없음 | TC-450g('NOT_IN_ROOM' 대표) | Low(관찰) | 설계 수용 |
- 시험 쪽 결함(수정 완료): 첫 시험 작성 시 `blob:https://...` 케이스의 기대가 틀려(안의 https URL은 정상 링크) 제외, 한글 리터럴 반복 문자를 영문으로 변경, 훅 헬퍼 타입 오류 수정.
- Critical/High 없음.

## 7. Teardown(규칙 K)
- `.harness-tmp/mut_06_unit10/` 삭제 완료. 남은 `.harness-tmp/mut_06_base`, `mut_06_head`, `mut_06_unit11r`, `mut_06_unit12`, `probe_06_web`는 다른 단위 소유이며 건드리지 않았다. 스크래치(`scratchpad/u10_mut*.py`·출력) 삭제 대상은 스크래치 영역이라 저장소 밖.
- `git status`(이 단위 소유): `apps/web/src/components/chatPanelActions.test.ts`, `chatPanelHref.test.ts`, `apps/web/src/lib/linkifyEdge.test.ts`(모두 미추적 신규), `docs/05-qa/test-cases.md` 해당 22행, `docs/traceability.md`(`--gen` 재생성), 이 결과서와 verify-log. 제품 파일 `ChatPanel.tsx`·`linkify.ts` diff 없음. 이 단위의 임시 아티팩트·미추적 잔여물 없음.

## 8. 남은 위험
- 훅 실행기는 실제 React 렌더·배치를 흉내 낼 뿐이라, 실제 DOM 포커스·스크롤·IME 입력(한글 조합 중 Enter)은 e2e/수동에 의존(IME는 미검증).
- 서버 측 길이·rate limit·정제는 서버 단위 시험 소유이며 여기서는 클라이언트의 반응만 확인.
- e2e(IT-04 등) 재실행 미검증. `toLocaleTimeString` 시간 문구는 값 검증 안 함.

## 9. 판정
**PASS** — 신규 시험 통과, 유효 변이 55종 검출(등가 2종 제외), 결함 0건(관찰 2건 Low).

## 10. 5인 검토
- ① 기획자 [통과]: 500자 제한·빈 상태·오류 원인별 안내 동작을 시험으로 확인. IME 입력은 미검증.
- ② 개발자 [통과]: 모든 분기를 구동하고 변이로 판별력 확인, 시험 보조 코드 재사용, 새 의존성 없음.
- ③ 디자이너 [우려]: 오류 문구 3종이 서로 다름만 확인, 색 대비·터치 크기는 미검증(e2e).
- ④ 아키텍트 [통과]: 제품 무수정, 변이는 복사본.
- ⑤ 보안 [통과]: XSS(HTML 이스케이프·`dangerouslySetInnerHTML` 변이 검출), 위험 스킴, 속성 주입 문자, rel, 무작위 3000건 원문 보존·http(s) 불변식을 확인. 서버 측 검증은 범위 밖.

## 11. 공유 문서 갱신 요청
- `docs/05-qa/test-cases.md`: TC-450b~450w 22행 추가 완료(본인 행만). `docs/traceability.md`는 `check-docs --gen`으로 재생성.
