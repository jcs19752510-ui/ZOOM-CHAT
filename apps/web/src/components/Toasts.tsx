import type { Toast } from '../state/MeetingController';

/** 입퇴장·호스트 변경 등 알림. 스크린리더에도 읽히도록 aria-live 영역으로 둔다(UX-12). */
export function Toasts({ toasts }: { toasts: Toast[] }) {
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 top-16 z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div key={t.id} className={`pointer-events-auto max-w-md rounded-md border px-4 py-2 text-sm shadow-pop ${t.kind === 'warn' ? 'border-warning bg-surface text-text' : 'border-line bg-raised text-text'}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}
