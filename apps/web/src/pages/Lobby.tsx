import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { normalizeNickname } from '@meetlite/shared';
import { CopyLink } from '../components/CopyLink';
import { PageShell } from '../components/PageShell';
import { Mic, MicOff, TriangleAlert, Video, VideoOff } from '../components/icons';
import { useAudioLevel } from '../lib/audioLevel';
import { listDevices, type DeviceLists, type LocalMedia, type MediaErrorKind } from '../lib/media';
import { S } from '../strings';

interface Props {
  roomId: string;
  isHost: boolean;
  needsPassword: boolean;
  initialNickname: string;
  media: LocalMedia;
  /** 입장 시도. 화면 전환으로 처리되는 결과는 null, 입력 화면에 보여 줄 오류는 문구를 돌려준다. */
  onJoin: (nickname: string, password: string) => Promise<string | null>;
  onCancel: () => void;
}

const permissionText = (kind: MediaErrorKind): string =>
  kind === 'denied' ? S.state.permission.denied : kind === 'notFound' ? S.state.permission.notFound : kind === 'inUse' ? S.state.permission.inUse : S.state.permission.unknown;

/** 대기실: 카메라·마이크 미리보기, 장치 선택, 닉네임(·비밀번호), 개인정보 고지, 입장(FR-03, FR-04, UX-09) */
export function Lobby({ roomId, isHost, needsPassword, initialNickname, media, onJoin, onCancel }: Props) {
  const version = useSyncExternalStore(media.subscribe, media.getVersion);
  const [starting, setStarting] = useState(true);
  const [nickname, setNickname] = useState(initialNickname);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [devices, setDevices] = useState<DeviceLists>({ audioinput: [], videoinput: [], audiooutput: [] });
  const videoRef = useRef<HTMLVideoElement>(null);
  const startedRef = useRef(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- 장치 구성이 바뀔 때(version)만 새 스트림을 만든다
  const stream = useMemo(() => media.stream(), [media, version]);
  const { level } = useAudioLevel(stream, media.micOn);

  const start = (): void => {
    setStarting(true);
    void media.start({ audio: true, video: true }).finally(() => setStarting(false));
  };

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 마운트 때 한 번만 시작한다
  }, []);

  useEffect(() => {
    let alive = true;
    const load = (): void => void listDevices().then((d) => alive && setDevices(d));
    load();
    navigator.mediaDevices?.addEventListener?.('devicechange', load);
    return () => {
      alive = false;
      navigator.mediaDevices?.removeEventListener?.('devicechange', load);
    };
  }, [version]);

  useEffect(() => {
    const el = videoRef.current;
    if (el && el.srcObject !== stream) el.srcObject = stream;
  }, [stream]);

  const noDevices = !media.audio && !media.video;
  const mediaProblem = media.errors.video ?? media.errors.audio;

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const nick = normalizeNickname(nickname);
    if (!nick) return setError(S.lobby.invalidNickname);
    setError('');
    setBusy(true);
    const msg = await onJoin(nick, password);
    setBusy(false);
    if (msg) setError(msg);
  };

  return (
    <PageShell context="lobby" roomId={roomId}>
    <main className="mx-auto flex w-full flex-1 max-w-5xl flex-col justify-center gap-6 px-4 py-6 md:flex-row md:items-center">
      <section className="w-full md:flex-1" aria-label={S.lobby.previewLabel}>
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-tile ring-1 ring-line" data-testid="preview">
          <video ref={videoRef} autoPlay playsInline muted className={`h-full w-full -scale-x-100 object-cover ${media.video && media.camOn ? '' : 'hidden'}`} data-testid="preview-video" />
          {!(media.video && media.camOn) ? (
            <div className="absolute inset-0 flex items-center justify-center text-muted">
              <p>{starting ? S.state.loading.title : S.lobby.cameraOff}</p>
            </div>
          ) : null}
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
            <button type="button" data-testid="lobby-mic" aria-pressed={!media.micOn} aria-label={media.micOn ? S.room.mute : S.room.unmute} disabled={!media.audio} className="flex min-h-touch min-w-touch items-center justify-center rounded-pill bg-overlay hover:bg-raised" onClick={() => media.setMic(!media.micOn)}>
              {media.micOn && media.audio ? <Mic size={20} aria-hidden="true" /> : <MicOff size={20} className="text-danger-text" aria-hidden="true" />}
            </button>
            <button type="button" data-testid="lobby-camera" aria-pressed={!media.camOn} aria-label={media.camOn ? S.room.cameraOffAction : S.room.cameraOn} className="flex min-h-touch min-w-touch items-center justify-center rounded-pill bg-overlay hover:bg-raised" onClick={() => void media.setCamera(!media.camOn)}>
              {media.camOn && media.video ? <Video size={20} aria-hidden="true" /> : <VideoOff size={20} className="text-danger-text" aria-hidden="true" />}
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs text-muted">
          <span>{S.lobby.micLevel}</span>
          <div role="meter" aria-label={S.lobby.micLevel} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(level * 100)} className="h-2 flex-1 overflow-hidden rounded-pill bg-raised">
            <div className="h-full bg-success transition-[width] duration-100" style={{ width: `${Math.round(level * 100)}%` }} />
          </div>
        </div>

        {mediaProblem ? (
          <div role="alert" className="mt-3 flex gap-2 rounded-md border border-warning bg-surface p-3 text-sm" data-testid="permission-problem">
            <TriangleAlert size={18} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
            <div>
              <p className="font-semibold">{S.state.permission.title}</p>
              <p className="text-muted">{permissionText(mediaProblem)}</p>
              <button type="button" className="btn-secondary mt-2" onClick={start}>
                {S.state.permission.retry}
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {(
            [
              ['lobby-mic-select', S.lobby.mic, devices.audioinput, media.audioDeviceId, (v: string) => void media.switchDevice('audio', v)],
              ['lobby-cam-select', S.lobby.camera, devices.videoinput, media.videoDeviceId, (v: string) => void media.switchDevice('video', v)],
            ] as const
          ).map(([id, label, list, value, change]) => (
            <div key={id}>
              <label htmlFor={id} className="mb-1 block text-xs font-semibold text-muted">
                {label}
              </label>
              <select id={id} className="input text-sm" value={value ?? ''} disabled={list.length === 0} onChange={(e) => change(e.target.value)}>
                {list.length === 0 ? <option value="">{S.lobby.noDevice}</option> : null}
                {list.map((d, i) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `${label} ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </section>

      <section className="w-full rounded-lg border border-line bg-surface p-5 shadow-pop md:w-[380px]">
        <h1 className="text-xl font-bold">{S.lobby.title}</h1>
        {isHost ? <p className="mt-1 text-sm text-success">{S.lobby.hostBadge}</p> : null}
        <form onSubmit={(e) => void submit(e)} className="mt-4 flex flex-col gap-3" noValidate>
          <div>
            <label htmlFor="lobby-nickname" className="mb-1 block text-sm font-semibold">
              {S.lobby.nicknameLabel}
            </label>
            <input id="lobby-nickname" data-testid="lobby-nickname" className="input" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder={S.landing.nicknamePlaceholder} autoComplete="nickname" maxLength={80} autoFocus />
          </div>
          {needsPassword && !isHost ? (
            <div>
              <label htmlFor="lobby-password" className="mb-1 block text-sm font-semibold">
                {S.lobby.passwordLabel}
              </label>
              <input id="lobby-password" data-testid="lobby-password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" maxLength={32} />
            </div>
          ) : null}
          <p className="rounded-md bg-bg p-3 text-xs text-muted" data-testid="privacy-notice">
            {S.lobby.privacy}
          </p>
          {error ? (
            <p role="alert" className="text-sm text-warning" data-testid="join-error">
              {error}
            </p>
          ) : null}
          <button type="submit" className="btn-primary" disabled={busy || starting} data-testid="join-button">
            {busy ? S.lobby.joining : noDevices && !starting ? S.lobby.joinWithoutDevices : S.lobby.join}
          </button>
          <button type="button" className="btn-secondary" onClick={onCancel}>
            {S.lobby.cancel}
          </button>
        </form>
        <div className="mt-4 border-t border-line pt-4">
          <CopyLink roomId={roomId} />
        </div>
      </section>
    </main>
    </PageShell>
  );
}
