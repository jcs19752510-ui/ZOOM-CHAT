import { useEffect, useRef } from 'react';
import { useAudioLevel } from '../lib/audioLevel';
import type { PeerConnState } from '../media/MediaTransport';
import { S } from '../strings';
import { Crown, MicOff, TriangleAlert } from './icons';

interface Props {
  stream: MediaStream | null;
  name: string;
  peerId: string;
  self?: boolean;
  host?: boolean;
  micOn: boolean;
  camOn: boolean;
  reconnecting?: boolean;
  peer?: PeerConnState;
  /** 화면공유 타일: 이름 대신 "OO님의 화면", 영상은 잘리지 않게 contain */
  screen?: boolean;
  thumb?: boolean;
  sinkId?: string;
}

type SinkElement = HTMLVideoElement & { setSinkId?: (id: string) => Promise<void> };

const initialOf = (name: string): string => [...name.trim()][0]?.toUpperCase() ?? '?';

export function VideoTile({ stream, name, peerId, self, host, micOn, camOn, reconnecting, peer, screen, thumb, sinkId }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const { speaking } = useAudioLevel(stream, !screen && micOn);

  useEffect(() => {
    const el = ref.current;
    if (el && el.srcObject !== stream) el.srcObject = stream;
  }, [stream]);

  useEffect(() => {
    const el = ref.current as SinkElement | null;
    if (el?.setSinkId && sinkId) void el.setSinkId(sinkId).catch(() => undefined);
  }, [sinkId]);

  const showVideo = screen || camOn;
  const peerProblem = !self && (peer === 'failed' || peer === 'disconnected');
  const label = screen ? S.room.sharingNow(name) : `${name}${self ? ` ${S.room.you}` : ''}`;

  return (
    <div
      data-testid={`tile-${peerId}${screen ? '-screen' : ''}`}
      data-speaking={speaking ? 'true' : 'false'}
      className={`relative min-h-0 min-w-0 overflow-hidden rounded-md bg-tile ${speaking && !screen ? 'ring-4 ring-speaking' : 'ring-1 ring-line'} ${thumb ? 'h-24 w-40 shrink-0 sm:h-28 sm:w-48' : 'h-full w-full'}`}
    >
      <video
        ref={ref}
        data-peer-id={peerId}
        data-kind={screen ? 'screen' : 'camera'}
        autoPlay
        playsInline
        muted={!!self}
        className={`h-full w-full ${screen ? 'object-contain' : 'object-cover'} ${self && !screen ? '-scale-x-100' : ''} ${showVideo ? '' : 'hidden'}`}
      />
      {!showVideo ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-tile" aria-label={`${name}: ${S.room.cameraIsOff}`}>
          <div className={`flex items-center justify-center rounded-pill bg-raised font-bold text-text ${thumb ? 'h-10 w-10 text-lg' : 'h-20 w-20 text-3xl'}`} aria-hidden="true">
            {initialOf(name)}
          </div>
        </div>
      ) : null}
      {reconnecting || peerProblem ? (
        <div className="absolute inset-x-0 top-0 flex items-center gap-1 bg-overlay px-2 py-1 text-xs text-warning" role="status">
          <TriangleAlert size={14} aria-hidden="true" />
          {reconnecting ? S.people.reconnecting : S.room.peerProblem}
        </div>
      ) : null}
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-6 text-xs sm:text-sm">
        {host && !screen ? <Crown size={14} className="shrink-0 text-warning" aria-label={S.room.host} /> : null}
        {!micOn && !screen ? <MicOff size={14} className="shrink-0 text-danger-hover" aria-label={S.people.micOff} /> : null}
        <span className="truncate font-medium">{label}</span>
      </div>
    </div>
  );
}
