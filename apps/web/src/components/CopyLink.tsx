import { useRef, useState } from 'react';
import { S } from '../strings';
import { Check, Copy } from './icons';

export const roomLink = (roomId: string): string => `${window.location.origin}/r/${roomId}`;

/** 링크 복사 버튼(FR-02). 클립보드가 막히면 선택 가능한 입력창으로 대체한다. */
export function CopyLink({ roomId, compact, onCopied }: { roomId: string; compact?: boolean; onCopied?: (ok: boolean) => void }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const inputRef = useRef<HTMLInputElement>(null);
  const link = roomLink(roomId);

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(link);
      setState('copied');
      onCopied?.(true);
      setTimeout(() => setState('idle'), 2500);
    } catch {
      setState('failed');
      onCopied?.(false);
      setTimeout(() => inputRef.current?.select(), 0);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button type="button" aria-label={state === 'copied' ? S.lobby.copied : S.lobby.copyLink} data-testid="copy-link" className={compact ? 'btn-secondary whitespace-nowrap px-3' : 'btn-secondary w-full'} onClick={() => void copy()}>
        {state === 'copied' ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
        <span className={compact ? 'hidden sm:inline' : ''}>{state === 'copied' ? S.lobby.copied : S.lobby.copyLink}</span>
      </button>
      {state === 'failed' ? (
        <div>
          <p className="mb-1 text-xs text-muted" role="status">
            {S.lobby.copyFailed}
          </p>
          <input ref={inputRef} readOnly value={link} className="input text-sm" aria-label={S.lobby.copyLink} onFocus={(e) => e.currentTarget.select()} />
        </div>
      ) : null}
    </div>
  );
}
