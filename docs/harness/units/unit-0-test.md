# 테스트 결과서 — unit-0 (공통 선행)

## 1. 개요
- 테스트 대상: unit-0 — config 신규 환경변수 5종, `metrics:path` 스키마, `strings.ts` 문구 키(04 §3.5), `LegalFooter`/`InAppNotice`/`PageShell`, Landing·Lobby 푸터 마운트 (코드 커밋 `a3eb1fc`, PROD)
- 테스트 유형: 단위 (+ 푸터 레이아웃은 Playwright 실행 확인)
- 적용 Tier: Standard
- 적용 속도 트랙: L3
- 병렬 실행 정보: 병렬 웨이브 W0에서 실행(동시에 돌던 단위: unit-18, unit-20)
- 테스트 목적: unit-0 인수 조건 1~9를 실제 실행으로 검증하고 기존 테스트가 덮지 못한 경계값을 보강
- 관련 산출물: `docs/harness/units/unit-0-note.md`, `03-system-design.md`, `04-ux-design.md` §3.5·§4.2, `decisions.md`(DEC-010·015)
- 테스트 수행자: 06-unit-tester (Claude)
- 테스트 일시: 2026-10-01

## 2. 테스트 범위 및 제외 범위
- 범위: 인수 조건 1~9. 5단계 게이트(lint·typecheck)와 note의 게이트 2 체크리스트 확인.
- 제외: `/api/meta`의 `null`·화면 "미정" 표시(unit-15), `/privacy` 등 문서 페이지(unit-15), InAppNotice 실제 감지·표시(unit-17), admin 리스너(unit-?), 실기기·타 브라우저(미검증).

## 3. 테스트 환경
- 실행 환경: Linux 6.18, Node(워크스페이스), Vitest 5.0.3, Playwright Chromium(`/opt/pw-browsers/chromium-1194`, fake media), 서버는 테스트가 임의 포트로 기동
- 테스트 데이터: `apps/server/test/helpers.ts`의 `baseEnv`(PORT=0), 아래 케이스별 입력값
- 전제 조건: 5단계 게이트 확인 — note의 게이트 1·2 기재 + 이번에 직접 재실행(아래). note가 지적한 `turnProbe.ts` 타입 오류는 이번 실행 시점에 재현되지 않음(typecheck 오류 0, unit-18 쪽에서 해소된 것으로 보이나 이 단위 책임 밖).

## 4. 테스트 케이스 및 결과
기존 = 5단계가 작성한 테스트. 신규 = 이번 6단계에서 추가. 인수 조건(AC) 번호는 note 기준.

| ID | 시나리오 | 사전조건 | 실행 절차 | 예상 결과 | 실제 결과 | Pass/Fail | 비고 |
|----|----------|----------|-----------|-----------|-----------|-----------|------|
| TC-301 (기존) | AC1 환경변수 5종이 빈 문자열·공백 | baseEnv | `loadConfig`에 `''`/`' '` 주입 | 모두 undefined | 일치 | PASS | |
| TC-303e (신규) | AC1 5종을 아예 주지 않음 | baseEnv | `loadConfig(baseEnv)` | 5종 undefined, 기동 가능 | 일치 | PASS | 정상 경로 |
| TC-301b (기존) | AC2 이메일·https 통과, http·javascript:·공백 포함·206자 거부 | | | 거부 시 메시지에 `OPERATOR_CONTACT` | 일치 | PASS | |
| TC-303 (신규) | AC2 경계: 정확히 200자(이메일/URL) 통과, 201자 거부, 앞뒤·중간 공백, `https://`만, `ftp://`, 대문자 `HTTP://`, `@example.com`, `ops@@example.com`, `ops@example` 거부 | | | 200 통과 / 그 외 거부(변수명 포함) | 일치 | PASS | 앞뒤 공백 값은 trim 없이 거부됨(문서화 필요, R-2) |
| TC-301c (기존) | AC3 날짜 `2026-10-01` 통과, 2026-02-30 등 거부, PRIVACY_OFFICER 101자 거부 | | | | 일치 | PASS | |
| TC-303b (신규) | AC3 경계: 2028-02-29(윤년) 통과, 2026-02-29·04-31·월0·일0·02-32·한 자리 월일·`20261001`·ISO 시각 접미·앞뒤 공백 거부, OFFICER 100자 통과·한글 통과 | | | | 일치 | PASS | |
| TC-301d (기존) | AC4 한쪽만, PORT와 동일, 토큰 5자, 포트 70000 | | | | 일치 | PASS | |
| TC-303c (신규) | AC4 경계: 포트 1·65535 통과, 0·-1·65536·3002.5·`abc`·`3002abc` 거부, 토큰 31 거부/32/33 통과, 공백만 값 처리, PORT=65535와 ADMIN_PORT=65535 거부·65534는 통과 | | | | 일치 | PASS | |
| TC-301e (기존) | AC5 운영 모드 `change-me` ADMIN_TOKEN 거부, 개발 모드 허용 | | | 메시지 "예시 비밀값" | 일치 | PASS | |
| TC-303d (신규) | AC5 보강: 운영 모드에서 정상 5종 값 통과, 32자 `change-me…` 거부, 개발 모드 허용, 운영 모드 ADMIN 미설정 기동 허용 | | | | 일치 | PASS | |
| TC-302 (기존) | AC6 `{v:1,path:relay|direct}` 통과, other·peerId·v:2 거부 | | | | 일치 | PASS | |
| TC-304 (신규) | AC6 예외: undefined/null/문자열/숫자/배열/{}, path 누락·null·''·공백·`RELAY`·배열·객체·숫자, v `'1'`·0·null, 추가 키 from/to/ip/ts | | `safeParse` | 모두 거부, 통과값은 두 키만 | 일치 | PASS | |
| TC-305 (신규) | AC8 `legalLinks` 키 5개 정확 일치, `aria` 함수 | | `S` 검사 | 04 §3.5 문구와 동일 | 일치 | PASS | 기대 문구는 04 문서에서 옮겨 적음 |
| TC-305b (신규) | AC8 `inApp` 키 9개, `steps` 배열 2개 | | | 일치 | 일치 | PASS | |
| TC-305c (신규) | AC8 `autoplay`·`background`, `mediaLost` camera/mic/both 3종 서로 다른 문구 | | | | 일치 | PASS | |
| TC-305d (신규) | AC8 `state.gone.operatorTitle/operator`, 기존 키 보존, `legal` UI 크롬 키(포함 검사, `labels` 5·`meta` 8 정확 일치) | | | | 일치 | PASS | |
| TC-305e (신규) | AC8 빈 문자열 값 없음(`S` 전체) | | | | 일치 | PASS | |
| TC-213 (기존) | AC8 한글 문구는 strings.ts에만 | | `design.test.ts` | 위반 0 | 위반 0 | PASS | 신규 `strings.test.ts`는 TC-213 면제 대상(.test) |
| TC-306 (신규) | AC7 소스 정적 점검: 경로 순서, `target`, `rel`, `min-h-touch`, `dangerouslySetInnerHTML` 없음 | | 소스 문자열 검사 | | 일치 | PASS | 정적 점검이므로 아래 IT-31이 실제 동작 증거 |
| IT-31 (신규) 360px | AC7 랜딩·대기실: 푸터 표시, 링크 3개 순서·href·`target=_blank`·`rel` noopener noreferrer·aria "… (새 탭에서 열림)"·높이 ≥44px·가로 스크롤 없음·Tab으로 3개 순서 도달·푸터가 문서 맨 아래, 회의실에는 푸터 0개 | Chromium fake media | Playwright | 모두 충족 | 일치(링크 높이 44, 폭 116/64/68, 가로 스크롤 0) | PASS | 세로: 랜딩 742/740(R-3 참고) |
| IT-31 (신규) 1280px | 동일 + 랜딩·대기실 세로 넘침 없음 | | | | 일치(scrollHeight 800/800) | PASS | |
| (AC7) InAppNotice 무렌더링 | `return null` 스텁 | | 소스 확인 + E2E에서 `inapp-notice` 요소 부재(관측) | | 코드가 `return null`. 전용 자동 TC는 없음 | PASS(코드 확인) | 전용 TC는 unit-17에서 대체됨 → 추가하지 않음 |
| 기존 E2E 전체 (AC9) | `npm run test:e2e` | | | 실패 0 | 32 passed, 1 skipped(기존 조건부 skip) | PASS | IT-31 2건 포함 |
| 게이트 | `npm run lint` | | | 오류 0 | 오류 0·경고 0 (신규 e2e의 non-null assertion 경고는 수정 후 해소) | PASS | |
| 게이트 | `npm run typecheck` | | | 오류 0 | 오류 0 | PASS | |
| 회귀 | `npm test` | | | 전부 통과 | shared 16, server 101(4 skipped, 기존 조건부), web 20 | PASS | |
| 문서 | `npm run check:docs` (`--gen` 후) | | | 통과 | 통과, TC/IT 172개, 미연결 요구 0 | PASS | |

실행 명령 요약: `npm test`(전체) → shared 16/16, server 101 pass·4 skipped, web 20/20; `npm run lint`/`typecheck` 오류 0; `npm run test:e2e` 32 passed·1 skipped; `node scripts/check-docs.mjs --gen` 후 `npm run check:docs` 통과.

## 5. 커버리지
- 지표: 정량 라인 커버리지 도구는 설정되어 있지 않아 측정하지 않음(미측정). AC 1~9 모두 최소 1개 실행 케이스에 1:1 대응(위 표). 설정 5종 × {빈값, 없음, 허용 경계, 거부 경계} 확인.
- 커버되지 않은 부분: ① 앱 기동 시 운영 모드 `warn` 로그(unit-15 이후) ② InAppNotice 이외의 렌더링 전용 TC 없음(스텁) ③ 360px 대기실의 세로 스크롤은 기존에도 발생(920/740, 푸터 이전 값은 미측정) ④ Safari/Firefox, 실기기 미검증.

## 6. 결함(Defect) 목록
| ID | 설명 | 재현 절차 | 심각도 | 상태 | 조치 내용 |
|----|------|-----------|--------|------|-----------|
| DEF-001 | 360×740 랜딩에 푸터 추가로 문서 높이가 742px가 되어 2px 세로 스크롤이 새로 생긴다(푸터 숨기면 740). note의 "푸터로 인한 새 세로 스크롤 방지" 의도와 불일치. 1280×800은 영향 없음 | `npm run build -w @meetlite/web` 후 서버 기동, 360×740 뷰포트로 `/` 열고 `document.documentElement.scrollHeight` 확인 → 742. 푸터 요소에 `display:none` 주면 740 | Low | Open | 제품 코드 수정 금지 범위라 5단계 재작업 요청. 원인 추정: `PageShell`의 `min-h-full` 컨테이너 안에서 `main`(`flex-1`)의 내용 높이 + 푸터(44px+패딩)가 뷰포트를 2px 초과. 이 단위 안의 원인으로 보이며 다른 단위·공유 자원 영향 가능성은 낮음. 자동 TC는 추가하지 않음(실패 상태로 두지 않기 위해 — 수정 후 `IT-31`에 `scrollHeight<=innerHeight` 360px 랜딩 단언 추가 권장) |

- 결함 외 관찰(결함 아님, 후속 단위 주의): R-1 `OPERATOR_CONTACT=javascript:alert(1)@x.com`는 이메일 정규식을 통과한다(실행 확인, 정규식 `^[^\s@]+@[^\s@]+\.[^\s@]+$`). 현재 화면에 쓰이지 않지만 unit-15가 링크로 렌더링할 때는 반드시 `mailto:` 접두를 붙이거나 텍스트로만 표시해야 한다. R-2 값 앞뒤 공백은 trim되지 않아 시작 실패(안전한 방향, `.env.example`에 안내하면 좋음).

## 7. 테스트 환경 정리(Teardown) 확인 — 규칙 K
- 생성한 임시 아티팩트: `.harness-tmp/wt_06_unit0/`(기준선 비교용 git worktree, node_modules 심볼릭 링크 포함) — 사용 후 삭제. 임시 프로브 스펙 `e2e/zz_probe.spec.ts` 2회 생성 후 삭제. Playwright 결과물 `test-results/`(gitignore 대상, 이전부터 존재하는 산출물 경로).
- 전부 `.harness-tmp/` 하위에서만 생성했는가: [x] 예(프로브 스펙은 e2e 폴더에 잠시 생성했고 삭제함 — 사유: Playwright testDir 제약)
- 정리 완료 여부: 완료. `git worktree remove --force` + `git worktree prune`, `.harness-tmp/` 디렉터리 없음 확인.
- 정리 후 `git status --short`:
```
 M apps/server/test/config.test.ts
 M docs/05-qa/test-cases.md
 M docs/traceability.md
 M packages/shared/src/schemas.test.ts
?? apps/web/src/strings.test.ts
?? e2e/legalfooter.spec.ts
```
(이 외 `docs/harness/units/unit-0-test.md`, `docs/harness/verify-log_unit-0-test.md`가 이 단위의 산출물로 추가됨.)
- 병렬 실행 소유 표기: 위 목록의 `config.test.ts`·`schemas.test.ts`·`strings.test.ts`·`legalfooter.spec.ts`·`test-cases.md`(생성 표)·`docs/traceability.md`(`--gen` 재생성)는 이 단위(unit-0 06단계)가 만든 변경. 중간에 보였던 `unit-20-test.md`·`verify-log_unit-20-test.md`는 unit-20 소유. 이 단위가 만든 임시 아티팩트·미추적 잔여물은 없음. 웨이브 종료 후 오케스트레이터의 전체 트리 점검(`harness-janitor.sh --check`) 결과는 이 문서 작성 시점에 미실시.
- 강제 중단: [x] 없음
- `docs/traceability.md`는 `check-docs --gen`이 재생성한 스크립트 산출물(프로젝트 루트 docs의 것이며 하네스 `docs/harness/traceability.md`와 다른 파일)이다. 하네스 쪽 `traceability.md`는 수정하지 않았다.

## 8. 리스크 및 잔존 이슈
- 커버되지 않는 리스크: 실제 브라우저 3종·실기기 푸터 표시, 360px 대기실 세로 스크롤의 푸터 이전 기준선, InAppNotice 실제 동작(unit-17), `/api/meta` 연동(unit-15).
- 후속 조치: DEF-001(Low) 5단계 수정, R-1 unit-15 렌더링 시 `mailto:`/텍스트 처리 확인, R-2 `.env.example` 공백 안내, DEC-015 편차(PageShell 채택)의 결정 기록 요청.

## 9. 결론 및 판정
- [x] PASS — 다음 단계 진행 가능 (Teardown 확인 완료). Low 결함 DEF-001은 Open이나 요구·인수 조건 1~9 위반이 아니며(노트의 구현 의도 항목) 오케스트레이터가 수정 시점을 판단하도록 CONDITIONAL 성격으로 보고한다.
- [ ] CONDITIONAL PASS — 조건: DEF-001을 07 이전에 고칠지 오케스트레이터 판단
- [ ] FAIL

## 10. 내부 검증
- 1차: 인수 조건 AC1~9 커버리지 100%, 기대값이 04 §3.5·note 명세에 근거함을 확인. 결함 1건(DEF-001) 및 단위 테스트의 경계 공백 5곳 발견 → 보강 테스트 추가.
- 2차: 독립 심사 관점에서 경계 재검토(공백 처리, 운영 모드 조합, 신규 테스트의 민감도) — 이슈 없음, 위 R-1·R-2 기록.
- 로그: `docs/harness/verify-log_unit-0-test.md`

## 공유 문서 갱신 요청
- `docs/harness/traceability.md`: unit-0은 직접 커버 REQ 없음. POL-17·19·20, SEC-13, UX-13~15, NFR-15 행의 "단위테스트" 컬럼에 unit-0 선행 준비분 근거로 `TC-301·301b~e·303·303b~e(설정), TC-302·304(스키마), TC-305·305b~e·306·IT-31(문구·푸터)` 기재. 상태는 해당 구현 단위 완료 시까지 "선행 준비 PASS".
- `docs/harness/decisions.md`: (note의 요청 유지) F-7/DEC-015 편차(PageShell 채택) 결정 기록. 추가로 DEF-001 처리 방침(수정 or 수용) 기록.
