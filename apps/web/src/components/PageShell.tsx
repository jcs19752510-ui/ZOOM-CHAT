import type { ReactNode } from "react";
import { InAppNotice } from "./InAppNotice";
import { LegalFooter } from "./LegalFooter";

/**
 * 랜딩·대기실 공통 틀: 안내 배너 슬롯 + 본문 + 법률 푸터. 본문(`main`)은 `flex-1`로 남는 높이를 채워
 * 푸터가 추가되어도 새 세로 스크롤이 생기지 않는다. 회의실 화면에는 쓰지 않는다.
 */
export function PageShell({
  context,
  roomId,
  forceOpenInApp,
  children,
}: {
  context: "landing" | "lobby";
  roomId?: string;
  forceOpenInApp?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <InAppNotice context={context} {...(roomId ? { roomId } : {})} {...(forceOpenInApp ? { forceOpen: true } : {})} />
      {children}
      <LegalFooter />
    </div>
  );
}
