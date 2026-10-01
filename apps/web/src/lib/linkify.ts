export type Segment = { type: 'text'; value: string } | { type: 'link'; href: string; label: string };

const URL_RE = /https?:\/\/[^\s<>"'`]+/gi;
const TRAILING = /[.,;:!?)\]}'"。，、]+$/;

/**
 * 채팅 본문을 텍스트와 링크 조각으로 나눈다(SEC-07). http/https만 링크로 만들고 그 밖의 모든 것은 텍스트다.
 * 결과는 React 요소로만 그리며 HTML 문자열로 만들지 않는다.
 */
export function linkify(text: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    const start = m.index ?? 0;
    let raw = m[0];
    const trimmed = raw.replace(TRAILING, '');
    const tail = raw.slice(trimmed.length);
    raw = trimmed;
    let href: string | null = null;
    try {
      const u = new URL(raw);
      if (u.protocol === 'http:' || u.protocol === 'https:') href = u.href;
    } catch {
      href = null;
    }
    if (!href) continue;
    if (start > last) out.push({ type: 'text', value: text.slice(last, start) });
    out.push({ type: 'link', href, label: raw });
    last = start + raw.length;
    if (tail) {
      out.push({ type: 'text', value: tail });
      last += tail.length;
    }
  }
  if (last < text.length) out.push({ type: 'text', value: text.slice(last) });
  return out;
}

/** 링크/방 코드 입력에서 방 ID를 뽑는다. 못 찾으면 null. */
export function extractRoomId(input: string): string | null {
  const s = input.trim();
  if (/^[A-Za-z0-9_-]{22}$/.test(s)) return s;
  try {
    const u = new URL(s);
    const m = u.pathname.match(/^\/r\/([A-Za-z0-9_-]{22})\/?$/);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}
