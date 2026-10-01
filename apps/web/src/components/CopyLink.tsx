import { useRef, useState } from 'react';
import { S } from '../strings';
import { Check, Copy } from './icons';

export const roomLink = (roomId: string): string => `${window.location.origin}/r/${roomId}`;

/** 링크 복사 버튼(FR-02). 클립보드가 막히면 선택 가능한 입력창으로 대체한다. */
export function CopyLink({
  roomId,
  url,
  label,
  inline,
  testId = 'copy-link',
  compact,
  onCopied,
}: {
  /** 복사할 대상: url이 있으면 그것(예: 랜딩의 사이트 주소), 없으면 roomId의 초대 링크 */
  roomId?: string;
  url?: string;
  label?: string;
  /** 문구를 항상 보이는 한 줄 버튼(안내 바용) */
  inline?: boolean;
  testId?: string;
  compact?: boolean;
  onCopied?: (ok: boolean) => void;
}) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const inputRef = useRef<HTMLInputElement>(null);
  const link = url ?? (roomId ? roomLink(roomId) : window.location.origin);
  const text = label ?? S.lobby.copyLink;

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
      <button type="button" aria-label={state === 'copied' ? S.lobby.copied : text} data-testid={testId} className={compact || inline ? 'btn-secondary whitespace-nowrap px-3' : 'btn-secondary w-full'} onClick={() => void copy()}>
        {state === 'copied' ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
        <span className={compact && !inline ? 'hidden sm:inline' : ''}>{state === 'copied' ? S.lobby.copied : text}</span>
      </button>
      {state === 'failed' ? (
        <div>
          <p className="mb-1 text-xs text-muted" role="status">
            {S.lobby.copyFailed}
          </p>
          <input ref={inputRef} readOnly value={link} className="input text-sm" aria-label={text} onFocus={(e) => e.currentTarget.select()} />
        </div>
      ) : null}
    </div>
  );
}
