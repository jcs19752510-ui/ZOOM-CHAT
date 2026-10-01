import type { MetaResponse } from '@meetlite/shared';

export type LegalKind = 'privacy' | 'terms' | 'contact';

export function parseLegalPath(path: string): LegalKind | null {
  const m = /^\/(privacy|terms|contact)\/?$/.exec(path);
  return m ? (m[1] as LegalKind) : null;
}

// 서버 config의 이메일 규칙과 같다. 링크 주입(`javascript:...@x.com`)을 막는 마지막 방어선이다(R-1).
const EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;

export type ContactLink = { kind: 'mail'; text: string; href: string } | { kind: 'web'; text: string; href: string } | { kind: 'text'; text: string };

/**
 * 운영자 연락처를 링크로 만들 수 있는지 판단한다. href는 `mailto:`(엄격한 이메일만)와 `https:`(URL 파서 통과)로만
 * 만들고, 그 밖의 값(`javascript:`, `data:`, 형식 오류)은 링크 없이 텍스트로만 보인다.
 */
export function contactLink(value: string): ContactLink {
  if (EMAIL.test(value)) return { kind: 'mail', text: value, href: `mailto:${value}` };
  if (/^https:\/\//i.test(value) && !/\s/.test(value)) {
    try {
      const u = new URL(value);
      if (u.protocol === 'https:' && u.hostname) return { kind: 'web', text: value, href: u.href };
    } catch {
      // 형식 오류는 텍스트로 표시한다
    }
  }
  return { kind: 'text', text: value };
}

/** `YYYY-MM-DD`가 실제 존재하는 날짜면 분해해 돌려주고, 아니면 null(= 미정 취급). */
export function parseDate(value: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = new Date(Date.UTC(y, mo - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d ? { y, m: mo, d } : null;
}

const isStrOrNull = (v: unknown): v is string | null => v === null || typeof v === 'string';
const isStrArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** 서버 응답(시스템 경계)을 확인한다. 모양이 다르면 null이라 화면은 "불러오지 못함"으로 처리한다. */
export function parseMeta(raw: unknown): MetaResponse | null {
  if (!isObj(raw) || raw.v !== 1) return null;
  const { operator, legal, network } = raw;
  if (!isObj(operator) || !isStrOrNull(operator.contact) || !isStrOrNull(operator.privacyOfficer)) return null;
  if (!isObj(legal) || !isStrOrNull(legal.effectiveDate)) return null;
  if (!isObj(network) || !isStrArray(network.stunHosts) || !isStrArray(network.turnHosts)) return null;
  return {
    v: 1,
    operator: { contact: operator.contact, privacyOfficer: operator.privacyOfficer },
    legal: { effectiveDate: legal.effectiveDate },
    network: { stunHosts: network.stunHosts, turnHosts: network.turnHosts },
  };
}
