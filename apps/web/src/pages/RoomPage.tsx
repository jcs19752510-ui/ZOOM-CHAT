import { useCallback, useEffect, useRef, useState } from 'react';
import { LIMITS, type RoomStatusResponse } from '@meetlite/shared';
import { CopyLink } from '../components/CopyLink';
import { InAppNotice } from '../components/InAppNotice';
import { StateScreen } from '../components/StateScreen';
import { Lock, TriangleAlert, Users, VideoOff } from '../components/icons';
import { getRoomStatus } from '../lib/api';
import { LocalMedia, supportsMedia } from '../lib/media';
import { clearHostClaim, loadHostClaim, loadNickname, saveNickname } from '../lib/storage';
import { MeetingController, type EndReason } from '../state/MeetingController';
import { S } from '../strings';
import { Lobby } from './Lobby';
import { Room } from './Room';

type Phase =
  | { k: 'checking' }
  | { k: 'unsupported' }
  | { k: 'error' }
  | { k: 'gone'; why: 'closed' | 'restarted' | 'operator' }
  | { k: 'waitHost' }
  | { k: 'full' }
  | { k: 'locked' }
  | { k: 'kicked' }
  | { k: 'lobby'; status: RoomStatusResponse }
  | { k: 'live'; controller: MeetingController }
  | { k: 'left' }
  | { k: 'expired' };

export function RoomPage({ roomId, navigate }: { roomId: string; navigate: (to: string) => void }) {
  const [phase, setPhase] = useState<Phase>(() => (supportsMedia() ? { k: 'checking' } : { k: 'unsupported' }));
  const [attempt, setAttempt] = useState(0);
  const [media, setMedia] = useState<LocalMedia | null>(null);
  const mediaRef = useRef<LocalMedia | null>(null);
  const controllerRef = useRef<MeetingController | null>(null);
  // 호스트 클레임은 처음 한 번만 읽는다(입장 성공 후 지우더라도 방 상태 확인이 다시 실행되지 않도록)
  const [hostClaim] = useState(() => loadHostClaim(roomId));

  // 방 상태 확인(FR-06): 존재, 호스트 입장 여부, 정원, 잠금
  useEffect(() => {
    let alive = true;
    if (!supportsMedia()) return;
    void getRoomStatus(roomId).then((res) => {
      if (!alive) return;
      if (!res.ok) return setPhase({ k: 'error' });
      const st = res.data;
      if (!st.exists) return setPhase({ k: 'gone', why: 'closed' });
      if (!st.hostPresent && !hostClaim) return setPhase({ k: 'waitHost' });
      if (!hostClaim && st.locked) return setPhase({ k: 'locked' });
      if (st.full) return setPhase({ k: 'full' });
      mediaRef.current?.stopAll();
      const next = new LocalMedia();
      mediaRef.current = next;
      setMedia(next);
      setPhase({ k: 'lobby', status: st });
    });
    return () => {
      alive = false;
    };
  }, [roomId, attempt, hostClaim]);

  // 호스트 대기(FR-23): 호스트가 입장하면 자동으로 진행한다
  useEffect(() => {
    if (phase.k !== 'waitHost') return;
    const t = setInterval(() => {
      void getRoomStatus(roomId).then((res) => {
        if (!res.ok) return;
        if (!res.data.exists) setPhase({ k: 'gone', why: 'closed' });
        else if (res.data.hostPresent) setAttempt((n) => n + 1);
      });
    }, 2500);
    return () => clearInterval(t);
  }, [phase.k, roomId]);

  useEffect(
    () => () => {
      controllerRef.current?.dispose();
      mediaRef.current?.stopAll();
    },
    [],
  );

  const retry = useCallback(() => {
    setPhase({ k: 'checking' });
    setAttempt((n) => n + 1);
  }, []);

  const join = async (nickname: string, password: string): Promise<string | null> => {
    const media = mediaRef.current;
    if (!media) return S.state.error.body;
    const controller = new MeetingController();
    const res = await controller.join({ roomId, nickname, media, ...(password ? { password } : {}), ...(hostClaim ? { hostClaim } : {}) });
    if (res.ok) {
      saveNickname(nickname);
      clearHostClaim(roomId);
      controllerRef.current = controller;
      setPhase({ k: 'live', controller });
      return null;
    }
    controller.dispose();
    switch (res.code) {
      case 'ROOM_FULL':
        setPhase({ k: 'full' });
        return null;
      case 'ROOM_LOCKED':
        setPhase({ k: 'locked' });
        return null;
      case 'KICKED':
        setPhase({ k: 'kicked' });
        return null;
      case 'ROOM_NOT_FOUND':
        setPhase({ k: 'gone', why: 'closed' });
        return null;
      case 'HOST_NOT_PRESENT':
        setPhase({ k: 'waitHost' });
        return null;
      case 'WRONG_PASSWORD':
        return S.lobby.wrongPassword;
      case 'TOO_MANY_ATTEMPTS':
        return S.lobby.tooManyAttempts;
      case 'INVALID_PAYLOAD':
        // 서버는 어느 필드가 틀렸는지 알려 주지 않으므로, 비밀번호가 규칙을 벗어났을 때만 비밀번호 안내를 낸다.
        return password && (password.length < LIMITS.passwordMin || password.length > LIMITS.passwordMax) ? S.lobby.invalidPassword : S.lobby.invalidNickname;
      case 'RATE_LIMITED':
        return S.lobby.rateLimited;
      case 'SERVER_BUSY':
        return S.lobby.serverBusy;
      default:
        return S.state.error.body;
    }
  };

  const onEnded = useCallback((reason: EndReason) => {
    controllerRef.current = null;
    mediaRef.current = null;
    setMedia(null);
    setPhase(reason === 'kicked' ? { k: 'kicked' } : reason === 'expired' ? { k: 'expired' } : reason === 'closed' ? { k: 'gone', why: 'closed' } : reason === 'restarted' ? { k: 'gone', why: 'restarted' } : reason === 'operator' ? { k: 'gone', why: 'operator' } : { k: 'left' });
  }, []);

  const home = (
    <button type="button" className="btn-secondary" onClick={() => navigate('/')}>
      {S.state.error.home}
    </button>
  );

  switch (phase.k) {
    case 'checking':
      return <StateScreen title={S.state.loading.title} body={S.state.loading.body} />;
    case 'unsupported':
      return (
        <div className="flex min-h-full flex-col">
          <InAppNotice context="unsupported" roomId={roomId} forceOpen />
          <StateScreen alert icon={<VideoOff size={36} />} title={S.state.unsupported.title} body={S.state.unsupported.body}>
            <div className="w-full max-w-xs">
              <CopyLink roomId={roomId} />
            </div>
          </StateScreen>
        </div>
      );
    case 'error':
      return (
        <StateScreen alert icon={<TriangleAlert size={36} />} title={S.state.error.title} body={S.state.error.body}>
          <button type="button" className="btn-primary" onClick={retry}>
            {S.state.error.retry}
          </button>
          {home}
        </StateScreen>
      );
    case 'gone':
      if (phase.why === 'operator') {
        return (
          <StateScreen alert icon={<TriangleAlert size={36} />} title={S.state.gone.operatorTitle} body={S.state.gone.operator}>
            <button type="button" className="btn-primary" data-testid="operator-closed" onClick={() => navigate('/')}>
              {S.state.gone.newRoom}
            </button>
            <a className="btn-secondary" href="/contact" data-testid="operator-closed-contact">
              {S.legalLinks.contact}
            </a>
          </StateScreen>
        );
      }
      return (
        <StateScreen alert icon={<TriangleAlert size={36} />} title={S.state.gone.title} body={phase.why === 'restarted' ? S.state.gone.restarted : S.state.gone.closed}>
          <button type="button" className="btn-primary" onClick={() => navigate('/')}>
            {S.state.gone.newRoom}
          </button>
        </StateScreen>
      );
    case 'waitHost':
      return (
        <StateScreen icon={<Users size={36} />} title={S.state.waitHost.title} body={S.state.waitHost.body}>
          {home}
        </StateScreen>
      );
    case 'full':
      return (
        <StateScreen alert icon={<Users size={36} />} title={S.state.full.title} body={S.state.full.body}>
          <button type="button" className="btn-primary" onClick={retry}>
            {S.state.full.retry}
          </button>
          {home}
        </StateScreen>
      );
    case 'locked':
      return (
        <StateScreen alert icon={<Lock size={36} />} title={S.state.locked.title} body={S.state.locked.body}>
          <button type="button" className="btn-primary" onClick={retry}>
            {S.state.locked.retry}
          </button>
          {home}
        </StateScreen>
      );
    case 'kicked':
      return (
        <StateScreen alert icon={<TriangleAlert size={36} />} title={S.state.kicked.title} body={S.state.kicked.body}>
          {home}
        </StateScreen>
      );
    case 'expired':
      return (
        <StateScreen alert icon={<TriangleAlert size={36} />} title={S.state.expired.title} body={`${S.state.expired.body} ${S.background.platformNote}`}>
          <button type="button" className="btn-primary" onClick={retry}>
            {S.state.expired.rejoin}
          </button>
          {home}
        </StateScreen>
      );
    case 'left':
      return (
        <StateScreen title={S.state.left.title} body={S.state.left.body}>
          <button type="button" className="btn-primary" onClick={retry} data-testid="rejoin">
            {S.state.left.rejoin}
          </button>
          {home}
        </StateScreen>
      );
    case 'lobby':
      return media ? <Lobby roomId={roomId} isHost={!!hostClaim} needsPassword={phase.status.needsPassword} initialNickname={loadNickname()} media={media} onJoin={join} onCancel={() => navigate('/')} /> : null;
    case 'live':
      return media ? <Room controller={phase.controller} media={media} roomId={roomId} onEnded={onEnded} /> : null;
  }
}
