import type { ReactNode } from 'react';

interface Props {
  icon?: ReactNode;
  title: string;
  body: string;
  children?: ReactNode;
  /** 스크린리더가 즉시 읽도록 오류 계열 화면에서 사용 */
  alert?: boolean;
}

/** 로딩·오류·권한 거부·방 가득 참 등 모든 상태 화면의 공통 틀. 원인, 해결 방법, 다음 행동 버튼을 갖는다(UX-02, UX-03). */
export function StateScreen({ icon, title, body, children, alert }: Props) {
  return (
    <main className="flex min-h-full items-center justify-center p-4">
      <section role={alert ? 'alert' : 'status'} className="w-full max-w-md rounded-lg border border-line bg-surface p-6 text-center shadow-pop">
        {icon ? <div className="mb-3 flex justify-center text-muted" aria-hidden="true">{icon}</div> : null}
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-muted">{body}</p>
        {children ? <div className="mt-5 flex flex-wrap justify-center gap-2">{children}</div> : null}
      </section>
    </main>
  );
}
