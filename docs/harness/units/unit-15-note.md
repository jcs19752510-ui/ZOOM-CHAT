# unit-15 컴플라이언스 화면·`/api/meta`·로그 비식별·제한기 IP 정리 노트

속도 트랙: **L4**(개인정보·보안 관련 문구/노출). **병렬 웨이브 W1**, 동시 실행 단위: unit-17(UX-13/14/15). 이 단위는 unit-17 파일(`RoomPage`·`MeetingController`·`InAppNotice`·`CopyLink`·`media`·`signaling`·`VideoTile`·`Room` 등)을 건드리지 않았다. 새 의존성·`package.json`·lockfile·`ci.yml` 변경 없음. git commit·push 없음.

## 구현 범위
서버
- `GET /api/meta`(`http/app.ts`, 새 `http/meta.ts`): `OPERATOR_CONTACT`·`PRIVACY_OFFICER`·`LEGAL_EFFECTIVE_DATE`를 `MetaResponse`로 반환, 없으면 `null`. `STUN_URLS/TURN_URLS`는 `iceHost()`로 호스트명만(포트·`?transport=`·자격 정보 버림, IPv6 대괄호 유지, 중복 제거). 인증 없음, `statusLimiter` 재사용(IP당 60회/분, 초과 시 429 `RATE_LIMITED`), 200일 때만 `Cache-Control: public, max-age=60`, 기존 `/api` CORS(허용 목록 외 Origin 403) 그대로.
- production에서 `OPERATOR_CONTACT`가 없으면 `createApp` 안에서 시작 시 `warn` 1회. 기동은 막지 않음(03 §4.6).
- `config.ts`: 이메일 정규식을 ASCII 로컬 파트(`[A-Za-z0-9._%+-]+`)와 점으로 구분된 도메인 라벨로 강화(R-1: `javascript:alert(1)@x.com` 거부). https URL 규칙은 그대로. `.env.example` 안내 갱신.
- `logger.ts`: `createLogger(level, stream?)`(캡처용 선택 인자, 기본 동작 동일).
- `security/rateLimit.ts`(D-6): `KeyedRateLimiter`·`AttemptLimiter`가 생성 시 5분 주기 `setInterval(...).unref()` 정리를 시작(10분 넘게 안 쓴 키 삭제 → 최대 약 15분 보관). `sweep()` 공개, `size`·`dispose()` 추가, 기존 5만 키 초과 시 정리는 유지. `AttemptLimiter.sweep`은 차단이 끝났고 집계 창 안의 실패가 없는 키만 삭제.

웹
- `lib/legalMeta.ts`: `parseLegalPath`, `contactLink`(mailto 엄격 이메일/https만 href 생성, 그 외 텍스트), `parseDate`, `parseMeta`(응답 모양 검증). `lib/api.ts`에 `getMeta`(모양이 다르면 실패 처리).
- `pages/Legal.tsx`(SCR-23~25): 헤더(처음으로·문서 3종 nav, `aria-current`), 초안 리본 + "법률 자문이 아닌 초안" 고지(`S.legal.status==='draft'`일 때), h1, 시행일 슬롯, 처리방침 목차, 섹션별 본문, `MetaSlot` 상태 5종(로딩 `aria-busy` / 값 있음 / 미정 경고 상자 / 불러오기 실패+다시 불러오기(44px) / networkHosts 없음). 본문은 React 텍스트 노드만. 문서 이동 시 `document.title` 갱신·복원, h1 포커스(최초 로드 제외). 문의·신고의 첫 섹션 연락처 미정은 굵은 경고 테두리·큰 아이콘.
- `strings.ts`: `LegalSlot/LegalSection/LegalDoc` 타입과 `S.legal.{status,notAdvice,dateFormat,privacy,terms,contact}` 추가(처리방침 10개 필수 id, 약관 연령·호스트·신고·중단 등, 문의·신고 5개 섹션). 법령 조문 번호·법령 시행일은 쓰지 않았고 불확실한 부분은 "확인 필요"로 표기. IP 원문은 "메모리에 일시 보관(최대 약 15분)", 로그에는 IP·닉네임·채팅·토큰을 남기지 않는다고 서술(D-6 후의 사실과 일치).
- `App.tsx`: 방 → 법률 3종 → 랜딩 순 분기. `useRoute.ts`는 주석만 갱신(unit-17과 겹치지 않음, 03 확정표 확인).

## 설계 대비 편차
1. `LegalSection.slot?`(03 §3.6) 대신 **`slots?: LegalSlot[]`**. 처리방침 contact 섹션과 약관 changes 섹션이 슬롯 2개를 갖기 때문.
2. D-6 정리를 `socket/server.ts`(unit-16/19 파일)가 아닌 **제한기 클래스 생성자**에서 시작해 파일을 건드리지 않고 `joinByIp`·`passwordAttempts`까지 포함. 단점: `createApp`/`attachSocket`이 만든 제한기에는 `dispose()`가 연결되지 않아(unref라 종료는 막지 않음) 테스트에서 서버를 여러 번 띄우면 타이머가 남는다.
3. 이메일을 ASCII 로컬 파트로 제한(국제화 이메일 주소는 `OPERATOR_CONTACT`로 거부됨). R-1 방어 우선(보안 > 편의).
4. 시행일 슬롯은 모든 문서 상단과(처리방침·약관은) 해당 섹션 두 곳에 나온다(테스트 id는 `meta-slot-top-effectiveDate`와 `meta-slot-effectiveDate`로 구분).
5. 03 §1.3의 `scripts/license-report.mjs`(SEC-13, MC-06)와 `src/legal.test.ts` 이외 문서 갱신은 이번 요청 범위(1~5)에 없어 **구현하지 않음**. 아래 요청 참고.
6. `docs/05-qa/content-guide.md`는 재생성하지 않았다(`npx tsx scripts/gen-content-guide.ts`로 가능).

## 게이트 1 (정적 분석·린트)
설정이 있어 모두 실행. 병렬 단위(unit-17) 파일 포함 전체 기준으로도 통과.
- `npm run lint`: 오류·경고 0. (중간에 `react-hooks/set-state-in-effect` 오류가 났고 수정함)
- `npm run typecheck`: 오류 0.
- `npm test`: shared 16, server 111(+4 skipped, 기존 조건부), web 61 통과.
- `npm run test:e2e`: 45 passed, 1 skipped(IT-29 SOAK 조건부), 실패 0. 이 단위 신규 6개(IT-32 360/1280, IT-32b, IT-33, IT-33b, IT-33c) 통과. 같은 실행에 unit-17의 `mobile-lifecycle.spec.ts`도 포함되어 통과.
- `npm run check:docs`: 통과(테스트 미연결 요구 0건). `node scripts/check-docs.mjs --gen`으로 `test-cases.md`·`traceability.md` 표 재생성함(unit-17의 신규 테스트도 같은 표에 반영됨).
- 변이 확인: `participant joined` 로그에 닉네임·IP를 임시로 넣으면 TC-342가 실패함을 확인한 뒤 원복.

## 게이트 2 (자체 리뷰)
- [x] 설계서/UX 명세와 일치(편차는 위 기재)
- [x] 에러 처리: meta 실패·모양 불일치는 "불러오지 못함" 상태로 표시, 삼키는 코드 없음(`catch`는 URL 파싱 실패→텍스트 표시)
- [x] 입력 검증: 서버 env(zod, 강화된 이메일), 웹은 `/api/meta` 응답을 `parseMeta`로 검증, 연락처는 `contactLink`로만 href 생성
- [x] 하드코딩 시크릿 없음(시험 값은 시험 전용)
- [x] 새 의존성 없음, `package.json`·lockfile 미변경
- [x] 범위 외 변경 없음. 다른 단위 파일(Lobby/PageShell/InAppNotice 등)은 읽기만. `git status`상 해당 파일의 변경은 unit-0/17 몫

## 인수 조건 (6단계용)
1. `GET /api/meta`: 값 설정 시 `{v:1, operator:{contact,privacyOfficer}, legal:{effectiveDate}, network:{stunHosts,turnHosts}}` 그대로. 미설정은 `null`, STUN만 있으면 `turnHosts:[]`. 응답에 비밀값·포트·`transport`·IP·ADMIN 값 없음, 키는 `v/operator/legal/network` 4개뿐. `Cache-Control: public, max-age=60`. 허용 외 Origin 403, 분당 60회 초과 429(`{code:'RATE_LIMITED'}`, 캐시 헤더 없음). (TC-340~340d)
2. `OPERATOR_CONTACT=javascript:alert(1)@x.com`, `data:...@...`, `mailto:...`, 괄호·따옴표·`<>` 포함 로컬 파트, `ops@example..com`은 서버 시작 실패. 일반 이메일·`first.last+tag@sub.example.co.kr`·https URL은 통과. (TC-344, 기존 TC-301b/303 유지)
3. 어떤 연락처 값이 와도 화면의 `href`는 `mailto:`(엄격 이메일) 또는 `https:`로만 시작. `javascript:`·`data:`·http·공백 포함 값은 링크 없이 텍스트(이스케이프)로만 표시, `alert` 미실행. https 링크는 `target=_blank`, `rel`에 `noopener noreferrer`, 접근 이름 "… (새 탭에서 열림)". 책임자·시행일 값은 절대 링크가 아님. 법률 페이지 소스에 `dangerouslySetInnerHTML`·`.innerHTML` 없음. (TC-345~345d, IT-33, IT-33b)
4. `/privacy`·`/terms`·`/contact`(끝 슬래시 허용)가 열리고 그 밖의 경로(`/privacy/x`, `/Privacy`)는 랜딩. 3개 페이지 모두 초안 리본("초안(법률 검토 전)")과 "법률 자문이 아닌 초안" 고지, `document.title` `"{제목} · MeetLite"`. 360·1280px에서 가로 스크롤 없음. 문서 간 이동은 같은 탭, h1 포커스, 처음으로 링크는 랜딩. 푸터 링크는 새 탭에서 열림(원래 탭 유지). (IT-32, IT-32b, TC-341d)
5. 처리방침은 필수 섹션 10개 id(`collected … effectiveDate`)를 모두 갖고, 모든 문서의 문단이 비어 있지 않음. 문서 본문에 조문 번호(`제N조`)·"N년 N월 N일 시행" 단정이 없고 "확인 필요"가 있음. 보유 기간 문구에 "메모리에 일시 보관"과 "로그에는 IP 주소"가 있음. (TC-341~341c)
6. 슬롯 상태 5종: 로딩(`aria-busy`), 값 있음(시행일 "2026년 10월 1일", STUN 호스트만 나열), 미정(`data-state=pending`, 빈칸·가짜 값 없음, `role=status`, 문의·신고는 굵은 경고 테두리), 불러오기 실패(안내 + 다시 불러오기 44px 이상, 본문은 정상, 재시도 시 복구, 모양이 틀린 응답도 실패), 시행일 형식 오류·존재하지 않는 날짜는 미정. (TC-346~346e, IT-32, IT-33, IT-33c)
7. 로그 비식별: 방 생성·오답/정답 입장·채팅·SDP/ICE 신호·잘못된 페이로드·위조 토큰·HTTP 오류·재접속·강퇴 후 재입장 흐름의 실제 로그 캡처에 `127.0.0.1`·`::1`·`::ffff:`·닉네임·채팅·비밀번호·SDP(`v=0`)·ICE 후보 IP·호스트 클레임·세션 토큰·`SESSION_SECRET`·전체 방 ID·`ipKey` 값이 없고, `room created`·`participant joined`·`server listening`·`http error` 줄은 있음(양성 대조군). 방 ID는 앞 6자만. 로거 redact가 token·password·sdp·text·nickname을 가림. (TC-342, 342b)
8. 제한기: 키가 적어도 5분 주기 정리로 10분 넘게 안 쓴 IP 키가 지워짐(15분 안에 0건), 최근 키는 유지, 정리 후 같은 키는 새 버킷으로 다시 제한, 차단 중이거나 창 안 실패가 있는 키는 유지, 타이머는 `unref`이고 `dispose()`로 멈춤. (TC-343~343c)
9. 기존 동작 유지: 위 게이트 전부 통과(기존 TC·IT 회귀 0건).

## 수동 확인 필요 (미검증)
- 실제 법률 검토, 문서 문구의 법적 정확성(자동 검증 불가, SEC-13). 리본·고지는 `status:'draft'` 유지.
- 360/1280px 시각 품질(여백·대비)은 자동 TC로 가로 스크롤만 확인함. 스크린샷 육안 검토 미수행.
- 스크린리더 읽기 순서(`role=status` 슬롯, h1 포커스)와 iOS Safari에서의 새 탭 동작.
- 실제 배포 환경 변수(`OPERATOR_CONTACT` 등) 설정 후 production 기동 `warn`이 사라지는지(production 기동 warn 자체는 자동 TC가 없음, 코드 1줄).
- `createApp`/`attachSocket`의 제한기 타이머가 서버 종료 시 정리되지 않는다는 점(unref라 실해 없음).

## 공유 문서 갱신 요청 (오케스트레이터가 웨이브 종료 후 반영)
traceability.md (구현 상태: 구현·단위검증 완료 / E2E 통과)
- POL-17: 작업 단위 unit-15(+unit-0 선행), TC-340·340d·341·341b·341c·346·346e, IT-32·32b·33·33c
- POL-18: unit-15, TC-342·342b·343·343b·343c (IP 원문 메모리 보관 15분 이내, D-6 해소)
- POL-19: unit-15(신고 채널 화면·연락처 슬롯), TC-340·340b·344·345·346, IT-33·33b (폐쇄 수단은 unit-16 몫이라 부분 커버)
- POL-20: unit-15(약관 연령 문구·시행일 슬롯), TC-340b·346·346b·346d, IT-32·33
- SEC-13: 부분 — 법률 문서 초안·"법률 자문 아님" 표기 완료(TC-341c). `license-report`(MC-06)와 release-checklist SEC-13 행은 **미구현**
- SEC-07: TC-345~345d, IT-33b(연락처 링크 주입 방지) 추가
- 03 §8.3 D-6: 해소(제한기 정기 정리), D-6 위험 행을 "완료"로 표기. R-1(unit-0)도 해소(config 강화 + 웹 방어 + TC)

decisions.md (신규 DEC 제안)
- DEC: "D-6 정리 타이머는 `socket/server.ts` 대신 제한기 생성자에서 시작(unref, 5분 주기, 10분 미사용 삭제). 사유: unit-16/19 파일 비접촉. 한계: 앱 종료 시 명시적 dispose 미연결."
- DEC: "`OPERATOR_CONTACT` 이메일을 ASCII 로컬 파트로 제한, 웹은 `contactLink`로 mailto:/https:만 href 생성. 사유: R-1(DEC-017②) 링크 주입 방지. 국제화 이메일 주소는 미지원"
- DEC: "`LegalSection.slot`을 `slots[]`로 변경(03 §3.6 편차)"

기타 공유 문서(통합 단계 몫)
- `docs/04-security/privacy.md`: IP 원문 제한기 보관을 "메모리에 일시 보관, 최대 약 15분"으로 정정(처리방침과 일치시킬 것). `docs/04-security/legal-drafts/*`는 `strings.ts`가 정본이므로 검토용 사본을 동기화.
- `docs/05-qa/test-cases.md`: `--gen`으로 이미 재생성됨(TC-340~346e, IT-32~33c). `integration-test.md`·`api-spec.md`(EVT-04 `/api/meta`)·`runbook`·`observability.md`(기동 warn 1줄) 반영 필요.
- `release-checklist.md`: SEC-13 행(미완료=No-Go)과 `OPERATOR_CONTACT` 미설정=공개 불가 행.
- 후속 작업 후보: `scripts/license-report.mjs`(SEC-13, 새 의존성 없음) — 별도 지시 필요.
