> **이 문서의 용도** — 누가: 디자이너, 기획자, 개발자 / 언제: 문구를 쓰거나 고칠 때 / 무엇을: UX 라이팅 규칙과 전체 문구 목록(키 포함)을 결정한다.

# 콘텐츠 가이드

| 항목 | 내용 |
|---|---|
| 버전 | 0.1 |
| 작성일 | 2026-10-01 |
| 상태 | 승인 (표는 strings.ts에서 자동 생성) |
| 주도 | ③ 디자이너 |

## 변경 이력
| 버전 | 날짜 | 내용 |
|---|---|---|
| 0.1 | 2026-10-01 | 최초 작성. 문구 표는 `npx tsx scripts/gen-content-guide.ts`로 생성 |

## 작성 규칙
1. 한국어 존댓말, 짧고 직접적으로. 사과나 꾸밈 문구 없이 사실과 다음 행동을 쓴다.
2. 오류 문구는 **원인 + 해결 방법**(UX-03). 예) "카메라 권한이 차단되었습니다. 주소창의 자물쇠 아이콘에서 허용한 뒤 새로고침해 주세요."
3. 서버 오류 코드는 사용자에게 보이지 않는다. 코드→문구 변환은 `strings.ts`의 `errorText`와 각 화면이 한다.
4. 모든 문구는 `apps/web/src/strings.ts`에만 둔다(UX-01, TC-213이 컴포넌트의 한글 직접 사용을 막는다).
5. 용어는 `glossary.md`와 맞춘다(방, 호스트, 참가자, 대기실).

## 전체 문구 (키 → 문구)
| 키 | 문구 |
|---|---|
| `app.name` | MeetLite |
| `app.tagline` | 설치 없이, 링크 하나로 바로 만나는 화상회의 |
| `landing.title` | 링크 하나로 바로 시작하세요 |
| `landing.subtitle` | 설치도 가입도 필요 없습니다. 방을 만들고 링크를 공유하면 끝입니다. |
| `landing.nicknameLabel` | 닉네임 |
| `landing.nicknamePlaceholder` | 회의에서 보일 이름 |
| `landing.nicknameHint` | 1~20자, 한글·영문·숫자·공백·_ - . 만 쓸 수 있습니다. |
| `landing.createButton` | 새 회의 만들기 |
| `landing.creating` | 만드는 중… |
| `landing.passwordToggle` | 비밀번호 설정 (선택) |
| `landing.passwordLabel` | 방 비밀번호 |
| `landing.passwordHint` | 4~32자. 참가자에게 따로 알려 주세요. 링크에는 들어가지 않습니다. |
| `landing.joinTitle` | 초대 링크가 있나요? |
| `landing.joinPlaceholder` | 링크 또는 방 코드 붙여넣기 |
| `landing.joinButton` | 입장 |
| `landing.joinInvalid` | 올바른 회의 링크가 아닙니다. 받은 링크를 그대로 붙여넣어 주세요. |
| `landing.support` | Chrome, Edge, Firefox, Safari 최신 버전을 지원합니다. 화면공유는 PC 브라우저에서만 쓸 수 있습니다. |
| `lobby.title` | 입장 전 확인 |
| `lobby.previewLabel` | 내 카메라 미리보기 |
| `lobby.cameraOff` | 카메라가 꺼져 있습니다 |
| `lobby.mic` | 마이크 |
| `lobby.camera` | 카메라 |
| `lobby.speaker` | 스피커 |
| `lobby.micLevel` | 마이크 입력 레벨 |
| `lobby.noDevice` | 장치 없음 |
| `lobby.privacy` | 영상 통화를 연결하는 과정에서 다른 참가자에게 내 네트워크 정보(IP 주소 등)가 보일 수 있습니다. |
| `lobby.join` | 회의 입장 |
| `lobby.joining` | 입장하는 중… |
| `lobby.joinWithoutDevices` | 장치 없이 입장 |
| `lobby.copyLink` | 초대 링크 복사 |
| `lobby.copied` | 링크를 복사했습니다 |
| `lobby.copyFailed` | 자동 복사에 실패했습니다. 아래 링크를 직접 선택해 복사해 주세요. |
| `lobby.nicknameLabel` | 닉네임 |
| `lobby.passwordLabel` | 방 비밀번호 |
| `lobby.wrongPassword` | 비밀번호가 맞지 않습니다. 호스트에게 비밀번호를 다시 확인해 주세요. |
| `lobby.tooManyAttempts` | 비밀번호를 여러 번 틀려 잠시 입장할 수 없습니다. 10분 뒤에 다시 시도해 주세요. |
| `lobby.invalidNickname` | 닉네임은 1~20자이고 한글·영문·숫자·공백·_ - . 만 쓸 수 있습니다. |
| `lobby.rateLimited` | 요청이 너무 많습니다. 잠시 뒤에 다시 시도해 주세요. |
| `lobby.hostBadge` | 호스트로 입장합니다 |
| `lobby.permissionNote` | 카메라와 마이크 권한을 허용하면 미리보기가 나타납니다. |
| `lobby.cancel` | 처음으로 |
| `room.mute` | 마이크 끄기 |
| `room.unmute` | 마이크 켜기 |
| `room.cameraOn` | 카메라 켜기 |
| `room.cameraOffAction` | 카메라 끄기 |
| `room.controls` | 회의 컨트롤 |
| `room.stage` | 회의 화면 |
| `room.micLabel` | 마이크 |
| `room.cameraLabel` | 카메라 |
| `room.shareLabel` | 화면공유 |
| `room.shareStop` | 공유 중지 |
| `room.chat` | 채팅 |
| `room.participants` | 참가자 |
| `room.leave` | 나가기 |
| `room.copyLink` | 링크 복사 |
| `room.deviceMenuMic` | 마이크 장치 선택 |
| `room.deviceMenuCamera` | 카메라 장치 선택 |
| `room.you` | (나) |
| `room.host` | 호스트 |
| `room.sharingNow` | {이름}님이 화면을 공유 중입니다 (함수형 문구) |
| `room.youSharing` | 내 화면을 공유 중입니다 |
| `room.shareUnsupportedMobile` | 모바일 브라우저에서는 화면공유를 지원하지 않습니다. PC 브라우저를 이용해 주세요. |
| `room.shareBusy` | {이름}님이 이미 화면을 공유 중입니다. 공유가 끝난 뒤에 시작해 주세요. (함수형 문구) |
| `room.shareDenied` | 화면공유가 취소되었거나 권한이 없습니다. 다시 시도해 주세요. |
| `room.micMutedByHost` | 호스트가 모든 참가자의 마이크를 껐습니다. 말하려면 마이크를 다시 켜 주세요. |
| `room.locked` | 방이 잠겨 있습니다 |
| `room.alone` | 아직 아무도 없어요 |
| `room.aloneHint` | 링크를 복사해서 참가자를 초대해 보세요. |
| `room.peerProblem` | 연결 문제 |
| `room.cameraIsOff` | 카메라 꺼짐 |
| `room.live` | 연결됨 |
| `room.reconnecting` | 재연결 중 |
| `room.poor` | 불안정 |
| `room.poorBanner` | 네트워크가 불안정합니다. 카메라를 끄면 개선될 수 있습니다. |
| `room.reconnectingBanner` | 연결이 끊겨 다시 연결하는 중입니다. 자리는 잠시 유지됩니다. |
| `room.joined` | {이름}님이 입장했습니다 (함수형 문구) |
| `room.left` | {이름}님이 나갔습니다 (함수형 문구) |
| `room.timedOut` | {이름}님의 연결이 끊겨 퇴장 처리되었습니다 (함수형 문구) |
| `room.hostChanged` | {이름}님이 새 호스트가 되었습니다 (함수형 문구) |
| `room.youAreHost` | 이제 내가 호스트입니다 |
| `room.lockedToast` | 방을 잠갔습니다. 새 참가자는 입장할 수 없습니다 |
| `room.unlockedToast` | 방 잠금을 해제했습니다 |
| `room.reconnected` | 다시 연결되었습니다 |
| `room.deviceChangeFailed` | 장치를 바꾸지 못했습니다. 다른 앱이 장치를 사용 중인지 확인해 주세요. |
| `room.cameraFailed` | 카메라를 켜지 못했습니다. 브라우저 권한과 다른 앱의 사용 여부를 확인해 주세요. |
| `room.micFailed` | 마이크를 켜지 못했습니다. 브라우저 권한과 다른 앱의 사용 여부를 확인해 주세요. |
| `room.actionFailed` | 요청을 처리하지 못했습니다. 잠시 뒤에 다시 시도해 주세요. |
| `room.forbidden` | 호스트만 할 수 있는 기능입니다. |
| `chat.title` | 채팅 |
| `chat.placeholder` | 메시지 입력 (최대 500자) |
| `chat.send` | 보내기 |
| `chat.empty` | 첫 메시지를 보내 보세요 |
| `chat.emptyHint` | 대화는 서버에 저장되지 않고, 이 방이 끝나면 사라집니다. |
| `chat.tooLong` | 메시지는 500자까지 보낼 수 있습니다. |
| `chat.rateLimited` | 너무 빨리 보내고 있습니다. 잠시 뒤에 다시 보내 주세요. |
| `chat.failed` | 메시지를 보내지 못했습니다. 연결 상태를 확인해 주세요. |
| `chat.counter` | {이름}/500 (함수형 문구) |
| `chat.close` | 채팅 닫기 |
| `chat.newMessages` | 새 메시지 |
| `people.title` | 참가자 |
| `people.close` | 참가자 목록 닫기 |
| `people.lock` | 방 잠그기 |
| `people.unlock` | 방 잠금 해제 |
| `people.muteAll` | 전체 음소거 |
| `people.kick` | 내보내기 |
| `people.hostOnly` | 호스트 도구 |
| `people.micOn` | 마이크 켜짐 |
| `people.micOff` | 마이크 꺼짐 |
| `people.camOn` | 카메라 켜짐 |
| `people.camOff` | 카메라 꺼짐 |
| `people.sharing` | 화면 공유 중 |
| `people.reconnecting` | 재연결 중 |
| `people.count` | 참가자 {이름}명 (함수형 문구) |
| `confirm.cancel` | 취소 |
| `confirm.leaveTitle` | 회의에서 나갈까요? |
| `confirm.leaveBody` | 나가도 같은 링크로 다시 입장할 수 있습니다. 호스트가 나가면 가장 먼저 들어온 참가자가 호스트가 됩니다. |
| `confirm.leaveConfirm` | 나가기 |
| `confirm.kickTitle` | {이름}님을 내보낼까요? (함수형 문구) |
| `confirm.kickBody` | 내보낸 참가자는 이 방에 다시 들어올 수 없습니다. |
| `confirm.kickConfirm` | 내보내기 |
| `confirm.muteAllTitle` | 모든 참가자의 마이크를 끌까요? |
| `confirm.muteAllBody` | 호스트를 제외한 모두의 마이크가 꺼집니다. 각자 다시 켤 수 있습니다. |
| `confirm.muteAllConfirm` | 전체 음소거 |
| `devices.title` | 장치 설정 |
| `devices.close` | 닫기 |
| `devices.mic` | 마이크 |
| `devices.camera` | 카메라 |
| `devices.speaker` | 스피커 |
| `devices.none` | 선택 가능한 장치가 없습니다 |
| `devices.default` | 기본 장치 |
| `devices.speakerUnsupported` | 이 브라우저는 스피커 선택을 지원하지 않습니다. 기기 설정에서 바꿔 주세요. |
| `state.loading.title` | 준비하는 중입니다 |
| `state.loading.body` | 잠시만 기다려 주세요. |
| `state.loading.slow` | 연결이 오래 걸리고 있습니다. 네트워크를 확인하고 다시 시도해 주세요. |
| `state.error.title` | 문제가 발생했습니다 |
| `state.error.body` | 서버와 통신하지 못했습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요. |
| `state.error.retry` | 다시 시도 |
| `state.error.home` | 처음으로 |
| `state.permission.title` | 카메라·마이크를 사용할 수 없습니다 |
| `state.permission.denied` | 카메라 또는 마이크 권한이 차단되었습니다. 주소창의 자물쇠 아이콘에서 허용한 뒤 새로고침해 주세요. |
| `state.permission.notFound` | 연결된 카메라나 마이크를 찾지 못했습니다. 장치가 연결되어 있는지 확인해 주세요. 장치 없이도 입장할 수 있습니다. |
| `state.permission.inUse` | 다른 앱이 카메라나 마이크를 사용 중입니다. 해당 앱을 닫은 뒤 다시 확인해 주세요. |
| `state.permission.unknown` | 장치를 시작하지 못했습니다. 브라우저를 새로고침하거나 다른 브라우저로 시도해 주세요. |
| `state.permission.retry` | 다시 확인 |
| `state.full.title` | 방이 가득 찼습니다 |
| `state.full.body` | 이 방은 정원이 가득 찼습니다. 호스트에게 문의하거나 잠시 뒤에 다시 시도해 주세요. |
| `state.full.retry` | 다시 시도 |
| `state.locked.title` | 방이 잠겨 있습니다 |
| `state.locked.body` | 호스트가 새 참가자의 입장을 막았습니다. 호스트에게 잠금 해제를 요청해 주세요. |
| `state.locked.retry` | 다시 시도 |
| `state.kicked.title` | 회의에서 내보내졌습니다 |
| `state.kicked.body` | 호스트가 이 회의에서 내보냈습니다. 필요하다면 호스트에게 문의해 주세요. |
| `state.kicked.home` | 처음으로 |
| `state.gone.title` | 회의를 찾을 수 없습니다 |
| `state.gone.closed` | 이미 종료되었거나 만료된 회의입니다. 링크를 다시 확인하거나 새 회의를 만들어 주세요. |
| `state.gone.restarted` | 서비스가 재시작되어 회의가 종료되었습니다. 새 회의를 만들어 다시 시작해 주세요. |
| `state.gone.newRoom` | 새 회의 만들기 |
| `state.unsupported.title` | 이 브라우저에서는 사용할 수 없습니다 |
| `state.unsupported.body` | 화상회의에 필요한 기능(WebRTC, 카메라 접근)을 지원하지 않거나 보안 연결(HTTPS)이 아닙니다. 최신 Chrome, Edge, Firefox, Safari에서 열어 주세요. |
| `state.unsupported.copy` | 링크 복사해서 다른 브라우저에서 열기 |
| `state.left.title` | 회의에서 나왔습니다 |
| `state.left.body` | 필요하면 같은 링크로 다시 입장할 수 있습니다. |
| `state.left.rejoin` | 다시 입장 |
| `state.left.home` | 처음으로 |
| `state.expired.title` | 연결이 오래 끊겨 회의에서 나갔습니다 |
| `state.expired.body` | 네트워크가 복구되지 않아 자리가 정리되었습니다. 다시 입장해 주세요. |
| `state.expired.rejoin` | 다시 입장 |
| `state.waitHost.title` | 호스트를 기다리고 있습니다 |
| `state.waitHost.body` | 호스트가 입장하면 자동으로 시작됩니다. 이 화면을 닫지 마세요. |
| `state.waitHost.cancel` | 처음으로 |
