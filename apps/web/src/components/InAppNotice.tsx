import { useMemo, useState } from 'react';
import { detectInApp } from '../lib/inApp';
import { S } from '../strings';
import { CopyLink } from './CopyLink';
import { ChevronUp, TriangleAlert, X } from './icons';

export interface InAppNoticeProps {
  context: 'landing' | 'lobby' | 'unsupported';
  roomId?: string;
  /** 권한 실패·지원 불가처럼 원인 안내가 필요할 때: 닫음 상태를 무시하고 펼쳐서 보이며 닫기 버튼이 없다 */
  forceOpen?: boolean;
  onDismissed?: () => void;
}

// 닫음 상태는 같은 실행(페이지 로드) 동안 메모리에만 둔다. 새 저장소 키를 만들지 않는다(04 §2.3.4).
let dismissedThisRun = false;

const focusFirstInput = (): void => document.querySelector<HTMLElement>('main input')?.focus();

/** 앱 안 브라우저 안내 바(UX-13). 입장을 막지 않으며 외부 링크·앱 스킴으로 이동하지 않는다. */
export function InAppNotice({ context, roomId, forceOpen, onDismissed }: InAppNoticeProps) {
  const info = useMemo(() => detectInApp(navigator.userAgent), []);
  const [dismissed, setDismissed] = useState(dismissedThisRun);
  const [open, setOpen] = useState(false);
  if (!info.inApp) return null;
  const forced = !!forceOpen || context === 'unsupported';
  if (dismissed && !forced) return null;
  const expanded = forced || open;
  const copy = context === 'landing' || !roomId ? { url: window.location.origin, label: S.inApp.copySite } : { roomId };

  const dismiss = (): void => {
    dismissedThisRun = true;
    setDismissed(true);
    (onDismissed ?? focusFirstInput)();
  };

  return (
    <aside aria-labelledby="inapp-title" data-testid="inapp-notice" data-expanded={expanded ? 'true' : 'false'} className="border-b border-warning bg-surface px-4 py-3 text-sm">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-2">
        <div className="flex items-start gap-2">
          <TriangleAlert size={18} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
          <h2 id="inapp-title" className="font-semibold">
            {S.inApp.title}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CopyLink {...copy} inline testId="inapp-copy" />
          {forced ? null : (
            <button type="button" className="btn-secondary" data-testid="inapp-toggle" aria-expanded={open} aria-controls="inapp-details" onClick={() => setOpen((v) => !v)}>
              {open ? S.inApp.howClose : S.inApp.howOpen}
              <ChevronUp size={16} aria-hidden="true" className={open ? '' : 'rotate-180'} />
            </button>
          )}
          {forced ? null : (
            <button type="button" className="btn-secondary ml-auto" data-testid="inapp-dismiss" aria-label={S.inApp.dismiss} onClick={dismiss}>
              <X size={18} aria-hidden="true" />
            </button>
          )}
        </div>
        {expanded ? (
          <div id="inapp-details" className="text-muted" data-testid="inapp-details">
            <p>{S.inApp.summary}</p>
            <ol className="my-1 list-decimal pl-5">
              {S.inApp.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p>{S.inApp.proceed}</p>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
