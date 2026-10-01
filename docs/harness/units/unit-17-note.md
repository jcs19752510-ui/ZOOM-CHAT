# unit-17 구현 노트 — 인앱 브라우저 안내(UX-13), 백그라운드·화면 잠금 복귀(UX-14), 자동재생 탭 재생(UX-15)

> 5단계 구현 담당이 6단계 테스터에게 범위·편차·인수 조건을 넘기는 문서. 2026-10-01, 병렬 웨이브 W1(동시: unit-15). **속도 트랙: L3.**

## 1. 구현 범위
- `lib/inApp.ts`(신규): `detectInApp(ua)` 순수 함수. 카카오톡·인스타·페이스북·라인·네이버·다음 토큰, Android `; wv)`, iOS WebKit인데 `Safari/`·`CriOS|FxiOS|EdgiOS` 없음 → `webview`.
- `components/InAppNotice.tsx`: 스텁을 구현. 접힘 기본(제목+[주소/링크 복사][방법 보기][✕]), 펼침, 강제 펼침(권한 실패·SCR-20: [✕]·접기 없음). 닫음 상태는 모듈 메모리 변수(새 저장소 키 없음). 닫으면 포커스를 `main input`(닉네임)으로. `target`·외부 링크·앱 스킴 없음. 문구는 기존 `S.inApp.*`만 사용(키 추가 없음).
- `components/CopyLink.tsx`(DEC-015, F-1): 선택 prop `url?`·`label?`·`inline?`·`testId?` 추가, `roomId`를 선택으로. 기존 호출부 동작 불변. 랜딩은 `origin` 복사 + "주소 복사".
- `state/foreground.ts`(신규) `decideForeground` 순수 함수, `state/useForeground.ts`(신규) 훅(`visibilitychange`·`pageshow`, 500ms 합치기).
- `state/MeetingController.ts`: `onForeground`(미디어 정합 → 재연결 확인 → 3초 `media:state` 프로브 → 시간 초과 시 소켓 끊고 재연결, `NOT_JOINED`면 즉시 `resume`, 정상이면 ICE 문제가 있을 때만 `restartIce`), 상태 필드 `reconnectCause`(F-9). 기존 `disconnect`/`connect`/`resume`/ICE restart 경로를 그대로 재사용. 세션 토큰은 새로 영속하지 않음(ADR-0003).
- `lib/media.ts`: `LocalMedia.reconcile()`. `lib/signaling.ts`: `request`의 선택적 `timeoutMs`(기본 8000).
- `components/VideoTile.tsx`·`VideoGrid.tsx`·`pages/Room.tsx`: 원격 영상 `play()` 명시 호출, `NotAllowedError`만 "막힘"으로 집계, 방 단위 배너 1개(`role=status`, 버튼 44px+), 탭 시 모든 막힌 요소 `play()` 후 성공하면 info 토스트·포커스를 `main`(tabindex -1)으로, 일부 남으면 warn 토스트·배너 유지. 재연결 배너 문구는 `reconnectCause==='foreground'`일 때 `S.background.returned`.
- `pages/RoomPage.tsx`: SCR-20(지원 불가) 위에 `InAppNotice`(강제 펼침) 래퍼, expired 화면 본문에 `S.background.platformNote` 덧붙임.
- 테스트: `inApp.test.ts`(TC-360·360b), `foreground.test.ts`(TC-361~361d), `media.test.ts`(TC-362·362b), `e2e/mobile-lifecycle.spec.ts`(IT-35·35b·35c·35d·36·36b·36c). `test-cases.md`·`traceability.md`는 `check-docs --gen`으로 재생성됨(아래 §6).

## 2. 설계서 대비 편차
1. **`Lobby.tsx`·`PageShell.tsx`(unit-0 파일) 최소 수정**: 권한 실패 시 강제 펼침과 `S.inApp.permissionExtra` 한 줄을 위해 `PageShell`에 `forceOpenInApp` prop, `Lobby`에 `forceOpenInApp={!!mediaProblem}`와 인앱일 때 한 줄 추가. 03은 unit-17 파일에 포함하지 않았으나 04 §2.3.4가 요구하는 동작이고 unit-15와 겹치지 않아 진행했다(웨이브 규칙상 범위 밖이므로 오케스트레이터 확인 요청).
2. **프로브 `PARTICIPANT_GONE`은 `resumeNow`가 아니라 `kickSocket`으로 처리**: 서버 `room:resume`은 소켓에 이미 `pid`가 묶여 있으면 `ALREADY_JOINED`로 거부하므로, 같은 소켓에서 `resume`하면 무한 재연결 상태에 머문다. 새 소켓으로 `resume`해야 기존 `expired` 화면까지 이어진다. `NOT_JOINED`(묶임 없음)만 `resumeNow`.
3. 포커스 이동은 `onDismissed`가 없으면 `main input`을 쓴다(랜딩·대기실의 닉네임 입력). 
4. 인앱 E2E는 할당된 IT 번호(35·36)를 넘지 않도록 `IT-35c`·`IT-35d`로 접미사를 썼다.
5. 04의 "[회의 입장] 제스처에서 재생 권한 선취"(구현 후보)는 **하지 않음**(실기기 의존, 미검증).
6. 화면공유 판정(`supportsScreenShare`)은 변경하지 않았다(A-18).

## 3. 수동 확인 필요(미검증, 실기기)
- **UAT-04**: 카카오톡·인스타그램·네이버 등 실제 인앱 브라우저에서 UA 토큰이 맞는지, 안내 문구의 메뉴 이름이 실제와 맞는지, 권한 실패 시 안내가 해결에 도움이 되는지. UA 토큰은 일반 지식 기반(근거 약함·확인 필요 유지).
- **UAT-05**: iOS Safari 백그라운드·화면 잠금 15/30/60초 후 복귀 시 재연결 배너·같은 자리 복구·카메라/마이크 중단 토스트·유예 초과 시 expired 문구(`platformNote`). 에뮬레이션(`visibilitychange` 수동 발생, WebSocket 송신 차단)으로만 검증했고 실제 OS 수명주기는 미검증.
- iOS Safari에서 자동재생 거부가 실제로 발생하는 조건과 배너 한 번 탭으로 소리까지 재생되는지(미검증). 360×740 접힘 높이는 Chromium 에뮬레이션에서 130px 이하로 확인(IT-35c), 실제 폰은 미검증.
- 비-Chromium(Firefox/WebKit) E2E는 이 환경에서 실행하지 않았다.

## 4. 6단계 인수 조건(AC)
- AC-1 (UX-13): 인앱 UA(예: 카카오톡 Android)로 랜딩·대기실을 열면 접힌 안내가 보이고 `data-expanded="false"`, 높이 ≤130px(360×740), 가로 스크롤 없음. [방법 보기]로 펼침/접힘(`aria-expanded`). 일반 Chrome/Safari UA에는 렌더링되지 않음. 입장 조작 횟수(닉네임→입장)는 불변.
- AC-2 (UX-13): [✕] 클릭 시 안내가 사라지고 포커스가 `#lobby-nickname`. 같은 페이지 로드 동안 유지(저장소 키 없음, 새로고침하면 다시 보임).
- AC-3 (UX-13): 인앱 UA + `getUserMedia` 거부 시 안내가 강제 펼침, [✕]·접기 없음, 권한 안내 블록에 `permissionExtra` 문장. 지원 불가 화면(SCR-20)에도 강제 펼침. 안내에 외부 링크·`target`이 없음.
- AC-4 (UX-13): 랜딩의 복사 버튼은 사이트 주소(origin), 대기실·지원 불가는 초대 링크(`/r/:id`)를 복사.
- AC-5 (UX-15): 원격 `<video>.play()`가 `NotAllowedError`면 헤더·연결 배너 아래에 `role=status` 배너 1개("탭하여 재생", 높이≥44px). 탭 후 배너 사라지고 `main`에 포커스, info 토스트. `AbortError` 등은 배너 없음. 거부가 없으면 배너 없음.
- AC-6 (UX-14): 정상 연결에서 복귀 이벤트는 배너를 띄우지 않음. 응답 없는 소켓은 복귀 후 5초 이내 재연결 상태가 되고 배너 문구가 `S.background.returned`, 복구 후 같은 `selfId`·참가자 수 유지. 이미 끊김을 알면 즉시 재연결.
- AC-7 (UX-14): 로컬 트랙이 `ended`면 해당 버튼이 꺼지고 `S.background.mediaLost` warn 토스트, 상대에게 `media:state` 전송. 유예 초과 `expired` 화면 본문에 `platformNote`.
- AC-8 (회귀): 기존 IT-01~30, IT-03(재연결)·IT-19(다시 입장), 입장 3회 이내(IT-01/24) 통과 유지.

## 5. 게이트
**게이트 1(정적 분석)**: `npm run lint` 통과, `npm run typecheck` 통과(0 오류), `npm test` 통과(shared 16 · server 111+4 skip · web 61), `npm run test:e2e`(빌드 포함) 45 통과·1 skipped(기존 soak). 병렬 주의: unit-15가 `App.tsx`에서 아직 없는 `Legal`을 import하던 시점에 빌드가 한 번 실패했고, 린트에서 unit-15 파일의 `react-hooks/set-state-in-effect` 오류가 한 번 보였으나 모두 그쪽이 수정 완료한 뒤 재실행에서 통과했다. 전체 E2E 1회차에서 IT-08이 한 번 타임아웃(대기실 로딩 대기)이 났고 단독 3회 반복·전체 재실행은 통과(공유 `apps/web/dist`를 unit-15 빌드와 동시에 쓴 영향으로 추정, 원인 미확정).
`npm run check:docs`: 점검 통과.

**게이트 2(자체 리뷰)**:
- [x] 설계서/디자인서와 일치(편차는 §2에 기록)
- [x] 에러 처리: `play()` 거부는 `NotAllowedError`만 배너, 나머지는 의도적으로 무시(주석으로 사유); 프로브 `NETWORK`/기타 코드 분기 명시; 빈 `catch` 없음
- [x] 입력 검증: 새 외부 입력은 UA 문자열 정규식 판정뿐(입장 차단 없음), 서버 응답은 ack 코드로만 분기
- [x] 하드코딩 시크릿 없음
- [x] 새 의존성 없음(`package.json`/lockfile 불변)
- [x] 범위 외 변경 없음(`Lobby`·`PageShell`·`CopyLink`는 §2-1 / DEC-015)

## 6. 병렬 실행 및 공유 문서 갱신 요청
- 병렬 웨이브 W1, 동시 단위: **unit-15**. `useRoute.ts`·`App.tsx`·`strings.ts`·`config.ts`·`server/*` 미수정.
- `docs/05-qa/test-cases.md`·`docs/harness/traceability.md`는 지시에 따라 `node scripts/check-docs.mjs --gen`을 실행했다(전체 재생성이라 unit-15 행도 함께 반영됨). 충돌 시 오케스트레이터가 재생성으로 정리하면 된다.
- 갱신 요청(traceability, 구현 상태): UX-13 → unit-17, TC-360·360b, IT-35c·35d, 구현 완료(실기기 UAT-04 미수행); UX-14 → unit-17, TC-361~362b, IT-36·36b·36c, 구현 완료(UAT-05 미수행); UX-15 → unit-17, IT-35·35b, 구현 완료(실기기 미검증).
- 결정 기록 요청: (1) `PARTICIPANT_GONE` 프로브는 새 소켓 resume 경로 사용(§2-2, 서버 `ALREADY_JOINED` 근거). (2) `Lobby`/`PageShell` 최소 수정(§2-1) 승인 여부.
- 서버 변경 없음. 같은 방에서 `visibilitychange` 이벤트 합치기는 클라이언트 500ms 창.
