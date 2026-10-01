import { useCallback, useEffect, useState } from 'react';

/** 라우트는 `/`(랜딩)와 `/r/:roomId` 두 개뿐이라 history API로 직접 처리한다. */
export function useRoute(): { path: string; navigate: (to: string, replace?: boolean) => void } {
  const [path, setPath] = useState(() => window.location.pathname);
  useEffect(() => {
    const onPop = (): void => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const navigate = useCallback((to: string, replace = false) => {
    if (replace) window.history.replaceState(null, '', to);
    else window.history.pushState(null, '', to);
    setPath(window.location.pathname);
  }, []);
  return { path, navigate };
}

export const parseRoomPath = (path: string): string | null => path.match(/^\/r\/([A-Za-z0-9_-]{22})\/?$/)?.[1] ?? null;
