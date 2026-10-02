import type * as React from 'react';
import { ERROR_CODES, JoinRequestSchema, type JoinRequest, type RoomStatusResponse } from '@meetlite/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { findAll, mount } from '../testing/hookHarness';

// 7단계 통합: 서버 오류 코드(shared) → 컨트롤러 결과 → RoomPage 화면·문구(strings) 매핑 전수.
// 서버 쪽 코드 생성은 clientServerWire.test.ts(IT-63)가 실제 서버로 확인한다. 여기서는 "코드가 오면 사용자가 무엇을 보는가"를 전수한다.

vi.mock('react', async (orig) => {
  const actual = await orig<typeof React>();
  const { fakeHooks } = await import('../testing/hookHarness');
  const hooks = { ...fakeHooks, useCallback: <T>(fn: T): T => fn };
  return { ...actual, ...hooks, default: { ...actual, ...hooks } };
});
const h = vi.hoisted(() => ({ status: vi.fn(), join: vi.fn(), sent: [] as unknown[] }));
vi.mock('../lib/api', () => ({ getRoomStatus: (...a: unknown[]) => h.status(...a) }));
vi.mock('../lib/media', () => ({ supportsMedia: () => true, LocalMedia: class { stopAll(): void {} } }));
vi.mock('../lib/storage', () => ({ loadHostClaim: () => undefined, loadNickname: () => '', saveNickname: vi.fn(), clearHostClaim: vi.fn() }));
vi.mock('../state/MeetingController', () => ({
  MeetingController: class {
    join(p: unknown): Promise<unknown> {
      return h.join(p);
    }
    dispose(): void {}
  },
}));
vi.mock('../components/CopyLink', () => ({ CopyLink: () => null }));
vi.mock('../components/InAppNotice', () => ({ InAppNotice: () => null }));
vi.mock('../components/StateScreen', () => ({ StateScreen: () => null }));
vi.mock('../components/icons', () => ({ Lock: () => null, TriangleAlert: () => null, Users: () => null, VideoOff: () => null }));
vi.mock('./../pages/Lobby', () => ({ Lobby: () => null }));
vi.mock('./../pages/Room', () => ({ Room: () => null }));

import { StateScreen } from '../components/StateScreen';
import { Lobby } from '../pages/Lobby';
import { Room } from '../pages/Room';
import { RoomPage } from '../pages/RoomPage';
import type { EndReason } from '../state/MeetingController';
import { S, errorText } from '../strings';

const ROOM = 'M'.repeat(22);
const status = (over: Partial<RoomStatusResponse> = {}): { ok: true; data: RoomStatusResponse } => ({ ok: true, data: { v: 1, exists: true, hostPresent: true, locked: false, full: false, needsPassword: true, ...over } });
const flush = async (): Promise<void> => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};
type El = { type?: unknown; props: Record<string, unknown> };
const screenTitle = (tree: ReactNode): string | undefined => {
  const el = findAll(tree, (e) => e.type === StateScreen)[0];
  return el ? String(el.props.title) : undefined;
};
const screenBody = (tree: ReactNode): string => String(findAll(tree, (e) => e.type === StateScreen)[0]?.props.body);

const mountPage = () => mount(RoomPage, { roomId: ROOM, navigate: vi.fn() });
async function lobby(): Promise<{ m: ReturnType<typeof mountPage>; onJoin: (n: string, p: string) => Promise<string | null> }> {
  const m = mountPage();
  await flush();
  const el = m.tree as unknown as El;
  expect(el.type).toBe(Lobby);
  return { m, onJoin: el.props.onJoin as (n: string, p: string) => Promise<string | null> };
}

beforeEach(() => {
  h.status.mockReset().mockResolvedValue(status());
  h.join.mockReset();
  h.sent.length = 0;
});

// 대기실 입장 결과 → [화면 전환 제목 | 입력 화면에 남는 문구]
const JOIN_EXPECT: Record<string, { screen?: () => string; message?: () => string }> = {
  ROOM_FULL: { screen: () => S.state.full.title },
  ROOM_LOCKED: { screen: () => S.state.locked.title },
  KICKED: { screen: () => S.state.kicked.title },
  ROOM_NOT_FOUND: { screen: () => S.state.gone.title },
  HOST_NOT_PRESENT: { screen: () => S.state.waitHost.title },
  WRONG_PASSWORD: { message: () => S.lobby.wrongPassword },
  TOO_MANY_ATTEMPTS: { message: () => S.lobby.tooManyAttempts },
  INVALID_PAYLOAD: { message: () => S.lobby.invalidNickname },
  RATE_LIMITED: { message: () => S.lobby.rateLimited },
  SERVER_BUSY: { message: () => S.lobby.serverBusy }, // DEF-S-02 수정
};

describe('F1 오류 코드 → 대기실 결과 전수 (ERROR_CODES 19종 + NETWORK)', () => {
  it('IT-74 [UX-02,UX-03,FR-06,FR-07,FR-23] 입장 응답 코드 전부가 화면 전환 또는 입력 화면 문구로 연결되고, 매핑 없는 코드는 일반 오류 문구(원인 불명 안내)로 떨어진다', async () => {
    const generic = new Set<string>();
    for (const code of [...ERROR_CODES, 'NETWORK']) {
      h.status.mockResolvedValue(status());
      h.join.mockResolvedValue({ ok: false, code });
      const { m, onJoin } = await lobby();
      const msg = await onJoin('Nick', 'secret1');
      const exp = JOIN_EXPECT[code];
      if (exp?.screen) {
        expect(msg, code).toBeNull();
        expect(screenTitle(m.tree), code).toBe(exp.screen());
      } else {
        expect(msg, code).toBe(exp?.message ? exp.message() : S.state.error.body);
        if (!exp) generic.add(code);
      }
      m.unmount();
    }
    // 일반 문구로 떨어지는 코드는 "입장 시도에서 사용자 조작으로 만들어지지 않는" 코드뿐이어야 한다
    expect([...generic].sort()).toEqual(['ALREADY_JOINED', 'CANNOT_KICK_SELF', 'FORBIDDEN', 'INTERNAL', 'NETWORK', 'NOT_JOINED', 'PARTICIPANT_GONE', 'SCREEN_BUSY', 'TARGET_NOT_FOUND', 'TOKEN_INVALID']);
    expect(S.state.error.body.length).toBeGreaterThan(10);
  });

  it('IT-75 [UX-03,SEC-02,FR-05] 대기실에서 올바른 닉네임과 너무 짧은 비밀번호를 보내면 서버 스키마가 INVALID_PAYLOAD로 거부하는데 화면은 닉네임 안내가 아니라 비밀번호 원인을 알려야 한다 (DEF-I-01 재현)', async () => {
    // 서버의 zod 경계를 shared 스키마 그대로 흉내 낸다(IT-63이 실제 서버로 같은 코드를 확인한다)
    h.join.mockImplementation((p: Record<string, unknown>) => {
      const req: JoinRequest = { v: 1, roomId: p.roomId as string, nickname: p.nickname as string, ...(p.password ? { password: p.password as string } : {}) };
      h.sent.push(req);
      return Promise.resolve(JoinRequestSchema.safeParse(req).success ? { ok: true } : { ok: false, code: 'INVALID_PAYLOAD' });
    });
    const { onJoin } = await lobby();
    const msg = await onJoin('ValidNick', 'ab');
    expect(h.sent).toHaveLength(1); // 서버까지 갔다 왔다(대기실이 막지 않았다)
    // 수정 완료(DEF-I-01): 닉네임 안내가 아니라 비밀번호 안내가 나온다
    expect(msg).toBe(S.lobby.invalidPassword);
    const ok = await onJoin('Bad Nick!', 'abcd');
    expect(ok).toBe(S.lobby.invalidNickname);
  });
});

describe('F1·F2 종료 사유(EndReason) → 종료 화면 전수', () => {
  const REASONS: Record<EndReason, () => string> = {
    left: () => S.state.left.title,
    kicked: () => S.state.kicked.title,
    expired: () => S.state.expired.title,
    closed: () => S.state.gone.title,
    restarted: () => S.state.gone.title,
    operator: () => S.state.gone.operatorTitle,
  };
  it('IT-76 [FR-21,FR-22,POL-19,UX-02] 컨트롤러가 내는 종료 사유 6종이 서로 다른 의도의 종료 화면으로 가고 restarted·operator는 본문이 다르다', async () => {
    h.join.mockResolvedValue({ ok: true });
    for (const [reason, title] of Object.entries(REASONS)) {
      const { m, onJoin } = await lobby();
      expect(await onJoin('Nick', 'secret1')).toBeNull();
      const live = m.tree as unknown as El;
      expect(live.type).toBe(Room);
      (live.props.onEnded as (r: EndReason) => void)(reason as EndReason);
      expect(screenTitle(m.tree), reason).toBe(title());
      if (reason === 'restarted') expect(screenBody(m.tree)).toBe(S.state.gone.restarted);
      if (reason === 'closed') expect(screenBody(m.tree)).toBe(S.state.gone.closed);
      if (reason === 'operator') expect(screenBody(m.tree)).toBe(S.state.gone.operator);
      m.unmount();
    }
    expect(new Set([S.state.gone.restarted, S.state.gone.closed, S.state.gone.operator]).size).toBe(3);
  });
});

describe('호스트 동작 오류 → 토스트 문구(errorText)', () => {
  it('IT-77 [FR-14,FR-15,FR-16,UX-03] errorText: 서버가 호스트 동작에서 돌려줄 수 있는 코드는 모두 비어 있지 않은 문구가 되고 FORBIDDEN·RATE_LIMITED는 전용 문구다', () => {
    for (const code of [...ERROR_CODES, 'NETWORK']) expect(errorText(code).length, code).toBeGreaterThan(5);
    expect(errorText('FORBIDDEN')).toBe(S.room.forbidden);
    expect(errorText('RATE_LIMITED')).toBe(S.lobby.rateLimited);
    expect(errorText('TARGET_NOT_FOUND')).toBe(S.room.actionFailed);
  });
});
