/**
 * 모든 화면 문구(UX-01). 컴포넌트는 문구를 직접 쓰지 않고 이 파일의 키만 참조한다.
 * 오류 문구는 원인과 해결 방법을 함께 안내한다(UX-03).
 */
export type LegalSlot = 'contact' | 'officer' | 'effectiveDate' | 'networkHosts';
export type LegalStatus = 'draft' | 'reviewed';
export interface LegalSection {
  id: string;
  heading: string;
  paragraphs: readonly string[];
  /** 문단 뒤에 `GET /api/meta` 값이 들어갈 자리 */
  slots?: readonly LegalSlot[];
}
export interface LegalDoc {
  title: string;
  sections: readonly LegalSection[];
}

/**
 * 법률 문서 본문(POL-17·19·20). 법률 검토 전 초안이며 법률 자문이 아니다. 시스템 설계(03 §6.4)의 사실만 쓰고
 * 조문 번호·시행일 같은 확인하지 못한 내용은 "확인 필요"로 둔다. 운영자 정보는 슬롯으로만 채운다.
 */
const privacyDoc: LegalDoc = {
  title: '개인정보 처리방침',
  sections: [
    {
      id: 'collected',
      heading: '수집하는 정보',
      paragraphs: [
        'MeetLite는 회원가입이 없으며 이름·이메일·전화번호를 받지 않습니다.',
        '회의에 입장할 때 입력하는 닉네임, 접속 과정에서 서버가 알게 되는 IP 주소, 방 비밀번호(설정한 경우)를 처리합니다. IP 주소는 개인정보에 해당할 수 있다고 보고 보수적으로 다룹니다(해당 여부는 확인 필요).',
        '영상·음성·화면은 참가자의 브라우저끼리 직접 전송되며 서버에 저장하지 않습니다. 채팅은 같은 방 참가자에게 전달만 하고 서버에 저장하지 않습니다.',
      ],
    },
    {
      id: 'purpose',
      heading: '이용 목적',
      paragraphs: ['회의 방 운영(참가자 목록 표시), 방 정원·잠금·강퇴 같은 접속 통제, 서비스 남용 방지(요청 횟수 제한)에만 사용합니다.'],
    },
    {
      id: 'retention',
      heading: '보유 기간',
      paragraphs: [
        '닉네임과 방 정보는 서버 메모리에만 있으며 방이 삭제되면 함께 사라집니다. 마지막 참가자가 나가면 방은 바로 정리되고, 빈 방은 최대 10분 안에 정리됩니다.',
        '강퇴된 참가자의 재입장을 막기 위해 IP를 일방향 해시로 바꾼 값을 방이 있는 동안만 메모리에 둡니다. 비밀번호는 원문을 복원할 수 없는 해시 값으로만 보관합니다.',
        '요청 횟수 제한을 위해 IP 주소 원문을 서버 메모리에 일시 보관합니다. 마지막 요청 뒤 10분이 지난 항목을 5분마다 지우므로 최대 약 15분 뒤에는 사라집니다. 디스크에 저장하지 않습니다.',
        '앱 서버 로그에는 IP 주소·닉네임·채팅·토큰을 남기지 않습니다. 다만 영상 중계(TURN) 서버를 쓰면 그 서버의 로그에 접속 IP 주소와 사용자명이 남을 수 있고, 설정 기준으로 컨테이너 로그 파일(최대 10MB 3개)에 보관됩니다. 로그 보관 기간은 서비스 배포 후 정해지며 확인 필요입니다.',
      ],
    },
    {
      id: 'destruction',
      heading: '파기',
      paragraphs: ['메모리의 정보는 방이 삭제되거나 서버가 종료될 때 자동으로 사라집니다. 로그는 로테이션 기준에 따라 삭제됩니다.'],
    },
    {
      id: 'thirdParty',
      heading: '제3자 제공·위탁',
      paragraphs: [
        '서버는 개인정보를 제3자에게 전송하지 않습니다.',
        '다만 영상 연결을 위해 브라우저가 아래 STUN/TURN 서버에 접속하면서 이용자의 IP 주소가 해당 서버로 직접 전달됩니다. 이것이 법적으로 제3자 제공이나 위탁에 해당하는지는 확인 필요입니다. 같은 방 참가자에게도 연결 과정에서 IP 주소가 보일 수 있습니다(WebRTC의 특성).',
      ],
      slots: ['networkHosts'],
    },
    {
      id: 'overseas',
      heading: '국외 이전',
      paragraphs: [
        '위 STUN/TURN 서버가 해외 사업자의 서버이거나 해외에 있으면 IP 주소가 국외로 전달될 수 있습니다. 해당 여부와 서비스 서버의 소재지는 확인 필요입니다.',
      ],
    },
    {
      id: 'contact',
      heading: '문의 및 개인정보 책임자',
      paragraphs: ['개인정보와 관련한 문의는 아래 연락처로 보내 주세요. 책임자 지정 필요 여부는 법률 검토 후 결정합니다.'],
      slots: ['contact', 'officer'],
    },
    {
      id: 'rights',
      heading: '이용자의 권리',
      paragraphs: [
        '서버는 개인을 식별해 계정 단위로 보관하는 정보가 없습니다. 위에서 설명한 메모리 정보는 방이 끝나면 사라집니다.',
        '신고·문의 내용은 운영자가 확인하기 위해 보관할 수 있으며, 이 정보의 열람·삭제 요청 방법은 확인 필요입니다.',
      ],
    },
    {
      id: 'breach',
      heading: '유출 사고 대응',
      paragraphs: ['정보 유출이 의심되면 운영자가 정한 절차에 따라 원인을 확인하고 필요한 안내를 합니다. 구체적인 통지 의무와 기한은 확인 필요입니다.'],
    },
    {
      id: 'effectiveDate',
      heading: '시행일과 변경',
      paragraphs: ['이 방침이 바뀌면 서비스 화면에 알립니다.'],
      slots: ['effectiveDate'],
    },
  ],
};

const termsDoc: LegalDoc = {
  title: '이용약관',
  sections: [
    {
      id: 'service',
      heading: '서비스',
      paragraphs: ['MeetLite는 링크로 입장하는 웹 화상회의 도구입니다. 회원가입이 없고, 방마다 정해진 인원까지 함께 이용할 수 있습니다.'],
    },
    {
      id: 'age',
      heading: '이용 연령',
      paragraphs: ['이 서비스는 만 14세 이상 이용자를 대상으로 하는 것을 전제로 한 초안입니다. 연령 기준과 확인 방식은 법률 검토 후 확정하며 확인 필요입니다.'],
    },
    {
      id: 'responsibility',
      heading: '이용자의 책임',
      paragraphs: ['다른 사람의 권리를 침해하거나 불법·유해한 내용을 전송하지 않습니다. 회의 링크와 방 비밀번호를 누구와 공유할지는 호스트가 책임지고 관리합니다.'],
    },
    {
      id: 'host',
      heading: '호스트의 권한',
      paragraphs: ['호스트는 방 잠금, 참가자 내보내기, 전체 음소거를 할 수 있습니다. 내보내진 참가자는 같은 방에 다시 입장할 수 없습니다.'],
    },
    {
      id: 'prohibited',
      heading: '금지 행위',
      paragraphs: ['서비스 방해(과도한 요청 등), 무단 접근 시도, 자동화된 대량 이용, 다른 사람의 동의 없는 녹화나 유출을 금지합니다.'],
    },
    {
      id: 'recording',
      heading: '녹화',
      paragraphs: ['MeetLite는 녹화 기능을 제공하지 않습니다. 이용자가 따로 녹화할 때는 관련 법령과 상대방의 동의를 지켜야 합니다.'],
    },
    {
      id: 'reportAndClose',
      heading: '신고와 회의 종료',
      paragraphs: [
        '문제가 있는 회의는 문의·신고 페이지의 연락처로 알릴 수 있습니다. 운영자는 필요하다고 판단하면 해당 회의를 종료할 수 있습니다.',
        '유해 콘텐츠 신고 처리에 관한 법적 의무와 처리 기한은 확인 필요입니다.',
      ],
    },
    {
      id: 'interruption',
      heading: '서비스 중단',
      paragraphs: [
        '점검이나 장애로 회의가 끝날 수 있습니다. 서버를 다시 시작하면 진행 중인 방은 모두 사라지며, 이때는 새 회의를 만들어야 합니다.',
        '서비스 중단으로 생긴 손해에 대한 운영자의 책임 범위는 운영자가 정하며 법률 검토 후 확정합니다(확인 필요).',
      ],
    },
    {
      id: 'disclaimer',
      heading: '면책',
      paragraphs: ['이용자끼리 나눈 대화·영상의 내용은 서버에 저장되지 않으며 그 내용에 대해 운영자는 책임지지 않습니다. 면책 범위의 효력은 확인 필요입니다.'],
    },
    {
      id: 'changes',
      heading: '약관 변경과 문의',
      paragraphs: ['약관이 바뀌면 서비스 화면에 알립니다. 문의는 아래 연락처로 보내 주세요.'],
      slots: ['contact', 'effectiveDate'],
    },
  ],
};

const contactDoc: LegalDoc = {
  title: '문의·신고',
  sections: [
    {
      id: 'channel',
      heading: '신고·문의 연락처',
      paragraphs: ['문의나 신고는 아래 연락처로 보내 주세요.'],
      slots: ['contact'],
    },
    {
      id: 'whatToSend',
      heading: '신고할 때 알려 주세요',
      paragraphs: [
        '회의 링크(주소), 문제가 있었던 일시, 어떤 문제였는지를 적어 주세요.',
        '방 비밀번호는 보내지 마세요. 링크만 있으면 어느 방인지 알 수 있습니다.',
      ],
    },
    {
      id: 'inMeeting',
      heading: '회의 중이라면',
      paragraphs: ['호스트에게 참가자 내보내기나 방 잠그기를 요청할 수 있고, [나가기]를 눌러 바로 회의에서 나갈 수도 있습니다.'],
    },
    {
      id: 'operatorAction',
      heading: '운영자가 할 수 있는 조치',
      paragraphs: ['운영자는 신고된 회의를 종료할 수 있습니다. 접수한 모든 건에 개별 회신을 약속하지는 않습니다.'],
    },
    {
      id: 'handling',
      heading: '처리',
      paragraphs: ['접수한 내용을 확인한 뒤 필요한 조치를 합니다. 처리 기한은 운영자가 정해 안내합니다(미정).'],
    },
  ],
};

export const S = {
  app: { name: 'MeetLite', tagline: '설치 없이, 링크 하나로 바로 만나는 화상회의' },
  landing: {
    title: '링크 하나로 바로 시작하세요',
    subtitle: '설치도 가입도 필요 없습니다. 방을 만들고 링크를 공유하면 끝입니다.',
    nicknameLabel: '닉네임',
    nicknamePlaceholder: '회의에서 보일 이름',
    nicknameHint: '1~20자, 한글·영문·숫자·공백·_ - . 만 쓸 수 있습니다.',
    createButton: '새 회의 만들기',
    creating: '만드는 중…',
    passwordToggle: '비밀번호 설정 (선택)',
    passwordLabel: '방 비밀번호',
    passwordHint: '4~32자. 참가자에게 따로 알려 주세요. 링크에는 들어가지 않습니다.',
    joinTitle: '초대 링크가 있나요?',
    joinPlaceholder: '링크 또는 방 코드 붙여넣기',
    joinButton: '입장',
    joinInvalid: '올바른 회의 링크가 아닙니다. 받은 링크를 그대로 붙여넣어 주세요.',
    support: 'Chrome, Edge, Firefox, Safari 최신 버전을 지원합니다. 화면공유는 PC 브라우저에서만 쓸 수 있습니다.',
  },
  lobby: {
    title: '입장 전 확인',
    previewLabel: '내 카메라 미리보기',
    cameraOff: '카메라가 꺼져 있습니다',
    mic: '마이크',
    camera: '카메라',
    speaker: '스피커',
    micLevel: '마이크 입력 레벨',
    noDevice: '장치 없음',
    privacy: '영상 통화를 연결하는 과정에서 다른 참가자에게 내 네트워크 정보(IP 주소 등)가 보일 수 있습니다.',
    join: '회의 입장',
    joining: '입장하는 중…',
    joinWithoutDevices: '장치 없이 입장',
    copyLink: '초대 링크 복사',
    copied: '링크를 복사했습니다',
    copyFailed: '자동 복사에 실패했습니다. 아래 링크를 직접 선택해 복사해 주세요.',
    nicknameLabel: '닉네임',
    passwordLabel: '방 비밀번호',
    wrongPassword: '비밀번호가 맞지 않습니다. 호스트에게 비밀번호를 다시 확인해 주세요.',
    tooManyAttempts: '비밀번호를 여러 번 틀려 잠시 입장할 수 없습니다. 10분 뒤에 다시 시도해 주세요.',
    invalidNickname: '닉네임은 1~20자이고 한글·영문·숫자·공백·_ - . 만 쓸 수 있습니다.',
    invalidPassword: '비밀번호는 4~32자여야 합니다. 호스트에게 받은 비밀번호를 다시 확인해 주세요.',
    rateLimited: '요청이 너무 많습니다. 잠시 뒤에 다시 시도해 주세요.',
    hostBadge: '호스트로 입장합니다',
    permissionNote: '카메라와 마이크 권한을 허용하면 미리보기가 나타납니다.',
    cancel: '처음으로',
  },
  room: {
    mute: '마이크 끄기',
    unmute: '마이크 켜기',
    cameraOn: '카메라 켜기',
    cameraOffAction: '카메라 끄기',
    controls: '회의 컨트롤',
    stage: '회의 화면',
    micLabel: '마이크',
    cameraLabel: '카메라',
    shareLabel: '화면공유',
    shareStop: '공유 중지',
    chat: '채팅',
    participants: '참가자',
    leave: '나가기',
    copyLink: '링크 복사',
    deviceMenuMic: '마이크 장치 선택',
    deviceMenuCamera: '카메라 장치 선택',
    you: '(나)',
    host: '호스트',
    sharingNow: (name: string) => `${name}님이 화면을 공유 중입니다`,
    youSharing: '내 화면을 공유 중입니다',
    shareUnsupportedMobile: '모바일 브라우저에서는 화면공유를 지원하지 않습니다. PC 브라우저를 이용해 주세요.',
    shareBusy: (name: string) => `${name}님이 이미 화면을 공유 중입니다. 공유가 끝난 뒤에 시작해 주세요.`,
    shareDenied: '화면공유가 취소되었거나 권한이 없습니다. 다시 시도해 주세요.',
    micMutedByHost: '호스트가 모든 참가자의 마이크를 껐습니다. 말하려면 마이크를 다시 켜 주세요.',
    locked: '방이 잠겨 있습니다',
    alone: '아직 아무도 없어요',
    aloneHint: '링크를 복사해서 참가자를 초대해 보세요.',
    peerProblem: '연결 문제',
    cameraIsOff: '카메라 꺼짐',
    live: '연결됨',
    reconnecting: '재연결 중',
    poor: '불안정',
    poorBanner: '네트워크가 불안정합니다. 카메라를 끄면 개선될 수 있습니다.',
    reconnectingBanner: '연결이 끊겨 다시 연결하는 중입니다. 자리는 잠시 유지됩니다.',
    joined: (name: string) => `${name}님이 입장했습니다`,
    left: (name: string) => `${name}님이 나갔습니다`,
    timedOut: (name: string) => `${name}님의 연결이 끊겨 퇴장 처리되었습니다`,
    hostChanged: (name: string) => `${name}님이 새 호스트가 되었습니다`,
    youAreHost: '이제 내가 호스트입니다',
    lockedToast: '방을 잠갔습니다. 새 참가자는 입장할 수 없습니다',
    unlockedToast: '방 잠금을 해제했습니다',
    reconnected: '다시 연결되었습니다',
    deviceChangeFailed: '장치를 바꾸지 못했습니다. 다른 앱이 장치를 사용 중인지 확인해 주세요.',
    cameraFailed: '카메라를 켜지 못했습니다. 브라우저 권한과 다른 앱의 사용 여부를 확인해 주세요.',
    micFailed: '마이크를 켜지 못했습니다. 브라우저 권한과 다른 앱의 사용 여부를 확인해 주세요.',
    actionFailed: '요청을 처리하지 못했습니다. 잠시 뒤에 다시 시도해 주세요.',
    forbidden: '호스트만 할 수 있는 기능입니다.',
  },
  chat: {
    title: '채팅',
    placeholder: '메시지 입력 (최대 500자)',
    send: '보내기',
    empty: '첫 메시지를 보내 보세요',
    emptyHint: '대화는 서버에 저장되지 않고, 이 방이 끝나면 사라집니다.',
    tooLong: '메시지는 500자까지 보낼 수 있습니다.',
    invalid: '보낼 수 없는 내용입니다. 눈에 보이는 글자를 넣어 다시 보내 주세요.',
    rateLimited: '너무 빨리 보내고 있습니다. 잠시 뒤에 다시 보내 주세요.',
    failed: '메시지를 보내지 못했습니다. 연결 상태를 확인해 주세요.',
    counter: (n: number) => `${n}/500`,
    close: '채팅 닫기',
    newMessages: '새 메시지',
  },
  people: {
    title: '참가자',
    close: '참가자 목록 닫기',
    lock: '방 잠그기',
    unlock: '방 잠금 해제',
    muteAll: '전체 음소거',
    kick: '내보내기',
    hostOnly: '호스트 도구',
    micOn: '마이크 켜짐',
    micOff: '마이크 꺼짐',
    camOn: '카메라 켜짐',
    camOff: '카메라 꺼짐',
    sharing: '화면 공유 중',
    reconnecting: '재연결 중',
    count: (n: number) => `참가자 ${n}명`,
  },
  confirm: {
    cancel: '취소',
    leaveTitle: '회의에서 나갈까요?',
    leaveBody: '나가도 같은 링크로 다시 입장할 수 있습니다. 호스트가 나가면 가장 먼저 들어온 참가자가 호스트가 됩니다.',
    leaveConfirm: '나가기',
    kickTitle: (name: string) => `${name}님을 내보낼까요?`,
    kickBody: '내보낸 참가자는 이 방에 다시 들어올 수 없습니다.',
    kickConfirm: '내보내기',
    muteAllTitle: '모든 참가자의 마이크를 끌까요?',
    muteAllBody: '호스트를 제외한 모두의 마이크가 꺼집니다. 각자 다시 켤 수 있습니다.',
    muteAllConfirm: '전체 음소거',
  },
  devices: {
    title: '장치 설정',
    close: '닫기',
    mic: '마이크',
    camera: '카메라',
    speaker: '스피커',
    none: '선택 가능한 장치가 없습니다',
    default: '기본 장치',
    speakerUnsupported: '이 브라우저는 스피커 선택을 지원하지 않습니다. 기기 설정에서 바꿔 주세요.',
  },
  state: {
    loading: { title: '준비하는 중입니다', body: '잠시만 기다려 주세요.', slow: '연결이 오래 걸리고 있습니다. 네트워크를 확인하고 다시 시도해 주세요.' },
    error: {
      title: '문제가 발생했습니다',
      body: '서버와 통신하지 못했습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.',
      retry: '다시 시도',
      home: '처음으로',
    },
    permission: {
      title: '카메라·마이크를 사용할 수 없습니다',
      denied: '카메라 또는 마이크 권한이 차단되었습니다. 주소창의 자물쇠 아이콘에서 허용한 뒤 새로고침해 주세요.',
      notFound: '연결된 카메라나 마이크를 찾지 못했습니다. 장치가 연결되어 있는지 확인해 주세요. 장치 없이도 입장할 수 있습니다.',
      inUse: '다른 앱이 카메라나 마이크를 사용 중입니다. 해당 앱을 닫은 뒤 다시 확인해 주세요.',
      unknown: '장치를 시작하지 못했습니다. 브라우저를 새로고침하거나 다른 브라우저로 시도해 주세요.',
      retry: '다시 확인',
    },
    full: { title: '방이 가득 찼습니다', body: '이 방은 정원이 가득 찼습니다. 호스트에게 문의하거나 잠시 뒤에 다시 시도해 주세요.', retry: '다시 시도' },
    locked: { title: '방이 잠겨 있습니다', body: '호스트가 새 참가자의 입장을 막았습니다. 호스트에게 잠금 해제를 요청해 주세요.', retry: '다시 시도' },
    kicked: { title: '회의에서 내보내졌습니다', body: '호스트가 이 회의에서 내보냈습니다. 필요하다면 호스트에게 문의해 주세요.', home: '처음으로' },
    gone: {
      title: '회의를 찾을 수 없습니다',
      closed: '이미 종료되었거나 만료된 회의입니다. 링크를 다시 확인하거나 새 회의를 만들어 주세요.',
      restarted: '서비스가 재시작되어 회의가 종료되었습니다. 새 회의를 만들어 다시 시작해 주세요.',
      operatorTitle: '운영자가 이 회의를 종료했습니다',
      operator: '이 링크로는 다시 입장할 수 없습니다. 새 회의를 만들어 시작하거나, 이유가 궁금하면 문의 안내를 확인해 주세요.',
      newRoom: '새 회의 만들기',
    },
    unsupported: {
      title: '이 브라우저에서는 사용할 수 없습니다',
      body: '화상회의에 필요한 기능(WebRTC, 카메라 접근)을 지원하지 않거나 보안 연결(HTTPS)이 아닙니다. 최신 Chrome, Edge, Firefox, Safari에서 열어 주세요.',
      copy: '링크 복사해서 다른 브라우저에서 열기',
    },
    left: { title: '회의에서 나왔습니다', body: '필요하면 같은 링크로 다시 입장할 수 있습니다.', rejoin: '다시 입장', home: '처음으로' },
    expired: {
      title: '연결이 오래 끊겨 회의에서 나갔습니다',
      body: '네트워크가 복구되지 않아 자리가 정리되었습니다. 다시 입장해 주세요.',
      rejoin: '다시 입장',
    },
    waitHost: { title: '호스트를 기다리고 있습니다', body: '호스트가 입장하면 자동으로 시작됩니다. 이 화면을 닫지 마세요.', cancel: '처음으로' },
  },
  legalLinks: {
    privacy: '개인정보 처리방침',
    terms: '이용약관',
    contact: '문의·신고',
    nav: '법적 고지와 문의',
    aria: (name: string): string => `${name} (새 탭에서 열림)`,
  },
  inApp: {
    title: '앱 안의 브라우저로 열었다면 카메라가 막힐 수 있어요',
    summary: 'Chrome이나 Safari 같은 기본 브라우저에서 여는 것을 권장합니다.',
    howOpen: '방법 보기',
    howClose: '방법 접기',
    steps: [
      '화면의 메뉴(⋮ 또는 공유 아이콘)에서 "다른 브라우저로 열기" 또는 "기본 브라우저로 열기"를 찾아 누르세요.',
      '메뉴에 없으면 "링크 복사"를 누른 뒤 Chrome이나 Safari 주소창에 붙여넣으세요.',
    ],
    proceed: '이 브라우저에서도 계속 진행할 수 있습니다.',
    copySite: '주소 복사',
    dismiss: '안내 닫기',
    permissionExtra: '앱 안의 브라우저가 카메라·마이크를 막았을 수 있습니다. 위 방법으로 기본 브라우저에서 다시 열어 주세요.',
  },
  autoplay: {
    banner: '일부 참가자의 영상이나 소리가 브라우저 설정 때문에 멈춰 있습니다.',
    button: '탭하여 재생',
    started: '재생을 시작했습니다',
    stillBlocked: '아직 재생되지 않는 영상이 있습니다. 한 번 더 누르거나 브라우저 설정에서 자동 재생을 허용해 주세요.',
  },
  background: {
    returned: '앱으로 돌아와 연결을 다시 확인하고 있습니다. 자리는 잠시 유지됩니다.',
    mediaLost: (kind: 'camera' | 'mic' | 'both'): string => {
      const what = kind === 'camera' ? '카메라' : kind === 'mic' ? '마이크' : '카메라와 마이크';
      return `화면이 꺼져 있는 동안 ${what}가 중단되었습니다. ${what} 버튼을 눌러 다시 켜 주세요.`;
    },
    platformNote: '휴대폰은 화면을 끄거나 다른 앱으로 이동하면 통화를 멈출 수 있습니다. 회의 중에는 이 브라우저를 켜 둔 채로 유지해 주세요.',
  },
  legal: {
    status: 'draft' as LegalStatus,
    notAdvice: '이 문서는 법률 자문이 아닌 초안입니다. 적용되는 법령의 확인과 전문가 검토가 필요합니다.',
    dateFormat: (y: number, m: number, d: number): string => `${y}년 ${m}월 ${d}일`,
    privacy: privacyDoc,
    terms: termsDoc,
    contact: contactDoc,
    home: 'MeetLite 처음으로',
    navLabel: '문서 목록',
    tocLabel: '이 문서의 목차',
    draftRibbon: '초안(법률 검토 전) — 내용이 바뀔 수 있습니다',
    labels: {
      contact: '문의 연락처',
      officer: '개인정보 책임자',
      effectiveDate: '시행일',
      stun: 'STUN 서버',
      turn: 'TURN 서버',
    },
    meta: {
      loading: '불러오는 중…',
      pending: '운영자가 아직 정하지 않았습니다(공개 전 필수)',
      officerPending: '지정 전 — 필요 여부는 법률 검토 후 결정합니다',
      datePending: '시행일이 아직 정해지지 않았습니다(공개 전 필수)',
      error: '운영자 정보를 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요. 문서의 나머지 내용에는 영향이 없습니다.',
      retry: '다시 불러오기',
      newTab: '(새 탭)',
      none: '없음',
    },
  },
} as const;

/** 서버 오류 코드 → 사용자 안내 문구 */
export const errorText = (code: string): string => {
  switch (code) {
    case 'RATE_LIMITED':
      return S.lobby.rateLimited;
    case 'FORBIDDEN':
      return S.room.forbidden;
    case 'INVALID_PAYLOAD':
      return S.lobby.invalidNickname;
    default:
      return S.room.actionFailed;
  }
};
