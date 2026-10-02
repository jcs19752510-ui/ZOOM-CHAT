> **이 문서의 용도** — 누가: 개발자, 기획자 / 언제: 어떤 요구가 어떤 테스트로 확인되는지 볼 때 / 무엇을: 모든 TC/IT/UAT/MC와 연결된 요구를 한눈에 보게 한다. **표는 테스트 코드에서 자동 생성**한다.

# 테스트 케이스 목록

| 항목 | 내용 |
|---|---|
| 버전 | 0.1 |
| 작성일 | 2026-10-01 |
| 상태 | 승인 (구현·검증 반영, DEC-004) |
| 주도 | ② 개발자 |

## 변경 이력
| 버전 | 날짜 | 내용 |
|---|---|---|
| 0.1 | 2026-10-01 | 최초 작성, 표는 자동 생성 |


- 요구 대비 TC 매핑(요구 → 테스트)은 [`../traceability.md`](../traceability.md), 테스트 → 요구는 아래 표다.
- 갱신: `node scripts/check-docs.mjs --gen`
- 유형: 서버(단위·통합·보안), 공유(단위), 웹(단위), E2E(Playwright), UAT(사용자 수행, 미수행), MC(수동·명령 점검)

<!-- BEGIN GENERATED -->
| ID | 제목 | 연결 요구 | 유형 | 파일 | 실행 |
|---|---|---|---|---|---|
| IT-01 | 3명이 입장해 서로의 비디오·오디오 트랙을 수신한다 | FR-01, FR-03, FR-04, FR-07, NFR-01 | E2E | `e2e/meeting.spec.ts` | 자동 |
| IT-02 | 마이크·카메라를 끄면 다른 참가자의 목록과 타일에 반영된다 | FR-08, FR-13, UX-05 | E2E | `e2e/meeting.spec.ts` | 자동 |
| IT-03 | 네트워크가 끊겼다 복구되면 같은 자리로 돌아오고 영상이 다시 흐른다 | FR-20, FR-19, NFR-03 | E2E | `e2e/meeting.spec.ts` | 자동 |
| IT-04 | 채팅의 XSS 페이로드는 텍스트로만 표시되고 http 링크만 안전하게 열린다 | FR-11, SEC-07 | E2E | `e2e/meeting.spec.ts` | 자동 |
| IT-05 | 호스트가 방을 잠그고, 전체 음소거하고, 참가자를 내보낸다(재입장 차단) | FR-14, FR-15, FR-16, SEC-05 | E2E | `e2e/meeting.spec.ts` | 자동 |
| IT-06 | 호스트가 입장하기 전에는 대기 화면이 보이고, 호스트가 입장하면 자동으로 진행된다 | FR-23, POL-13 | E2E | `e2e/meeting.spec.ts` | 자동 |
| IT-07 | 비밀번호 방: 틀린 비밀번호는 거부되고 올바르면 입장한다 | FR-05, SEC-02 | E2E | `e2e/meeting.spec.ts` | 자동 |
| IT-08 | 화면공유: 공유 화면은 크게, 다른 사람은 시작할 수 없고, 중지하면 그리드로 돌아온다 | FR-12, POL-12, UX-06 | E2E | `e2e/meeting.spec.ts` | 자동 |
| IT-09 | 호스트가 나가면 다음 참가자가 호스트가 되어 호스트 도구를 쓸 수 있다 | FR-17 | E2E | `e2e/meeting.spec.ts` | 자동 |
| IT-10 | ${size.width}px: 화면별 스크린샷, 가로 스크롤 없음, 터치 타깃 44px 이상 | NFR-10, UX-02, UX-05 | E2E | `e2e/responsive.spec.ts` | 자동 |
| IT-11 | 키보드만으로 랜딩 → 방 만들기 → 입장 → 채팅 → 참가자 → 나가기까지 할 수 있다 | UX-10, NFR-09 | E2E | `e2e/a11y.spec.ts` | 자동 |
| IT-12 | 모든 아이콘 버튼에 접근 가능한 이름이 있고, 상태 화면은 스크린리더에 알려진다 | UX-10, NFR-09 | E2E | `e2e/a11y.spec.ts` | 자동 |
| IT-13 | 통화 중 마이크 장치를 바꿔도 통화가 유지되고 상대가 계속 소리를 받는다 | FR-09, FR-04 | E2E | `e2e/states.spec.ts` | 자동 |
| IT-14 | 말하는 참가자의 타일이 강조되고, 말이 멈추면 강조가 풀린다(임계값 + 디바운스) | FR-10, UX-07 | E2E | `e2e/states.spec.ts` | 자동 |
| IT-15 | 서버가 재시작되어 방이 사라지면 이유와 다시 시작하는 방법을 안내한다 | FR-21, NFR-06 | E2E | `e2e/states.spec.ts` | 자동 |
| IT-16 | 정원이 차면 세 번째 사람은 "방이 가득 찼습니다"를 본다 | FR-06, FR-07, POL-01 | E2E | `e2e/states.spec.ts` | 자동 |
| IT-17 | 카메라·마이크 권한이 거부돼도 원인과 해결 방법을 안내하고 장치 없이 입장할 수 있다 | FR-04, UX-03, UX-02 | E2E | `e2e/states.spec.ts` | 자동 |
| IT-18 | 지원하지 않는 환경(WebRTC 없음)은 안내 화면과 링크 복사를 보여 준다 | NFR-05, POL-14, FR-06 | E2E | `e2e/states.spec.ts` | 자동 |
| IT-19 | 나간 뒤 "다시 입장"으로 같은 링크에 다시 들어갈 수 있다 | FR-22, FR-03 | E2E | `e2e/states.spec.ts` | 자동 |
| IT-20 | 정원 6명이 모두 입장해 서로 5개씩 영상·오디오를 받고, 7번째는 거부된다 | FR-07, NFR-04, NFR-13, UX-05 | E2E | `e2e/mesh6.spec.ts` | 자동 |
| IT-21 | 서버가 발급한 HMAC 임시 자격증명으로 TURN 릴레이 연결이 되고 영상·오디오가 흐른다 | SEC-09, FR-07 | E2E | `e2e/turn.spec.ts` | 자동 |
| IT-22 | TURN 공유 비밀이 다르면(자격증명 위조·불일치) 릴레이 연결이 만들어지지 않는다 | SEC-09 | E2E | `e2e/turn.spec.ts` | 자동 |
| IT-23 | 링크 복사 버튼은 링크를 클립보드에 복사하고 결과를 알린다. 클립보드가 막히면 선택 가능한 링크를 보여 준다 | FR-02, UX-12 | E2E | `e2e/ux.spec.ts` | 자동 |
| IT-24 | 입장 버튼을 누른 뒤 첫 원격 영상까지 걸리는 시간(로컬 루프백 기준, 중앙값 5초·최대 10초 이내) | NFR-02, KPI-03 | E2E | `e2e/ux.spec.ts` | 자동 |
| IT-25 | 컨트롤바 순서는 마이크, 카메라, 화면공유, 채팅, 참가자, 나가기이고 나가기는 분리되어 위험색이다 | UX-04 | E2E | `e2e/ux.spec.ts` | 자동 |
| IT-26 | 대기실에 네트워크 정보(IP) 노출 가능성 고지가 보인다 | UX-09 | E2E | `e2e/ux.spec.ts` | 자동 |
| IT-27 | prefers-reduced-motion이면 전환·애니메이션이 사실상 꺼진다 | UX-11 | E2E | `e2e/ux.spec.ts` | 자동 |
| IT-28 | 입장·퇴장 알림은 aria-live 영역에 표시된다 | UX-12, FR-13 | E2E | `e2e/ux.spec.ts` | 자동 |
| IT-29 | 6명이 오래 통화해도 모든 원격 영상이 계속 흐르고 페이지 오류가 없다 (SOAK_MINUTES 지정 시에만 실행) | NFR-03, NFR-04, NFR-13 | E2E | `e2e/soak.spec.ts` | 자동 |
| IT-30 | CPU를 4배 느리게 한 저사양 기기 모사에서도 3명 통화가 연결되고 영상이 계속 흐른다 | NFR-02, NFR-13 | E2E | `e2e/soak.spec.ts` | 자동 |
| IT-31 | ${size.width}px: 랜딩·대기실에 법률 푸터(링크 3개·새 탭·접근 이름·44px·Tab 도달·가로 스크롤 없음)가 있고 회의실에는 없다 | POL-17, POL-19, NFR-10, UX-10 | E2E | `e2e/legalfooter.spec.ts` | 자동 |
| IT-32 | ${size.width}px: 처리방침·약관·문의 3개 페이지가 열리고 초안 리본·미정 표시·문서 간 이동·가로 스크롤 없음을 만족한다 | POL-17, POL-19, POL-20, NFR-10 | E2E | `e2e/legal.spec.ts` | 자동 |
| IT-32b | 랜딩 푸터 링크는 새 탭으로 법률 페이지를 열고 원래 탭은 그대로 남는다 | POL-17, POL-19 | E2E | `e2e/legal.spec.ts` | 자동 |
| IT-33 | 운영자 값이 있으면 mailto 링크·책임자·시행일(2026년 10월 1일)·STUN 호스트가 보이고, https 연락처는 새 탭 + rel noopener noreferrer로 열린다 | POL-19, POL-20, POL-17, SEC-07 | E2E | `e2e/legal.spec.ts` | 자동 |
| IT-33b | 서버 응답에 javascript:·data: 연락처가 섞여 와도 화면에 링크가 만들어지지 않고 텍스트로만 보인다(방어적 처리) | SEC-07, POL-19 | E2E | `e2e/legal.spec.ts` | 자동 |
| IT-33c | /api/meta 호출이 실패하면 본문은 그대로 읽히고 슬롯에 안내와 다시 불러오기가 나오며, 재시도하면 복구된다 | POL-17, UX-03 | E2E | `e2e/legal.spec.ts` | 자동 |
| IT-35 | 자동재생이 거부되면 방 단위 배너가 보이고, 탭하면 재생되며 배너가 사라지고 포커스가 회의 화면으로 간다 | UX-15 | E2E | `e2e/mobile-lifecycle.spec.ts` | 자동 |
| IT-35b | 거부되지 않으면 배너가 없다(기존 동작 유지) | UX-15 | E2E | `e2e/mobile-lifecycle.spec.ts` | 자동 |
| IT-35c | 인앱 UA: 랜딩·대기실에 접힌 안내가 보이고 입장을 막지 않으며, 닫으면 닉네임으로 포커스가 가고 일반 UA에는 없다 | UX-13 | E2E | `e2e/mobile-lifecycle.spec.ts` | 자동 |
| IT-35d | 인앱 UA에서 카메라·마이크 권한이 거부되면 안내가 강제로 펼쳐지고 닫기 버튼이 없다 | UX-13 | E2E | `e2e/mobile-lifecycle.spec.ts` | 자동 |
| IT-36 | 조용히 죽은 소켓은 화면 복귀 후 5초 안에 재연결 배너(복귀 문구)가 보이고, 복구되면 같은 자리로 돌아온다 | UX-14 | E2E | `e2e/mobile-lifecycle.spec.ts` | 자동 |
| IT-36b | 정상 연결에서 복귀(visibilitychange·pageshow)해도 재연결 배너가 뜨지 않고 통화가 유지된다 | UX-14 | E2E | `e2e/mobile-lifecycle.spec.ts` | 자동 |
| IT-36c | 서버가 연결을 끊은 뒤 복귀 이벤트가 겹쳐도 같은 자리로 돌아온다 | UX-14 | E2E | `e2e/mobile-lifecycle.spec.ts` | 자동 |
| IT-37 | ${size.width}px: 악성·초장문 운영자 값이 와도 href에 위험 스킴·이벤트 속성이 없고 alert이 실행되지 않으며 가로 스크롤이 생기지 않는다 | SEC-07, POL-19, NFR-10 | E2E | `e2e/legalAdversarial.spec.ts` | 자동 |
| IT-37b | 서버가 이상한 응답(HTML 200·429·500·빈 본문·배열·거대 JSON·지연)을 보내도 본문은 읽히고 슬롯은 실패 안내로 수렴하며 로딩은 aria-busy다 | SEC-06, UX-03 | E2E | `e2e/legalAdversarial.spec.ts` | 자동 |
| IT-38 | ${size.width}px: 키보드만으로 문서 이동·뒤로가기, 터치 대상 44px 이상, 포커스 표시, CSP 위반·콘솔 오류 없음 | NFR-10, POL-17 | E2E | `e2e/legalAdversarial.spec.ts` | 자동 |
| IT-39 | 서버가 이미 자리를 정리했는데(PARTICIPANT_GONE) 복귀하면, 재연결 상태에 갇히지 않고 새 소켓 한 번으로 만료 화면에 도달한다 | UX-14 | E2E | `e2e/foreground-extra.spec.ts` | 자동 |
| IT-40 | 죽은 소켓 상태에서 복귀 이벤트가 연속으로 쏟아져도 소켓은 한 번만 다시 열리고 같은 자리로 돌아오며 이후 추가 연결이 없다 | UX-14 | E2E | `e2e/foreground-extra.spec.ts` | 자동 |
| IT-40b | 정상 연결에서 복귀 이벤트가 연속으로 와도 소켓을 다시 열지 않는다 | UX-14 | E2E | `e2e/foreground-extra.spec.ts` | 자동 |
| IT-40c | play()가 NotAllowedError가 아닌 이유(AbortError)로 실패하면 자동재생 배너를 띄우지 않는다 | UX-15 | E2E | `e2e/foreground-extra.spec.ts` | 자동 |
| IT-40d | 같은 실행에서 안내를 닫았어도, 이후 권한 실패 화면에서는 안내가 강제로 다시 펼쳐진다(닫기 없음) | UX-13 | E2E | `e2e/foreground-extra.spec.ts` | 자동 |
| IT-40e | 안내의 복사 버튼: 랜딩은 사이트 주소, 대기실·지원 불가 화면은 초대 링크를 복사하고 안내에는 외부 링크·target이 없다 | UX-13 | E2E | `e2e/foreground-extra.spec.ts` | 자동 |
| IT-40f | 화면이 꺼진 동안 카메라 트랙이 끝났으면(ended) 복귀 시 카메라 버튼이 꺼지고 경고 토스트가 뜨며 상대 화면에도 반영된다 | UX-14 | E2E | `e2e/foreground-extra.spec.ts` | 자동 |
| IT-40g | 접근성: 안내 바·배너의 이름·역할·상태 속성, 터치 44px, 키보드 순서(안내 → 입력), prefers-reduced-motion에서 전환이 꺼진다 | UX-13, UX-15 | E2E | `e2e/foreground-extra.spec.ts` | 자동 |
| IT-40h | 360×740 대기실: 접힌 안내가 [회의 입장] 버튼을 밀어내는 양은 안내 높이(≤130px) 이내이고(04 §2.3.4 의도적 비용), 펼쳐도 스크롤로 닿을 수 있으며 입장이 막히지 않는다 | UX-13 | E2E | `e2e/foreground-extra.spec.ts` | 자동 |
| IT-40i | visibilitychange 없이 pageshow(뒤로가기 캐시 복원)만 와도 5초 안에 죽은 소켓을 감지해 같은 자리로 복구한다 | UX-14 | E2E | `e2e/foreground-extra.spec.ts` | 자동 |
| IT-40j | 프로브 응답이 NOT_JOINED(소켓이 자리에 안 묶임)면 소켓을 새로 열지 않고 같은 소켓으로 즉시 room:resume을 보낸다 | UX-14 | E2E | `e2e/foreground-extra.spec.ts` | 자동 |
| IT-41 | 운영자가 방을 닫으면 모든 참가자가 "운영자가 이 회의를 종료했습니다"를 보고, 재연결을 시도하지 않으며, 같은 링크로는 다시 입장할 수 없다 | POL-19, EVT-34 | E2E | `e2e/operatorClose.spec.ts` | 자동 |
| IT-42 | 운영자 종료 화면: 360px에서 버튼 터치 44px 이상, 키보드로 [새 회의 만들기]에 닿고, 새 회의 버튼은 랜딩으로 이동한다 | POL-19, UX-02 | E2E | `e2e/operatorClose.spec.ts` | 자동 |
| IT-43 | 운영자 종료 화면(1280px): alert 역할·제목, Tab 순서(새 회의 → 문의·신고), 포커스 표시, 가로 스크롤 없음, 모든 카메라·마이크 트랙 중지, 복귀 이벤트가 와도 소켓·장치를 다시 열지 않는다 | POL-19, UX-02 | E2E | `e2e/operatorClose-extra.spec.ts` | 자동 |
| IT-44 | 끊김 유예 중(소켓 없음)인 참가자가 있는 방을 폐쇄하면 복귀한 참가자는 재연결·무한 재시도 없이 종료 안내를 보고 방은 다시 생기지 않는다 | POL-19 | E2E | `e2e/operatorClose-extra.spec.ts` | 자동 |
| IT-45 | 일반(루프백) 통화에서 각 참가자가 direct를 한 번씩만 보고하고 로그에 식별자가 없다 | NFR-15, KPI-05 | E2E | `e2e/pathMetrics.spec.ts` | 자동 |
| IT-46 | TURN 릴레이로만 연결되면 각 참가자가 relay를 보고하고 direct 보고는 없다 | NFR-15, KPI-05, SEC-09 | E2E | `e2e/turn.spec.ts` | 자동 |
| IT-47 | 3인 통화에서 연결 6개 끝(참가자당 2개)이 direct를 정확히 6줄 보고하고, 로그에 식별자가 없으며, 화면에 알림·경고가 뜨지 않는다 | NFR-15, KPI-05 | E2E | `e2e/pathMetrics-extra.spec.ts` | 자동 |
| IT-50 | 랜딩 입력 검증: 닉네임·비밀번호 길이·링크 형식 오류는 role=alert로 원인과 해결을 알리고, 서버 오류·속도 제한·대기 중 상태가 구분된다 | FR-01, FR-03, UX-03, NFR-01 | E2E | `e2e/webRetro.spec.ts` | 자동 |
| IT-51 | 방 상태 조회와 입장 사이에 정원이 차거나 방이 잠기면, 입력 화면에 갇히지 않고 가득 참·잠김 화면으로 바뀐다 | FR-06, FR-07, POL-01, UX-02 | E2E | `e2e/webRetro.spec.ts` | 자동 |
| IT-52 | 장치 오류 4종(차단·없음·사용 중·알 수 없음)은 각각 원인과 해결 문구를 role=alert로 보이고 장치 없이 입장할 수 있으며, 다시 확인하면 복구된다 | FR-04, UX-02, UX-03 | E2E | `e2e/webRetro.spec.ts` | 자동 |
| IT-53 | 호스트 도구 UI: 참가자에게는 도구·내보내기가 하나도 없고, 호스트에게는 자기 자신 외 모두에게 내보내기가 있으며, 확인창에서 취소하면 아무 일도 일어나지 않는다 | FR-14, FR-15, FR-16, SEC-05, UX-10 | E2E | `e2e/webRetro.spec.ts` | 자동 |
| IT-54 | 포커스 관리: 확인창은 취소에 포커스를 두고 Tab·Shift+Tab을 창 안에 가두며 닫으면 열었던 버튼으로 돌려주고, 장치 시트는 닫기에 포커스를 두고 Esc로 닫힌다 | UX-10, NFR-09 | E2E | `e2e/webRetro.spec.ts` | 자동 |
| IT-54b | 장치 시트(aria-modal)도 Tab을 창 안에 가둬야 한다(G-2 수정) | UX-10, NFR-09 | E2E | `e2e/webRetro.spec.ts` | 자동 |
| IT-55 | 키보드 포커스 표시(2px 이상, 포커스 색)가 랜딩·회의실 버튼에 보이고, prefers-reduced-motion이면 회의실 버튼의 전환도 꺼진다 | UX-10, UX-11, NFR-09 | E2E | `e2e/webRetro.spec.ts` | 자동 |
| IT-56 | 상태 화면: 로딩·오류·방 없음·호스트 대기·잠김·가득 참 화면이 각각 올바른 role·h1·행동 버튼을 갖고, 360px에서 가로 스크롤이 없으며, 오류·호스트 대기는 복구된다 | UX-02, UX-03, FR-06, FR-23 | E2E | `e2e/webRetro.spec.ts` | 자동 |
| IT-57 | 채팅 경계·XSS(360px): 500자(이모지 500개 포함)는 전달되고 501자는 막히며 입력이 보존되고, 초장문·악성 URL이 레이아웃·속성을 깨지 못한다 | FR-11, SEC-07, NFR-10 | E2E | `e2e/webRetro.spec.ts` | 자동 |
| IT-57b | 보이지 않는 문자만 있는 메시지가 서버에서 거부되면 "500자까지"가 아니라 실제 원인에 맞는 안내가 나와야 한다 (DEF-W01 수정) | FR-11, UX-03 | E2E | `e2e/webRetro.spec.ts` | 자동 |
| IT-57c | 채팅 전송 응답이 오지 않으면(8초 시간 초과) 보낸 글이 입력창에 복원되고 원인·해결 문구가 role=alert로 나온다 | FR-11, UX-03 | E2E | `e2e/webRetro.spec.ts` | 자동 |
| IT-58 | 360px 터치 타깃: 랜딩·대기실·회의실(채팅·참가자 패널, 확인창, 장치 시트)의 버튼·입력·링크가 44px 이상이다(인라인 링크와 알려진 결함 DEF-W02·W03 제외) | NFR-10, UX-02, UX-10 | E2E | `e2e/webRetro.spec.ts` | 자동 |
| IT-58b | 360px에서 회의실 머리글의 링크 복사 버튼과 채팅 보내기 버튼도 가로 44px 이상이어야 한다 (DEF-W02·W03 수정) | NFR-10, UX-10 | E2E | `e2e/webRetro.spec.ts` | 자동 |
| IT-59 | 대기실: 닉네임 검증 오류는 입장하지 않고 안내하며, 미리보기 준비 중에는 입장 버튼이 꺼져 있고, 비밀번호 칸은 비밀번호 방의 참가자에게만 보인다 | FR-03, FR-04, FR-05, UX-03 | E2E | `e2e/webRetro.spec.ts` | 자동 |
| IT-59b | 혼자 있을 때만 "아직 아무도 없어요" 빈 상태 카드와 링크 복사가 보이고, 참가자가 들어오면 사라진다 | FR-02, UX-02, FR-13 | E2E | `e2e/webRetro.spec.ts` | 자동 |
| IT-60 | 방 생성 → 상태 조회 → 호스트 입장 → 참가자 입장이 실제 서버와 맞물리고 컨트롤러가 보낸 모든 요청이 서버 스키마를 통과한다 | FR-01, FR-03, FR-06, FR-23, NFR-12 | E2E | `apps/web/src/integration/clientServerWire.test.ts` | 자동 |
| IT-61 | 신호(offer·ICE)는 서버를 거쳐 상대 transport에 도착하고 from은 서버가 부여한 참가자 ID다 | FR-07, SEC-04 | E2E | `apps/web/src/integration/clientServerWire.test.ts` | 자동 |
| IT-62 | 서버가 발급한 ICE 서버(STUN + TURN 임시 자격증명)가 그대로 transport.start에 전달되고 자격증명이 HMAC 규칙과 일치한다 | SEC-09, FR-07 | E2E | `apps/web/src/integration/clientServerWire.test.ts` | 자동 |
| IT-63 | 입장 거부·실패 코드 8종(WRONG_PASSWORD 포함)이 실제 서버에서 만들어지고 컨트롤러는 idle로 돌아와 같은 코드를 호출자에게 돌려준다 | FR-02, FR-05, FR-06, FR-07, FR-14, FR-15, FR-23, POL-06, SEC-02 | E2E | `apps/web/src/integration/clientServerWire.test.ts` | 자동 |
| IT-64 | 정원이 찬 방의 입장은 ROOM_FULL이고 방 상태 조회의 full 플래그와 일치한다 | FR-07, POL-01 | E2E | `apps/web/src/integration/clientServerWire.test.ts` | 자동 |
| IT-65 | 채팅은 서버가 채운 발신자 정보와 함께 모두에게 가고(HTML은 문자열 그대로) 길이·보이지 않는 글자·속도 제한 오류 코드가 컨트롤러에 그대로 전달된다 | FR-11, SEC-07, POL-07 | E2E | `apps/web/src/integration/clientServerWire.test.ts` | 자동 |
| IT-66 | 잠금·전체 음소거·강퇴·호스트 승계가 서버 판정을 거쳐 양쪽 컨트롤러 상태·알림에 반영되고 비호스트의 요청은 호스트 전용 안내로 끝난다 | FR-14, FR-15, FR-16, FR-17, SEC-05 | E2E | `apps/web/src/integration/clientServerWire.test.ts` | 자동 |
| IT-67 | 강퇴: 대상 컨트롤러는 kicked로 끝나고 재연결을 시도하지 않으며 남은 참가자 목록·transport에서 정리되고 같은 사람은 KICKED로 재입장이 막힌다 | FR-15, POL-06, SEC-05 | E2E | `apps/web/src/integration/clientServerWire.test.ts` | 자동 |
| IT-68 | 서버가 소켓을 끊으면 컨트롤러가 재연결 상태를 거쳐 토큰으로 같은 자리(selfId·호스트)를 복구하고 ICE를 재시작한다 | FR-19, FR-20, NFR-03, SEC-03 | E2E | `apps/web/src/integration/clientServerWire.test.ts` | 자동 |
| IT-69 | 재연결 실패 사유별 종료: 서버 재시작(방 없음)은 restarted, 서명 비밀이 바뀌면 expired, 서버가 이미 자리를 정리했으면 expired | FR-20, FR-21, NFR-06, SEC-03 | E2E | `apps/web/src/integration/clientServerWire.test.ts` | 자동 |
| IT-70 | 경로 보고(direct·relay)는 서버 스키마를 통과해 식별자 없는 로그 한 줄로만 남는다 | NFR-15, KPI-05, POL-09 | E2E | `apps/web/src/integration/clientServerWire.test.ts` | 자동 |
| IT-71 | /api/meta 실제 응답이 웹 parseMeta·getMeta를 통과하고(설정 있음/없음 모두) 호스트명만 담긴다 | POL-19, POL-17, POL-20, SEC-07 | E2E | `apps/web/src/integration/clientServerWire.test.ts` | 자동 |
| IT-72 | 운영자 방 폐쇄: 모든 컨트롤러가 operator로 끝나고 재연결·재시도를 하지 않으며 방 상태 조회는 exists=false | POL-19, EVT-34, FR-21 | E2E | `apps/web/src/integration/clientServerWire.test.ts` | 자동 |
| IT-74 | 입장 응답 코드 전부가 화면 전환 또는 입력 화면 문구로 연결되고, 매핑 없는 코드는 일반 오류 문구(원인 불명 안내)로 떨어진다 | UX-02, UX-03, FR-06, FR-07, FR-23 | E2E | `apps/web/src/integration/joinErrorMapping.test.ts` | 자동 |
| IT-75 | 대기실에서 올바른 닉네임과 너무 짧은 비밀번호를 보내면 서버 스키마가 INVALID_PAYLOAD로 거부하는데 화면은 닉네임 안내가 아니라 비밀번호 원인을 알려야 한다 (DEF-I-01 재현) | UX-03, SEC-02, FR-05 | E2E | `apps/web/src/integration/joinErrorMapping.test.ts` | 자동 |
| IT-76 | 컨트롤러가 내는 종료 사유 6종이 서로 다른 의도의 종료 화면으로 가고 restarted·operator는 본문이 다르다 | FR-21, FR-22, POL-19, UX-02 | E2E | `apps/web/src/integration/joinErrorMapping.test.ts` | 자동 |
| IT-77 | errorText: 서버가 호스트 동작에서 돌려줄 수 있는 코드는 모두 비어 있지 않은 문구가 되고 FORBIDDEN·RATE_LIMITED는 전용 문구다 | FR-14, FR-15, FR-16, UX-03 | E2E | `apps/web/src/integration/joinErrorMapping.test.ts` | 자동 |
| IT-78 | 입력 maxLength·검증식·안내 문구의 숫자가 LIMITS와 같다 | FR-03, FR-05, FR-11, POL-04, POL-07 | E2E | `apps/web/src/integration/limitsContract.test.ts` | 자동 |
| IT-79 | 웹이 쓰는 정규화 함수는 서버가 쓰는 것과 같은 shared 구현이다(경계값에서 서버·웹 판정이 갈릴 수 없다) | POL-04, POL-07 | E2E | `apps/web/src/integration/limitsContract.test.ts` | 자동 |
| IT-80 | 클라이언트→서버 이벤트 12종: shared 타입 = 서버 핸들러 = 서버 속도 제한 표 = 웹이 실제로 보내는 이벤트 | NFR-12, SEC-06 | E2E | `apps/server/test/featureContracts.test.ts` | 자동 |
| IT-81 | 서버→클라이언트 이벤트 10종: shared 타입 = 서버가 내보내는 이벤트 = 웹이 듣는 이벤트 | NFR-12, SEC-04 | E2E | `apps/server/test/featureContracts.test.ts` | 자동 |
| IT-82 | 서버·웹 소스가 쓰는 오류 코드 문자열은 모두 shared ERROR_CODES(또는 HTTP 전용 코드·NETWORK)에 있고 서버 message 표와 코드 목록이 일치한다 | NFR-12, SEC-08 | E2E | `apps/server/test/featureContracts.test.ts` | 자동 |
| IT-83 | DOC-I-01: api-spec.md(단일 기준)에 오류 코드 19종·metrics:path·room:closed·/api/meta·admin 이벤트가 모두 적혀 있다 (11단계 문서화 대기, DEC-020) | NFR-12, SEC-08 | E2E | `apps/server/test/featureContracts.test.ts` | 자동 |
| IT-84 | config 스키마의 환경변수는 .env.example에 모두(주석 포함) 있고 .env.example에 스키마에 없는 죽은 키가 없으며, 사본을 그대로 쓰면 개발 모드로 기동 설정이 통과한다 | NFR-08, SEC-10, POL-19, POL-20 | E2E | `apps/server/test/featureContracts.test.ts` | 자동 |
| IT-85 | 기본 포트(3001)가 config 기본값·.env.example·Dockerfile(EXPOSE·HEALTHCHECK)·dev 프록시·runbook에서 같고, TURN 포트·릴레이 대역이 .env.example·compose 안내·coturn 설정에서 같다 | NFR-07, NFR-08, SEC-09 | E2E | `apps/server/test/featureContracts.test.ts` | 자동 |
| IT-86 | 기본 정원(6명) mesh의 릴레이 할당 수(참가자당 5개, ICE 재시작 중첩 시 2배)가 coturn user-quota 안에 들어간다 | NFR-04, NFR-13, SEC-09 | E2E | `apps/server/test/featureContracts.test.ts` | 자동 |
| IT-87 | 10종 이벤트를 실제로 모두 발생시켜 모든 페이로드가 v:1이고, 발신자 필드(from·by·id)는 서버가 부여한 참가자 ID이며, 이벤트 목록이 shared와 같다 | NFR-12, SEC-04, FR-13, FR-14, FR-15, FR-16, FR-17, POL-19 | E2E | `apps/server/test/featureContracts.test.ts` | 자동 |
| IT-88 | 마이크를 짧은 시간에 연타해 서버 media:state 속도 제한(10회, 초당 5)에 걸려도 결국 컨트롤러 표시와 서버·다른 참가자가 보는 상태가 같아져야 한다 (DEF-I-02 재현) | FR-08, FR-13, SEC-06 | E2E | `apps/web/src/integration/clientServerWire.test.ts` | 자동 |
| IT-90 | 전체 여정: 링크→3조작 입장→서로 영상→채팅→화면공유→호스트 도구→재연결→호스트 승계→전원 퇴장→방 삭제 (기본 한도, 콘솔·CSP 오류 0) | FR-01, FR-02, FR-03, FR-04, FR-07, FR-08, FR-11, FR-12, FR-13, FR-14, FR-15, FR-16, FR-17, FR-20, FR-22, NFR-01, NFR-07, SEC-01, POL-05 | E2E | `e2e/system.spec.ts` | 자동 |
| IT-91 | 성능 스모크(운영 프로세스, 기본 한도): 첫 영상까지 8회, 6명 전원 mesh 완성 시간, 서버 RSS·CPU | NFR-02, NFR-04, NFR-13, NFR-08, KPI-03 | E2E | `e2e/system.spec.ts` | 자동 |
| IT-92 | 서버 상한 동시 도달: 방 수 상한·IP당 연결 상한에서 서버는 정상, 기존 통화는 유지, 해제되면 다시 가능 | NFR-04, POL-15, SEC-06, UX-03 | E2E | `e2e/system.spec.ts` | 자동 |
| IT-92b | 서버 방 수 상한으로 방 만들기가 거부되면 "인터넷 연결"이 아닌 서버가 붐빈다는 원인으로 안내해야 한다 (결함 재현: DEF-S-02) | UX-03, POL-15 | E2E | `e2e/system.spec.ts` | 자동 |
| IT-92c | IP당 동시 연결 상한으로 입장이 거부되면 "인터넷 연결"이 아닌 원인(이 네트워크의 연결이 너무 많음 등)으로 안내해야 한다 (결함 재현: DEF-S-02) | UX-03, POL-15, SEC-06 | E2E | `e2e/system.spec.ts` | 자동 |
| IT-93 | 운영 프로세스 SIGTERM(graceful) → 참가자는 재연결 중을 거쳐 "서비스 재시작" 안내 → 새 프로세스에서 새 회의가 바로 된다 | NFR-06, NFR-08, FR-21 | E2E | `e2e/system.spec.ts` | 자동 |
| IT-94 | 운영 프로세스 보안 헤더·교차 Origin 거부, 실제 통화 뒤 로그에 토큰·채팅·닉네임·SDP·IP가 없다 | NFR-08, SEC-10, SEC-08, SEC-03, POL-09 | E2E | `e2e/system.spec.ts` | 자동 |
| IT-95 | 엣지: 호스트가 끊겨 유예가 지나면 승계되고 돌아온 원 호스트는 만료 안내, 빈 방 만료, 호스트 입장 전 방은 TTL 뒤 사라진다 | FR-17, FR-18, FR-20, FR-22, POL-02, POL-05, POL-13 | E2E | `e2e/system.spec.ts` | 자동 |
| IT-96 | 지표 계측 현황: 입장 성공(participant joined)과 연결 경로(direct/relay) 로그는 있다 | KPI-01, KPI-05, NFR-15, POL-09 | E2E | `e2e/system.spec.ts` | 자동 |
| IT-97 | 입장이 거부되면 거부 사유가 로그 이벤트로 남아 입장 성공률(성공÷시도)을 계산할 수 있어야 한다 (결함 재현: DEF-S-01) | KPI-01 | E2E | `e2e/system.spec.ts` | 자동 |
| IT-98 | 재접속 결과(성공/유예 초과)가 로그 이벤트로 남아 재연결 성공률을 계산할 수 있어야 한다 (결함 재현: DEF-S-01) | KPI-04, FR-20, NFR-03 | E2E | `e2e/system.spec.ts` | 자동 |
| IT-99 | 같은 네트워크(공인 IP)의 참가자를 내보낸 뒤에도 호스트·다른 참가자는 같은 링크로 다시 입장할 수 있어야 한다 (결함 재현: DEF-S-03) | FR-15, POL-06, FR-17 | E2E | `e2e/system.spec.ts` | 자동 |
| IT-100 | TURN 릴레이로만 연결된 통화 중 서버가 SIGTERM으로 재시작되면 재시작 안내를 보고, 같은 TURN 비밀로 새 회의도 릴레이로 연결된다(경로 로그는 relay만) | SEC-09, NFR-15, NFR-06, FR-07, FR-21 | E2E | `e2e/system.spec.ts` | 자동 |
| IT-101 | TURN이 설정된 일반(릴레이 강제 아님) 3명 통화에서 직접 연결이 성공해도 TURN 할당이 몇 개 열리는지 센다 — total-quota 산정 가정(참가자 N(N-1)개) 검증 | NFR-04, SEC-09, NFR-15 | E2E | `e2e/system.spec.ts` | 자동 |
| IT-102 | 운영 프로세스: 화면공유·채팅·잠금이 진행 중인 방을 운영자가 닫으면 모두 종료 안내, 재연결·재입장 없음, admin 포트는 루프백에서만 열리고 로그에 토큰이 없다 | POL-19, SEC-05, SEC-10, FR-12, FR-11 | E2E | `e2e/system.spec.ts` | 자동 |
| TC-01 | 정원을 넘는 입장은 ROOM_FULL로 거부된다 | FR-07, POL-01 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-02 | 재접속 유예 중인 참가자도 정원을 차지한다 | POL-01, FR-20 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-03 | 호스트가 입장하기 전에는 다른 사람이 입장할 수 없다 | FR-23, POL-13 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-04 | 호스트 클레임은 한 번만 유효하다(재사용해도 호스트가 되지 않는다) | FR-23, SEC-05 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-05 | 없는 방 입장은 ROOM_NOT_FOUND | FR-06, POL-02 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-06 | 비밀번호 방은 검증 통과 없이 입장할 수 없다 | FR-05, SEC-02 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-07 | 서버 방 수 상한을 넘으면 SERVER_BUSY | POL-15, SEC-06 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-08 | 중복 닉네임에는 번호를 붙인다(대소문자 무시) | FR-03, POL-04 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-09 | 호스트가 나가면 입장 순번이 가장 앞선 접속자가 승계한다 | FR-17 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-10 | 호스트가 끊기면 유예 동안 승계를 보류하고, 유예 후 승계한다 | FR-17, POL-05 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-11 | 유예 안에 호스트가 복귀하면 호스트를 유지한다 | FR-17, POL-05 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-12 | 승계된 뒤 복귀한 원 호스트는 일반 참가자다 | FR-17, POL-05 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-13 | 승계 뒤에도 잠금과 강퇴 목록이 유지된다 | FR-17, POL-05 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-14 | 마지막 참가자가 나가면 방이 즉시 삭제된다 | FR-18 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-15 | 생성 후 아무도 입장하지 않으면 TTL 뒤 삭제된다 | FR-18 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-16 | 유예 중인 참가자만 남으면 유예가 끝날 때 방이 삭제된다 | FR-18, POL-02 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-17 | 호스트 입장 후에는 빈 방 TTL 타이머가 취소된다 | FR-18 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-18 | 비호스트의 방 잠금은 FORBIDDEN | FR-14, SEC-05 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-19 | 잠긴 방은 신규 입장을 거부하고 유예 중 재접속은 허용한다 | FR-14, POL-03 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-20 | 비호스트의 강퇴는 FORBIDDEN, 호스트 자신 강퇴는 불가 | FR-15, SEC-05 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-21 | 강퇴된 사람은 같은 네트워크로 재입장할 수 없다 | FR-15, POL-06 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-22 | 전체 음소거는 호스트를 제외한 참가자의 마이크만 끈다 | FR-16, POL-05 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-23 | 방당 동시 1명만 화면공유할 수 있다 | FR-12, POL-12 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-24 | 공유자가 나가면 공유가 즉시 해제된다 | FR-12, POL-12 | 서버 | `apps/server/test/roomManager.test.ts` | 자동 |
| TC-30 | 호스트 클레임으로 입장하면 ack에 세션 토큰·참가자 ID·ICE 서버가 온다 | FR-03, SEC-03 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-31 | 잘못된 페이로드는 모두 INVALID_PAYLOAD로 거부된다 | SEC-06 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-32 | 입장하지 않은 소켓의 모든 이벤트는 NOT_JOINED로 거부된다 | SEC-03 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-33 | 정원을 넘은 입장은 ROOM_FULL로 거부된다 | FR-07, POL-01 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-34 | 호스트 입장 전 일반 참가자는 HOST_NOT_PRESENT | FR-23, POL-13 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-35 | 위조된 호스트 클레임으로는 호스트가 될 수 없다 | SEC-05 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-36 | 다른 방의 호스트 클레임은 쓸 수 없다 | SEC-05 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-37 | 같은 닉네임은 번호가 붙는다 | FR-03, POL-04 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-40 | signal에 발신자(from)를 넣어 보내면 거부된다 | SEC-04 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-41 | 정상 신호의 from은 서버가 부여한 발신자 ID다 | SEC-04, FR-07 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-42 | 다른 방 참가자에게는 릴레이되지 않는다 | SEC-04 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-43 | SDP 16KB 초과와 소켓 메시지 32KB 초과는 거부된다 | SEC-06 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-44 | 자기 자신에게 보내는 신호는 거부된다 | SEC-04 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-50 | 위조·변조·형식 오류 토큰은 TOKEN_INVALID | SEC-03 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-51 | 호스트 클레임 토큰은 세션 토큰으로 쓸 수 없다 | SEC-03 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-52 | 유예 안에 세션 토큰으로 재접속하면 같은 자리(ID·호스트)를 복구한다 | FR-20, SEC-03 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-53 | 유예가 지나면 퇴장 처리되어 재접속할 수 없다 | FR-20, POL-08 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-54 | 서버가 재시작되어 방이 없으면 ROOM_NOT_FOUND(재접속 안내용) | SEC-03 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-60 | 비호스트의 lock/kick/muteAll 위조 요청은 FORBIDDEN | FR-14, FR-15, FR-16, SEC-05 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-61 | 호스트가 잠그면 신규 입장은 ROOM_LOCKED, 해제하면 입장 가능 | FR-14, POL-03 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-62 | 강퇴된 사람은 소켓이 끊기고 토큰·재입장 모두 거부된다 | FR-15, POL-06, SEC-05 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-63 | 호스트는 자기 자신을 강퇴할 수 없다 | FR-15 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-64 | 전체 음소거 알림은 호스트를 제외한 참가자에게만 가고 목록 상태가 갱신된다 | FR-16 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-65 | 호스트가 나가면 다음 참가자가 호스트가 되고 알림이 간다 | FR-17 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-70 | 채팅은 같은 방에만 가고 발신자 정보는 서버가 채운다 | FR-11, SEC-07 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-71 | 500자 초과·빈 메시지는 거부, 제어·방향 문자는 제거, HTML은 그대로(텍스트로만 표시) | FR-11, SEC-07 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-72 | 이미 공유 중이면 SCREEN_BUSY, 공유자가 나가면 해제 | FR-12, POL-12 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-73 | 마이크·카메라 상태 변경이 다른 참가자에게 전달된다 | FR-08 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-80 | 채팅을 짧은 시간에 반복하면 RATE_LIMITED | SEC-06 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-81 | 거부가 반복되면 서버가 연결을 끊는다 | SEC-06, POL-10 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-90 | 올바른 비밀번호만 입장하고 틀린 시도는 제한된다 | FR-05, SEC-02 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-91 | 오답이 5회를 넘으면 올바른 비밀번호도 TOO_MANY_ATTEMPTS | FR-05, SEC-02, POL-11 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-92 | 호스트는 비밀번호 없이 입장하고, 유효 토큰 재접속은 비밀번호를 다시 묻지 않는다 | FR-05, E-12 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-95 | 허용 목록에 없거나 없는 Origin의 소켓 연결은 거부된다 | SEC-08 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-96 | IP당 동시 연결 수를 넘으면 연결이 거부된다 | SEC-06 | 서버 | `apps/server/test/signaling.test.ts` | 자동 |
| TC-100 | /healthz는 내부 정보 없이 상태만 돌려준다 | NFR-08 | 서버 | `apps/server/test/http.test.ts` | 자동 |
| TC-101 | 방 ID는 128비트 난수(base64url 22자)이고 서로 다르다 | FR-01, SEC-01 | 서버 | `apps/server/test/http.test.ts` | 자동 |
| TC-102 | 방 상태 조회: 없는 방·형식 오류는 exists=false, 있는 방은 플래그만 노출 | FR-06, FR-23 | 서버 | `apps/server/test/http.test.ts` | 자동 |
| TC-103 | 보안 헤더(CSP, Permissions-Policy, Referrer-Policy 등)가 붙고 서버 정보는 숨긴다 | SEC-08 | 서버 | `apps/server/test/http.test.ts` | 자동 |
| TC-104 | CORS: 허용 Origin만 통과하고 와일드카드를 쓰지 않는다 | SEC-08 | 서버 | `apps/server/test/http.test.ts` | 자동 |
| TC-105 | 잘못된 본문은 400, 너무 큰 본문은 413으로 거부하고 내부 정보를 싣지 않는다 | SEC-06, SEC-08 | 서버 | `apps/server/test/http.test.ts` | 자동 |
| TC-106 | 방 생성은 IP당 속도 제한이 있다(429) | SEC-06 | 서버 | `apps/server/test/http.test.ts` | 자동 |
| TC-107 | 방 비밀번호는 평문이 아닌 해시로만 보관한다 | SEC-02 | 서버 | `apps/server/test/http.test.ts` | 자동 |
| TC-108 | 서버 전체 방 수 상한을 넘으면 503 | SEC-06, POL-15 | 서버 | `apps/server/test/http.test.ts` | 자동 |
| TC-109 | 알 수 없는 경로는 JSON 404 | SEC-08 | 서버 | `apps/server/test/http.test.ts` | 자동 |
| TC-111 | 웹 빌드를 함께 제공하고 SPA 경로·HEAD 요청도 index.html로 응답한다(API·소켓 경로는 제외) | NFR-07, NFR-08 | 서버 | `apps/server/test/http.test.ts` | 자동 |
| TC-120 | 필수값이 없으면 읽기 쉬운 오류로 시작이 실패한다 | NFR-08 | 서버 | `apps/server/test/config.test.ts` | 자동 |
| TC-121 | 짧은 시크릿은 거부한다 | SEC-10 | 서버 | `apps/server/test/config.test.ts` | 자동 |
| TC-122 | Origin 와일드카드와 형식 오류를 거부한다 | SEC-08 | 서버 | `apps/server/test/config.test.ts` | 자동 |
| TC-123 | TURN_URLS는 TURN_SECRET 없이 쓸 수 없다 | SEC-09 | 서버 | `apps/server/test/config.test.ts` | 자동 |
| TC-124 | 기본값: 방당 6명, 방 100개, 유예 20초, 빈 방 10분 | FR-07, NFR-04 | 서버 | `apps/server/test/config.test.ts` | 자동 |
| TC-125 | 운영 모드에서는 .env.example의 예시 비밀값을 거부한다 | SEC-10 | 서버 | `apps/server/test/config.test.ts` | 자동 |
| TC-130 | 서명·만료·종류를 모두 검증한다 | SEC-03 | 서버 | `apps/server/test/security.test.ts` | 자동 |
| TC-131 | username=만료:참가자, credential=HMAC-SHA1(base64), 만료=now+TTL | SEC-09 | 서버 | `apps/server/test/security.test.ts` | 자동 |
| TC-132 | TURN을 설정하지 않으면 자격증명이 만들어지지 않는다(고정 비밀번호 없음) | SEC-09 | 서버 | `apps/server/test/security.test.ts` | 자동 |
| TC-132b | STUN_URLS를 비우면 빈 urls 항목을 만들지 않는다 | SEC-09 | 서버 | `apps/server/test/security.test.ts` | 자동 |
| TC-133 | 같은 비밀번호도 매번 다른 bcrypt 해시이고 검증은 정확하다 | SEC-02 | 서버 | `apps/server/test/security.test.ts` | 자동 |
| TC-134 | 72바이트를 넘는 긴 한글 비밀번호도 끝부분까지 검증한다(잘림 방지) | SEC-02 | 서버 | `apps/server/test/security.test.ts` | 자동 |
| TC-135 | 토큰 버킷은 용량까지 허용하고 시간이 지나면 보충된다 | SEC-06 | 서버 | `apps/server/test/security.test.ts` | 자동 |
| TC-136 | 오답 5회/10분이면 10분간 차단, 성공하면 초기화 | SEC-02, POL-11 | 서버 | `apps/server/test/security.test.ts` | 자동 |
| TC-137 | 방 ID는 base64url 22자(128비트)이며 중복되지 않는다 | SEC-01 | 서버 | `apps/server/test/security.test.ts` | 자동 |
| TC-138 | 참가자 ID는 서버가 만든 12자 난수이다 | SEC-04 | 서버 | `apps/server/test/security.test.ts` | 자동 |
| TC-139 | 차단 키는 IP 원문을 담지 않고 비밀값에 의존한다 | POL-06 | 서버 | `apps/server/test/security.test.ts` | 자동 |
| TC-200 | http/https 링크만 링크로 만들고 나머지는 텍스트다 | FR-11, SEC-07 | 웹 | `apps/web/src/lib/linkify.test.ts` | 자동 |
| TC-201 | javascript:, data:, 상대 경로, HTML 태그는 링크가 되지 않는다 | SEC-07 | 웹 | `apps/web/src/lib/linkify.test.ts` | 자동 |
| TC-202 | 문장부호는 링크에서 떼어 낸다 | SEC-07 | 웹 | `apps/web/src/lib/linkify.test.ts` | 자동 |
| TC-203 | 모든 조각을 이어 붙이면 원문이 보존된다(텍스트로 표시) | SEC-07 | 웹 | `apps/web/src/lib/linkify.test.ts` | 자동 |
| TC-204 | 링크 또는 방 코드에서 방 ID를 뽑는다 | FR-03 | 웹 | `apps/web/src/lib/linkify.test.ts` | 자동 |
| TC-205 | 잘못된 입력은 null | FR-03 | 웹 | `apps/web/src/lib/linkify.test.ts` | 자동 |
| TC-210 | 인원이 늘수록 비트레이트 상한이 낮아지고 해상도가 줄어든다 | NFR-13 | 웹 | `apps/web/src/media/MeshTransport.test.ts` | 자동 |
| TC-211 | 6명 mesh의 총 업링크는 약 2Mbps 이하(5개 스트림 × 400kbps)다 | NFR-13, RISK-01 | 웹 | `apps/web/src/media/MeshTransport.test.ts` | 자동 |
| TC-212 | 색상 코드는 design/tokens.ts 밖에 하드코딩하지 않는다 | UX-08 | 웹 | `apps/web/src/design/design.test.ts` | 자동 |
| TC-212b | tokens.ts color values equal the design-system.md color table, both directions (no undocumented, missing or changed token) | UX-08 | 웹 | `apps/web/src/design/designAudit.test.ts` | 자동 |
| TC-212c | radius, shadow, font stack order and touch size equal the design-system.md values | UX-08 | 웹 | `apps/web/src/design/designAudit.test.ts` | 자동 |
| TC-213 | 화면에 보이는 한글 문구는 strings.ts에만 있다(컴포넌트·페이지에 직접 쓰지 않는다) | UX-01 | 웹 | `apps/web/src/design/design.test.ts` | 자동 |
| TC-214 | 본문·보조 글자는 모든 배경에서 4.5:1 이상이다 | NFR-09, UX-08 | 웹 | `apps/web/src/design/design.test.ts` | 자동 |
| TC-215 | 버튼(기본·호버) 위 흰 글자는 4.5:1 이상이다 | NFR-09, UX-08 | 웹 | `apps/web/src/design/design.test.ts` | 자동 |
| TC-216 | 경고 배지(어두운 글자/경고색)와 아이콘·링크 색은 어두운 면 위에서 4.5:1 이상이다 | NFR-09, UX-08 | 웹 | `apps/web/src/design/design.test.ts` | 자동 |
| TC-216b | every text-<token> that shares a class group with a bg-<token> (incl. hover: variants and @apply) has >=4.5:1 (>=3 for non-text success/speaking) | NFR-09 | 웹 | `apps/web/src/design/designAudit.test.ts` | 자동 |
| TC-216c | every text color token used without an explicit bg in the same group passes against all four dark surfaces (4.5:1; 3:1 for success) | NFR-09 | 웹 | `apps/web/src/design/designAudit.test.ts` | 자동 |
| TC-216d | a text-white (or text-bg) class group without any bg-<token> is limited to image/overlay contexts and never appears in StateScreen/Lobby/Landing/Legal pages | NFR-09 | 웹 | `apps/web/src/design/designAudit.test.ts` | 자동 |
| TC-217 | 비텍스트 요소(포커스 링, 말하는 사람 강조, 성공 아이콘)는 3:1 이상이다 | NFR-09 | 웹 | `apps/web/src/design/design.test.ts` | 자동 |
| TC-217b | token palette sanity: every color token is #RRGGBB or rgba(), unique values, and surfaces are strictly ordered by luminance bg < surface < tile < raised < line | NFR-09 | 웹 | `apps/web/src/design/designAudit.test.ts` | 자동 |
| TC-217c | every contrast row in design-system.md section 2 is reproduced by the real token colors within 0.1 (the doc cannot drift from the code), and every color used there is a token or white | NFR-09 | 웹 | `apps/web/src/design/designAudit.test.ts` | 자동 |
| TC-230 | 한글, 영문, 숫자, 공백, _-. 를 허용한다 | FR-03, POL-04, SEC-06 | 공유 | `packages/shared/src/text.test.ts` | 자동 |
| TC-231 | 빈 값, 21자, 기호, 이모지, 제어/방향 문자를 거부한다 | FR-03, POL-04, SEC-06 | 공유 | `packages/shared/src/text.test.ts` | 자동 |
| TC-232 | 20자는 허용하고 원문이 너무 길면 거부한다 | POL-04, SEC-06 | 공유 | `packages/shared/src/text.test.ts` | 자동 |
| TC-233 | 중복 비교 키는 대소문자를 구분하지 않는다 | FR-03, POL-04 | 공유 | `packages/shared/src/text.test.ts` | 자동 |
| TC-234 | 일반 텍스트와 HTML 문자는 그대로 둔다(렌더링은 텍스트로만) | FR-11, SEC-07 | 공유 | `packages/shared/src/text.test.ts` | 자동 |
| TC-235 | 제어·방향 문자를 제거한다 | FR-11, SEC-07 | 공유 | `packages/shared/src/text.test.ts` | 자동 |
| TC-236 | 빈 값과 500자 초과를 거부한다 | FR-11, POL-07, SEC-06 | 공유 | `packages/shared/src/text.test.ts` | 자동 |
| TC-237 | 줄바꿈은 유지한다 | FR-11, POL-07 | 공유 | `packages/shared/src/text.test.ts` | 자동 |
| TC-240 | 정상 입장 요청을 통과시킨다 | FR-03, SEC-06 | 공유 | `packages/shared/src/schemas.test.ts` | 자동 |
| TC-241 | 버전이 다르면 거부한다 | NFR-12, SEC-06 | 공유 | `packages/shared/src/schemas.test.ts` | 자동 |
| TC-242 | 발신자 필드(from)처럼 모르는 키는 거부한다 | SEC-04, SEC-06 | 공유 | `packages/shared/src/schemas.test.ts` | 자동 |
| TC-243 | signal은 description과 candidate 중 정확히 하나만 허용한다 | SEC-04, SEC-06 | 공유 | `packages/shared/src/schemas.test.ts` | 자동 |
| TC-244 | SDP 16KB 초과를 거부한다 | SEC-06 | 공유 | `packages/shared/src/schemas.test.ts` | 자동 |
| TC-245 | 방 ID 형식이 아니면 거부한다 | SEC-01, SEC-06 | 공유 | `packages/shared/src/schemas.test.ts` | 자동 |
| TC-301 | 운영자 설정은 선택이며 빈 값은 없음으로 본다 | POL-19, POL-20 | 서버 | `apps/server/test/config.test.ts` | 자동 |
| TC-301b | OPERATOR_CONTACT는 이메일 또는 https URL, 200자 이하만 허용한다 | POL-19 | 서버 | `apps/server/test/config.test.ts` | 자동 |
| TC-301c | LEGAL_EFFECTIVE_DATE는 존재하는 YYYY-MM-DD, PRIVACY_OFFICER는 100자 이하 | POL-20 | 서버 | `apps/server/test/config.test.ts` | 자동 |
| TC-301d | ADMIN_PORT와 ADMIN_TOKEN은 함께만 허용하고 PORT와 같을 수 없으며 토큰은 32자 이상 | POL-19 | 서버 | `apps/server/test/config.test.ts` | 자동 |
| TC-301e | 운영 모드에서는 ADMIN_TOKEN 예시 값도 거부한다 | SEC-10 | 서버 | `apps/server/test/config.test.ts` | 자동 |
| TC-301f | 운영 모드에서 예시 값(change-me...)을 쓴 변수 이름이 오류 메시지에 정확히 나온다(ADMIN_TOKEN을 SESSION_SECRET으로 잘못 지목하지 않음, DEF-005) | POL-19, SEC-10 | 서버 | `apps/server/test/config.test.ts` | 자동 |
| TC-302 | metrics:path는 direct/relay만 허용하고 모르는 키(식별자 등)는 거부한다 | NFR-15, SEC-06 | 공유 | `packages/shared/src/schemas.test.ts` | 자동 |
| TC-303 | OPERATOR_CONTACT 경계값: 200자 통과·201자 거부, 공백 포함·스킴만 있는 값 거부 | POL-19 | 서버 | `apps/server/test/config.test.ts` | 자동 |
| TC-303b | LEGAL_EFFECTIVE_DATE 경계값(윤년·월말·0값)과 PRIVACY_OFFICER 100자 경계 | POL-20 | 서버 | `apps/server/test/config.test.ts` | 자동 |
| TC-303c | ADMIN_PORT·ADMIN_TOKEN 경계값: 포트 1·65535 통과, 0·65536·비정수·문자 거부, 토큰 31자 거부·32자 통과 | POL-19 | 서버 | `apps/server/test/config.test.ts` | 자동 |
| TC-303d | 운영 모드 예시값: 정상 운영 값은 통과하고 change-me 접두 ADMIN_TOKEN만 거부, 개발 모드는 허용 | SEC-10, POL-19 | 서버 | `apps/server/test/config.test.ts` | 자동 |
| TC-303e | 환경변수를 전혀 주지 않아도 기동 설정이 만들어지고 5종은 undefined다(키 자체가 없음) | POL-19, POL-20 | 서버 | `apps/server/test/config.test.ts` | 자동 |
| TC-304 | metrics:path 경계·예외 입력: 빈값·대소문자·공백·잘못된 타입·버전·추가 식별자 키를 모두 거부한다 | NFR-15, SEC-06 | 공유 | `packages/shared/src/schemas.test.ts` | 자동 |
| TC-305 | legalLinks는 04 §3.5와 정확히 일치한다(키 5개, aria는 함수) | UX-01, POL-17 | 웹 | `apps/web/src/strings.test.ts` | 자동 |
| TC-305b | inApp은 04 §3.5와 정확히 일치한다(steps 2개) | UX-01, UX-13 | 웹 | `apps/web/src/strings.test.ts` | 자동 |
| TC-305c | autoplay·background는 04 §3.5와 일치하고 mediaLost는 3종 입력별 문구를 만든다 | UX-01, UX-14, UX-15 | 웹 | `apps/web/src/strings.test.ts` | 자동 |
| TC-305d | state.gone 운영자 종료 문구와 기존 키 보존, legal UI 크롬 키가 04 §3.5와 일치한다 | UX-01, UX-03 | 웹 | `apps/web/src/strings.test.ts` | 자동 |
| TC-305e | 새 문구 키의 모든 문자열 값은 비어 있지 않다(빈 문구 방지) | UX-01 | 웹 | `apps/web/src/strings.test.ts` | 자동 |
| TC-305f | numbers shown to users match the shared limits (chat 500, nickname 1~20, password 4~32) | UX-01 | 웹 | `apps/web/src/components/stateScreenGap.test.ts` | 자동 |
| TC-305g | name-taking message functions include the name verbatim (also hostile text, which stays a plain string for React to escape) and exactly once | UX-01 | 웹 | `apps/web/src/components/stateScreenGap.test.ts` | 자동 |
| TC-305h | every user-facing string in S contains Hangul (UI is Korean-only), except the brand name and pure number/symbol formats | UX-01 | 웹 | `apps/web/src/components/stateScreenGap.test.ts` | 자동 |
| TC-306 | 푸터 링크 경로는 문구가 아닌 코드에 있고 LegalFooter는 링크 3개를 /privacy /terms /contact 순서로, _blank+noopener noreferrer로 연다(소스 정적 점검) | UX-01, POL-17 | 웹 | `apps/web/src/strings.test.ts` | 자동 |
| TC-330 | 필수 보안 옵션이 있고 고정 자격증명·무인증이 없다 | SEC-12, SEC-09 | 서버 | `apps/server/test/coturnConfig.test.ts` | 자동 |
| TC-330b | denied-peer-ip가 사설·루프백·링크로컬·CGNAT·멀티캐스트 IPv4/IPv6 대역을 모두 포함한다 | SEC-12, SEC-09 | 서버 | `apps/server/test/coturnConfig.test.ts` | 자동 |
| TC-330c | "::"로 시작하는 deny 범위가 없다 (D-1 회귀 방지: 공인 IPv4 peer까지 거부됨) | SEC-12 | 서버 | `apps/server/test/coturnConfig.test.ts` | 자동 |
| TC-330d | compose의 coturn 이미지는 4.9 이상으로 고정되고 로그 로테이션이 있다 (POL-18) | SEC-12 | 서버 | `apps/server/test/coturnConfig.test.ts` | 자동 |
| TC-331 | 양성 대조군: 공인 IPv4 peer는 허용된다 (모두 거부하는 깨진 설정 탐지, D-1) | SEC-12, SEC-09 | 서버 | `apps/server/test/coturnLive.test.ts` | 자동 |
| TC-332 | 사설·루프백·링크로컬·CGNAT·멀티캐스트 IPv4 peer는 403으로 거부된다 | SEC-12, SEC-09 | 서버 | `apps/server/test/coturnLive.test.ts` | 자동 |
| TC-333 | IPv4-mapped IPv6(::ffff:*) peer는 어떤 경우에도 성공하지 않는다 | SEC-12, SEC-09 | 서버 | `apps/server/test/coturnLive.test.ts` | 자동 |
| TC-334 | 같은 사용자의 동시 할당이 user-quota(12)를 넘으면 거부된다 | SEC-12, SEC-09 | 서버 | `apps/server/test/coturnLive.test.ts` | 자동 |
| TC-340 | 운영자 값이 설정되면 연락처·책임자·시행일과 STUN/TURN 호스트명을 돌려준다 | POL-19, POL-20, POL-17 | 서버 | `apps/server/test/meta.test.ts` | 자동 |
| TC-340b | 값이 없으면 null(미정)이고 TURN이 없으면 turnHosts는 빈 배열이다(가짜 값 없음) | POL-19, POL-20 | 서버 | `apps/server/test/meta.test.ts` | 자동 |
| TC-340c | 응답은 정해진 필드만 담고(비밀값·포트·쿼리·IP 없음) 60초 캐시, 허용 안 된 Origin은 403, 한도 초과는 429(캐시 헤더 없음) | POL-18, SEC-10, SEC-08 | 서버 | `apps/server/test/meta.test.ts` | 자동 |
| TC-340d | ICE URI에서 호스트명만 뽑는다(스킴·포트·쿼리·IPv6 대괄호), 해석 불가는 버린다 | POL-17 | 서버 | `apps/server/test/meta.test.ts` | 자동 |
| TC-341 | 처리방침은 필수 섹션 id를 모두 갖고 모든 문서의 제목·섹션·문단이 비어 있지 않다 | POL-17, SEC-13 | 웹 | `apps/web/src/legal.test.ts` | 자동 |
| TC-341b | 슬롯 자리: 처리방침은 STUN/TURN·연락처·책임자·시행일, 문의·신고는 첫 섹션에 연락처, 약관은 연령 문구를 갖는다 | POL-17, POL-19 | 웹 | `apps/web/src/legal.test.ts` | 자동 |
| TC-341c | 초안 상태에서는 "법률 자문이 아닌 초안" 고지가 있고, 확인하지 못한 조문 번호·법령 시행일을 단정해 쓰지 않는다 | SEC-13, POL-17 | 웹 | `apps/web/src/legal.test.ts` | 자동 |
| TC-341d | 라우팅: /privacy /terms /contact(끝 슬래시 허용)만 문서로 인식한다(대소문자 구분) | UX-01 | 웹 | `apps/web/src/legal.test.ts` | 자동 |
| TC-342 | 방 생성·입장·채팅·신호·강퇴·재접속·오류 흐름의 실제 로그에 IP·닉네임·채팅·토큰·비밀번호·SDP가 없고 기대 이벤트 줄은 있다 | POL-18, SEC-10 | 서버 | `apps/server/test/logPrivacy.test.ts` | 자동 |
| TC-342b | 로거는 민감 키(token·password·sdp·text·nickname)를 [redacted]로 가린다(호출부 실수의 2차 방어선) | POL-18, SEC-10 | 서버 | `apps/server/test/logPrivacy.test.ts` | 자동 |
| TC-343 | 키 수가 적어도 5분 주기 정리가 10분 넘게 안 쓴 IP 키를 지운다(최대 약 15분 보관), 최근 키는 남는다 | POL-18 | 서버 | `apps/server/test/security.test.ts` | 자동 |
| TC-343b | 정리 뒤에도 같은 키는 새 버킷으로 다시 제한되고, 차단 중인 키와 최근 실패 기록은 지우지 않는다 | POL-18, SEC-02 | 서버 | `apps/server/test/security.test.ts` | 자동 |
| TC-343c | 정리 주기는 unref 타이머이고 dispose하면 멈춘다(프로세스 종료를 막지 않음) | POL-18 | 서버 | `apps/server/test/security.test.ts` | 자동 |
| TC-344 | OPERATOR_CONTACT 이메일은 javascript:·data: 같은 스킴을 숨긴 값을 통과시키지 않는다(R-1, 링크 주입 방지) | POL-19, SEC-07 | 서버 | `apps/server/test/config.test.ts` | 자동 |
| TC-345 | contactLink: href는 mailto:(엄격한 이메일)와 https:만 만들고 javascript:·data: 등 그 밖의 값은 링크 없이 텍스트가 된다 | SEC-07, POL-19 | 웹 | `apps/web/src/legal.test.ts` | 자동 |
| TC-345b | 렌더링 결과(HTML)에 javascript:·data: href가 없고, 외부 https 링크는 새 탭 + rel noopener noreferrer, 이메일은 mailto: | SEC-07, POL-19 | 웹 | `apps/web/src/legal.test.ts` | 자동 |
| TC-345c | 책임자·시행일 값은 링크가 되지 않고 마크업은 이스케이프된다 | SEC-07 | 웹 | `apps/web/src/legal.test.ts` | 자동 |
| TC-345d | 법률 페이지·푸터 소스에 dangerouslySetInnerHTML이 없고 href를 직접 조립하지 않는다(정적 점검) | SEC-07 | 웹 | `apps/web/src/legal.test.ts` | 자동 |
| TC-346 | 값 있음: 연락처·책임자·시행일(YYYY년 M월 D일)·STUN 호스트가 표시된다 | POL-19, POL-20 | 웹 | `apps/web/src/legal.test.ts` | 자동 |
| TC-346b | 미정(null): 빈칸·가짜 값 없이 "운영자가 아직 정하지 않았습니다" 등 눈에 띄는 문구, 시행일 형식 오류도 미정 취급 | POL-19, POL-20 | 웹 | `apps/web/src/legal.test.ts` | 자동 |
| TC-346c | 로딩은 aria-busy, 실패는 안내 문구와 다시 불러오기 버튼(문서 본문 영향 없음 문구 포함) | POL-17 | 웹 | `apps/web/src/legal.test.ts` | 자동 |
| TC-346d | parseDate는 존재하는 날짜만 통과시킨다(윤년·월말) | POL-20 | 웹 | `apps/web/src/legal.test.ts` | 자동 |
| TC-346e | parseMeta는 서버 응답의 모양이 다르면 null이다(시스템 경계 검증) | SEC-06 | 웹 | `apps/web/src/legal.test.ts` | 자동 |
| TC-347 | 위험 스킴·공백/개행/널·혼동 문자·@ 다중·속성 주입·200자 초과는 시작 실패, 정상 값은 통과한다 | SEC-07, POL-19 | 서버 | `apps/server/test/unit15Adversarial.test.ts` | 자동 |
| TC-347b | 위험 스킴·제어문자·유니코드 혼동·속성 주입 문자열은 href가 없거나 안전한 mailto:/https:뿐이고, 렌더 결과에 이벤트 핸들러 속성이 없다 | SEC-07, POL-19 | 웹 | `apps/web/src/legalAdversarial.test.ts` | 자동 |
| TC-347c | 교차 검증: 서버 config가 받아들이는 모든 값을 웹 contactLink에 넣어도 href는 mailto:/https:로만 시작한다(서버·웹 두 겹) | SEC-07 | 서버 | `apps/server/test/unit15Adversarial.test.ts` | 자동 |
| TC-347d | 경계: 정상 mailto/https는 링크가 되고, 대문자 HTTPS는 https로 정규화되며, URL 자격 정보(userinfo)·제어 문자가 든 값은 링크가 아니라 텍스트로만 표시된다(표시 텍스트 ≠ 대상 방지, DEF-003 수정; 참조) | SEC-07 | 웹 | `apps/web/src/legalAdversarial.test.ts` | 자동 |
| TC-347e | 책임자·시행일·호스트 값에 악성 문자열이 와도 어떤 슬롯도 a 태그·이벤트 속성을 만들지 않는다 | SEC-07 | 웹 | `apps/web/src/legalAdversarial.test.ts` | 자동 |
| TC-348 | STUN/TURN URL에 자격 정보·쿼리·IPv6·대소문자·중복이 섞여도 호스트명만 나가고 비밀값은 응답에 없다 | POL-17, SEC-10 | 서버 | `apps/server/test/unit15Adversarial.test.ts` | 자동 |
| TC-348b | 속도 제한 경계: 고정 시계에서 60번째까지 200, 61번째 429(RATE_LIMITED, 캐시 헤더 없음), 1초 뒤 1회 회복, X-Forwarded-For 위조로 우회 불가(TRUST_PROXY=0) | POL-17, SEC-02 | 서버 | `apps/server/test/unit15Adversarial.test.ts` | 자동 |
| TC-348c | 429 상태에서도 다른 경로(/healthz)는 영향받지 않고, meta 429는 방 상태 조회 한도(같은 제한기)와 공유된다는 점을 문서화한다 | POL-17 | 서버 | `apps/server/test/unit15Adversarial.test.ts` | 자동 |
| TC-348d | LEGAL_EFFECTIVE_DATE·PRIVACY_OFFICER 경계: 존재하지 않는 날짜·형식 오류는 시작 실패, 100자 책임자는 통과·101자는 실패, HTML 값은 JSON 문자열로만 나간다 | POL-20 | 서버 | `apps/server/test/unit15Adversarial.test.ts` | 자동 |
| TC-348e | production에서 OPERATOR_CONTACT가 없으면 warn이 정확히 1번, 있으면 0번이며 기동은 막지 않는다 | POL-19 | 서버 | `apps/server/test/unit15Adversarial.test.ts` | 자동 |
| TC-348f | 응답 헤더: JSON content-type, nosniff, CSP script-src self, 쿠키 없음, HEAD/OPTIONS/POST 처리 | SEC-08 | 서버 | `apps/server/test/unit15Adversarial.test.ts` | 자동 |
| TC-348g | parseMeta: 추가 필드는 버리고, 타입 오류(숫자·객체·배열 혼입·null 프로토타입)·v 불일치는 null이다 | SEC-06 | 웹 | `apps/web/src/legalAdversarial.test.ts` | 자동 |
| TC-348h | getMeta: 200이지만 JSON이 아님·빈 본문·배열·거대 문자열·429·500은 모두 실패 결과이며 예외를 던지지 않는다 | SEC-06 | 웹 | `apps/web/src/legalAdversarial.test.ts` | 자동 |
| TC-349 | KeyedRateLimiter: 정확히 10분 미사용은 유지, 10분+1ms부터 삭제 대상, 5천 키가 정리되어 size가 실제로 줄고, 같은 키는 새 버킷 | POL-18 | 서버 | `apps/server/test/unit15Adversarial.test.ts` | 자동 |
| TC-349b | 별도 프로세스: 제한기를 만들어 쓴 뒤 스스로 종료하고, 서버를 띄웠다 close한 뒤에도 프로세스가 매달리지 않는다(변이 대조: ref 타이머는 매달린다) | POL-18 | 서버 | `apps/server/test/unit15Adversarial.test.ts` | 자동 |
| TC-349c | /api/meta 조회·429·CORS 403·허용 안 된 소켓 Origin·404 흐름의 로그에도 IP·위조 Origin 값·XFF가 남지 않는다(양성 대조군 포함) | POL-18, SEC-10 | 서버 | `apps/server/test/unit15Adversarial.test.ts` | 자동 |
| TC-349d | 사용 중인 키는 정리 주기가 몇 번 지나도 사라지지 않는다(계속 쓰면 seen이 갱신) — 제한 우회 방지 | POL-18, SEC-02 | 서버 | `apps/server/test/unit15Adversarial.test.ts` | 자동 |
| TC-349e | AttemptLimiter 경계: 차단 종료 시각 정각에는 삭제, 직전에는 유지; 창 정각(windowMs)에 실패 기록은 창 밖으로 취급 | POL-18, SEC-02 | 서버 | `apps/server/test/unit15Adversarial.test.ts` | 자동 |
| TC-349f | 실제 setInterval 타이머는 unref이고 dispose는 여러 번 불러도 안전하며 dispose 후 sweep 주기가 멈춘다 | POL-18 | 서버 | `apps/server/test/unit15Adversarial.test.ts` | 자동 |
| TC-349g | 법령명·조문·항·호·시행일·기한(N일 이내)·과태료 금액을 단정해 쓰지 않는다 | SEC-13 | 웹 | `apps/web/src/legalAdversarial.test.ts` | 자동 |
| TC-349h | 연령(14세)·국외 이전·제3자 제공·유출 통지·열람/삭제·면책·신고 처리 의무처럼 법적 판단이 걸린 문단은 같은 문단에 "확인 필요"(또는 법률 검토 후 확정) 표기가 있다 | SEC-13 | 웹 | `apps/web/src/legalAdversarial.test.ts` | 자동 |
| TC-349i | 초안 표기는 3개 문서 어디서나 같은 상수에서 나오고(status=draft), 운영자 정보 슬롯은 서버 값이 없을 때 빈칸이 아니라 눈에 띄는 미정 문구가 된다 | SEC-13 | 웹 | `apps/web/src/legalAdversarial.test.ts` | 자동 |
| TC-349j | 앱 서버 로그 비식별 문구에 영상 중계(TURN) 서버 로그에는 IP·사용자명이 남을 수 있다는 단서가 있고, 비밀번호를 "암호화"라고 표현하지 않는다 | POL-17, POL-18 | 웹 | `apps/web/src/legalAdversarial.test.ts` | 자동 |
| TC-360 | 카카오톡·인스타그램·페이스북·라인·네이버·다음·일반 웹뷰 UA는 앱 안 브라우저로 판정한다 | UX-13 | 웹 | `apps/web/src/lib/inApp.test.ts` | 자동 |
| TC-360b | 일반 Chrome·Edge·Firefox·Safari·삼성 인터넷·iOS Chrome/Firefox/Edge UA와 빈 문자열은 오탐하지 않는다 | UX-13 | 웹 | `apps/web/src/lib/inApp.test.ts` | 자동 |
| TC-361 | 라이브가 아니면 아무것도 하지 않는다 | UX-14 | 웹 | `apps/web/src/state/foreground.test.ts` | 자동 |
| TC-361b | 이미 끊김을 알면 즉시 재연결한다(소켓이 없으면 connectNow, 붙어 있으면 resumeNow) | UX-14 | 웹 | `apps/web/src/state/foreground.test.ts` | 자동 |
| TC-361c | 연결된 것처럼 보이면 프로브를 먼저 하고, 소켓이 이미 죽었으면 바로 끊고 다시 연결한다 | UX-14 | 웹 | `apps/web/src/state/foreground.test.ts` | 자동 |
| TC-361d | 프로브 결과별 후속 동작: 시간 초과는 kickSocket, 자리에 안 묶였으면 resumeNow, 정상이면 ICE 문제가 있을 때만 restartIce | UX-14 | 웹 | `apps/web/src/state/foreground.test.ts` | 자동 |
| TC-362 | ended 트랙만 비우고 잃은 종류를 알려 주며, 살아 있는 트랙은 유지한다 | UX-14 | 웹 | `apps/web/src/lib/media.test.ts` | 자동 |
| TC-362b | 잃은 트랙이 없으면 알림도 상태 변경도 없다 | UX-14 | 웹 | `apps/web/src/lib/media.test.ts` | 자동 |
| TC-363 | 대소문자·위치가 달라도 토큰을 찾고, 비정상 UA(공백·무관 문자열·매우 긴 문자열)는 오탐 없이 빠르게 끝난다 | UX-13 | 웹 | `apps/web/src/lib/inApp.edge.test.ts` | 자동 |
| TC-363b | Android 웹뷰 표지(; wv))는 Android에서만 인정하고, iOS WebKit은 Safari/·CriOS·FxiOS·EdgiOS 중 하나라도 있으면 일반 브라우저로 본다 | UX-13 | 웹 | `apps/web/src/lib/inApp.edge.test.ts` | 자동 |
| TC-364 | 모든 상태×소켓×프로브×피어 조합에서 불변식을 지킨다(비라이브 무동작, probe 결과 후엔 probe 액션 없음, 중복 액션 없음, timeout은 항상 kickSocket) | UX-14 | 웹 | `apps/web/src/state/foreground.table.test.ts` | 자동 |
| TC-370 | 토큰 없음·틀림·길이 다름·형식 틀림은 모두 같은 401 FORBIDDEN이고 방은 닫히지 않으며, 올바른 토큰만 통과한다 | POL-19 | 서버 | `apps/server/test/adminClose.test.ts` | 자동 |
| TC-371 | admin 포트는 127.0.0.1에만 바인딩된다(같은 루프백 대역의 127.0.0.2로는 닿지 않고, 공개 포트는 닿는다) | POL-19 | 서버 | `apps/server/test/adminClose.test.ts` | 자동 |
| TC-372 | ADMIN_PORT·ADMIN_TOKEN이 없으면 admin 리스너가 없고, 한쪽만 있으면 서버가 시작되지 않는다 | POL-19 | 서버 | `apps/server/test/adminClose.test.ts` | 자동 |
| TC-373 | 형식 오류·없는 경로·잘못된 메서드·없는 방·거대 본문·거대 헤더·깨진 요청을 거절하고 서버는 계속 동작한다 | POL-19 | 서버 | `apps/server/test/adminClose.test.ts` | 자동 |
| TC-374 | 인증 실패가 몰리면 429로 막히고, 오류 응답에는 내부 정보(스택·경로·토큰)가 없다 | POL-19 | 서버 | `apps/server/test/adminClose.test.ts` | 자동 |
| TC-375 | 폐쇄 로그에는 방 ID 앞 6자와 인원수만 남고 토큰·전체 방 ID·IP는 없다 | POL-19, SEC-10 | 서버 | `apps/server/test/adminClose.test.ts` | 자동 |
| TC-376 | 폐쇄하면 참가자 전원이 room:closed를 받고 소켓이 끊기며, 같은 토큰의 재접속·재입장은 거부되고, 다른 방은 영향이 없다 | POL-19, EVT-34 | 서버 | `apps/server/test/adminClose.test.ts` | 자동 |
| TC-377 | 호스트 없는 대기 방(입장 전)과 끊김 유예 중인 참가자가 있는 방도 닫히고 타이머가 남지 않는다 | POL-19 | 서버 | `apps/server/test/adminClose.test.ts` | 자동 |
| TC-378 | RoomManager.closeByOperator: 방을 지우고 closedByOperator 이벤트(참가자 ID 목록)를 한 번 내며, 없는 방은 ROOM_NOT_FOUND | POL-19 | 서버 | `apps/server/test/adminClose.test.ts` | 자동 |
| TC-379 | 인증 헤더 변형(스킴 대소문자·공백·중복·쿼리·쿠키·유사 헤더·유니코드·빈 값·같은 길이 다른 값)은 모두 401이고 방은 닫히지 않는다 | POL-19 | 서버 | `apps/server/test/adminAdversarial.test.ts` | 자동 |
| TC-380 | 경로 변형(점 경로·%2e·이중 슬래시·대문자·끝 슬래시·잘못된 퍼센트·널 바이트·긴 ID·특수문자·공백·개행)은 200이 되지 않고 방은 유지되며 서버는 계속 동작한다 | POL-19 | 서버 | `apps/server/test/adminAdversarial.test.ts` | 자동 |
| TC-381 | 메서드(OPTIONS/HEAD/GET/PUT/DELETE/PATCH)는 405(토큰 없으면 401)이고 CORS 헤더가 없으며, Expect: 100-continue·청크 본문·작은 본문은 정상 처리되고 큰 청크 본문은 413이다 | POL-19 | 서버 | `apps/server/test/adminAdversarial.test.ts` | 자동 |
| TC-382 | 요청 밀수(CL/TE 혼합)·파이프라이닝·거대 헤더/요청줄은 두 번째 요청을 실행하지 않고 방을 닫지 못하며 서버는 계속 동작한다 | POL-19 | 서버 | `apps/server/test/adminAdversarial.test.ts` | 자동 |
| TC-383 | 느린 연결(slowloris) 16개가 admin 연결 한도를 채워도 공개 포트와 방 상태는 영향이 없고, 느린 연결은 15초 안에 정리되어(DEF-002 수정) 정상 요청이 다시 처리된다 | POL-19 | 서버 | `apps/server/test/adminAdversarial.test.ts` | 자동 |
| TC-384 | 속도 제한은 인증에 실패한 요청에만 적용된다: 틀린 토큰을 쏟아부으면 429가 되지만 올바른 토큰의 운영자는 잠기지 않는다 (DEF-003 수정) | POL-19 | 서버 | `apps/server/test/adminAdversarial.test.ts` | 자동 |
| TC-385 | 시작 실패·노출: ADMIN_PORT가 이미 사용 중이면 서버가 시작되지 않고 공개 포트도 남지 않으며, 공개 포트로는 /admin 경로가 어떤 메서드·토큰으로도 방을 닫지 못한다 | POL-19 | 서버 | `apps/server/test/adminAdversarial.test.ts` | 자동 |
| TC-386 | 경합: 같은 방에 폐쇄 2건 동시 → 정확히 1건만 200, 폐쇄와 동시에 입장·퇴장·재접속하는 참가자도 방이 되살아나지 않고 모든 소켓이 정리된다 | POL-19, EVT-34 | 서버 | `apps/server/test/adminAdversarial.test.ts` | 자동 |
| TC-387 | 참가자가 room:closed(또는 유사 이벤트)를 서버로 보내 같은 방 참가자에게 릴레이시키려 해도 서버는 전달하지 않고 방은 유지된다 | POL-19, SEC-04 | 서버 | `apps/server/test/adminAdversarial.test.ts` | 자동 |
| TC-388 | 폐쇄 한 번이 남기는 로그 전체를 캡처해 방 ID 앞 6자·인원수 외에 닉네임·토큰·IP·전체 방 ID가 없는지 확인한다(debug 수준) | POL-19, SEC-10 | 서버 | `apps/server/test/adminAdversarial.test.ts` | 자동 |
| TC-389 | 인증은 본문보다 먼저: 토큰 없는 큰 본문은 413이 아니라 401이고, 본문 1024B는 처리·1025B는 413, 헤더 한도 경계(약 4KB)가 지켜진다 | POL-19 | 서버 | `apps/server/test/adminAdversarial.test.ts` | 자동 |
| TC-390 | 토큰이 없든·짧든·길든·같은 길이든 모든 요청이 32B 해시끼리 timingSafeEqual을 정확히 한 번 호출한다 | POL-19 | 서버 | `apps/server/test/adminTimingSafe.test.ts` | 자동 |
| TC-391 | 폐쇄 후 끊김 유예·빈 방 타이머가 남지 않는다: 유예 중이던 참가자의 만료로 닫힌 방에 대한 이벤트가 더 나오지 않는다 | POL-19 | 서버 | `apps/server/test/adminAdversarial.test.ts` | 자동 |
| TC-392 | 서버 종료(graceful shutdown)는 admin 리스너도 닫아 포트가 풀리고, 기동 후 admin 포트가 공개 포트와 다른 리스너임을 확인한다 | POL-19 | 서버 | `apps/server/test/adminAdversarial.test.ts` | 자동 |
| TC-393 | closeRoom이 예외를 던져도 admin은 500 INTERNAL로 응답하고 프로세스(공개 포트 포함)는 죽지 않는다 (DEF-001 수정) | POL-19 | 서버 | `apps/server/test/adminAdversarial.test.ts` | 자동 |
| TC-400 | 선택된 쌍의 후보 타입으로 direct(host/srflx/prflx)와 relay를 판정한다 | NFR-15 | 웹 | `apps/web/src/media/pathType.test.ts` | 자동 |
| TC-401 | transport.selectedCandidatePairId가 있으면 그 쌍을 우선하고, 선택 안 된 다른 쌍은 무시한다 | NFR-15 | 웹 | `apps/web/src/media/pathType.test.ts` | 자동 |
| TC-402 | 빈 통계·쌍 없음·nominated/succeeded 아님·후보 누락·알 수 없는 타입·이상한 항목은 null(보고 안 함)이다 | NFR-15 | 웹 | `apps/web/src/media/pathType.test.ts` | 자동 |
| TC-403 | 정상 보고는 ack ok이고 로그는 kpi·path만 담으며 방 ID·IP·닉네임·참가자 ID·토큰이 없다 | NFR-15, SEC-06 | 서버 | `apps/server/test/metricsPath.test.ts` | 자동 |
| TC-404 | 잘못된 값·추가 식별자 키·버전 불일치·타입 오류는 INVALID_PAYLOAD로 거부되고 로그가 남지 않으며 서버는 계속 동작한다 | NFR-15, SEC-06 | 서버 | `apps/server/test/metricsPath.test.ts` | 자동 |
| TC-405 | 입장하지 않은 소켓은 NOT_JOINED로 거부되고 로그가 남지 않는다 | NFR-15, SEC-03 | 서버 | `apps/server/test/metricsPath.test.ts` | 자동 |
| TC-406 | 같은 소켓의 짧은 시간 반복은 속도 제한(RATE_LIMITED)되어 로그가 버킷 용량(10)을 넘지 않는다 | NFR-15, SEC-06 | 서버 | `apps/server/test/metricsPath.test.ts` | 자동 |
| TC-410 | 적대 페이로드(추가 키·__proto__·타입 혼동·유사 문자·인자 없음·ack 없음)는 거부되고 로그에 흔적이 없으며 서버는 계속 동작한다 | NFR-15, SEC-06 | 서버 | `apps/server/test/metricsPathAdversarial.test.ts` | 자동 |
| TC-411 | 거대 페이로드: 한도 이내 100KB 문자열은 INVALID_PAYLOAD·로그 없음, 한도(32KiB) 초과 메시지는 연결이 끊기고 다른 소켓과 서버는 영향이 없다 | NFR-15, SEC-06 | 서버 | `apps/server/test/metricsPathAdversarial.test.ts` | 자동 |
| TC-412 | 입장 상태 경계: 입장 전·퇴장 후·강퇴 후는 기록되지 않고, 다른 방 참가자·재접속(resume) 소켓은 각자 정상이며 로그에 방 ID가 없다 | NFR-15, SEC-03 | 서버 | `apps/server/test/metricsPathAdversarial.test.ts` | 자동 |
| TC-413 | 소켓당 로그 상한: 정확히 20줄까지만 기록되고 21번째부터는 ack ok이지만 기록이 없으며, 다른 소켓의 상한과 독립이다 | NFR-15, SEC-06 | 서버 | `apps/server/test/metricsPathAdversarial.test.ts` | 자동 |
| TC-414 | 속도 제한 경계: 정확히 10건 성공·11번째 RATE_LIMITED, 시간 경과 후 보충되고, 거부 15회 누적 시 연결 종료(POL-10)·다른 소켓은 영향 없음 | NFR-15, SEC-06 | 서버 | `apps/server/test/metricsPathAdversarial.test.ts` | 자동 |
| TC-415 | 로그 전수 검사: 정상·비정상·강퇴·속도 제한 경로에서 디버그 수준 로그 전체에 방 ID·IP·닉네임·참가자 ID·소켓 ID·토큰·SDP·후보 주소·주입 문자열이 없다 | NFR-15, SEC-10, DEC-012 | 서버 | `apps/server/test/metricsPathAdversarial.test.ts` | 자동 |
| TC-416 | 후보 타입 조합표: 한쪽만 relay여도 relay, host/srflx/prflx 조합은 direct, 하나라도 미상이면 relay가 아닌 한 null이다 | NFR-15 | 웹 | `apps/web/src/media/pathMetricsAdversarial.test.ts` | 자동 |
| TC-417 | 대소문자·공백·undefined·프로토타입 이름은 인식하지 않는다(오보 금지): RELAY/Host/" host"/constructor/__proto__는 null | NFR-15 | 웹 | `apps/web/src/media/pathMetricsAdversarial.test.ts` | 자동 |
| TC-418 | 선택 규칙: selected 우선·없는 id면 nominated+succeeded 폴백·여러 쌍이면 선택된 쌍만·형식이 틀린 selected/transport는 무시 | NFR-15 | 웹 | `apps/web/src/media/pathMetricsAdversarial.test.ts` | 자동 |
| TC-419 | 입력 형식: Map.values()·Set·제너레이터도 받고, 빈/잡다한 항목·id 충돌·거대한 통계에서도 예외 없이 제때 끝난다 | NFR-15 | 웹 | `apps/web/src/media/pathMetricsAdversarial.test.ts` | 자동 |
| TC-419b | 연결당 1회: connected/completed가 반복돼도 같은 경로는 1번만, ICE restart 뒤 경로가 바뀌면 1번 더 보고한다 | NFR-15 | 웹 | `apps/web/src/media/pathMetricsAdversarial.test.ts` | 자동 |
| TC-419c | 통계가 늦으면 1초 간격 최대 2회만 재시도하고(총 3회), 그 뒤엔 포기하며 재시도 중 성공하면 1번 보고한다 | NFR-15 | 웹 | `apps/web/src/media/pathMetricsAdversarial.test.ts` | 자동 |
| TC-419d | 통계 예외(동기 throw·reject)·getStats 미지원·형식 이상은 조용히 건너뛰고 예외를 밖으로 내지 않으며 처리되지 않은 거부가 없다 | NFR-15 | 웹 | `apps/web/src/media/pathMetricsAdversarial.test.ts` | 자동 |
| TC-419e | 정리: removePeer·close 뒤에는 대기 중 타이머가 없고, 늦게 도착한 통계도 보고하지 않으며, 진행 중 중복 호출은 getStats 1회로 합쳐진다 | NFR-15 | 웹 | `apps/web/src/media/pathMetricsAdversarial.test.ts` | 자동 |
| TC-419f | ack가 오지 않아도 metrics:path 요청은 지정한 시간 뒤 NETWORK 결과로 끝나고 거부(예외)가 나지 않으며, 보낸 페이로드는 {v,path}뿐이다 | NFR-15 | 웹 | `apps/web/src/lib/signalingPathCompat.test.ts` | 자동 |
| TC-419g | 재시도 대기 중 connected가 다시 와도 앞선 타이머가 남지 않는다: removePeer 뒤 대기 타이머 0개 (unit-19 DEF-001 회귀) | NFR-15 | 웹 | `apps/web/src/media/pathMetricsAdversarial.test.ts` | 자동 |
| TC-420 | 스키마 경계값: 토큰·비밀번호·SDP·candidate·sdpMLineIndex·참가자ID·채팅 원문 길이의 상·하한 바로 안/밖 | SEC-06, NFR-12 | 공유 | `packages/shared/src/protocolBoundary.test.ts` | 자동 |
| TC-420b | 모든 클라이언트→서버 스키마는 strict(추가 키 거부)이고 타입을 강제변환하지 않으며 v가 필수다 | SEC-04, SEC-06, NFR-12 | 공유 | `packages/shared/src/protocolBoundary.test.ts` | 자동 |
| TC-421 | 닉네임: 분해된 한글(NFC 정규화)·연속 공백 축약·경계 20 코드포인트·거부 문자 | POL-04, SEC-06 | 공유 | `packages/shared/src/protocolBoundary.test.ts` | 자동 |
| TC-421b | 채팅 정리: 모든 제어·제로폭·방향 문자 범위 제거, 코드포인트 기준 500자 경계, 줄바꿈 정규화, 공백만 있으면 거부 | POL-07, SEC-07 | 공유 | `packages/shared/src/protocolBoundary.test.ts` | 자동 |
| TC-421c | 계약 상수 고정: 버전 1, 한도값, 오류 코드 목록(중복 없음·핵심 코드 포함) | NFR-12, SEC-06 | 공유 | `packages/shared/src/protocolBoundary.test.ts` | 자동 |
| TC-422 | 클라이언트 IP 판정: TRUST_PROXY=0이면 X-Forwarded-For를 무시, N>0이면 오른쪽에서 N번째만 신뢰(왼쪽 위조 값 무시) | SEC-06, SEC-08 | 서버 | `apps/server/test/unit02Adversarial.test.ts` | 자동 |
| TC-422b | 속도 제한은 실제 판정 IP 기준이다: 왼쪽 XFF를 바꿔도 우회되지 않고, 오른쪽(프록시가 붙인) 값이 다르면 별도 버킷이다 | SEC-06 | 서버 | `apps/server/test/unit02Adversarial.test.ts` | 자동 |
| TC-423 | 오류 응답 본문은 코드만 담고(정확히 일치), 내부 예외가 나도 메시지·스택을 싣지 않는다 | SEC-08 | 서버 | `apps/server/test/unit02Adversarial.test.ts` | 자동 |
| TC-424 | 설정 경계값: 정원 2~12, 방 수 1~10000, 유예 1~300초, IP 연결 1~1000, 포트 0~65535, TRUST_PROXY 0~5, TURN TTL 60~86400, 배율 1~1000 | NFR-08, NFR-04, SEC-10 | 서버 | `apps/server/test/unit02Adversarial.test.ts` | 자동 |
| TC-424b | 설정 오류 메시지는 잘못된 비밀값 자체를 되풀이하지 않는다 | SEC-10, NFR-08 | 서버 | `apps/server/test/unit02Adversarial.test.ts` | 자동 |
| TC-425 | 방 상태 조회도 IP당 속도 제한이 있다(429, 본문은 코드만) | SEC-06 | 서버 | `apps/server/test/unit02Adversarial.test.ts` | 자동 |
| TC-426 | 호스트 클레임은 발급 후 1시간 안에만 유효하다(경계: 만료 시각 정각은 무효) | SEC-03, SEC-05 | 서버 | `apps/server/test/unit02Adversarial.test.ts` | 자동 |
| TC-427 | 서버 종료(close)는 열린 소켓을 끊고 포트를 반납하며 방 상태를 비운다 | NFR-08 | 서버 | `apps/server/test/unit02Adversarial.test.ts` | 자동 |
| TC-427b | 필수 환경변수가 없으면 프로세스가 종료코드 1로 끝나고 원인만 출력한다, 정상 기동 후 SIGTERM이면 종료코드 0으로 정리한다 | NFR-08 | 서버 | `apps/server/test/unit02Adversarial.test.ts` | 자동 |
| TC-428 | CORS: 대소문자·후행 슬래시·접미 도메인·null Origin을 모두 거부하고(OPTIONS 포함), Origin이 없으면 CORS 헤더를 붙이지 않는다 | SEC-08 | 서버 | `apps/server/test/unit02Adversarial.test.ts` | 자동 |
| TC-428b | 소켓 연결은 Origin 헤더가 허용 목록과 정확히 같을 때만 열린다(변형 Origin 거부) | SEC-06, SEC-08 | 서버 | `apps/server/test/unit02Adversarial.test.ts` | 자동 |
| TC-429 | 정적 파일 제공 경계: 경로 순회·숨김 파일로 dist 밖/안의 비공개 파일을 읽을 수 없고, POST·소켓 경로는 index.html로 대체되지 않는다 | SEC-08, NFR-07 | 서버 | `apps/server/test/unit02Adversarial.test.ts` | 자동 |
| TC-429b | (DEF-U02-01 수정) WEB_DIST 경로에 점 디렉터리가 있어도 SPA 폴백이 index.html을 돌려준다 | NFR-07 | 서버 | `apps/server/test/unit02Adversarial.test.ts` | 자동 |
| TC-430 | 만료 경계: exp-1 유효, exp 정각·exp+1 무효. 호스트 클레임(t=h)도 같은 검증을 받는다 | SEC-03 | 서버 | `apps/server/test/unit03Adversarial.test.ts` | 자동 |
| TC-430b | 서명은 맞지만 내용이 비정상인 토큰은 모두 예외 없이 null: 본문이 JSON이 아님·배열·null·숫자, pid/rid/exp 누락·타입 오류, 알 수 없는 종류 | SEC-03 | 서버 | `apps/server/test/unit03Adversarial.test.ts` | 자동 |
| TC-430c | 형식 공격: 조각 수·서명 길이·한 글자 변조·거대 입력은 예외 없이 null | SEC-03 | 서버 | `apps/server/test/unit03Adversarial.test.ts` | 자동 |
| TC-430d | 서명 토큰 형식: base64url(본문).base64url(HMAC-SHA256), 참가자가 다르면 토큰도 다르고 본문에 비밀값이 없다 | SEC-03 | 서버 | `apps/server/test/unit03Adversarial.test.ts` | 자동 |
| TC-431 | 토큰 버킷: 유휴 시간이 길어도 용량을 넘겨 쌓이지 않고, 소수 보충·무보충·용량 1 경계를 지킨다 | SEC-06 | 서버 | `apps/server/test/unit03Adversarial.test.ts` | 자동 |
| TC-431b | 키별 제한기: 키마다 독립 버킷(한 IP가 소진해도 다른 IP는 영향 없음) | SEC-06 | 서버 | `apps/server/test/unit03Adversarial.test.ts` | 자동 |
| TC-431c | 시도 제한: 실패 집계 창이 지나면 오래된 실패는 세지 않고, 차단은 정확히 blockMs 뒤 풀리며, 키마다 독립이다 | SEC-02, POL-11 | 서버 | `apps/server/test/unit03Adversarial.test.ts` | 자동 |
| TC-432 | bcrypt 비용 10 이상의 해시, 빈 문자열·이모지·1000자도 해시/검증이 일치하고, 잘못된 해시 형식은 false(예외 없음) | SEC-02 | 서버 | `apps/server/test/unit03Adversarial.test.ts` | 자동 |
| TC-432b | 식별자: 형식·유일성·엔트로피(참가자 12자, 메시지 8자, 방 22자), 한 자리 위치가 고정되지 않는다 | SEC-01, SEC-04 | 서버 | `apps/server/test/unit03Adversarial.test.ts` | 자동 |
| TC-432c | 강퇴용 IP 키: 결정적이고 IP마다 다르며 IPv6도 22자, 원문 IP가 나타나지 않는다 | POL-06, SEC-04 | 서버 | `apps/server/test/unit03Adversarial.test.ts` | 자동 |
| TC-433 | TURN 자격증명: 만료는 floor(초)+TTL, 참가자마다 다른 자격증명, username 형식 `<만료>:<참가자>`, 공유 비밀·TURN 비밀번호 상수가 응답에 없다 | SEC-09 | 서버 | `apps/server/test/unit03Adversarial.test.ts` | 자동 |
| TC-434 | 정원 경계: full 플래그는 정확히 정원일 때만 true, 정원 2(설정 최소)에서도 3번째는 ROOM_FULL, 자리가 나면 다시 입장 가능, joinSeq는 성공한 입장에서만 증가한다 | FR-06, POL-01, NFR-04 | 서버 | `apps/server/test/unit04Adversarial.test.ts` | 자동 |
| TC-434b | 정원 6(운영 기본)에서 6명까지만 입장하고 병렬로 쏟아지는 입장 시도에서도 초과하지 않는다 | POL-01, FR-07 | 서버 | `apps/server/test/unit04Adversarial.test.ts` | 자동 |
| TC-435 | 호스트 승계: 유예 중(끊긴) 참가자는 건너뛰고 접속 중인 가장 앞선 참가자가 승계한다, 승계 알림은 1회 | FR-17, POL-05 | 서버 | `apps/server/test/unit04Adversarial.test.ts` | 자동 |
| TC-435b | 남은 사람이 모두 끊긴 상태에서 호스트가 나가면 호스트 공석, 첫 복귀자가 호스트가 된다(승계 알림 포함) | FR-17, FR-20 | 서버 | `apps/server/test/unit04Adversarial.test.ts` | 자동 |
| TC-436 | 끊김·복귀의 이벤트와 유예 시간: 중복 disconnect는 이벤트·유예를 늘리지 않고, 복귀는 connected 이벤트 1회, 이미 접속 중인 resume은 이벤트 없음 | POL-08, FR-20 | 서버 | `apps/server/test/unit04Adversarial.test.ts` | 자동 |
| TC-436b | 알 수 없는 방·참가자에 대한 끊김/복귀/퇴장은 예외 없이 안전하게 처리된다 | FR-20 | 서버 | `apps/server/test/unit04Adversarial.test.ts` | 자동 |
| TC-437 | 강퇴 상세: 이벤트 순서(퇴장 후 kick), 유예 중 강퇴 시 타이머가 남지 않아 나중에 timeout 퇴장이 또 나오지 않음, 같은 네트워크는 닉네임을 바꿔도 거부, 다른 네트워크는 허용 | FR-15, POL-06, SEC-05 | 서버 | `apps/server/test/unit04Adversarial.test.ts` | 자동 |
| TC-437b | 강퇴 기록은 방이 사라지면 함께 사라지고(새 방은 깨끗), 호스트가 아닌 사람은 강퇴·잠금·음소거 어느 것도 못 하며 상태가 변하지 않는다 | FR-15, SEC-05 | 서버 | `apps/server/test/unit04Adversarial.test.ts` | 자동 |
| TC-438 | 잠금: 같은 값 반복 설정은 이벤트를 만들지 않고, 변경 때만 locked 이벤트, 호스트 승계 후 새 호스트만 해제할 수 있다 | FR-14, POL-03 | 서버 | `apps/server/test/unit04Adversarial.test.ts` | 자동 |
| TC-438b | 호스트 클레임: 클레임 없는 입장은 호스트 첫 입장 전에는 항상 거부, 호스트가 한 번 입장한 뒤에는 호스트가 나가도 "호스트 입장 전" 상태로 돌아가지 않는다 | POL-13, FR-23, SEC-05 | 서버 | `apps/server/test/unit04Adversarial.test.ts` | 자동 |
| TC-438c | 비밀번호 방: 호스트 클레임 입장은 검증을 요구하지 않고, 게스트는 검증 실패 시 정원이 남아도 거부, 검증 통과 시 입장 | FR-05, SEC-02 | 서버 | `apps/server/test/unit04Adversarial.test.ts` | 자동 |
| TC-439 | 미디어·화면공유 상태: 무변화는 이벤트 없음, 변화는 patch만 전달, SCREEN_BUSY는 기존 공유자를 바꾸지 않고, 공유자 아닌 사람의 중지 요청은 공유를 끊지 못한다 | FR-08, POL-12 | 서버 | `apps/server/test/unit04Adversarial.test.ts` | 자동 |
| TC-439b | 전체 음소거: 호스트 마이크는 유지, 이미 꺼진 사람에게는 개별 이벤트가 없고, 영상 상태는 건드리지 않으며, 각자 다시 켤 수 있다 | FR-16, POL-05 | 서버 | `apps/server/test/unit04Adversarial.test.ts` | 자동 |
| TC-440 | 방 정리: 마지막 퇴장·유예 만료·강퇴 뒤에 남는 타이머가 없고, 정리된 방은 입장·재접속이 거부되며 방 수 상한 자리가 반환된다 | FR-18, POL-02 | 서버 | `apps/server/test/unit04Adversarial.test.ts` | 자동 |
| TC-440b | 중복 닉네임: 번호는 비어 있는 가장 작은 번호부터(퇴장 후 재사용), 유니코드 정규화·대소문자 차이도 같은 이름으로 취급 | POL-04, FR-03 | 서버 | `apps/server/test/unit04Adversarial.test.ts` | 자동 |
| TC-440c | 참가자 ID는 서버가 부여하며 입장 입력(닉네임·IP 키)과 무관한 난수이고 방 안에서 유일하다 | SEC-04 | 서버 | `apps/server/test/unit04Adversarial.test.ts` | 자동 |
| TC-441 | 이미 입장한 소켓의 join·resume은 ALREADY_JOINED, 비밀번호 방에 동시에 두 번 보낸 join은 정확히 한 번만 성공한다 | SEC-03, FR-03 | 서버 | `apps/server/test/unit05Adversarial.test.ts` | 자동 |
| TC-442 | 세션 토큰은 4시간 단기 토큰: 본문(t,rid,pid,exp)이 서버 값에 묶이고, 만료 1ms 전 재접속 성공·만료 시각 정각 거부 | SEC-03 | 서버 | `apps/server/test/unit05Adversarial.test.ts` | 자동 |
| TC-443 | 이벤트별 속도 제한(api-spec §3): 모든 이벤트가 용량을 넘기면 RATE_LIMITED, 용량 안은 처리된다 | SEC-06, POL-10 | 서버 | `apps/server/test/unit05Adversarial.test.ts` | 자동 |
| TC-443b | room:leave 속도 제한(3/1)과 반복 거부(미입장·제한) 누적 시 연결 종료 | SEC-06, POL-10 | 서버 | `apps/server/test/unit05Adversarial.test.ts` | 자동 |
| TC-444 | 같은 세션 토큰으로 두 번째 소켓이 resume하면 이전 소켓은 끊기고 참가자는 재접속 중으로 표시되지 않는다 | SEC-03, FR-20 | 서버 | `apps/server/test/unit05Adversarial.test.ts` | 자동 |
| TC-444b | room:leave 후 같은 소켓의 이벤트는 NOT_JOINED이고(바인딩 해제), 같은 소켓으로 다시 입장하면 새 참가자 ID를 받는다 | SEC-03 | 서버 | `apps/server/test/unit05Adversarial.test.ts` | 자동 |
| TC-444c | IP당 동시 연결 수는 연결이 끊기면 줄어들어 새 연결이 가능하고, 상한을 계속 지킨다 | SEC-06 | 서버 | `apps/server/test/unit05Adversarial.test.ts` | 자동 |
| TC-445 | 핸들러 내부 예외는 ack에 일반 코드(INTERNAL)만 싣고 로그에는 예외 종류만 남기며(메시지·경로 없음), 이후에도 연결·서버가 정상이다 | SEC-08, SEC-10 | 서버 | `apps/server/test/unit05Adversarial.test.ts` | 자동 |
| TC-445b | ack 콜백이 없거나 함수가 아닌 emit(잘못된 페이로드 포함)을 보내도 서버가 죽지 않고 계속 응답한다 | SEC-06 | 서버 | `apps/server/test/unit05Adversarial.test.ts` | 자동 |
| TC-446 | 닉네임은 서버가 정규화한 값으로 저장·표시된다(공백 정리, NFC), 채팅 발신자 이름도 그 값이다 | FR-03, POL-04 | 서버 | `apps/server/test/unit05Adversarial.test.ts` | 자동 |
| TC-446b | 신호 릴레이: candidate·description 내용은 그대로 전달되고(from만 서버 값) 다른 종류의 키는 붙지 않으며, 수신자 외에는 받지 못한다 | SEC-04 | 서버 | `apps/server/test/unit05Adversarial.test.ts` | 자동 |
| TC-446c | 입장 ack·참가자 알림에 내부 필드가 없다: 토큰은 서버 값에 묶이고, 참가자 객체 키는 공개 항목뿐(IP 키 없음), TURN 자격증명은 임시값이며 비밀값·해시가 응답에 없다 | SEC-03, SEC-09, SEC-10 | 서버 | `apps/server/test/unit05Adversarial.test.ts` | 자동 |
| TC-446d | 오류 ack는 {ok,code,message}뿐이고 message는 짧은 일반 문구이다(경로·스택·내부 값 없음) | SEC-08 | 서버 | `apps/server/test/unit05Adversarial.test.ts` | 자동 |
| TC-447 | 비밀번호 오답 제한은 IP+방 단위다: 한 방에서 차단돼도 다른 방·다른 IP에는 영향이 없다 | SEC-02, POL-11 | 서버 | `apps/server/test/unit05Adversarial.test.ts` | 자동 |
| TC-447b | IP별 입장 시도 제한(30회 버스트): 한 IP가 소진해도 다른 IP는 입장 시도를 할 수 있고, 제한은 새 소켓으로 우회되지 않는다 | SEC-06 | 서버 | `apps/server/test/unit05Adversarial.test.ts` | 자동 |
| TC-448 | 방 격리: 다른 방 참가자를 강퇴·음소거·잠금할 수 없고 다른 방 참가자의 상태는 그대로다 | SEC-04, SEC-05 | 서버 | `apps/server/test/unit05Adversarial.test.ts` | 자동 |
| TC-448b | 소켓 전송은 websocket만 허용한다: HTTP long-polling 핸드셰이크는 허용 Origin에서도 세션(sid)을 열어 주지 않는다 | SEC-08, SEC-06 | 서버 | `apps/server/test/unit05Adversarial.test.ts` | 자동 |
| TC-450 | 악성 HTML 페이로드는 이스케이프된 텍스트로만 그려지고 요소·이벤트 속성·링크가 생기지 않는다 | FR-11, SEC-07 | 웹 | `apps/web/src/components/chatPanel.test.ts` | 자동 |
| TC-450b | 비었거나 공백뿐인 입력은 보내지 않고 오류도 띄우지 않으며, 보내기 버튼은 꺼져 있다 | FR-11 | 웹 | `apps/web/src/components/chatPanelActions.test.ts` | 자동 |
| TC-450c | 앞뒤 공백을 떼어 보내고, 보내는 즉시 입력창이 비며 이전 오류가 사라진다 | FR-11 | 웹 | `apps/web/src/components/chatPanelActions.test.ts` | 자동 |
| TC-450d | 길이 경계: 500자는 전송, 501자는 전송 없이 tooLong 안내하고 글은 남는다 | FR-11, SEC-07 | 웹 | `apps/web/src/components/chatPanelActions.test.ts` | 자동 |
| TC-450e | 길이는 UTF-16이 아닌 코드포인트로 센다(이모지 500개 허용·501개 거부), 카운터 표시와 초과 색 | FR-11, SEC-07 | 웹 | `apps/web/src/components/chatPanelActions.test.ts` | 자동 |
| TC-450f | 길이 검사는 앞뒤 공백을 뗀 뒤 한다(공백 포함 501자라도 본문 500자면 전송) | FR-11, POL-07 | 웹 | `apps/web/src/components/chatPanelActions.test.ts` | 자동 |
| TC-450g | 서버 오류 코드별 안내: RATE_LIMITED, INVALID_PAYLOAD, 그 밖은 failed. 글은 입력창으로 되돌아온다 | FR-11, POL-07 | 웹 | `apps/web/src/components/chatPanelActions.test.ts` | 자동 |
| TC-450h | 실패 중에 사용자가 새로 쓰기 시작했다면 그 글을 덮어쓰지 않고, 이후 성공하면 오류가 지워진다 | FR-11 | 웹 | `apps/web/src/components/chatPanelActions.test.ts` | 자동 |
| TC-450i | 오류는 role=alert로 나오고 정상일 때는 alert 요소가 없다 | FR-11 | 웹 | `apps/web/src/components/chatPanelActions.test.ts` | 자동 |
| TC-450j | 본문에 HTML이 있어도 onSend에는 가공 없이 문자열 그대로 가고(서버가 정리), 입력창은 자동완성이 꺼져 있다 | SEC-07 | 웹 | `apps/web/src/components/chatPanelActions.test.ts` | 자동 |
| TC-450k | 닫기 버튼은 onClose를 한 번 부른다 | FR-11 | 웹 | `apps/web/src/components/chatPanelActions.test.ts` | 자동 |
| TC-450l | 메시지 수가 바뀔 때만 맨 아래로 스크롤한다(같은 길이 재렌더는 안 함) | FR-11 | 웹 | `apps/web/src/components/chatPanelActions.test.ts` | 자동 |
| TC-450m | 목록: 메시지 개수만큼 항목, 내 메시지는 오른쪽 정렬·강조색이며 빈 상태 문구는 사라진다 | FR-11 | 웹 | `apps/web/src/components/chatPanelActions.test.ts` | 자동 |
| TC-450n | 위험 스킴은 대소문자·공백 변형이 있어도 링크가 되지 않는다 | SEC-07 | 웹 | `apps/web/src/lib/linkifyEdge.test.ts` | 자동 |
| TC-450o | 스킴 대소문자는 구분하지 않아 HTTPS://도 링크이고 href는 정규화된 http(s)다 | SEC-07 | 웹 | `apps/web/src/lib/linkifyEdge.test.ts` | 자동 |
| TC-450p | URL은 공백·꺾쇠·따옴표·백틱에서 끝나 속성 주입 문자가 href에 들어가지 않는다 | SEC-07 | 웹 | `apps/web/src/lib/linkifyEdge.test.ts` | 자동 |
| TC-450q | 끝 문장부호 여러 개와 전각 마침표를 떼고 원문 순서를 보존한다 | FR-11 | 웹 | `apps/web/src/lib/linkifyEdge.test.ts` | 자동 |
| TC-450r | 스킴만 있거나 호스트가 없으면 텍스트로 남는다(링크 조각 0개, 원문 보존) | FR-11 | 웹 | `apps/web/src/lib/linkifyEdge.test.ts` | 자동 |
| TC-450s | 한 메시지의 여러 링크와 사이 텍스트를 모두 순서대로 만든다 | FR-11 | 웹 | `apps/web/src/lib/linkifyEdge.test.ts` | 자동 |
| TC-450t | 빈 문자열은 조각 0개, 링크 없는 글은 텍스트 1조각이다 | FR-11 | 웹 | `apps/web/src/lib/linkifyEdge.test.ts` | 자동 |
| TC-450u | 무작위 입력 3000개에서 조각을 이어 붙이면 항상 원문이고, 링크 href는 항상 http(s)이다 | SEC-07 | 웹 | `apps/web/src/lib/linkifyEdge.test.ts` | 자동 |
| TC-450v | 매우 긴 입력(2만 자)도 빠르게 처리된다(정규식 폭주 없음) | FR-11 | 웹 | `apps/web/src/lib/linkifyEdge.test.ts` | 자동 |
| TC-450w | href는 정규화된 URL, 표시 글자는 사용자가 쓴 그대로이며, 내 메시지/남의 메시지 링크 색 클래스가 다르다 | SEC-07, UX-12 | 웹 | `apps/web/src/components/chatPanelHref.test.ts` | 자동 |
| TC-451 | http/https 링크만 새 탭·rel noopener noreferrer로 열리고, URL 안의 따옴표·꺾쇠로 속성이 새지 않는다 | FR-11, SEC-07 | 웹 | `apps/web/src/components/chatPanel.test.ts` | 자동 |
| TC-452 | 목록은 aria-live log이고 이름이 있으며, 빈 상태 문구와 닫기 버튼 이름이 있다 | FR-11, UX-10, UX-12 | 웹 | `apps/web/src/components/chatPanel.test.ts` | 자동 |
| TC-453 | 닉네임에 HTML이 있어도 이스케이프되고, 초장문 단어는 줄바꿈 가능한 클래스로 그려진다 | FR-11 | 웹 | `apps/web/src/components/chatPanel.test.ts` | 자동 |
| TC-453k | 열리면 닫기 버튼에 포커스, 닫히면 열기 전 요소로 포커스를 돌려주고 devicechange 구독을 해제하며 해제 뒤 목록 응답은 무시한다 | UX-10 | 웹 | `apps/web/src/components/copyLinkDeviceSheet.test.ts` | 자동 |
| TC-453l | 마운트 때 카메라·마이크를 한 번만 요청하고(리렌더 무관), 준비되기 전에는 입장 버튼이 꺼져 있다가 준비되면 켜진다 | FR-04 | 웹 | `apps/web/src/pages/lobbyActions.test.ts` | 자동 |
| TC-453m | 닉네임이 규칙 위반이면 입장을 시도하지 않고 안내하며, 유효하면 정규화한 닉네임과 비밀번호로 onJoin을 부른다 | FR-03, UX-03 | 웹 | `apps/web/src/pages/lobbyActions.test.ts` | 자동 |
| TC-453n | onJoin이 돌려준 오류 문구는 입력 화면에 role=alert로 남고(입력값 유지) 버튼이 다시 활성화된다; 성공(null)이면 오류가 없다; 처리 중에는 "입장하는 중…"이고 비활성이다 | FR-05, UX-03 | 웹 | `apps/web/src/pages/lobbyActions.test.ts` | 자동 |
| TC-453o | 비밀번호 칸은 비밀번호 방의 참가자에게만 보이고(호스트·공개 방에는 없음), 호스트 배지는 호스트에게만 보인다 | FR-05 | 웹 | `apps/web/src/pages/lobbyActions.test.ts` | 자동 |
| TC-453p | 장치가 하나도 없으면(준비 끝) 버튼이 "장치 없이 입장"이고 입장은 막히지 않는다; 하나라도 있으면 "회의 입장" | FR-04, UX-03 | 웹 | `apps/web/src/pages/lobbyActions.test.ts` | 자동 |
| TC-453q | 권한 문제는 원인 4종별 문구를 role=alert로 보이고(카메라 오류 우선), 다시 확인을 누르면 재요청하며, 앱 안 브라우저 안내를 펼친다(forceOpenInApp) | FR-04, UX-03 | 웹 | `apps/web/src/pages/lobbyActions.test.ts` | 자동 |
| TC-453r | 인앱 브라우저이면 권한 문제에 추가 안내(inApp.permissionExtra)를 붙이고, 일반 브라우저에는 붙이지 않는다 | FR-04, UX-10 | 웹 | `apps/web/src/pages/lobbyActions.test.ts` | 자동 |
| TC-453s | 마이크·카메라 토글: aria-pressed·aria-label이 상태를 따르고 누르면 반대 값으로 호출하며, 마이크 장치가 없으면 마이크 버튼은 비활성이다 | FR-04, FR-08, UX-10 | 웹 | `apps/web/src/pages/lobbyActions.test.ts` | 자동 |
| TC-453t | 장치 선택: 이름(빈 이름은 "마이크 2")·현재 장치 선택·장치 없음 비활성, 선택하면 종류와 ID로 switchDevice를 부른다 | FR-04 | 웹 | `apps/web/src/pages/lobbyActions.test.ts` | 자동 |
| TC-453u | 마이크 레벨 미터는 role=meter, 0~100 범위이며 값은 level×100 반올림이다; 개인정보(IP) 고지·취소·초대 링크 복사가 있다 | FR-04, UX-10 | 웹 | `apps/web/src/pages/lobbyActions.test.ts` | 자동 |
| TC-453v | 장치 목록은 devicechange 때 다시 읽고, 닫히면 구독을 해제하며 해제 뒤 응답은 반영하지 않는다 | FR-04 | 웹 | `apps/web/src/pages/lobbyActions.test.ts` | 자동 |
| TC-453w | 해제(언마운트) 뒤에 도착한 장치 목록 응답은 반영하지 않는다 | FR-04 | 웹 | `apps/web/src/pages/lobbyActions.test.ts` | 자동 |
| TC-453x | 대기실의 초대 링크 복사는 이 방의 ID로 만든다 | FR-02 | 웹 | `apps/web/src/pages/lobbyActions.test.ts` | 자동 |
| TC-453y | 장치 요청이 끝나지 않아도 일정 시간(30초) 뒤에는 입장 버튼이 다시 활성화된다(현재는 영구 비활성 — DEF-001) | FR-04, NFR-01 | 웹 | `apps/web/src/pages/lobbyActions.test.ts` | 자동 |
| TC-454 | 닉네임은 localStorage, 호스트 클레임은 방별로 sessionStorage에만 저장되고 지울 수 있다 | FR-01, FR-03 | 웹 | `apps/web/src/lib/storageApi.test.ts` | 자동 |
| TC-454b | 저장소 접근이 막혀 있어도(사생활 보호 모드) 예외 없이 기본값을 돌려준다 | FR-01 | 웹 | `apps/web/src/lib/storageApi.test.ts` | 자동 |
| TC-455 | 순서는 마이크, 카메라, 화면공유, 채팅, 참가자, 나가기이고 나가기는 구분선으로 분리된 위험색이다 | UX-04 | 웹 | `apps/web/src/components/roomUi.test.ts` | 자동 |
| TC-455b | 각 버튼은 자기 콜백만 호출한다(마이크·카메라·공유·채팅·참가자·나가기·장치) | UX-04, FR-08, FR-22 | 웹 | `apps/web/src/components/controlBarWiring.test.ts` | 자동 |
| TC-455c | 카메라 옆 장치 화살표도 장치 시트 콜백을 부르고 이름이 카메라용이다 | UX-10 | 웹 | `apps/web/src/components/controlBarWiring.test.ts` | 자동 |
| TC-455d | 컨트롤바에 마이크·카메라 상태·읽지 않음·참가자 수가 그대로 전달되고 마이크·카메라 버튼이 컨트롤러에 연결된다 | UX-04, FR-08 | 웹 | `apps/web/src/pages/room.test.ts` | 자동 |
| TC-456 | 마이크·카메라 버튼의 접근 가능한 이름과 aria-pressed는 상태를 따라 바뀐다 | UX-10, FR-08 | 웹 | `apps/web/src/components/roomUi.test.ts` | 자동 |
| TC-456b | 화면공유·채팅·참가자 버튼의 aria-pressed(pressed)와 공유 중 이름은 상태를 따른다 | UX-10, FR-12 | 웹 | `apps/web/src/components/controlBarWiring.test.ts` | 자동 |
| TC-457 | 모든 버튼은 이름이 있고 터치 최소 높이 클래스(min-h-touch)를 가진다 | UX-10, NFR-10 | 웹 | `apps/web/src/components/roomUi.test.ts` | 자동 |
| TC-458 | 화면공유를 지원하지 않는 환경(모바일·미지원)은 버튼이 비활성이고 이유가 이름·title에 있다 | FR-12, POL-12 | 웹 | `apps/web/src/components/roomUi.test.ts` | 자동 |
| TC-458b | 공유 중 상태의 이름은 지원 판정과 무관하게 "공유 중지"이고, 미지원 환경에서는 비활성이다 | FR-12, POL-12 | 웹 | `apps/web/src/components/controlBarWiring.test.ts` | 자동 |
| TC-459 | 읽지 않은 채팅 배지: 0이면 없고 1~99는 숫자, 100 이상은 99+, 채팅이 열려 있으면 없다 | FR-11, UX-12 | 웹 | `apps/web/src/components/roomUi.test.ts` | 자동 |
| TC-459b | 읽지 않음 개수는 채팅 버튼에만, 열려 있으면 0으로 넘어간다(음수·큰 수 경계 포함) | FR-11, UX-12 | 웹 | `apps/web/src/components/controlBarWiring.test.ts` | 자동 |
| TC-459c | 현재 일치 여부를 그대로 돌려주고 질의 문자열을 matchMedia에 넘긴다 | NFR-10 | 웹 | `apps/web/src/lib/useMediaQuery.test.ts` | 자동 |
| TC-459d | 구독은 change 리스너를 달고, 해제는 같은 리스너를 뗀다(누수 없음). 변경 알림이 콜백으로 전달된다 | NFR-10 | 웹 | `apps/web/src/lib/useMediaQuery.test.ts` | 자동 |
| TC-459e | 서버/첫 렌더 스냅샷은 false(넓은 화면 기준)이다 | UX-05 | 웹 | `apps/web/src/lib/useMediaQuery.test.ts` | 자동 |
| TC-460 | 데스크톱 열 수: 1명 1열, 2~4명 2열, 5~6명 3열이고 타일 수가 참가자 수와 같다 | UX-05 | 웹 | `apps/web/src/components/roomUi.test.ts` | 자동 |
| TC-460b | 좁은 화면(639px 이하) 열 수: 1~2명 1열, 3~6명 2열이고 행 수는 올림이다. 질의 문자열은 639px | UX-05, NFR-10 | 웹 | `apps/web/src/components/videoGridProps.test.ts` | 자동 |
| TC-460c | 참가자 0명이어도 예외 없이 1칸 틀(data-count=1)을 그리고, 입장 순서(joinSeq)로 정렬해 배치한다 | UX-05, FR-07 | 웹 | `apps/web/src/components/videoGridProps.test.ts` | 자동 |
| TC-461 | 마지막 줄이 덜 찼으면 가운데로 모은다(3명: 2열 중 마지막 1명, 5명: 3열 중 마지막 2명), 꽉 차면 그대로다 | UX-05 | 웹 | `apps/web/src/components/roomUi.test.ts` | 자동 |
| TC-461b | 좁은 화면의 홀수 마지막 줄 가운데 정렬(3·5명)과 1열(1·2명)은 span 2 그대로다 | UX-05 | 웹 | `apps/web/src/components/videoGridProps.test.ts` | 자동 |
| TC-461c | 데스크톱 5명(3열): 마지막 줄 첫 사람만 2열에서 시작하고 둘째는 자동 배치로 이어져 가운데 모인다 | UX-05 | 웹 | `apps/web/src/components/videoGridProps.test.ts` | 자동 |
| TC-462 | 다른 사람이 화면을 공유하면 큰 공유 타일과 참가자 썸네일이 나오고 갤러리는 사라진다 | UX-06, FR-12 | 웹 | `apps/web/src/components/roomUi.test.ts` | 자동 |
| TC-462b | 화면공유 타일: 레벨 측정 끔·이름은 "OO님의 화면"·크라운/마이크꺼짐 아이콘 없음·거울상 없음·object-contain | FR-12, UX-06 | 웹 | `apps/web/src/components/videoTileEffects.test.ts` | 자동 |
| TC-462c | 공유 레이아웃: 공유 타일은 공유자의 screen 스트림·screen 플래그, 썸네일은 전원(thumb)이고 공유자가 둘이면 입장이 빠른 사람이 큰 화면이다 | UX-06, FR-12 | 웹 | `apps/web/src/components/videoGridProps.test.ts` | 자동 |
| TC-462d | 내가 공유 중이면 큰 영역에는 VideoTile이 없고(안내 카드), 썸네일에는 내 타일이 포함된다 | UX-06 | 웹 | `apps/web/src/components/videoGridProps.test.ts` | 자동 |
| TC-463 | 타일: 카메라 꺼짐은 이니셜 아바타와 "이름: 카메라 꺼짐" 이름, 마이크 꺼짐·호스트는 아이콘 이름, 내 타일은 muted·(나) 표시다 | FR-08, FR-10, UX-10 | 웹 | `apps/web/src/components/roomUi.test.ts` | 자동 |
| TC-463b | 음성 레벨 측정은 마이크가 켜진 카메라 타일에만 켠다 | FR-10, FR-08 | 웹 | `apps/web/src/components/videoTileEffects.test.ts` | 자동 |
| TC-463c | 썸네일 크기 클래스와 이니셜 크기가 일반 타일과 다르다 | FR-08, UX-05 | 웹 | `apps/web/src/components/videoTileEffects.test.ts` | 자동 |
| TC-463d | 타일 속성 매핑: 내 타일은 selfStream·state.camOn, 원격은 camera 스트림·참가자 video, 연결 상태·호스트·마이크·재연결 표시를 넘긴다 | FR-08, FR-10, FR-19, UX-05 | 웹 | `apps/web/src/components/videoGridProps.test.ts` | 자동 |
| TC-463e | sinkId·onPlayBlocked는 값이 있을 때만 전달한다(빈 문자열은 전달하지 않음) | UX-15 | 웹 | `apps/web/src/components/videoGridProps.test.ts` | 자동 |
| TC-464 | 타일 상태 띠: 상대 연결 실패·끊김과 재연결 중은 role=status 문구, 내 타일과 정상 연결에는 없다 | FR-19 | 웹 | `apps/web/src/components/roomUi.test.ts` | 자동 |
| TC-464b | 원격 타일: srcObject를 연결하고 play 성공이면 차단 해제(false), NotAllowedError면 차단(true), AbortError 등은 알리지 않는다 | UX-15 | 웹 | `apps/web/src/components/videoTileEffects.test.ts` | 자동 |
| TC-464c | cleanup은 차단 목록에서 빼고(false), 정리된 뒤 늦게 끝난 play 결과는 무시한다 | UX-15 | 웹 | `apps/web/src/components/videoTileEffects.test.ts` | 자동 |
| TC-464d | 내 타일·스트림 없음·콜백 없음이면 play를 부르지 않고, 스트림이 같으면 srcObject를 다시 대입하지 않는다 | UX-15, FR-08 | 웹 | `apps/web/src/components/videoTileEffects.test.ts` | 자동 |
| TC-464e | 출력 장치(sinkId)는 지원되고 값이 있을 때만 적용하고, 거부돼도 예외가 새지 않는다 | UX-15 | 웹 | `apps/web/src/components/videoTileEffects.test.ts` | 자동 |
| TC-465 | 배지는 색뿐 아니라 글자로 연결됨·불안정·재연결 중(남은 시간)을 구분한다 | FR-19 | 웹 | `apps/web/src/components/roomUi.test.ts` | 자동 |
| TC-465b | 남은 시간 = 유예 시간 - 경과 시간(초, 올림), 0 아래로 내려가지 않는다 | FR-19 | 웹 | `apps/web/src/components/connectionBadgeTimer.test.ts` | 자동 |
| TC-465c | 재연결 중일 때만 0.5초 주기로 현재 시각을 갱신하고, cleanup이 타이머를 해제한다 | FR-19 | 웹 | `apps/web/src/components/connectionBadgeTimer.test.ts` | 자동 |
| TC-465d | 불안정 배지는 경고색·연결됨은 일반색이며 아이콘은 스크린리더에서 숨긴다(글자가 의미를 전달) | FR-19 | 웹 | `apps/web/src/components/connectionBadgeTimer.test.ts` | 자동 |
| TC-466 | 토스트 영역은 알림이 없을 때도 role=status aria-live=polite로 존재하고, 경고는 경고색 테두리다 | UX-12, FR-13 | 웹 | `apps/web/src/components/roomUi.test.ts` | 자동 |
| TC-466b | 발언 중인 타일은 data-speaking=true와 굵은 강조 링(ring-speaking)이 있고, 아니면 일반 링이다 | FR-10, UX-07 | 웹 | `apps/web/src/components/videoTileSpeaking.test.ts` | 자동 |
| TC-466c | 화면공유 타일은 발언 강조를 쓰지 않고(레벨 측정 끔), 마이크가 꺼진 타일도 측정하지 않는다 | FR-10 | 웹 | `apps/web/src/components/videoTileSpeaking.test.ts` | 자동 |
| TC-466d | Esc는 취소를 호출하고 전파를 막는다(방 패널 닫기와 겹치지 않게). 다른 키는 무시한다 | UX-10 | 웹 | `apps/web/src/components/confirmModal.test.ts` | 자동 |
| TC-466e | Tab은 마지막 버튼에서 첫 버튼으로, Shift+Tab은 첫 버튼에서 마지막으로 돈다. 중간에서는 가로채지 않는다 | UX-10, NFR-09 | 웹 | `apps/web/src/components/confirmModal.test.ts` | 자동 |
| TC-466f | 버튼 목록이 비어 있어도 Tab 처리가 예외 없이 끝난다 | UX-10 | 웹 | `apps/web/src/components/confirmModal.test.ts` | 자동 |
| TC-466g | 열릴 때 취소 버튼에 포커스하고, 닫히면(cleanup) 열기 전에 포커스돼 있던 요소로 돌려준다 | UX-10, NFR-09 | 웹 | `apps/web/src/components/confirmModal.test.ts` | 자동 |
| TC-466h | 구조: role=dialog·aria-modal·제목/본문 연결, 취소가 먼저·확인이 나중, danger만 위험 버튼, 각 버튼은 자기 콜백만 부른다 | FR-22, FR-14, FR-15 | 웹 | `apps/web/src/components/confirmModal.test.ts` | 자동 |
| TC-466i | 알림은 들어온 순서대로, 같은 문구라도 id별로 각각 그려지고 info는 일반 테두리다 | UX-12 | 웹 | `apps/web/src/components/connectionBadgeTimer.test.ts` | 자동 |
| TC-466j | 상단 배너: 재연결 중(원인 network/foreground별 문구), 불안정, 정상(없음). 재연결이 불안정보다 우선한다 | FR-19, UX-14 | 웹 | `apps/web/src/pages/room.test.ts` | 자동 |
| TC-466k | 혼자일 때만 "아직 아무도 없어요" 카드를 띄운다(1명 또는 0명), 2명이면 없다 | FR-02, UX-02 | 웹 | `apps/web/src/pages/room.test.ts` | 자동 |
| TC-466l | 잠금 아이콘은 잠긴 방에서만 보이고 이름이 붙는다 | FR-14 | 웹 | `apps/web/src/pages/room.test.ts` | 자동 |
| TC-466m | 채팅·참가자 패널: 한 번에 하나만, 같은 버튼을 다시 누르면 닫힘. 넓은 화면은 옆 패널(aside w-340), 좁은 화면은 영상 위 덮개(absolute inset-0) | UX-04, FR-11 | 웹 | `apps/web/src/pages/room.test.ts` | 자동 |
| TC-466n | Esc는 패널을 닫되, 확인창이나 장치 시트가 열려 있으면 패널을 닫지 않는다. 효과 해제 시 리스너를 뗀다 | UX-10 | 웹 | `apps/web/src/pages/room.test.ts` | 자동 |
| TC-466o | 나가기: 확인창이 먼저 뜨고(위험 버튼), 취소하면 leave를 부르지 않으며, 확인해야 leave를 부른다 | FR-22 | 웹 | `apps/web/src/pages/room.test.ts` | 자동 |
| TC-466p | 전체 음소거·내보내기도 확인창을 거치고, 확인 시 창을 닫은 뒤 해당 id로만 서버 호출한다(내보내기는 위험 버튼, 전체 음소거는 일반) | FR-15, FR-16, SEC-05 | 웹 | `apps/web/src/pages/room.test.ts` | 자동 |
| TC-466q | 공유 버튼: 내 참가자 정보의 screen이 우선이고(없으면 state.sharing), 공유 중이면 중지·아니면 시작을 부른다 | FR-12, POL-12 | 웹 | `apps/web/src/pages/room.test.ts` | 자동 |
| TC-466r | 채팅 패널을 열면 읽음 처리하고, 열려 있는 동안 unread가 늘 때마다 다시 읽음 처리한다(효과 의존성에 unread 포함). 닫혀 있으면 호출하지 않는다 | FR-11, UX-12 | 웹 | `apps/web/src/pages/room.test.ts` | 자동 |
| TC-466s | 회의가 끝났고 사유가 있을 때만 onEnded(사유)를 한 번 알린다(진행 중·사유 없음은 알리지 않는다) | FR-22, FR-17 | 웹 | `apps/web/src/pages/room.test.ts` | 자동 |
| TC-466t | 자동재생 배너: 차단된 영상이 있을 때만 보이고, 같은 요소의 중복 보고는 개수를 늘리지 않으며 해제하면 사라진다 | UX-15 | 웹 | `apps/web/src/pages/room.test.ts` | 자동 |
| TC-466u | 탭하여 재생: 막힌 모든 요소의 play()를 먼저 시작하고, 전부 성공하면 시작 토스트+무대 포커스, 일부 실패하면 경고 토스트(포커스 없음) | UX-15 | 웹 | `apps/web/src/pages/room.test.ts` | 자동 |
| TC-466v | 장치 시트: 열고 닫을 수 있고, 출력 장치 선택은 그리드(sinkId)로 전달되며 장치 전환은 컨트롤러로 간다. 모바일 상단 설정 버튼도 시트를 연다 | UX-15 | 웹 | `apps/web/src/pages/room.test.ts` | 자동 |
| TC-466w | 상태 표시(배지·토스트·그리드)에 현재 상태가 그대로 전달되고 data-status가 상태를 따른다 | UX-12, FR-19 | 웹 | `apps/web/src/pages/room.test.ts` | 자동 |
| TC-466x | 회의실의 좁은 화면 기준은 767px 이하(패널 덮개 전환 질의)다 | NFR-10, UX-04 | 웹 | `apps/web/src/pages/room.test.ts` | 자동 |
| TC-467 | 방 만들기는 POST /api/rooms에 v:1을 보내고 비밀번호는 있을 때만 포함하며 URL에는 넣지 않는다 | FR-01, SEC-02 | 웹 | `apps/web/src/lib/storageApi.test.ts` | 자동 |
| TC-467b | 오류 응답은 서버 code를 그대로, 모양이 이상하면 INTERNAL, 네트워크 실패는 NETWORK로 돌려주고 예외를 던지지 않는다 | FR-06, UX-03 | 웹 | `apps/web/src/lib/storageApi.test.ts` | 자동 |
| TC-467c | 방 상태 조회는 방 ID를 URL 인코딩하고, 메타 응답이 이상하면 INTERNAL이다 | FR-06, SEC-07 | 웹 | `apps/web/src/lib/storageApi.test.ts` | 자동 |
| TC-467d | 방 경로 파서: 22자 URL-safe ID만 방으로 인식하고 짧은·긴·특수문자·하위 경로는 거부한다 | FR-03 | 웹 | `apps/web/src/lib/storageApi.test.ts` | 자동 |
| TC-468 | 입장 요청은 v:1·방 ID·닉네임(+비밀번호·호스트 클레임은 있을 때만)을 보내고, 성공하면 서버가 준 selfId·호스트·참가자로 live가 된다 | FR-01, FR-03, SEC-03 | 웹 | `apps/web/src/state/meetingController.test.ts` | 자동 |
| TC-468b | 장치가 없으면(트랙 없음) 마이크·카메라는 꺼진 상태로 입장하고 상태가 서버에 전달된다 | FR-03, FR-04 | 웹 | `apps/web/src/state/meetingController.test.ts` | 자동 |
| TC-468c | 입장 거부(정원·잠금·강퇴·비밀번호·방 없음)는 코드를 그대로 돌려주고 소켓을 닫고 idle로 돌아가며, 연결 실패는 NETWORK다 | FR-06 | 웹 | `apps/web/src/state/meetingController.test.ts` | 자동 |
| TC-468d | 세션 토큰은 상태(렌더에 노출되는 값)·토스트에 들어가지 않고 resume 요청에만 쓰인다 | SEC-03 | 웹 | `apps/web/src/state/meetingController.test.ts` | 자동 |
| TC-468e | offer는 입장 순번이 더 늦은 쪽만 만든다(내가 늦으면 모두에게 initiate, 먼저면 대기) | FR-07 | 웹 | `apps/web/src/state/meetingController.test.ts` | 자동 |
| TC-468f | 참가자 입장·퇴장: 목록·알림이 갱신되고 중복 입장 이벤트는 무시하며 퇴장 시 영상·피어를 정리한다(timeout은 별도 문구) | FR-13 | 웹 | `apps/web/src/state/meetingController.test.ts` | 자동 |
| TC-468g | 상태 갱신·호스트 변경·잠금이 반영되고, 갱신 패치의 undefined는 기존 값을 지우지 않는다 | FR-08, FR-17, FR-14 | 웹 | `apps/web/src/state/meetingController.test.ts` | 자동 |
| TC-468h | 채팅 수신: 내 글은 mine이고 안 읽음에 포함하지 않으며, 읽음 처리·최근 200개만 유지된다 | FR-11 | 웹 | `apps/web/src/state/meetingController.test.ts` | 자동 |
| TC-468i | 호스트의 전체 음소거 이벤트는 내 마이크를 끄고 서버에 알리고 경고 토스트를 띄운다 | FR-15, SEC-05 | 웹 | `apps/web/src/state/meetingController.test.ts` | 자동 |
| TC-468j | 강퇴·운영자 폐쇄 이벤트는 회의를 끝내고(이유 구분) 장치·연결을 정리하며 이후 끊김이 재연결을 시작하지 않는다 | FR-16, POL-19 | 웹 | `apps/web/src/state/meetingController.test.ts` | 자동 |
| TC-468k | 끊기면 reconnecting(원인 network)이 되고, 다시 연결되면 토큰으로 resume해 같은 참가자 목록으로 live로 돌아오고 ICE를 다시 시작한다 | FR-20, FR-19 | 웹 | `apps/web/src/state/meetingController.test.ts` | 자동 |
| TC-468l | resume 실패 코드별 종료 사유: ROOM_NOT_FOUND는 restarted, TOKEN_INVALID·PARTICIPANT_GONE은 expired, 일시 오류(NETWORK)는 끊김 상태 유지 | FR-21, FR-20 | 웹 | `apps/web/src/state/meetingController.test.ts` | 자동 |
| TC-468m | 서버가 먼저 끊어 자동 재연결이 없는 경우(active=false) 1.5초마다 직접 다시 연결을 시도하고, 연결되면 멈춘다 | FR-20 | 웹 | `apps/web/src/state/meetingController.test.ts` | 자동 |
| TC-468n | 나가기: room:leave를 보내고 left로 끝나며 자원이 정리되고, 나가는 중의 끊김은 재연결을 시작하지 않는다 | FR-22, FR-03 | 웹 | `apps/web/src/state/meetingController.test.ts` | 자동 |
| TC-468o | 호스트 동작은 서버 요청으로만 처리되고 거부(FORBIDDEN)되면 안내 토스트를 띄우며 로컬 상태를 바꾸지 않는다 | FR-14, FR-15, FR-16, SEC-05 | 웹 | `apps/web/src/state/meetingController.test.ts` | 자동 |
| TC-468p | 채팅 전송은 성공 시 null, 실패 시 서버 코드, 응답 없음은 NETWORK를 돌려준다 | FR-11 | 웹 | `apps/web/src/state/meetingController.test.ts` | 자동 |
| TC-468q | 화면공유: 미지원이면 안내만, 다른 사람이 공유 중이면 getDisplayMedia를 부르지 않고 안내, 서버가 거부하면 트랙을 멈춘다 | FR-12, POL-12 | 웹 | `apps/web/src/state/meetingController.test.ts` | 자동 |
| TC-468r | 토스트는 최대 4개만 남고 4.5초 뒤 사라진다 | UX-12 | 웹 | `apps/web/src/state/meetingController.test.ts` | 자동 |
| TC-468s | WebSocket 전용·무한 재연결·지수 백오프(0.4~3초) 설정으로 연결한다 | FR-20, NFR-03 | 웹 | `apps/web/src/lib/signaling.test.ts` | 자동 |
| TC-468t | connect는 연결되면 해결, 오류·10초 초과면 거부하며 대기 리스너를 정리하고, 이미 연결돼 있으면 즉시 해결한다 | FR-01, FR-20 | 웹 | `apps/web/src/lib/signaling.test.ts` | 자동 |
| TC-468u | request는 ack를 그대로 돌려주고, 응답이 없으면 지정 시간(기본 8초) 뒤 NETWORK 오류로 끝나며, 늦은 ack는 결과를 바꾸지 못한다 | FR-20, SEC-03 | 웹 | `apps/web/src/lib/signaling.test.ts` | 자동 |
| TC-468v | close는 모든 리스너를 제거하고 소켓을 끊는다 | FR-22 | 웹 | `apps/web/src/lib/signaling.test.ts` | 자동 |
| TC-468w | 네트워크 품질: 연속 2회 poor일 때만 poor로 표시하고 한 번이라도 good이면 즉시 되돌린다(3초 주기) | FR-19 | 웹 | `apps/web/src/state/meetingController.test.ts` | 자동 |
| TC-468x | 화면공유 성공 시 서버에 알리고 sharing이 되며, 브라우저의 공유 중지(onended)가 오면 공유를 끝내고 서버에 알린다 | FR-12 | 웹 | `apps/web/src/state/meetingController.test.ts` | 자동 |
| TC-468y | 마이크 토글: 켜진 상태를 서버에 알리고, 마이크 트랙이 없으면 새로 열어 보며 실패하면 안내 토스트를 띄운다. 카메라를 못 켜면 상태를 바꾸지 않고 안내한다 | FR-08, UX-03 | 웹 | `apps/web/src/state/meetingController.test.ts` | 자동 |
| TC-469 | 세션 토큰은 어떤 저장소에도 쓰지 않는다 — 저장소 사용은 lib/storage.ts 한 곳이고 키는 닉네임·호스트 클레임뿐이다(정적 점검) | SEC-03 | 웹 | `apps/web/src/lib/storageApi.test.ts` | 자동 |
| TC-469k | 닉네임이 비었거나 규칙 위반이면 서버를 부르지 않고 사유를 role=alert로 알린다 | FR-01, UX-03 | 웹 | `apps/web/src/pages/landingActions.test.ts` | 자동 |
| TC-469l | 비밀번호는 4~32자만 통과한다(3자·33자 거부, 4자·32자 허용) — 검증은 서버 호출 전에 한다 | FR-01, FR-05 | 웹 | `apps/web/src/pages/landingActions.test.ts` | 자동 |
| TC-469m | 성공하면 닉네임(정규화)·호스트 클레임을 저장하고 /r/<방ID>로 이동한다. 비밀번호 칸을 껐으면 입력해 둔 값도 보내지 않는다 | FR-01, SEC-02 | 웹 | `apps/web/src/pages/landingActions.test.ts` | 자동 |
| TC-469n | 서버 오류는 원인별 문구(RATE_LIMITED, 그 밖)로 알리고 저장·이동하지 않으며 버튼은 다시 쓸 수 있다 | FR-01, UX-03 | 웹 | `apps/web/src/pages/landingActions.test.ts` | 자동 |
| TC-469o | 요청 중에는 버튼이 비활성화되고 "만드는 중…"이며 응답 뒤 풀린다; 이전 오류는 새 시도에서 지워진다 | FR-01, NFR-10 | 웹 | `apps/web/src/pages/landingActions.test.ts` | 자동 |
| TC-469p | 링크 입장: 22자 방 코드·초대 링크는 /r/<ID>로 이동하고, 잘못된 입력은 이동 없이 안내한다 | FR-03, SEC-07 | 웹 | `apps/web/src/pages/landingActions.test.ts` | 자동 |
| TC-469q | 저장된 닉네임이 있으면 입력 칸에 미리 채워지고(재방문 시 입력 생략), 제출 시 그 값이 쓰인다 | FR-01, NFR-01 | 웹 | `apps/web/src/pages/landingActions.test.ts` | 자동 |
| TC-469r | 비밀번호 칸은 체크하면 나타나고(type=password, 라벨·힌트 연결, maxLength 32), 끄면 사라진다 | FR-05, UX-10 | 웹 | `apps/web/src/pages/landingActions.test.ts` | 자동 |
| TC-469s | 방 ID가 있으면 <origin>/r/<ID>, url이 있으면 그 값, 둘 다 없으면 origin을 복사하고 성공을 알린다(라벨·onCopied(true)) | FR-02 | 웹 | `apps/web/src/components/copyLinkDeviceSheet.test.ts` | 자동 |
| TC-469t | 복사 표시는 2.5초 뒤 원래 문구로 돌아온다(2.4초에는 유지) | FR-02, UX-03 | 웹 | `apps/web/src/components/copyLinkDeviceSheet.test.ts` | 자동 |
| TC-469u | 클립보드가 거부되거나 없으면 실패를 알리고(role=status) 읽기 전용 입력창에 링크를 보여 주며 onCopied(false), 예외는 밖으로 나오지 않는다 | FR-02, UX-03 | 웹 | `apps/web/src/components/copyLinkDeviceSheet.test.ts` | 자동 |
| TC-469v | 버튼은 type=button이고 접근 가능한 이름이 있으며, compact는 모바일에서 글자를 숨겨도 aria-label은 남고, 사용자 지정 testId·label이 적용된다 | UX-10, NFR-10 | 웹 | `apps/web/src/components/copyLinkDeviceSheet.test.ts` | 자동 |
| TC-469w | 마이크·카메라 목록은 장치 이름(비면 "마이크 2" 대체)으로, 현재 장치를 선택한 채 보이고 비면 "선택 가능한 장치가 없습니다"와 함께 비활성이다 | FR-09 | 웹 | `apps/web/src/components/copyLinkDeviceSheet.test.ts` | 자동 |
| TC-469x | 선택하면 종류(audio/video)와 deviceId가 그대로 전달된다; 스피커 선택은 setSinkId 지원 브라우저에서만 나오고 아니면 안내문이 나온다 | FR-09 | 웹 | `apps/web/src/components/copyLinkDeviceSheet.test.ts` | 자동 |
| TC-469y | Esc는 닫기, 대화상자는 role=dialog·aria-modal·이름이 있고, 닫기 버튼에 이름이 있으며 닫기를 누르면 onClose | UX-10, NFR-09 | 웹 | `apps/web/src/components/copyLinkDeviceSheet.test.ts` | 자동 |
| TC-469z | Tab 순환: 마지막에서 Tab이면 첫째로, 첫째(또는 창 밖)에서 Shift+Tab이면 마지막으로 가고, 중간에서는 브라우저 기본 이동을 막지 않는다; 비활성 항목은 제외 | UX-10, NFR-09 | 웹 | `apps/web/src/components/copyLinkDeviceSheet.test.ts` | 자동 |
| TC-470 | 호스트에게만 잠금·전체 음소거·내보내기 도구가 보이고, 호스트가 아닌 사람(또는 호스트 불명)에게는 하나도 없다 | FR-14, FR-15, FR-16, SEC-05 | 웹 | `apps/web/src/components/participantsPanel.test.ts` | 자동 |
| TC-470b | 잠금·전체 음소거·닫기 버튼은 각자의 콜백을 정확히 1번만 호출하고 서로 섞이지 않는다 | FR-14, FR-16 | 웹 | `apps/web/src/components/participantsPanelActions.test.ts` | 자동 |
| TC-470c | 내보내기 버튼은 그 줄의 참가자 객체로만 onKick을 호출한다(다른 줄·자기 자신 아님) | FR-15, SEC-05 | 웹 | `apps/web/src/components/participantsPanelActions.test.ts` | 자동 |
| TC-470d | 호스트가 아니면 도구 컨테이너·잠금·음소거·내보내기가 트리에 전혀 없고, 목록·닫기는 그대로다 | FR-14, FR-15, FR-16, SEC-05 | 웹 | `apps/web/src/components/participantsPanelActions.test.ts` | 자동 |
| TC-470e | 잠금 버튼 상태: pressed가 locked와 같고 문구가 잠금/해제로 바뀐다(트리 기준) | FR-14 | 웹 | `apps/web/src/components/participantsPanelActions.test.ts` | 자동 |
| TC-470f | 호스트 1명만 있는 방: 목록 1줄·내보내기 없음·도구는 보임. 빈 목록도 터지지 않는다 | FR-13 | 웹 | `apps/web/src/components/participantsPanelActions.test.ts` | 자동 |
| TC-470g | 정렬은 입력 배열을 바꾸지 않고(복사), 승계 후(호스트가 뒤 순번)에도 왕관은 hostId에만 붙는다 | FR-13, FR-17 | 웹 | `apps/web/src/components/participantsPanelActions.test.ts` | 자동 |
| TC-470h | 상태 표시는 줄별로 독립이다: 재연결 중·화면공유는 해당 참가자 줄에만, 꺼짐 아이콘은 꺼진 줄에만 | FR-13 | 웹 | `apps/web/src/components/participantsPanelActions.test.ts` | 자동 |
| TC-470i | 이니셜: 빈 닉네임은 오류 없이 빈 칸, 소문자는 대문자, 결합 이모지는 코드포인트 첫 글자, 닉네임은 텍스트 노드로만 들어간다 | FR-13, SEC-07 | 웹 | `apps/web/src/components/participantsPanelActions.test.ts` | 자동 |
| TC-470j | 내보내기·닫기 버튼은 type=button이고 터치 크기 클래스, 아이콘은 aria-hidden이다(폼 제출 방지) | UX-10 | 웹 | `apps/web/src/components/participantsPanelActions.test.ts` | 자동 |
| TC-470k | 잠금 아이콘은 상태 반영(잠금 중=열림 아이콘), 호스트 도구 묶음에 이름이 있고, e2e가 쓰는 testid(people-panel·people-list)와 닉네임 원문 표시가 유지된다 | FR-14, UX-10 | 웹 | `apps/web/src/components/participantsPanelActions.test.ts` | 자동 |
| TC-471 | 호스트도 자기 자신에게는 내보내기 버튼이 없고, 내보내기 버튼 이름에 대상 닉네임이 있다 | FR-16 | 웹 | `apps/web/src/components/participantsPanel.test.ts` | 자동 |
| TC-472 | 잠금 버튼은 상태에 따라 문구·aria-pressed가 바뀐다 | FR-14 | 웹 | `apps/web/src/components/participantsPanel.test.ts` | 자동 |
| TC-473 | 목록은 입장 순서이고 (나)·호스트 왕관·재연결 중·화면공유·마이크·카메라 상태가 이름 있는 아이콘으로 나온다 | FR-13, FR-17 | 웹 | `apps/web/src/components/participantsPanel.test.ts` | 자동 |
| TC-474 | 닉네임의 HTML은 이스케이프되고, 이니셜은 첫 글자(이모지 포함 코드포인트 단위)다 | FR-13, SEC-07 | 웹 | `apps/web/src/components/participantsPanel.test.ts` | 자동 |
| TC-475 | 닫기 버튼과 패널에 접근 가능한 이름이 있다 | UX-10 | 웹 | `apps/web/src/components/participantsPanel.test.ts` | 자동 |
| TC-476 | 임계값(RMS 0.035) 이하의 소리는 아무리 길어도 발언으로 보지 않고, 초과하면 120ms 이상 이어질 때 켜진다 | FR-10, UX-07 | 웹 | `apps/web/src/lib/audioLevel.test.ts` | 자동 |
| TC-476b | 짧은 소음(120ms 미만)에는 켜지지 않고, 발언이 멈춰도 700ms가 지나야 꺼지며, 그 안에 다시 말하면 꺼지지 않는다 | FR-10, UX-07 | 웹 | `apps/web/src/lib/audioLevel.test.ts` | 자동 |
| TC-476c | 입력 레벨은 rms×4(최대 1)로 계산되고 거의 변하지 않으면 상태를 갱신하지 않는다 | FR-10 | 웹 | `apps/web/src/lib/audioLevel.test.ts` | 자동 |
| TC-476d | 비활성(enabled=false)이거나 오디오 트랙이 없으면 오디오 컨텍스트를 만들지 않고 강조 없음을 돌려주며, 정리 시 rAF 취소·연결 해제한다 | FR-10 | 웹 | `apps/web/src/lib/audioLevel.test.ts` | 자동 |
| TC-476e | 첫 화면에 h1·닉네임·[새 회의 만들기]·링크 입장 폼이 있어 조작 3번 이내(닉네임→만들기→입장)에 닿는다 | FR-01, NFR-01 | 웹 | `apps/web/src/pages/landing.test.ts` | 자동 |
| TC-476f | 모든 입력에 라벨이 연결돼 있고(for/id), 비밀번호 입력은 체크하기 전에는 없으며, 닉네임 힌트가 aria-describedby로 연결된다 | FR-05, UX-10 | 웹 | `apps/web/src/pages/landing.test.ts` | 자동 |
| TC-476g | 만들기 버튼은 type=submit이고 두 폼 모두 noValidate(브라우저 기본 팝업 대신 한국어 오류)이며 법률 푸터가 포함된다 | NFR-10, UX-10 | 웹 | `apps/web/src/pages/landing.test.ts` | 자동 |
| TC-476h | AudioContext는 모든 타일이 하나를 공유하고(브라우저 한도 보호), 일시정지(suspended) 상태면 resume하며 resume이 거부돼도 예외가 없다 | FR-10, NFR-05 | 웹 | `apps/web/src/lib/unit07AudioLevel.test.ts` | 자동 |
| TC-476i | AudioContext를 만들 수 없는 환경(구형·정책 차단)에서는 예외 없이 강조 없음을 돌려주고 측정 루프를 돌리지 않는다 | FR-10, NFR-05 | 웹 | `apps/web/src/lib/unit07AudioLevel.test.ts` | 자동 |
| TC-476j | 분석기는 fftSize 512로 소스에 연결되고 샘플 버퍼도 512다 | FR-10 | 웹 | `apps/web/src/lib/unit07AudioLevel.test.ts` | 자동 |
| TC-476k | 측정은 약 15fps(66ms)로 제한된다: 10ms 간격으로 호출돼도 66ms 전에는 다시 읽지 않는다 | FR-10 | 웹 | `apps/web/src/lib/unit07AudioLevel.test.ts` | 자동 |
| TC-476l | 레벨 변화가 0.05 이하이면 상태를 갱신하지 않고, 초과하면 갱신한다 | FR-10, UX-07 | 웹 | `apps/web/src/lib/unit07AudioLevel.test.ts` | 자동 |
| TC-476m | 소리가 띄엄띄엄(켜짐·꺼짐 번갈아) 나면 누적되지 않아 발언으로 보지 않는다 | FR-10, UX-07 | 웹 | `apps/web/src/lib/unit07AudioLevel.test.ts` | 자동 |
| TC-476n | 정리 중 소스 연결 해제가 예외를 던져도(이미 해제됨) 정리는 예외 없이 끝난다 | FR-10 | 웹 | `apps/web/src/lib/unit07AudioLevel.test.ts` | 자동 |
| TC-476o | 유지 시간 경계: 소리가 120ms 이어진 순간(119ms는 아직)에 켜지고, 침묵이 700ms 이어진 순간(699ms는 아직)에 꺼진다 | FR-10, UX-07 | 웹 | `apps/web/src/lib/unit07AudioLevel.test.ts` | 자동 |
| TC-476p | 오디오 트랙이 다른 트랙으로 바뀌면 이전 연결을 정리하고 새 트랙에 다시 연결하며, 같은 트랙이면 다시 연결하지 않는다 | FR-10, UX-07 | 웹 | `apps/web/src/lib/unit07AudioLevel.hook.test.ts` | 자동 |
| TC-476q | 발언 중에 enabled가 꺼지거나 스트림이 사라지면 곧바로 레벨 0·발언 없음을 돌려주고 연결을 정리한다 | FR-10, UX-07 | 웹 | `apps/web/src/lib/unit07AudioLevel.hook.test.ts` | 자동 |
| TC-477 | 장치 오류 이름을 denied·notFound·inUse·unknown 4종으로 분류하고 이상한 입력도 unknown이다 | FR-04, UX-03 | 웹 | `apps/web/src/lib/localMedia.test.ts` | 자동 |
| TC-477b | supportsMedia는 보안 컨텍스트·RTCPeerConnection·getUserMedia가 모두 있어야 true다 | NFR-05, POL-14 | 웹 | `apps/web/src/lib/localMedia.test.ts` | 자동 |
| TC-477c | 장치 목록은 이름이 가려진 빈 deviceId 항목을 제외하고, 열거 실패에도 빈 목록을 돌려준다 | FR-09 | 웹 | `apps/web/src/lib/localMedia.test.ts` | 자동 |
| TC-477d | Android·iPhone·iPad·iPod·모바일 Firefox와 iPadOS 데스크톱 모드(Macintosh+터치 2점 이상)는 모바일이고, 일반 Windows·터치 없는 Mac은 아니다 | FR-12, NFR-05 | 웹 | `apps/web/src/lib/unit07Media.test.ts` | 자동 |
| TC-477e | 화면공유는 getDisplayMedia가 있는 데스크톱에서만 지원하고, 모바일이거나 API가 없으면 지원하지 않는다 | FR-12 | 웹 | `apps/web/src/lib/unit07Media.test.ts` | 자동 |
| TC-477f | 모바일 토큰이 iPhone뿐인 UA(Mobile·iPad·iPod 없음)도 모바일로 판정한다 | FR-12, NFR-05 | 웹 | `apps/web/src/lib/unit07Media.test.ts` | 자동 |
| TC-477g | 구형 이름(TrackStartError·PermissionDeniedError·DevicesNotFoundError·OverconstrainedError·AbortError)도 같은 종류로 분류하고, 이름만 흉내 낸 일반 객체는 unknown이다 | FR-04, UX-03 | 웹 | `apps/web/src/lib/unit07Media.test.ts` | 자동 |
| TC-477h | window가 없는 환경에서도 supportsMedia는 예외 없이 false다 | NFR-05 | 웹 | `apps/web/src/lib/unit07Media.test.ts` | 자동 |
| TC-478 | 한 번에 얻지 못하면 따로 시도해 되는 것만 켜고, 실패한 종류의 원인을 errors에 남긴다 | FR-04 | 웹 | `apps/web/src/lib/localMedia.test.ts` | 자동 |
| TC-478b | 둘 다 거부되면 장치 없이 시작하고 errors에 두 원인이 남으며(입장은 막지 않는다), 다시 시작하면 오류가 초기화된다 | FR-04 | 웹 | `apps/web/src/lib/localMedia.test.ts` | 자동 |
| TC-478c | 마이크는 track.enabled로 즉시 음소거되고(장치는 유지), 카메라를 끄면 장치를 해제하며 다시 켜면 새로 연다 | FR-08 | 웹 | `apps/web/src/lib/localMedia.test.ts` | 자동 |
| TC-478d | 카메라를 다시 켜지 못하면 false를 돌려주고 camOn은 꺼진 채로 둔다 | FR-08, UX-03 | 웹 | `apps/web/src/lib/localMedia.test.ts` | 자동 |
| TC-478e | 장치 전환 실패 시 이전 장치 ID로 되돌리고 false를 돌려주며, 성공하면 새 트랙으로 바뀌고 이전 트랙은 멈춘다 | FR-09 | 웹 | `apps/web/src/lib/localMedia.test.ts` | 자동 |
| TC-478f | 카메라가 꺼진 상태에서 카메라 장치를 바꾸면 장치를 열지 않고 선택만 기억한다 | FR-09 | 웹 | `apps/web/src/lib/localMedia.test.ts` | 자동 |
| TC-478g | 카메라 트랙이 외부 요인으로 끝나면(ended) 비디오를 비우고 구독자에게 알리며, stopAll은 모든 트랙을 멈춘다 | FR-04 | 웹 | `apps/web/src/lib/localMedia.test.ts` | 자동 |
| TC-478h | 합친 요청이 성공하면 getUserMedia는 1번만 부르고, 제약은 에코 제거·잡음 억제·자동 게인과 720p·30fps 상한이며 장치 ID는 지정했을 때만 exact로 넣는다 | FR-04 | 웹 | `apps/web/src/lib/unit07Media.test.ts` | 자동 |
| TC-478i | 마이크만·카메라만 요청하면 해당 종류만 열고, 둘 다 false면 장치를 열지 않는다(알림은 1번) | FR-04 | 웹 | `apps/web/src/lib/unit07Media.test.ts` | 자동 |
| TC-478j | 음소거한 뒤 장치를 새로 얻어도(전환·재시작) 새 마이크 트랙은 음소거 상태를 그대로 따른다 | FR-08 | 웹 | `apps/web/src/lib/unit07Media.test.ts` | 자동 |
| TC-478k | 실패했던 종류를 나중에 성공하면 그 종류의 오류만 지워지고 다른 종류의 오류는 남는다 | FR-04, UX-03 | 웹 | `apps/web/src/lib/unit07Media.test.ts` | 자동 |
| TC-478l | 카메라 장치 전환이 실패하면 카메라가 켜진 상태에서도 이전 카메라 ID로 되돌린다 | FR-09 | 웹 | `apps/web/src/lib/unit07Media.test.ts` | 자동 |
| TC-478m | 이미 교체된 옛 카메라 트랙의 ended 콜백은 새 트랙과 구독자에게 영향을 주지 않는다(경쟁 조건) | FR-04 | 웹 | `apps/web/src/lib/unit07Media.test.ts` | 자동 |
| TC-478n | setMic·stopAll은 구독자에게 알리고, stopAll은 마이크·카메라를 모두 멈추며, stream()에는 살아 있는 트랙만 담긴다 | FR-08 | 웹 | `apps/web/src/lib/unit07Media.test.ts` | 자동 |
| TC-478o | 백그라운드에서 카메라만 끊기면 reconcile이 카메라만 비우고 마이크는 유지한다 | UX-14 | 웹 | `apps/web/src/lib/unit07Media.test.ts` | 자동 |
| TC-478p | subscribe가 돌려준 해제 함수를 부르면 더 이상 알리지 않고, 다른 구독자는 계속 알린다 | FR-08 | 웹 | `apps/web/src/lib/unit07Media.test.ts` | 자동 |
| TC-479 | offer를 만드는 쪽은 마이크·카메라·화면 순서의 sendrecv m-line 3개를 만들고, 응답하는 쪽은 만들지 않는다(중복 m-line 방지) | FR-07 | 웹 | `apps/web/src/media/meshTransport.fake.test.ts` | 자동 |
| TC-479b | ICE 서버는 서버가 준 STUN/TURN 자격증명 그대로 쓰고, 자격증명이 없는 항목에는 빈 필드를 만들지 않는다 | SEC-09 | 웹 | `apps/web/src/media/meshTransport.fake.test.ts` | 자동 |
| TC-479c | 인원 수에 맞춰 카메라 송신 비트레이트·해상도를 적용하고(2명 1.5Mbps, 6명 400kbps·1/2), 화면 송신은 1.5Mbps로 고정한다 | NFR-13 | 웹 | `apps/web/src/media/meshTransport.fake.test.ts` | 자동 |
| TC-479d | 마이크·카메라·화면 트랙 교체는 모든 연결의 해당 m-line에만 적용되고, 화면 트랙에는 contentHint=detail을 둔다 | FR-08, FR-12 | 웹 | `apps/web/src/media/meshTransport.fake.test.ts` | 자동 |
| TC-479e | 동시 offer 충돌: 양보하는 쪽(ID가 더 큰 쪽)은 상대 offer를 받아들이고, 양보하지 않는 쪽은 무시한다 | FR-07 | 웹 | `apps/web/src/media/meshTransport.fake.test.ts` | 자동 |
| TC-479f | 충돌이 없으면 offer에 answer를 만들어 보내고 응답 쪽이 m-line에 송신 트랙을 붙이며, 모르는 상대의 시그널은 연결을 만든다 | FR-07 | 웹 | `apps/web/src/media/meshTransport.fake.test.ts` | 자동 |
| TC-479g | 잘못된 시그널(예외를 던지는 후보·설명)은 삼키고 다른 연결에 영향을 주지 않으며, 닫힌 뒤의 시그널은 무시한다 | FR-20, SEC-07 | 웹 | `apps/web/src/media/meshTransport.fake.test.ts` | 자동 |
| TC-479h | ICE disconnected는 4초 기다린 뒤에도 그대로면 재시작하고, 그 사이 복구되면 재시작하지 않으며, failed는 즉시 재시작하되 3회까지만 한다 | NFR-03 | 웹 | `apps/web/src/media/meshTransport.fake.test.ts` | 자동 |
| TC-479i | 경로 판정은 연결 직후 한 번만 보고하고(같은 값 반복 없음), 통계가 비어 있으면 최대 2번 더 재시도한 뒤 포기한다 | NFR-15 | 웹 | `apps/web/src/media/meshTransport.fake.test.ts` | 자동 |
| TC-479j | close()와 removePeer()는 연결을 닫고 이벤트 핸들러를 떼어 이후 콜백이 아무 일도 하지 않게 한다 | FR-22 | 웹 | `apps/web/src/media/meshTransport.fake.test.ts` | 자동 |
| TC-479k | 수신 트랙은 m-line 순서로 역할이 정해진다: 오디오#0·비디오#0은 camera 스트림, 비디오#1은 screen 스트림, 그 밖의 m-line은 무시한다 | FR-07, FR-12 | 웹 | `apps/web/src/media/unit07Transport.test.ts` | 자동 |
| TC-479l | 같은 역할의 트랙이 새로 오면 이전 트랙을 스트림에서 빼고(교체) 다른 종류 트랙은 유지한다 | FR-09, FR-12 | 웹 | `apps/web/src/media/unit07Transport.test.ts` | 자동 |
| TC-479m | 로컬 ICE 후보와 협상(offer)은 서버로 보낼 시그널이 되고, 후보 끝(null)은 보내지 않으며, offer·answer 이외 설명은 보내지 않는다 | FR-07 | 웹 | `apps/web/src/media/unit07Transport.test.ts` | 자동 |
| TC-479n | 협상 중 오류가 나도 예외를 밖으로 내지 않고 makingOffer를 풀어, 이후 상대 offer를 정상 처리한다 | FR-20 | 웹 | `apps/web/src/media/unit07Transport.test.ts` | 자동 |
| TC-479o | 내가 offer를 만드는 중(makingOffer)에 상대 offer가 오면 양보하지 않는 쪽은 무시하고, 협상이 끝난 뒤의 offer는 받아들인다 | FR-07 | 웹 | `apps/web/src/media/unit07Transport.test.ts` | 자동 |
| TC-479p | ICE 후보 시그널은 연결에 전달되고, answer 설명도 그대로 적용된다 | FR-07 | 웹 | `apps/web/src/media/unit07Transport.test.ts` | 자동 |
| TC-479q | PeerConnection 상태는 connected·connecting(new 포함)·failed만 보고하고 disconnected·closed는 ICE 경로가 담당하므로 보고하지 않는다 | FR-19 | 웹 | `apps/web/src/media/unit07Transport.test.ts` | 자동 |
| TC-479r | 연결이 없으면 good이고, 왕복 지연은 0.4초 초과일 때만 poor다(0.4초는 경계: good) | FR-19 | 웹 | `apps/web/src/media/unit07Transport.test.ts` | 자동 |
| TC-479s | 왕복 지연은 선택된(nominated·succeeded) 쌍의 값만 보고, 후보 쌍이 여럿이면 가장 큰 값을 쓴다 | FR-19 | 웹 | `apps/web/src/media/unit07Transport.test.ts` | 자동 |
| TC-479t | 패킷 손실은 표본이 200개를 넘고 손실률이 8%를 넘을 때만 poor이며, 여러 수신 스트림은 합산한다 | FR-19 | 웹 | `apps/web/src/media/unit07Transport.test.ts` | 자동 |
| TC-479u | 연결되지 않은 상대의 통계는 무시하고, 한 상대의 통계 오류는 다른 상대의 판정을 막지 않으며, 하나라도 나쁘면 poor다 | FR-19 | 웹 | `apps/web/src/media/unit07Transport.test.ts` | 자동 |
| TC-479v | failed 재시작은 3회로 제한되지만 연결이 한 번 복구되면 횟수가 초기화되고, disconnected의 4초 재시작은 상한과 무관하다 | NFR-03 | 웹 | `apps/web/src/media/unit07Transport.test.ts` | 자동 |
| TC-479w | 연결을 제거하면 대기 중이던 재시작 타이머도 사라지고 제거된 연결을 다시 건드리지 않는다 | NFR-03 | 웹 | `apps/web/src/media/unit07Transport.test.ts` | 자동 |
| TC-479x | 협상이 끝나 안정(stable) 상태가 될 때마다 카메라·화면 송신 파라미터를 다시 적용하고, 안정이 아닐 때는 적용하지 않는다 | NFR-13 | 웹 | `apps/web/src/media/unit07Transport.test.ts` | 자동 |
| TC-479y | 카메라 트랙을 바꾸면 현재 인원 기준 송신 상한을 다시 적용한다 | NFR-13 | 웹 | `apps/web/src/media/unit07Transport.test.ts` | 자동 |
| TC-479z | ICE 서버 변환은 값이 없는 username·credential 키를 만들지 않는다(빈 문자열 포함, 엄격 비교) | SEC-09 | 웹 | `apps/web/src/media/unit07Transport.test.ts` | 자동 |
| TC-480 | 오류 계열은 role=alert, 중립 계열은 role=status이고 h1 제목·본문·버튼 영역이 있다 | UX-02, UX-03, UX-10 | 웹 | `apps/web/src/components/stateScreen.test.ts` | 자동 |
| TC-480b | main fills the viewport and centers the card; the card is full-width capped (max-w-md) so 360px screens do not overflow; uses surface/line/shadow tokens | UX-02, NFR-10 | 웹 | `apps/web/src/components/stateScreenGap.test.ts` | 자동 |
| TC-480c | the action area wraps (flex-wrap) and centers so two buttons fit a 360px card, and renders only when children are truthy (null/undefined/false/0/empty string render nothing) | UX-03 | 웹 | `apps/web/src/components/stateScreenGap.test.ts` | 자동 |
| TC-480d | icon wrapper is aria-hidden and muted, absent when no icon; the body paragraph is the muted token; exactly one h1 | UX-10 | 웹 | `apps/web/src/components/stateScreenGap.test.ts` | 자동 |
| TC-480e | title and body are rendered as escaped text, never as HTML; explicit alert=false is a status region | UX-02, SEC-07 | 웹 | `apps/web/src/components/stateScreenGap.test.ts` | 자동 |
| TC-481 | 상태 화면 문구가 7종 이상 정의돼 있고 모두 제목·본문이 비어 있지 않다 | UX-02 | 웹 | `apps/web/src/components/stateScreen.test.ts` | 자동 |
| TC-481b | RoomPage renders 10 StateScreen variants whose title/body come only from S.state (no literals), covering loading/unsupported/error/gone(2)/waitHost/full/locked/kicked/expired/left | UX-02 | 웹 | `apps/web/src/components/stateScreenGap.test.ts` | 자동 |
| TC-481c | error-class screens announce as alert (unsupported/error/gone/full/locked/kicked/expired); neutral screens (loading/waitHost/left) do not | UX-02, UX-10 | 웹 | `apps/web/src/components/stateScreenGap.test.ts` | 자동 |
| TC-481d | every screen except loading offers at least one next-action button (retry / home / new room) with a strings label | UX-03 | 웹 | `apps/web/src/components/stateScreenGap.test.ts` | 자동 |
| TC-481e | every S.state group is referenced by real UI code (a screen text that nothing renders would silently reduce the 7+ state screens) | UX-02 | 웹 | `apps/web/src/components/stateScreenGap.test.ts` | 자동 |
| TC-481f | every state-screen body/title string in S.state has no raw placeholder, double space or trailing whitespace, and bodies end with a sentence mark | UX-03 | 웹 | `apps/web/src/components/stateScreenGap.test.ts` | 자동 |
| TC-482 | 오류·거부 문구는 원인과 해결 방법(다음 행동)을 함께 담는다 — 행동 어휘가 없는 본문은 실패 | UX-03 | 웹 | `apps/web/src/components/stateScreen.test.ts` | 자동 |
| TC-482b | every S string that reports a failure/blocked state (any group, not just a hand list) also contains an action word; the scan finds at least 20 such strings | UX-03 | 웹 | `apps/web/src/components/stateScreenGap.test.ts` | 자동 |
| TC-483 | errorText는 모든 서버 오류 코드에 사용자 문구를 주고 코드·내부 정보를 노출하지 않는다 | UX-03, SEC-06 | 웹 | `apps/web/src/components/stateScreen.test.ts` | 자동 |
| TC-483b | errorText maps each server code exactly: RATE_LIMITED->lobby.rateLimited, FORBIDDEN->room.forbidden, INVALID_PAYLOAD->lobby.invalidNickname, everything else (incl. prototype keys) -> room.actionFailed | UX-03 | 웹 | `apps/web/src/components/stateScreenGap.test.ts` | 자동 |
| TC-484 | index.css에 prefers-reduced-motion 규칙이 있고 animation·transition 시간을 사실상 0으로 만든다 | UX-11 | 웹 | `apps/web/src/components/stateScreen.test.ts` | 자동 |
| TC-484b | compiled .btn/.btn-*/.input/.min-h-touch/.min-w-touch resolve to 44px (tailwind config + index.css, not just source strings) | NFR-10 | 웹 | `apps/web/src/design/designAudit.test.ts` | 자동 |
| TC-484c | compiled button colors come from tokens: primary=accent, danger=danger, secondary=raised, hover variants=hover tokens | UX-08 | 웹 | `apps/web/src/design/designAudit.test.ts` | 자동 |
| TC-484d | compiled :focus-visible is a solid >=2px outline in the focus token color, and nothing in the CSS removes outlines | UX-10, NFR-09 | 웹 | `apps/web/src/design/designAudit.test.ts` | 자동 |
| TC-484e | the compiled prefers-reduced-motion block is a real @media at-rule that zeroes animation, transition and smooth scroll for every element | UX-11 | 웹 | `apps/web/src/design/designAudit.test.ts` | 자동 |
| TC-484f | every color in compiled CSS is a token value (no stray literal colors) and body uses the bg/text tokens | UX-08 | 웹 | `apps/web/src/design/designAudit.test.ts` | 자동 |
| TC-484g | every bg-/text-/border-/ring-/outline-/from-/to-/shadow-/rounded-/min-h-/min-w- class used in a tsx string has a compiled rule using the tailwind config own content globs (typo like bg-surfce, or a purged tsx glob, would silently render nothing) | UX-08 | 웹 | `apps/web/src/design/designAudit.test.ts` | 자동 |
| TC-484h | no tsx removes the focus outline (outline-none/outline-0) except a tabIndex={-1} programmatic focus container, and no positive tabIndex exists | UX-10 | 웹 | `apps/web/src/design/designAudit.test.ts` | 자동 |
| TC-485 | 터치 최소 크기 토큰은 44px이고 .btn·.input이 이를 쓰며, 포커스 링은 outline 2px 이상이다 | NFR-10, UX-10 | 웹 | `apps/web/src/components/stateScreen.test.ts` | 자동 |
| TC-485b | every <button>/<select>/<input>/<textarea> uses .btn*/.input or min-h-touch (44px height); the scan finds the known controls | NFR-10 | 웹 | `apps/web/src/design/designAudit.test.ts` | 자동 |
| TC-485c | no control shrinks its height under 44px with h-N/max-h-N/min-h-[Npx<44] utilities | NFR-10 | 웹 | `apps/web/src/design/designAudit.test.ts` | 자동 |
| TC-485d | the only sub-44px-wide controls are the two device-menu chevrons documented as the desktop-only chip exception (accessibility-spec 2.5.8): hidden below sm, min-h-touch, 28px wide | NFR-10 | 웹 | `apps/web/src/design/designAudit.test.ts` | 자동 |
| TC-485e | a checkbox is allowed to be small only when it sits inside a <label> row that has min-h-touch (the row is the touch target) | NFR-10 | 웹 | `apps/web/src/design/designAudit.test.ts` | 자동 |
| TC-485f | every aria-label icon button other than the documented chevrons is at least 44px wide (min-w-touch or .btn*) | NFR-10 | 웹 | `apps/web/src/design/designAudit.test.ts` | 자동 |
| TC-486 | index.html의 theme-color는 design 토큰 bg와 같고 lang=ko, viewport-fit=cover가 있다(G-7) | UX-08 | 웹 | `apps/web/src/components/stateScreen.test.ts` | 자동 |
| TC-486b | viewport allows pinch zoom (no user-scalable=no / maximum-scale<5) and declares width=device-width | UX-10, NFR-10 | 웹 | `apps/web/src/design/designAudit.test.ts` | 자동 |
| TC-486c | index.html has no inline script/style, one #root, a module entry script, a no-referrer policy, and a non-empty title (strict CSP-compatible) | SEC-07 | 웹 | `apps/web/src/design/designAudit.test.ts` | 자동 |
| TC-486d | the html title and the app name string agree | UX-01 | 웹 | `apps/web/src/design/designAudit.test.ts` | 자동 |
| TC-486e | public/ has no stray color definitions to bypass the token file (manifest theme_color, if any, equals the bg token) | UX-08 | 웹 | `apps/web/src/design/designAudit.test.ts` | 자동 |
| TC-486f | vite dev config proxies /api, /healthz and /socket.io(ws) to the server default port, with no source maps and es2022 target | SEC-07 | 웹 | `apps/web/src/design/designAudit.test.ts` | 자동 |
| TC-487 | 앱 소스(테스트 제외)에 dangerouslySetInnerHTML·innerHTML·eval·document.write가 없다 | SEC-07 | 웹 | `apps/web/src/components/stateScreen.test.ts` | 자동 |
| TC-488 | target="_blank"인 모든 링크는 같은 태그에 rel="noopener noreferrer"를 가진다 | SEC-07 | 웹 | `apps/web/src/components/stateScreen.test.ts` | 자동 |
| TC-489 | 모든 아이콘 전용 버튼 소스는 aria-label을 갖는다(텍스트 없는 button 태그 정적 점검) | UX-10 | 웹 | `apps/web/src/components/stateScreen.test.ts` | 자동 |
| TC-489b | 접근성 속성·placeholder·title의 글자는 리터럴이 아니라 strings 키에서만 온다(영문 리터럴 포함, 정적 점검) | UX-01, UX-10 | 웹 | `apps/web/src/components/stateScreen.test.ts` | 자동 |
| TC-489c | icons.tsx is the single lucide-react entry point (no other source imports lucide-react) and exports 25 renderable SVG icons | UX-10 | 웹 | `apps/web/src/components/stateScreenGap.test.ts` | 자동 |
| TC-489d | every icon element used in UI code is decorative (aria-hidden="true"), labelled through a strings aria-label, or passed through StateScreen icon (whose wrapper hides it) | UX-10 | 웹 | `apps/web/src/components/stateScreenGap.test.ts` | 자동 |
| TC-490 | ci.yml에 YAML 구문 사고(탭·따옴표 없는 스칼라의 ": "·따옴표 불균형)가 없고 점검기는 과거 사고 줄을 실제로 잡는다 | SEC-11, NFR-11 | 서버 | `apps/server/test/infraGuard.test.ts` | 자동 |
| TC-491 | ci.yml: 검증 단계(lint·typecheck·test·check:docs·audit)가 npm ci 뒤에 있고 e2e·coturn job은 verify에 의존하며 coturn은 REQUIRE_COTURN으로 건너뜀을 막는다 | SEC-11, NFR-08 | 서버 | `apps/server/test/infraGuard.test.ts` | 자동 |
| TC-492 | Dockerfile: 멀티 스테이지·고정 베이스·비루트·HEALTHCHECK·운영 의존성만·비밀값 미포함이고 점검기는 변이를 실제로 잡는다 | NFR-07, NFR-08, SEC-10 | 서버 | `apps/server/test/infraGuard.test.ts` | 자동 |
| TC-493 | .dockerignore가 .env·.git·node_modules를 제외하고, compose는 시크릿을 보간으로만 받으며 이미지 태그가 고정되고 점검기는 변이를 잡는다 | SEC-10, SEC-09, NFR-07 | 서버 | `apps/server/test/infraGuard.test.ts` | 자동 |
| TC-494 | eslint가 any·dangerouslySetInnerHTML·미사용 변수를 오류로 잡고 모든 워크스페이스 tsconfig가 strict 기반을 상속한다 | NFR-11, SEC-07 | 서버 | `apps/server/test/infraGuard.test.ts` | 자동 |
| TC-495 | E2E 시험에 .only/.fixme가 없고 skip은 허용 목록·사유가 있으며 모든 시험은 ID 형식 제목과 단언을 가진다(검사기는 변이를 잡는다) | NFR-11, NFR-08 | 서버 | `apps/server/test/e2eGuard.test.ts` | 자동 |
| TC-496 | E2E 독립성: Playwright는 workers=1·retries=0, 서버는 시험마다 빈 포트, 하드코딩 포트는 TURN 시험 한 곳뿐이며 세션 컨텍스트는 afterEach로 정리하고 IT-14는 50ms 폴링(DEC-015)을 유지한다 | NFR-11, NFR-08 | 서버 | `apps/server/test/e2eGuard.test.ts` | 자동 |
| TC-497 | check-docs는 중복 TC·양식 위반·미정의 ID·인수 조건 누락·인덱스 누락·EVT 매핑 삭제·매트릭스 변조·요구 미연결을 실제로 실패시킨다(대조군 포함) | NFR-11, SEC-11 | 서버 | `apps/server/test/e2eGuard.test.ts` | 자동 |
| TC-498 | 인수 계획의 IT-01~IT-30이 E2E 시험에 빠짐없이 있다 | NFR-11 | 서버 | `apps/server/test/e2eGuard.test.ts` | 자동 |
| TC-500 | 입장 요청은 비밀번호·호스트 클레임이 없으면 키 자체를 보내지 않고, 있을 때만 정확히 그 키를 보낸다 | FR-01, FR-03 | 웹 | `apps/web/src/state/meetingSession.gap.test.ts` | 자동 |
| TC-501 | 세션 토큰은 room:resume 외의 어떤 요청에도 실리지 않는다(입장·미디어·채팅·호스트·공유·신호 전체) | SEC-03, SEC-06 | 웹 | `apps/web/src/state/meetingSession.gap.test.ts` | 자동 |
| TC-502 | 복귀 시 연결된 소켓은 3초 프로브(media:state, 현재 마이크·카메라 상태)로 확인하고, 응답이 오면 아무것도 건드리지 않는다 | UX-14 | 웹 | `apps/web/src/state/meetingSession.gap.test.ts` | 자동 |
| TC-502b | 프로브가 시간 초과(NETWORK)면 소켓을 끊고 다시 연결해 끊김 경로에 합류하고(원인 foreground), 재연결되면 토큰으로 resume하며 원인은 network로 돌아간다 | UX-14, FR-20 | 웹 | `apps/web/src/state/meetingSession.gap.test.ts` | 자동 |
| TC-502c | 프로브 오류 코드 매핑: NOT_JOINED는 즉시 resume(끊김 상태로 전환·원인 foreground), PARTICIPANT_GONE은 소켓 재연결, 그 밖의 서버 오류는 연결이 살아 있는 것으로 보고 무동작이다 | UX-14 | 웹 | `apps/web/src/state/meetingSession.gap.test.ts` | 자동 |
| TC-502d | 프로브가 정상이어도 실패·끊김 피어가 있으면 ICE를 다시 시작하고, 모두 정상이면 하지 않는다 | UX-14 | 웹 | `apps/web/src/state/meetingSession.gap.test.ts` | 자동 |
| TC-502e | 이미 확인 중이면 중복 복귀 신호는 무시하고(프로브 1회), 확인 중 회의가 끝나면 늦은 결과로 소켓을 건드리지 않으며, 끝난 회의·미입장은 아무것도 보내지 않는다 | UX-14 | 웹 | `apps/web/src/state/meetingSession.gap.test.ts` | 자동 |
| TC-502f | 끊김(reconnecting) 중 복귀: 소켓이 끊겨 있으면 즉시 다시 연결하고(원인 foreground), 연결돼 있으면 바로 resume한다 | UX-14 | 웹 | `apps/web/src/state/meetingSession.gap.test.ts` | 자동 |
| TC-502g | 확인 중 회의가 끝나면 늦은 프로브 결과로 미디어 정합(reconcile)도 실행하지 않는다 | UX-14 | 웹 | `apps/web/src/state/meetingSession.gap.test.ts` | 자동 |
| TC-503 | 복귀 시 미디어 정합: 켜져 있던 마이크를 잃으면 끄고 서버에 알리며 안내하고, 이미 꺼진 마이크 손실은 안내하지 않으며, 카메라 트랙이 사라졌으면 잃은 것으로 본다 | UX-14, FR-04 | 웹 | `apps/web/src/state/meetingSession.gap.test.ts` | 자동 |
| TC-504 | 내보내는 신호는 v:1과 수신자를 붙여 signal:send로 보내고, 받은 신호는 보낸 이(서버 부여 from)와 있는 필드만 전송 계층에 전달한다 | FR-07, SEC-06 | 웹 | `apps/web/src/state/meetingSession.gap.test.ts` | 자동 |
| TC-504b | 연결 경로 계측은 피어 식별자 없이 경로 종류만 3초 제한으로 보낸다 | NFR-15, SEC-06 | 웹 | `apps/web/src/state/meetingSession.gap.test.ts` | 자동 |
| TC-504c | 피어 연결 상태는 알려진 피어이고 값이 바뀔 때만 상태를 갱신한다(모르는 피어 무시, 같은 값 재렌더 없음) | FR-19 | 웹 | `apps/web/src/state/meetingSession.gap.test.ts` | 자동 |
| TC-505 | 연결 중인 정상 상태에서 connect 이벤트가 와도 resume을 보내지 않고, resume 응답을 기다리는 사이 회의가 끝나면 늦은 성공이 상태를 되살리지 않는다 | FR-20 | 웹 | `apps/web/src/state/meetingSession.gap.test.ts` | 자동 |
| TC-505b | 나가기 응답을 기다리는 동안 소켓이 끊겨도 재연결을 시작하지 않는다 | FR-22 | 웹 | `apps/web/src/state/meetingSession.gap.test.ts` | 자동 |
| TC-506 | end 이후에는 품질 측정 타이머가 멈추고, dispose는 진행 중 회의를 left로 끝내며 구독을 모두 끊고 두 번 불러도 안전하다 | FR-22, NFR-03 | 웹 | `apps/web/src/state/meetingSession.gap.test.ts` | 자동 |
| TC-507 | 카메라 켜기는 장치 열기가 성공해도 트랙이 없으면 켜짐으로 표시하지 않고, 성공하면 전송 계층에 새 트랙을 넘기고 서버에 알린다 | FR-04 | 웹 | `apps/web/src/state/meetingSession.gap.test.ts` | 자동 |
| TC-507b | 장치 전환은 종류에 맞는 전송 트랙만 교체하고, 실패하면 안내만 하고 트랙을 바꾸지 않는다 | FR-04, UX-03 | 웹 | `apps/web/src/state/meetingSession.gap.test.ts` | 자동 |
| TC-508 | 처음 경로는 현재 주소이고 popstate(뒤로·앞으로 가기)를 구독하며, 해제하면 구독을 지운다 | FR-03 | 웹 | `apps/web/src/lib/useRoute.hook.test.ts` | 자동 |
| TC-508b | navigate는 기본이 pushState(뒤로 가기 가능), replace=true면 replaceState이며, 둘 다 경로 상태를 새 주소로 바꾼다 | FR-03 | 웹 | `apps/web/src/lib/useRoute.hook.test.ts` | 자동 |
| TC-508c | 방 경로 파서는 앞쪽 접두(/x/r/<id>)·뒤쪽 접미·쿼리 문자를 거부한다 | FR-03, SEC-07 | 웹 | `apps/web/src/lib/useRoute.hook.test.ts` | 자동 |
| TC-509 | "/"와 알 수 없는 경로, 길이가 다른 방 경로(/r/짧은ID)는 랜딩을 보인다 | FR-01 | 웹 | `apps/web/src/appRoutes.test.ts` | 자동 |
| TC-509b | 올바른 방 경로는 방 페이지로 가고, 이 브라우저가 미디어를 지원하지 않으면 입장 폼 대신 "지원 안 됨" 상태 화면과 링크 복사를 보인다 | FR-03, FR-06 | 웹 | `apps/web/src/appRoutes.test.ts` | 자동 |
| TC-509c | 미디어를 지원하는 브라우저의 방 페이지는 먼저 "확인 중" 로딩 화면(방 상태 확인 전에는 입력 폼 없음)을 보인다 | FR-06, UX-02 | 웹 | `apps/web/src/appRoutes.test.ts` | 자동 |
| TC-509d | 법률 문서 경로 3종은 법률 페이지로 가고 랜딩이 아니다 | POL-01 | 웹 | `apps/web/src/appRoutes.test.ts` | 자동 |
| TC-509e | 방 ID가 바뀌면 방 페이지를 새로 시작하도록 key에 방 ID를 쓴다(이전 방의 연결·입력 상태 재사용 금지) | FR-03 | 웹 | `apps/web/src/appRoutes.test.ts` | 자동 |
| TC-510 | main은 #root가 있으면 App을 렌더하고, 없으면 아무것도 하지 않는다 | NFR-01 | 웹 | `apps/web/src/appRoutes.test.ts` | 자동 |
| TC-511 | 모든 REST 요청은 content-type JSON을 보내고, 방 상태 조회는 본문 없는 GET이다 | FR-01, SEC-02 | 웹 | `apps/web/src/lib/apiStorage.gap.test.ts` | 자동 |
| TC-511b | 메타 조회 성공은 /api/meta의 검증된 값을 돌려주고, 오류 응답 코드는 그대로 전달한다 | FR-06 | 웹 | `apps/web/src/lib/apiStorage.gap.test.ts` | 자동 |
| TC-512 | 저장된 닉네임이 없으면 빈 문자열이다(기본값을 지어내지 않는다) | FR-03 | 웹 | `apps/web/src/lib/apiStorage.gap.test.ts` | 자동 |
| TC-513 | ack가 오면 대기 타이머를 정리한다(8초 뒤 늦은 타임아웃 타이머가 남지 않는다) | NFR-03 | 웹 | `apps/web/src/lib/apiStorage.gap.test.ts` | 자동 |
| TC-514 | 미디어 미지원이면 방 상태를 묻지 않고 "지원 안 됨"(링크 복사 포함), 지원하면 "확인 중"에서 시작한다 | FR-06, UX-02 | 웹 | `apps/web/src/pages/roomPage.hook.test.ts` | 자동 |
| TC-514b | 방 상태별 화면: 조회 실패=오류, 없는 방=방 없음, 호스트 미입장=대기, 잠김=잠김, 정원=가득 참, 정상=대기실(미디어 새로 준비) | FR-06, FR-23, UX-02 | 웹 | `apps/web/src/pages/roomPage.hook.test.ts` | 자동 |
| TC-514c | 호스트 클레임이 있는 방 생성자는 호스트가 아직 없어도, 방이 잠겨 있어도 대기실로 들어가며 호스트로 표시된다. 단 정원이 차면 막힌다 | FR-06, FR-02 | 웹 | `apps/web/src/pages/roomPage.hook.test.ts` | 자동 |
| TC-514d | 호스트 클레임은 마운트 때 한 번만 읽는다(여러 번 렌더해도 저장소를 다시 읽지 않는다) | FR-03 | 웹 | `apps/web/src/pages/roomPage.hook.test.ts` | 자동 |
| TC-514e | 상태 확인을 다시 하면(재시도) 이전 대기실의 카메라·마이크를 먼저 해제하고 새 미디어를 만든다 | NFR-02, FR-06 | 웹 | `apps/web/src/pages/roomPage.hook.test.ts` | 자동 |
| TC-515 | 호스트 대기 중 2.5초마다 확인해 호스트가 들어오면 방 상태 확인을 다시 시작하고, 방이 사라지면 방 없음으로, 조회 실패는 조용히 재시도하며, 떠나면 타이머를 멈춘다 | FR-23 | 웹 | `apps/web/src/pages/roomPage.hook.test.ts` | 자동 |
| TC-515b | 대기 중 방이 사라지면 방 없음 화면으로 바뀌고, 대기 상태가 아니면 폴링 효과가 타이머를 만들지 않는다 | FR-23 | 웹 | `apps/web/src/pages/roomPage.hook.test.ts` | 자동 |
| TC-516 | 입장 성공: 닉네임을 저장하고 호스트 클레임을 지우며(재사용 방지) 회의실로 넘어간다. 비밀번호·호스트 클레임은 있을 때만 전달한다 | FR-03, SEC-03 | 웹 | `apps/web/src/pages/roomPage.hook.test.ts` | 자동 |
| TC-516b | 입장 거부 코드별 처리: 화면 전환(가득 참·잠김·강퇴·방 없음·호스트 대기)과 입력 화면에 남는 안내(비밀번호·시도 초과·닉네임·속도 제한·기타)가 맞고, 실패한 컨트롤러는 정리되며 닉네임은 저장하지 않는다 | FR-06, FR-16, UX-03 | 웹 | `apps/web/src/pages/roomPage.hook.test.ts` | 자동 |
| TC-516c | 대기실 미디어가 없는 상태의 입장 시도는 연결하지 않고 일반 오류 안내를 돌려준다 | FR-06 | 웹 | `apps/web/src/pages/roomPage.hook.test.ts` | 자동 |
| TC-517 | 회의 종료 사유별 화면: 강퇴·세션 만료·방 닫힘·서버 재시작·운영자 폐쇄·나가기가 서로 다른 안내로 이어지고, 미디어·컨트롤러 참조를 비운다 | FR-16, FR-21, FR-22, POL-19 | 웹 | `apps/web/src/pages/roomPage.hook.test.ts` | 자동 |
| TC-517b | 페이지를 떠나면(언마운트) 진행 중 회의를 정리하고 카메라·마이크를 해제한다 | FR-22, NFR-02 | 웹 | `apps/web/src/pages/roomPage.hook.test.ts` | 자동 |
| TC-517c | 상태 확인 응답이 늦게 도착해도 이미 떠난 페이지(alive=false)는 화면을 바꾸지 않는다 | FR-06 | 웹 | `apps/web/src/pages/roomPage.hook.test.ts` | 자동 |
| TC-517d | 회의가 끝난 뒤 떠날 때는 이미 놓은 컨트롤러·미디어를 다시 건드리지 않는다(참조를 비운다) | FR-22 | 웹 | `apps/web/src/pages/roomPage.hook.test.ts` | 자동 |
| TC-518 | resume 응답이 일시 오류(NETWORK)로 끝나도 소켓이 연결돼 있으면 일정 시간 안에 resume을 다시 시도해야 한다(DEF-06-01) | FR-20, FR-21 | 웹 | `apps/web/src/state/meetingSession.gap.test.ts` | 자동 |
| TC-518b | (현재 동작 기록) 일시 오류 뒤 새 connect 이벤트가 오면 다시 resume한다 | FR-20 | 웹 | `apps/web/src/state/meetingSession.gap.test.ts` | 자동 |
| TC-519 | 복귀로 먼저 복구돼 live가 되면 남은 재연결 타이머는 소켓을 다시 연결하지 않고 스스로 멈춘다 | FR-20 | 웹 | `apps/web/src/state/meetingSession.gap.test.ts` | 자동 |
| TC-520 | 공유 중인 사람이 나 자신뿐이면 "다른 사람이 공유 중" 안내 없이 화면 선택을 진행한다 | FR-12, POL-12 | 웹 | `apps/web/src/state/meetingSession.gap.test.ts` | 자동 |
| TC-521 | 공유 중 회의가 끝나면 화면 공유 트랙을 멈춘다(브라우저의 "공유 중" 표시가 남지 않게) | FR-12, FR-22 | 웹 | `apps/web/src/state/meetingSession.gap.test.ts` | 자동 |
| TC-522 | 이미 다 읽은 상태에서 읽음 처리는 구독자에게 알리지 않고(불필요한 재렌더 방지), 안 읽은 글이 있을 때만 0으로 만들어 알린다 | FR-11 | 웹 | `apps/web/src/state/meetingSession.gap.test.ts` | 자동 |
| TC-523 | 화면이 다시 보이면(visible) 컨트롤러에 알리고, 숨겨질 때(hidden)는 알리지 않으며, pageshow도 알린다 | UX-14 | 웹 | `apps/web/src/state/useForeground.hook.test.ts` | 자동 |
| TC-523b | visibilitychange와 pageshow가 500ms 안에 겹쳐도 한 번만 전달하고, 500ms가 지나면 다시 전달한다 | UX-14 | 웹 | `apps/web/src/state/useForeground.hook.test.ts` | 자동 |
| TC-523c | 언마운트하면 두 구독을 모두 해제해 이후 신호가 컨트롤러에 가지 않는다 | UX-14 | 웹 | `apps/web/src/state/useForeground.hook.test.ts` | 자동 |
| TC-524 | 오류 화면의 "다시 시도"는 즉시 "확인 중" 화면으로 돌아가고 방 상태를 다시 물어 성공하면 대기실로 넘어간다 | FR-06, UX-02 | 웹 | `apps/web/src/pages/roomPageRetry.test.ts` | 자동 |
| TC-524b | 호스트 대기 중 호스트가 들어오면(폴링) 같은 방 상태 확인이 다시 실행되어 대기실로 넘어간다 | FR-23 | 웹 | `apps/web/src/pages/roomPageRetry.test.ts` | 자동 |
| UAT-01 | 가입·설치 없이 링크 클릭 후 3번 이내 조작(닉네임 입력, 권한 허용, [입장])으로 입장해 서로 영상이 보인다 | NFR-01, FR-03, FR-04 | 사용자 수행 | `05-qa/uat.md` | 미수행 |
| UAT-02 | 스마트폰(iPhone Safari, Android Chrome)에서 링크로 입장해 영상·소리·채팅이 동작한다 | NFR-05, NFR-10, FR-07 | 사용자 수행 | `05-qa/uat.md` | 미수행 |
| UAT-03 | 카메라/마이크 권한을 일부러 차단했을 때 안내 문구만 보고 스스로 해결할 수 있다 | UX-03, FR-04 | 사용자 수행 | `05-qa/uat.md` | 미수행 |
| UAT-04 | 메신저(카카오톡 등) 인앱 브라우저에서 링크를 열었을 때 동작 또는 안내가 적절하다 | NFR-05 | 사용자 수행 | `05-qa/uat.md` | 미수행 |
| UAT-05 | 실제 네트워크(Wi-Fi/LTE 전환, 엘리베이터 등)에서 끊겼다 복구될 때 자리가 유지되고 안내가 이해된다 | FR-20, FR-19, NFR-03 | 사용자 수행 | `05-qa/uat.md` | 미수행 |
| UAT-06 | 6명이 실제 기기·네트워크로 20분 통화했을 때 품질(끊김, 소리, 발열)이 받아들일 만하다 | FR-07, NFR-13, NFR-04 | 사용자 수행 | `05-qa/uat.md` | 미수행 |
| UAT-07 | 스크린리더(VoiceOver/TalkBack)로 입장부터 나가기까지 조작할 수 있다 | NFR-09, UX-10 | 사용자 수행 | `05-qa/uat.md` | 미수행 |
| MC-01 | 코드 품질 게이트: lint, 타입 검사(strict)가 CI와 같은 명령으로 통과한다 | NFR-11, NFR-08 | 수동/명령 | `05-qa/manual-checks.md` | 수행 기록 참조 |
| MC-02 | 의존성 취약점 점검과 lockfile 사용(`npm ci`) | SEC-11 | 수동/명령 | `05-qa/manual-checks.md` | 수행 기록 참조 |
| MC-03 | 운영 빌드 번들이 운영 의존성만 설치한 환경에서 기동하고 HEAD/GET, 정상 종료, 환경변수 누락 시 기동 실패를 만족한다 | NFR-07, NFR-08 | 수동/명령 | `05-qa/manual-checks.md` | 수행 기록 참조 |
| MC-04 | 부하 스모크: 100방×6명(600소켓) 신호 3.9만 건 | NFR-04, NFR-07 | 수동/명령 | `05-qa/manual-checks.md` | 수행 기록 참조 |
| MC-05 | 시크릿 스캔: 저장소에 비밀값·토큰이 커밋되지 않았다 | SEC-10 | 수동/명령 | `05-qa/manual-checks.md` | 수행 기록 참조 |
<!-- END GENERATED -->
