import { useEffect, useRef, useState } from 'react';
import { LIMITS } from '@meetlite/shared';
import { linkify } from '../lib/linkify';
import type { ChatItem } from '../state/MeetingController';
import { S } from '../strings';
import { Send, X } from './icons';

interface Props {
  messages: ChatItem[];
  onSend: (text: string) => Promise<string | null>;
  onClose: () => void;
}

const time = (ts: number): string => new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

/** 채팅 본문은 항상 텍스트로만 그린다. 링크는 http/https만 새 탭에서 열고 rel을 지정한다(SEC-07). */
function Body({ text, mine }: { text: string; mine: boolean }) {
  return (
    <p className="whitespace-pre-wrap break-words text-sm" data-testid="chat-text">
      {linkify(text).map((seg, i) =>
        seg.type === 'text' ? (
          <span key={i}>{seg.value}</span>
        ) : (
          <a key={i} href={seg.href} target="_blank" rel="noopener noreferrer" className={mine ? 'text-white underline' : 'text-focus underline'}>
            {seg.label}
          </a>
        ),
      )}
    </p>
  );
}

export function ChatPanel({ messages, onSend, onClose }: Props) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const len = [...text].length;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    if ([...value].length > LIMITS.chatMax) return setError(S.chat.tooLong);
    // 보내는 즉시 입력창을 비워 다음 글을 바로 쓸 수 있게 하고, 실패하면 글을 되돌린다.
    setText('');
    setError('');
    const err = await onSend(value);
    if (err) {
      setText((cur) => (cur === '' ? value : cur));
      setError(err === 'RATE_LIMITED' ? S.chat.rateLimited : err === 'INVALID_PAYLOAD' ? S.chat.invalid : S.chat.failed);
    }
  };

  return (
    <section className="flex h-full min-h-0 flex-col" aria-label={S.chat.title} data-testid="chat-panel">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="font-bold">{S.chat.title}</h2>
        <button type="button" aria-label={S.chat.close} className="flex min-h-touch min-w-touch items-center justify-center rounded-md hover:bg-raised" onClick={onClose}>
          <X size={20} aria-hidden="true" />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3" role="log" aria-live="polite" aria-label={S.chat.title}>
        {messages.length === 0 ? (
          <div className="mt-10 text-center text-sm text-muted">
            <p className="font-semibold text-text">{S.chat.empty}</p>
            <p className="mt-1">{S.chat.emptyHint}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {messages.map((m) => (
              <li key={m.id} className={`flex flex-col ${m.mine ? 'items-end' : 'items-start'}`}>
                <span className="text-xs text-muted">
                  {m.nickname} · {time(m.ts)}
                </span>
                <div className={`mt-0.5 max-w-[85%] rounded-md px-3 py-2 ${m.mine ? 'bg-accent text-white' : 'bg-raised'}`}>
                  <Body text={m.text} mine={m.mine} />
                </div>
              </li>
            ))}
          </ul>
        )}
        <div ref={endRef} />
      </div>
      <form onSubmit={(e) => void submit(e)} className="border-t border-line p-3">
        {error ? (
          <p role="alert" className="mb-2 text-xs text-warning">
            {error}
          </p>
        ) : null}
        <div className="flex gap-2">
          <label className="sr-only" htmlFor="chat-input">
            {S.chat.placeholder}
          </label>
          <input id="chat-input" data-testid="chat-input" className="input" placeholder={S.chat.placeholder} value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" />
          <button type="submit" data-testid="chat-send" className="btn-primary min-w-touch px-3" aria-label={S.chat.send} disabled={!text.trim()}>
            <Send size={18} aria-hidden="true" />
          </button>
        </div>
        <p className={`mt-1 text-right text-xs ${len > LIMITS.chatMax ? 'text-danger-text' : 'text-muted'}`}>{S.chat.counter(len)}</p>
      </form>
    </section>
  );
}
