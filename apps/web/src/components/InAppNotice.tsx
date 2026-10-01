export interface InAppNoticeProps {
  context: "landing" | "lobby" | "unsupported";
  roomId?: string;
  forceOpen?: boolean;
  onDismissed?: () => void;
}

/** 인앱 브라우저 안내 배너 자리(UX-13). 감지·표시는 unit-17이 채운다. */
export function InAppNotice(_props: InAppNoticeProps) {
  return null;
}
