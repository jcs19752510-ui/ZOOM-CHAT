import type * as React from 'react';
import type { RoomStatusResponse } from '@meetlite/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { byType, findAll, fire, mount, textOf } from '../testing/hookHarness';

vi.mock('react', async (orig) => {
  const actual = await orig<typeof React>();
  const { fakeHooks } = await import('../testing/hookHarness');
  const hooks = { ...fakeHooks, useCallback: <T>(fn: T): T => fn };
  return { ...actual, ...hooks, default: { ...actual, ...hooks } };
});
const status = vi.hoisted(() => vi.fn());
vi.mock('../lib/api', () => ({ getRoomStatus: (...a: unknown[]) => status(...a) }));
vi.mock('../lib/media', () => ({ supportsMedia: () => true, LocalMedia: class { stopAll(): void {} } }));
vi.mock('../lib/storage', () => ({ loadHostClaim: () => undefined, loadNickname: () => '', saveNickname: vi.fn(), clearHostClaim: vi.fn() }));
vi.mock('../state/MeetingController', () => ({ MeetingController: class {} }));
vi.mock('../components/CopyLink', () => ({ CopyLink: () => null }));
vi.mock('../components/InAppNotice', () => ({ InAppNotice: () => null }));
vi.mock('../components/StateScreen', () => ({ StateScreen: () => null }));
vi.mock('../components/icons', () => ({ Lock: () => null, TriangleAlert: () => null, Users: () => null, VideoOff: () => null }));
vi.mock('./Lobby', () => ({ Lobby: () => null }));
vi.mock('./Room', () => ({ Room: () => null }));

import { StateScreen } from '../components/StateScreen';
import { S } from '../strings';
import { Lobby } from './Lobby';
import { RoomPage } from './RoomPage';

// 소급 6단계(unit-06): 의존성 배열을 따르는 훅 실행기로 "다시 시도"가 방 상태를 실제로 다시 묻는지 시험한다(기존 RoomPage 시험의 가짜 훅은 deps를 무시한다).
const ROOM = 'E'.repeat(22);
const ok = (over: Partial<RoomStatusResponse> = {}): { ok: true; data: RoomStatusResponse } => ({ ok: true, data: { v: 1, exists: true, hostPresent: true, locked: false, full: false, needsPassword: false, ...over } });
const flush = async (): Promise<void> => {
  for (let i = 0; i < 6; i++) await Promise.resolve();
};
const title = (tree: ReactNode): string => String(findAll(tree, (e) => e.type === StateScreen)[0]?.props.title);
const navigate = vi.fn();
beforeEach(() => {
  status.mockReset();
  navigate.mockReset();
});

describe('RoomPage 다시 시도 (unit-06 보강, FR-06)', () => {
  it('TC-524 [FR-06,UX-02] 오류 화면의 "다시 시도"는 즉시 "확인 중" 화면으로 돌아가고 방 상태를 다시 물어 성공하면 대기실로 넘어간다', async () => {
    status.mockResolvedValueOnce({ ok: false, code: 'NETWORK' });
    const m = mount(RoomPage, { roomId: ROOM, navigate });
    await flush();
    expect(title(m.tree)).toBe(S.state.error.title);
    expect(status).toHaveBeenCalledTimes(1);
    status.mockResolvedValueOnce(ok());
    const retry = byType(m.tree, 'button').find((b) => textOf(b) === S.state.error.retry);
    fire(retry, 'onClick');
    expect(title(m.tree)).toBe(S.state.loading.title); // 응답 전에 오류 화면이 남아 있으면 안 된다
    await flush();
    expect(status).toHaveBeenCalledTimes(2);
    const tree = m.tree as { type?: unknown };
    expect(tree.type).toBe(Lobby);
  });

  it('TC-524b [FR-23] 호스트 대기 중 호스트가 들어오면(폴링) 같은 방 상태 확인이 다시 실행되어 대기실로 넘어간다', async () => {
    vi.useFakeTimers();
    try {
      status.mockResolvedValueOnce(ok({ hostPresent: false }));
      const m = mount(RoomPage, { roomId: ROOM, navigate });
      await flush();
      expect(title(m.tree)).toBe(S.state.waitHost.title);
      status.mockResolvedValue(ok());
      await vi.advanceTimersByTimeAsync(2500);
      await flush();
      expect((m.tree as { type?: unknown }).type).toBe(Lobby);
      m.unmount();
    } finally {
      vi.useRealTimers();
    }
  });
});
