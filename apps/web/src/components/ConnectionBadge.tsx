import { useEffect, useState } from 'react';
import type { MeetingState } from '../state/MeetingController';
import { S } from '../strings';
import { Wifi, WifiOff } from './icons';

/** 연결 상태 표시. 색뿐 아니라 아이콘과 글자로도 구분한다(FR-19). */
export function ConnectionBadge({ state }: { state: Pick<MeetingState, 'status' | 'quality' | 'reconnectingSince' | 'graceSec'> }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (state.status !== 'reconnecting') return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [state.status]);

  if (state.status === 'reconnecting') {
    const left = Math.max(0, Math.ceil(state.graceSec - (now - (state.reconnectingSince ?? now)) / 1000));
    return (
      <span className="inline-flex items-center gap-1 rounded-pill bg-warning px-3 py-1 text-xs font-semibold text-bg" data-testid="conn-badge" data-state="reconnecting">
        <WifiOff size={14} aria-hidden="true" />
        {S.room.reconnecting} · {left}s
      </span>
    );
  }
  const poor = state.quality === 'poor';
  return (
    <span className={`inline-flex items-center gap-1 rounded-pill px-3 py-1 text-xs font-semibold ${poor ? 'bg-warning text-bg' : 'bg-raised text-text'}`} data-testid="conn-badge" data-state={poor ? 'poor' : 'live'}>
      {poor ? <WifiOff size={14} aria-hidden="true" /> : <Wifi size={14} className="text-success" aria-hidden="true" />}
      {poor ? S.room.poor : S.room.live}
    </span>
  );
}
