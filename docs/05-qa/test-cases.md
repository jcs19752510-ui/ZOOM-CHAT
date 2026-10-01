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
| TC-213 | 화면에 보이는 한글 문구는 strings.ts에만 있다(컴포넌트·페이지에 직접 쓰지 않는다) | UX-01 | 웹 | `apps/web/src/design/design.test.ts` | 자동 |
| TC-214 | 본문·보조 글자는 모든 배경에서 4.5:1 이상이다 | NFR-09, UX-08 | 웹 | `apps/web/src/design/design.test.ts` | 자동 |
| TC-215 | 버튼(기본·호버) 위 흰 글자는 4.5:1 이상이다 | NFR-09, UX-08 | 웹 | `apps/web/src/design/design.test.ts` | 자동 |
| TC-216 | 경고 배지(어두운 글자/경고색)와 아이콘·링크 색은 어두운 면 위에서 4.5:1 이상이다 | NFR-09, UX-08 | 웹 | `apps/web/src/design/design.test.ts` | 자동 |
| TC-217 | 비텍스트 요소(포커스 링, 말하는 사람 강조, 성공 아이콘)는 3:1 이상이다 | NFR-09 | 웹 | `apps/web/src/design/design.test.ts` | 자동 |
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
