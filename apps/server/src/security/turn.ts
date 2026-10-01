import { createHmac } from 'node:crypto';
import type { IceServerConfig } from '@meetlite/shared';
import type { Config } from '../config';

/** STUN과 (설정 시) TURN 임시 자격증명. coturn `use-auth-secret` 방식(SEC-09). */
export function buildIceServers(config: Config, participantId: string, nowMs: number): IceServerConfig[] {
  const servers: IceServerConfig[] = [{ urls: config.STUN_URLS }];
  if (config.TURN_URLS?.length && config.TURN_SECRET) {
    const expiry = Math.floor(nowMs / 1000) + config.TURN_TTL_SEC;
    const username = `${expiry}:${participantId}`;
    const credential = createHmac('sha1', config.TURN_SECRET).update(username).digest('base64');
    servers.push({ urls: config.TURN_URLS, username, credential });
  }
  return servers;
}
