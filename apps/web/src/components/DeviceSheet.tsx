import { useEffect, useRef, useState } from 'react';
import { listDevices, type DeviceLists, type LocalMedia } from '../lib/media';
import { S } from '../strings';
import { X } from './icons';

interface Props {
  media: LocalMedia;
  sinkId: string;
  onSwitch: (kind: 'audio' | 'video', deviceId: string) => void;
  onSink: (deviceId: string) => void;
  onClose: () => void;
}

/** 통화 중 장치 변경(FR-09). 장치 목록은 권한 허용 뒤에야 이름이 보이고 장치가 바뀌면 갱신된다. */
export function DeviceSheet({ media, sinkId, onSwitch, onSink, onClose }: Props) {
  const [devices, setDevices] = useState<DeviceLists>({ audioinput: [], videoinput: [], audiooutput: [] });
  const closeRef = useRef<HTMLButtonElement>(null);
  const sinkSupported = typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype;

  useEffect(() => {
    let alive = true;
    const load = (): void => void listDevices().then((d) => alive && setDevices(d));
    load();
    navigator.mediaDevices?.addEventListener?.('devicechange', load);
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => {
      alive = false;
      navigator.mediaDevices?.removeEventListener?.('devicechange', load);
      prev?.focus?.();
    };
  }, []);

  const select = (id: string, label: string, list: MediaDeviceInfo[], value: string | undefined, onChange: (v: string) => void, disabled?: boolean) => (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">
        {label}
      </label>
      <select id={id} className="input" value={value ?? ''} disabled={disabled || list.length === 0} onChange={(e) => onChange(e.target.value)}>
        {list.length === 0 ? <option value="">{S.devices.none}</option> : null}
        {list.map((d, i) => (
          <option key={d.deviceId} value={d.deviceId}>
            {d.label || `${label} ${i + 1}`}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-overlay p-0 sm:items-center sm:p-4" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={S.devices.title} className="w-full max-w-md rounded-t-lg border border-line bg-surface p-5 shadow-pop sm:rounded-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{S.devices.title}</h2>
          <button ref={closeRef} type="button" aria-label={S.devices.close} className="flex min-h-touch min-w-touch items-center justify-center rounded-md hover:bg-raised" onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="flex flex-col gap-4">
          {select('dev-mic', S.devices.mic, devices.audioinput, media.audioDeviceId, (v) => onSwitch('audio', v))}
          {select('dev-cam', S.devices.camera, devices.videoinput, media.videoDeviceId, (v) => onSwitch('video', v))}
          {sinkSupported ? select('dev-spk', S.devices.speaker, devices.audiooutput, sinkId, onSink) : <p className="text-xs text-muted">{S.devices.speakerUnsupported}</p>}
        </div>
      </div>
    </div>
  );
}
