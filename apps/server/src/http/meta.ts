import type { MetaResponse } from '@meetlite/shared';
import type { Config } from '../config';

/**
 * `stun:host:3478?transport=udp`, `turns://[::1]:5349` 같은 ICE URI에서 호스트명만 뽑는다.
 * stun/turn URI는 `URL` 파서가 호스트를 돌려주지 않아 직접 자른다. 포트·쿼리·자격 정보는 버린다.
 */
export function iceHost(uri: string): string | null {
  const m = /^(?:stuns?|turns?):(?:\/\/)?(\[[0-9A-Fa-f:.]+\]|[^\s/?:#@[\]]+)(?::\d+)?(?:[/?#].*)?$/i.exec(uri.trim());
  return m?.[1] ?? null;
}

const hosts = (uris: readonly string[] | undefined): string[] => [...new Set((uris ?? []).map(iceHost).filter((h): h is string => h !== null))];

export function buildMeta(config: Config): MetaResponse {
  return {
    v: 1,
    operator: { contact: config.OPERATOR_CONTACT ?? null, privacyOfficer: config.PRIVACY_OFFICER ?? null },
    legal: { effectiveDate: config.LEGAL_EFFECTIVE_DATE ?? null },
    network: { stunHosts: hosts(config.STUN_URLS), turnHosts: hosts(config.TURN_URLS) },
  };
}
