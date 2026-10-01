import type { PublicParticipant } from '@meetlite/shared';
import { S } from '../strings';
import { Crown, Lock, LockOpen, Mic, MicOff, MonitorUp, UserX, Video, VideoOff, VolumeX, X } from './icons';

interface Props {
  participants: PublicParticipant[];
  selfId: string;
  hostId: string | null;
  locked: boolean;
  onClose: () => void;
  onToggleLock: () => void;
  onMuteAll: () => void;
  onKick: (p: PublicParticipant) => void;
}

/** 참가자 목록과 호스트 도구. 도구 표시는 보조일 뿐이며 권한은 서버가 판단한다(SEC-05). */
export function ParticipantsPanel({ participants, selfId, hostId, locked, onClose, onToggleLock, onMuteAll, onKick }: Props) {
  const isHost = selfId === hostId;
  const list = [...participants].sort((a, b) => a.joinSeq - b.joinSeq);
  return (
    <section className="flex h-full min-h-0 flex-col" aria-label={S.people.title} data-testid="people-panel">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="font-bold">{S.people.count(list.length)}</h2>
        <button type="button" aria-label={S.people.close} className="flex min-h-touch min-w-touch items-center justify-center rounded-md hover:bg-raised" onClick={onClose}>
          <X size={20} aria-hidden="true" />
        </button>
      </header>
      {isHost ? (
        <div className="border-b border-line px-4 py-3" aria-label={S.people.hostOnly}>
          <p className="mb-2 text-xs font-semibold text-muted">{S.people.hostOnly}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" data-testid="btn-lock" className="btn-secondary" aria-pressed={locked} onClick={onToggleLock}>
              {locked ? <LockOpen size={18} aria-hidden="true" /> : <Lock size={18} aria-hidden="true" />}
              {locked ? S.people.unlock : S.people.lock}
            </button>
            <button type="button" data-testid="btn-mute-all" className="btn-secondary" onClick={onMuteAll}>
              <VolumeX size={18} aria-hidden="true" />
              {S.people.muteAll}
            </button>
          </div>
        </div>
      ) : null}
      <ul className="min-h-0 flex-1 overflow-y-auto px-2 py-2" data-testid="people-list">
        {list.map((p) => (
          <li key={p.id} className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-raised" data-testid={`person-${p.id}`}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-raised text-sm font-bold" aria-hidden="true">
              {[...p.nickname][0]?.toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 truncate text-sm font-medium">
                {p.nickname}
                {p.id === selfId ? <span className="text-muted">{S.room.you}</span> : null}
                {p.id === hostId ? <Crown size={14} className="shrink-0 text-warning" aria-label={S.room.host} /> : null}
              </span>
              {p.connection === 'reconnecting' ? <span className="text-xs text-warning">{S.people.reconnecting}</span> : null}
            </span>
            <span className="flex items-center gap-2 text-muted">
              {p.screen ? <MonitorUp size={16} aria-label={S.people.sharing} /> : null}
              {p.audio ? <Mic size={16} aria-label={S.people.micOn} /> : <MicOff size={16} className="text-danger-hover" aria-label={S.people.micOff} />}
              {p.video ? <Video size={16} aria-label={S.people.camOn} /> : <VideoOff size={16} className="text-danger-hover" aria-label={S.people.camOff} />}
            </span>
            {isHost && p.id !== selfId ? (
              <button type="button" data-testid={`kick-${p.id}`} aria-label={`${p.nickname} ${S.people.kick}`} className="flex min-h-touch min-w-touch items-center justify-center rounded-md text-muted hover:bg-line hover:text-danger-hover" onClick={() => onKick(p)}>
                <UserX size={18} aria-hidden="true" />
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
