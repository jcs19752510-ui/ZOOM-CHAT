import { useEffect } from 'react';
import type { MeetingController } from './MeetingController';

/** 백그라운드·화면 잠금에서 돌아오면 컨트롤러에 알린다(UX-14). visibilitychange와 pageshow가 겹쳐도 한 번만 전달한다. */
export function useForeground(controller: MeetingController): void {
  useEffect(() => {
    let last = 0;
    const fire = (source: 'visibility' | 'pageshow'): void => {
      const now = Date.now();
      if (now - last < 500) return;
      last = now;
      void controller.onForeground(source);
    };
    const onVisible = (): void => {
      if (document.visibilityState === 'visible') fire('visibility');
    };
    document.addEventListener('visibilitychange', onVisible);
    const onPageShow = (): void => fire('pageshow');
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [controller]);
}
