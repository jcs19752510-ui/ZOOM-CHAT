import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { PublicParticipant } from '@meetlite/shared';
import { ChatPanel } from '../components/ChatPanel';
import { ConfirmModal } from '../components/ConfirmModal';
import { ConnectionBadge } from '../components/ConnectionBadge';
import { ControlBar } from '../components/ControlBar';
import { CopyLink } from '../components/CopyLink';
import { DeviceSheet } from '../components/DeviceSheet';
import { ParticipantsPanel } from '../components/ParticipantsPanel';
import { Toasts } from '../components/Toasts';
import { VideoGrid } from '../components/VideoGrid';
import { Lock, Settings } from '../components/icons';
import type { LocalMedia } from '../lib/media';
import { useMediaQuery } from '../lib/useMediaQuery';
import type { EndReason, MeetingController } from '../state/MeetingController';
import { useMeeting } from '../state/useMeeting';
import { S } from '../strings';

type Panel = 'chat' | 'people' | null;
type Confirm = { type: 'leave' } | { type: 'muteAll' } | { type: 'kick'; target: PublicParticipant } | null;

interface Props {
  controller: MeetingController;
  media: LocalMedia;
  roomId: string;
  onEnded: (reason: EndReason) => void;
}

/** 회의실: 비디오 그리드, 하단 컨트롤바, 사이드 패널(채팅/참가자) */
export function Room({ controller, media, roomId, onEnded }: Props) {
  const state = useMeeting(controller);
  const mediaVersion = useSyncExternalStore(media.subscribe, media.getVersion);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- 장치 구성이 바뀔 때(mediaVersion)만 새 스트림을 만든다
  const selfStream = useMemo(() => media.stream(), [media, mediaVersion]);
  const narrow = useMediaQuery('(max-width: 767px)');
  const [panel, setPanel] = useState<Panel>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [devicesOpen, setDevicesOpen] = useState(false);
  const [sinkId, setSinkId] = useState('');

  useEffect(() => {
    if (state.status === 'ended' && state.endReason) onEnded(state.endReason);
  }, [state.status, state.endReason, onEnded]);

  useEffect(() => {
    if (panel === 'chat') controller.markChatRead();
  }, [panel, state.unread, controller]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !confirm && !devicesOpen) setPanel(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirm, devicesOpen]);

  const toggle = (p: Exclude<Panel, null>): void => setPanel((cur) => (cur === p ? null : p));
  const alone = state.participants.length <= 1;
  const sharing = state.participants.find((p) => p.id === state.selfId)?.screen ?? state.sharing;

  const panelBody =
    panel === 'chat' ? (
      <ChatPanel messages={state.chat} onSend={(t) => controller.sendChat(t)} onClose={() => setPanel(null)} />
    ) : panel === 'people' ? (
      <ParticipantsPanel
        participants={state.participants}
        selfId={state.selfId}
        hostId={state.hostId}
        locked={state.locked}
        onClose={() => setPanel(null)}
        onToggleLock={() => void controller.setLocked(!state.locked)}
        onMuteAll={() => setConfirm({ type: 'muteAll' })}
        onKick={(target) => setConfirm({ type: 'kick', target })}
      />
    ) : null;

  return (
    <div className="flex h-dvh flex-col bg-bg" data-testid="room" data-status={state.status}>
      <header className="flex items-center justify-between gap-2 border-b border-line bg-surface px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="whitespace-nowrap font-bold">{S.app.name}</span>
          {state.locked ? <Lock size={16} className="text-warning" aria-label={S.room.locked} /> : null}
          <ConnectionBadge state={state} />
        </div>
        <div className="flex items-center gap-1">
          <CopyLink roomId={roomId} compact />
          <button type="button" aria-label={S.devices.title} data-testid="btn-devices-top" className="flex min-h-touch min-w-touch items-center justify-center rounded-md text-muted hover:bg-raised hover:text-text sm:hidden" onClick={() => setDevicesOpen(true)}>
            <Settings size={20} aria-hidden="true" />
          </button>
        </div>
      </header>

      {state.status === 'reconnecting' ? (
        <p role="status" className="bg-warning px-3 py-1.5 text-center text-sm font-semibold text-bg">
          {S.room.reconnectingBanner}
        </p>
      ) : state.quality === 'poor' ? (
        <p role="status" className="bg-warning px-3 py-1.5 text-center text-sm font-semibold text-bg" data-testid="poor-banner">
          {S.room.poorBanner}
        </p>
      ) : null}

      <div className="relative flex min-h-0 flex-1 gap-2 p-2">
        <main className="relative min-h-0 min-w-0 flex-1" aria-label="회의 화면">
          <VideoGrid state={state} selfStream={selfStream} {...(sinkId ? { sinkId } : {})} />
          {alone ? (
            <div className="absolute inset-x-0 bottom-3 mx-auto w-[calc(100%-1.5rem)] max-w-sm rounded-md border border-line bg-surface/95 p-3 text-center shadow-pop" data-testid="alone">
              <p className="font-semibold">{S.room.alone}</p>
              <p className="mb-2 text-sm text-muted">{S.room.aloneHint}</p>
              <CopyLink roomId={roomId} />
            </div>
          ) : null}
        </main>
        {panel && !narrow ? <aside className="w-[340px] shrink-0 overflow-hidden rounded-md border border-line bg-surface">{panelBody}</aside> : null}
        {/* 모바일: 패널은 영상 영역 위에만 덮고 하단 컨트롤바는 계속 쓸 수 있게 둔다 */}
        {panel && narrow ? <aside className="absolute inset-0 z-30 overflow-hidden rounded-md border border-line bg-surface shadow-pop">{panelBody}</aside> : null}
      </div>

      <ControlBar
        micOn={state.micOn}
        camOn={state.camOn}
        sharing={sharing}
        chatOpen={panel === 'chat'}
        peopleOpen={panel === 'people'}
        unread={state.unread}
        count={state.participants.length}
        onMic={() => controller.toggleMic()}
        onCamera={() => void controller.toggleCamera()}
        onShare={() => void (sharing ? controller.stopShare() : controller.startShare())}
        onChat={() => toggle('chat')}
        onPeople={() => toggle('people')}
        onLeave={() => setConfirm({ type: 'leave' })}
        onDevices={() => setDevicesOpen(true)}
      />

      <Toasts toasts={state.toasts} />

      {devicesOpen ? <DeviceSheet media={media} sinkId={sinkId} onSwitch={(k, id) => void controller.switchDevice(k, id)} onSink={setSinkId} onClose={() => setDevicesOpen(false)} /> : null}

      {confirm?.type === 'leave' ? (
        <ConfirmModal title={S.confirm.leaveTitle} body={S.confirm.leaveBody} confirmLabel={S.confirm.leaveConfirm} danger onCancel={() => setConfirm(null)} onConfirm={() => void controller.leave()} />
      ) : null}
      {confirm?.type === 'muteAll' ? (
        <ConfirmModal
          title={S.confirm.muteAllTitle}
          body={S.confirm.muteAllBody}
          confirmLabel={S.confirm.muteAllConfirm}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            setConfirm(null);
            void controller.muteAll();
          }}
        />
      ) : null}
      {confirm?.type === 'kick' ? (
        <ConfirmModal
          title={S.confirm.kickTitle(confirm.target.nickname)}
          body={S.confirm.kickBody}
          confirmLabel={S.confirm.kickConfirm}
          danger
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            const id = confirm.target.id;
            setConfirm(null);
            void controller.kick(id);
          }}
        />
      ) : null}
    </div>
  );
}
