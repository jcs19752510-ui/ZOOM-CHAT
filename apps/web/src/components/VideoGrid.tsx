import { useMediaQuery } from '../lib/useMediaQuery';
import type { MeetingState } from '../state/MeetingController';
import { S } from '../strings';
import { VideoTile } from './VideoTile';
import { MonitorUp } from './icons';

interface Props {
  state: MeetingState;
  selfStream: MediaStream;
  sinkId?: string;
}

/** 1~6명 자동 배치(UX-05), 화면공유 시 공유 화면을 크게 + 참가자 썸네일(UX-06). */
export function VideoGrid({ state, selfStream, sinkId }: Props) {
  const narrow = useMediaQuery('(max-width: 639px)');
  const people = [...state.participants].sort((a, b) => a.joinSeq - b.joinSeq);
  const sharer = people.find((p) => p.screen);

  const tileFor = (id: string, thumb: boolean) => {
    const p = people.find((x) => x.id === id);
    if (!p) return null;
    const self = id === state.selfId;
    const remote = state.remote[id];
    return (
      <VideoTile
        key={id}
        peerId={id}
        name={p.nickname}
        stream={self ? selfStream : (remote?.camera ?? null)}
        self={self}
        host={p.isHost}
        micOn={p.audio}
        camOn={self ? state.camOn : p.video}
        reconnecting={p.connection === 'reconnecting'}
        {...(remote ? { peer: remote.state } : {})}
        thumb={thumb}
        {...(sinkId ? { sinkId } : {})}
      />
    );
  };

  if (sharer) {
    const mine = sharer.id === state.selfId;
    const screenStream = state.remote[sharer.id]?.screen ?? null;
    return (
      <div className="flex h-full min-h-0 flex-col gap-2 sm:flex-row" data-testid="share-layout">
        <div className="relative min-h-0 min-w-0 flex-1">
          {mine ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-md bg-tile text-muted ring-1 ring-line">
              <MonitorUp size={40} aria-hidden="true" />
              <p className="text-sm">{S.room.youSharing}</p>
            </div>
          ) : (
            <VideoTile peerId={sharer.id} name={sharer.nickname} stream={screenStream} micOn camOn screen />
          )}
        </div>
        <div className="flex shrink-0 gap-2 overflow-auto sm:w-48 sm:flex-col" aria-label={S.people.title}>
          {people.map((p) => tileFor(p.id, true))}
        </div>
      </div>
    );
  }

  const n = Math.max(1, people.length);
  const cols = narrow ? (n <= 2 ? 1 : 2) : n === 1 ? 1 : n <= 4 ? 2 : 3;
  const rows = Math.ceil(n / cols);
  return (
    <div className="grid h-full min-h-0 gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }} data-testid="gallery" data-count={n}>
      {people.map((p) => tileFor(p.id, false))}
    </div>
  );
}
