import type { ReactNode } from 'react';
import { supportsScreenShare } from '../lib/media';
import { S } from '../strings';
import { ChevronUp, LogOut, MessageSquare, Mic, MicOff, MonitorUp, MonitorX, Users, Video, VideoOff } from './icons';

interface Props {
  micOn: boolean;
  camOn: boolean;
  sharing: boolean;
  chatOpen: boolean;
  peopleOpen: boolean;
  unread: number;
  count: number;
  onMic: () => void;
  onCamera: () => void;
  onShare: () => void;
  onChat: () => void;
  onPeople: () => void;
  onLeave: () => void;
  onDevices: () => void;
}

interface BtnProps {
  label: string;
  aria: string;
  icon: ReactNode;
  onClick: () => void;
  pressed?: boolean;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  badge?: number;
  testId: string;
  title?: string;
}

function Btn({ label, aria, icon, onClick, pressed, active, danger, disabled, badge, testId, title }: BtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={aria}
      {...(pressed !== undefined ? { 'aria-pressed': pressed } : {})}
      data-testid={testId}
      className={`relative flex min-h-touch min-w-touch flex-col items-center justify-center gap-0.5 whitespace-nowrap rounded-md px-1 py-1 text-[10px] font-medium transition-colors sm:min-w-[64px] sm:px-2 sm:text-xs ${
        danger ? 'bg-danger text-white hover:bg-danger-hover' : active ? 'bg-raised text-text hover:bg-line' : 'text-text hover:bg-raised'
      } disabled:opacity-50`}
    >
      <span className="relative">
        {icon}
        {badge ? (
          <span className="absolute -right-3 -top-2 min-w-[18px] rounded-pill bg-accent px-1 text-center text-[10px] font-bold text-white" aria-hidden="true">
            {badge > 99 ? '99+' : badge}
          </span>
        ) : null}
      </span>
      <span>{label}</span>
    </button>
  );
}

/** 하단 컨트롤바. 순서: 마이크, 카메라, 화면공유, 채팅, 참가자, 나가기(분리·위험색)(UX-04). */
export function ControlBar(p: Props) {
  const canShare = supportsScreenShare();
  return (
    <nav aria-label={S.room.controls} className="flex items-center justify-around gap-0.5 border-t border-line bg-surface px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 sm:justify-center sm:gap-2 sm:px-2">
      <div className="flex items-center">
        <Btn testId="btn-mic" label={S.room.micLabel} aria={p.micOn ? S.room.mute : S.room.unmute} pressed={!p.micOn} active={!p.micOn} icon={p.micOn ? <Mic size={22} aria-hidden="true" /> : <MicOff size={22} className="text-danger-text" aria-hidden="true" />} onClick={p.onMic} />
        <button type="button" aria-label={S.room.deviceMenuMic} onClick={p.onDevices} data-testid="btn-devices" className="hidden min-h-touch min-w-[28px] items-center justify-center rounded-md text-muted hover:bg-raised hover:text-text sm:flex">
          <ChevronUp size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="flex items-center">
        <Btn testId="btn-camera" label={S.room.cameraLabel} aria={p.camOn ? S.room.cameraOffAction : S.room.cameraOn} pressed={!p.camOn} active={!p.camOn} icon={p.camOn ? <Video size={22} aria-hidden="true" /> : <VideoOff size={22} className="text-danger-text" aria-hidden="true" />} onClick={p.onCamera} />
        <button type="button" aria-label={S.room.deviceMenuCamera} onClick={p.onDevices} className="hidden min-h-touch min-w-[28px] items-center justify-center rounded-md text-muted hover:bg-raised hover:text-text sm:flex">
          <ChevronUp size={16} aria-hidden="true" />
        </button>
      </div>
      <Btn
        testId="btn-share"
        label={p.sharing ? S.room.shareStop : S.room.shareLabel}
        aria={p.sharing ? S.room.shareStop : canShare ? S.room.shareLabel : S.room.shareUnsupportedMobile}
        title={canShare ? undefined : S.room.shareUnsupportedMobile}
        pressed={p.sharing}
        active={p.sharing}
        disabled={!canShare}
        icon={p.sharing ? <MonitorX size={22} className="text-success" aria-hidden="true" /> : <MonitorUp size={22} aria-hidden="true" />}
        onClick={p.onShare}
      />
      <Btn testId="btn-chat" label={S.room.chat} aria={S.room.chat} pressed={p.chatOpen} active={p.chatOpen} badge={p.chatOpen ? 0 : p.unread} icon={<MessageSquare size={22} aria-hidden="true" />} onClick={p.onChat} />
      <Btn testId="btn-people" label={S.room.participants} aria={`${S.room.participants} ${p.count}`} pressed={p.peopleOpen} active={p.peopleOpen} icon={<Users size={22} aria-hidden="true" />} onClick={p.onPeople} />
      <div className="ml-0.5 border-l border-line pl-1.5 sm:ml-3 sm:pl-3">
        <Btn testId="btn-leave" label={S.room.leave} aria={S.room.leave} danger icon={<LogOut size={22} aria-hidden="true" />} onClick={p.onLeave} />
      </div>
    </nav>
  );
}
