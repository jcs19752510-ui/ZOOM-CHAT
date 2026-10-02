import type { RoomStatusResponse } from '@meetlite/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { S } from '../strings';

// React 훅을 최소 구현으로 대체하고 RoomPage를 함수로 직접 호출해, 방 상태 확인(FR-06)·입장 결과 처리·종료 사유 화면을 DOM 없이 시험한다.
const r = vi.hoisted(() => {
  const cells: unknown[] = [];
  const effects: (() => void | (() => void))[] = [];
  return {
    cells,
    effects,
    idx: { i: 0 },
    supports: true,
    status: vi.fn(),
    joinResult: { ok: true } as { ok: true } | { ok: false; code: string },
    controllers: [] as { disposed: number; joinArgs: unknown }[],
    medias: [] as { stopped: number }[],
    hostClaim: undefined as string | undefined,
    loadHostClaim: vi.fn(),
    saveNickname: vi.fn(),
    clearHostClaim: vi.fn(),
  };
});
vi.mock('react', () => ({
  useState: <T>(init: T | (() => T)): [T, (v: T | ((p: T) => T)) => void] => {
    const i = r.idx.i++;
    if (!(i in r.cells)) r.cells[i] = typeof init === 'function' ? (init as () => T)() : init;
    return [r.cells[i] as T, (v) => void (r.cells[i] = typeof v === 'function' ? (v as (p: T) => T)(r.cells[i] as T) : v)];
  },
  useRef: <T>(init: T) => {
    const i = r.idx.i++;
    if (!(i in r.cells)) r.cells[i] = { current: init };
    return r.cells[i] as { current: T };
  },
  useEffect: (fn: () => void | (() => void)) => void r.effects.push(fn),
  useCallback: <T>(fn: T) => fn,
}));
vi.mock('../lib/api', () => ({ getRoomStatus: (...a: unknown[]) => r.status(...a) }));
vi.mock('../lib/media', () => ({
  supportsMedia: () => r.supports,
  LocalMedia: class {
    stopped = 0;
    constructor() {
      r.medias.push(this);
    }
    stopAll(): void {
      this.stopped++;
    }
  },
}));
vi.mock('../lib/storage', () => ({
  loadHostClaim: (...a: unknown[]) => (r.loadHostClaim(...a), r.hostClaim),
  loadNickname: () => '저장닉',
  saveNickname: (...a: unknown[]) => r.saveNickname(...a),
  clearHostClaim: (...a: unknown[]) => r.clearHostClaim(...a),
}));
vi.mock('../state/MeetingController', () => ({
  MeetingController: class {
    disposed = 0;
    joinArgs: unknown;
    constructor() {
      r.controllers.push(this);
    }
    join(a: unknown): Promise<unknown> {
      this.joinArgs = a;
      return Promise.resolve(r.joinResult);
    }
    dispose(): void {
      this.disposed++;
    }
  },
}));
vi.mock('../components/CopyLink', () => ({ CopyLink: () => null }));
vi.mock('../components/InAppNotice', () => ({ InAppNotice: () => null }));
vi.mock('../components/StateScreen', () => ({ StateScreen: () => null }));
vi.mock('../components/icons', () => ({ Lock: () => null, TriangleAlert: () => null, Users: () => null, VideoOff: () => null }));
vi.mock('./Lobby', () => ({ Lobby: () => null }));
vi.mock('./Room', () => ({ Room: () => null }));

import { StateScreen } from '../components/StateScreen';
import { Lobby } from './Lobby';
import { Room } from './Room';
import { RoomPage } from './RoomPage';

interface El {
  type: unknown;
  props: Record<string, unknown> & { children?: unknown };
}
const ROOM = 'D'.repeat(22);
const navigate = vi.fn();
const st = (over: Partial<RoomStatusResponse> = {}): RoomStatusResponse => ({ v: 1, exists: true, hostPresent: true, locked: false, full: false, needsPassword: false, ...over });
const render = (): El | null => {
  r.idx.i = 0;
  r.effects.length = 0;
  return RoomPage({ roomId: ROOM, navigate }) as unknown as El | null;
};
const flush = async (): Promise<void> => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};
/** 방 상태 확인 효과를 돌려 결과 화면을 돌려준다. */
async function enter(status: RoomStatusResponse | { ok: false }): Promise<El | null> {
  r.status.mockResolvedValue('ok' in status ? status : { ok: true, data: status });
  render();
  r.effects[0]?.();
  await flush();
  return render();
}
const screen = (e: El | null): { title: string; body: string } => {
  expect(e?.type).toBe(StateScreen);
  return { title: String(e?.props.title), body: String(e?.props.body) };
};

const join = async (nick = '민지', pw = ''): Promise<{ msg: string | null; page: El | null }> => {
  const lobby = await enter(st());
  const onJoin = lobby?.props.onJoin as (n: string, p: string) => Promise<string | null>;
  const msg = await onJoin(nick, pw);
  return { msg, page: render() };
};

beforeEach(() => {
  vi.useFakeTimers();
  r.cells.length = 0;
  r.supports = true;
  r.hostClaim = undefined;
  r.joinResult = { ok: true };
  r.controllers.length = 0;
  r.medias.length = 0;
  for (const f of [r.status, r.loadHostClaim, r.saveNickname, r.clearHostClaim, navigate]) f.mockReset();
});
afterEach(() => vi.useRealTimers());

const find = (e: unknown, type: unknown): El | null => {
  if (!e || typeof e !== 'object') return null;
  if (Array.isArray(e)) {
    for (const c of e) {
      const f = find(c, type);
      if (f) return f;
    }
    return null;
  }
  const el = e as El;
  if (el.type === type) return el;
  return find(el.props?.children, type);
};
const titleOf = (e: El | null): string => String(find(e, StateScreen)?.props.title);
const bodyOf = (e: El | null): string => String(find(e, StateScreen)?.props.body);

beforeEach(() => {
  vi.useFakeTimers();
  r.cells.length = 0;
  r.supports = true;
  r.hostClaim = undefined;
  r.joinResult = { ok: true };
  r.controllers.length = 0;
  r.medias.length = 0;
  for (const f of [r.status, r.loadHostClaim, r.saveNickname, r.clearHostClaim, navigate]) f.mockReset();
});
afterEach(() => vi.useRealTimers());

describe('RoomPage 방 상태 확인 (unit-06 보강, FR-06, FR-23, UX-02)', () => {
  it('TC-514 [FR-06,UX-02] 미디어 미지원이면 방 상태를 묻지 않고 "지원 안 됨"(링크 복사 포함), 지원하면 "확인 중"에서 시작한다', () => {
    r.supports = false;
    expect(titleOf(render())).toBe(S.state.unsupported.title);
    r.effects[0]?.();
    expect(r.status).not.toHaveBeenCalled();
    r.cells.length = 0;
    r.supports = true;
    expect(titleOf(render())).toBe(S.state.loading.title);
  });

  it('TC-514b [FR-06,FR-23,UX-02] 방 상태별 화면: 조회 실패=오류, 없는 방=방 없음, 호스트 미입장=대기, 잠김=잠김, 정원=가득 참, 정상=대기실(미디어 새로 준비)', async () => {
    expect(titleOf(await enter({ ok: false }))).toBe(S.state.error.title);
    r.cells.length = 0;
    expect(screen(await enter(st({ exists: false }))).title).toBe(S.state.gone.title);
    r.cells.length = 0;
    expect(titleOf(await enter(st({ hostPresent: false })))).toBe(S.state.waitHost.title);
    r.cells.length = 0;
    expect(titleOf(await enter(st({ locked: true })))).toBe(S.state.locked.title);
    r.cells.length = 0;
    expect(titleOf(await enter(st({ full: true })))).toBe(S.state.full.title);
    r.cells.length = 0;
    r.medias.length = 0;
    const lobby = await enter(st({ needsPassword: true }));
    expect(lobby?.type).toBe(Lobby);
    expect(lobby?.props).toMatchObject({ roomId: ROOM, isHost: false, needsPassword: true, initialNickname: '저장닉' });
    expect(r.medias.length).toBe(1);
  });

  it('TC-514c [FR-06,FR-02] 호스트 클레임이 있는 방 생성자는 호스트가 아직 없어도, 방이 잠겨 있어도 대기실로 들어가며 호스트로 표시된다. 단 정원이 차면 막힌다', async () => {
    r.hostClaim = 'HC';
    for (const over of [{ hostPresent: false }, { locked: true }]) {
      r.cells.length = 0;
      const lobby = await enter(st(over));
      expect(lobby?.type, JSON.stringify(over)).toBe(Lobby);
      expect(lobby?.props.isHost).toBe(true);
    }
    r.cells.length = 0;
    expect(titleOf(await enter(st({ full: true })))).toBe(S.state.full.title);
  });

  it('TC-514d [FR-03] 호스트 클레임은 마운트 때 한 번만 읽는다(여러 번 렌더해도 저장소를 다시 읽지 않는다)', async () => {
    r.hostClaim = 'HC';
    await enter(st());
    render();
    render();
    expect(r.loadHostClaim).toHaveBeenCalledTimes(1);
    expect(r.loadHostClaim).toHaveBeenCalledWith(ROOM);
  });
});

describe('RoomPage 호스트 대기 (unit-06 보강, FR-23)', () => {
  it('TC-515 [FR-23] 호스트 대기 중 2.5초마다 확인해 호스트가 들어오면 방 상태 확인을 다시 시작하고, 방이 사라지면 방 없음으로, 조회 실패는 조용히 재시도하며, 떠나면 타이머를 멈춘다', async () => {
    await enter(st({ hostPresent: false }));
    const cleanupEffect = r.effects[1]?.();
    r.status.mockClear();
    r.status.mockResolvedValue({ ok: false, code: 'NETWORK' });
    await vi.advanceTimersByTimeAsync(2500);
    expect(r.status).toHaveBeenCalledTimes(1);
    expect(titleOf(render())).toBe(S.state.waitHost.title); // 일시 실패는 화면을 바꾸지 않는다
    r.status.mockResolvedValue({ ok: true, data: st({ hostPresent: false }) });
    await vi.advanceTimersByTimeAsync(2500);
    expect(titleOf(render())).toBe(S.state.waitHost.title);
    expect(r.cells.includes(1)).toBe(false); // attempt는 아직 0
    r.status.mockResolvedValue({ ok: true, data: st({ hostPresent: true }) });
    await vi.advanceTimersByTimeAsync(2500);
    expect(r.cells.includes(1)).toBe(true); // 확인 재시작(attempt+1)
    (cleanupEffect as () => void)();
    r.status.mockClear();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(r.status).not.toHaveBeenCalled();
  });

  it('TC-515b [FR-23] 대기 중 방이 사라지면 방 없음 화면으로 바뀌고, 대기 상태가 아니면 폴링 효과가 타이머를 만들지 않는다', async () => {
    await enter(st({ hostPresent: false }));
    const stop = r.effects[1]?.();
    r.status.mockResolvedValue({ ok: true, data: st({ exists: false }) });
    await vi.advanceTimersByTimeAsync(2500);
    expect(titleOf(render())).toBe(S.state.gone.title);
    (stop as () => void)();
    r.cells.length = 0;
    await enter(st());
    r.effects[1]?.();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('RoomPage 입장 결과 처리 (unit-06 보강, FR-06, FR-16, SEC-03)', () => {
  it('TC-516 [FR-03,SEC-03] 입장 성공: 닉네임을 저장하고 호스트 클레임을 지우며(재사용 방지) 회의실로 넘어간다. 비밀번호·호스트 클레임은 있을 때만 전달한다', async () => {
    r.hostClaim = 'HC';
    const { msg, page } = await join('민지', 'pw-1');
    expect(msg).toBeNull();
    expect(r.saveNickname).toHaveBeenCalledWith('민지');
    expect(r.clearHostClaim).toHaveBeenCalledWith(ROOM);
    expect(page?.type).toBe(Room);
    expect(page?.props.roomId).toBe(ROOM);
    expect(r.controllers[0]?.joinArgs).toMatchObject({ roomId: ROOM, nickname: '민지', password: 'pw-1', hostClaim: 'HC' });
    r.cells.length = 0;
    r.hostClaim = undefined;
    r.controllers.length = 0;
    await join('수진', '');
    const args = r.controllers[0]?.joinArgs as Record<string, unknown>;
    expect('password' in args).toBe(false);
    expect('hostClaim' in args).toBe(false);
  });

  it('TC-516b [FR-06,FR-16,UX-03] 입장 거부 코드별 처리: 화면 전환(가득 참·잠김·강퇴·방 없음·호스트 대기)과 입력 화면에 남는 안내(비밀번호·시도 초과·닉네임·속도 제한·기타)가 맞고, 실패한 컨트롤러는 정리되며 닉네임은 저장하지 않는다', async () => {
    const screens: [string, string][] = [['ROOM_FULL', S.state.full.title], ['ROOM_LOCKED', S.state.locked.title], ['KICKED', S.state.kicked.title], ['ROOM_NOT_FOUND', S.state.gone.title], ['HOST_NOT_PRESENT', S.state.waitHost.title]];
    for (const [code, title] of screens) {
      r.cells.length = 0;
      r.joinResult = { ok: false, code };
      r.controllers.length = 0;
      const { msg, page } = await join();
      expect(msg, code).toBeNull();
      expect(titleOf(page), code).toBe(title);
      expect(r.controllers[0]?.disposed, code).toBe(1);
    }
    const messages: [string, string][] = [['WRONG_PASSWORD', S.lobby.wrongPassword], ['TOO_MANY_ATTEMPTS', S.lobby.tooManyAttempts], ['INVALID_PAYLOAD', S.lobby.invalidNickname], ['RATE_LIMITED', S.lobby.rateLimited], ['NETWORK', S.state.error.body], ['INTERNAL', S.state.error.body]];
    for (const [code, text] of messages) {
      r.cells.length = 0;
      r.joinResult = { ok: false, code };
      r.controllers.length = 0;
      const { msg, page } = await join();
      expect(msg, code).toBe(text);
      expect(page?.type, code).toBe(Lobby); // 입력 화면에 남는다
      expect(r.controllers[0]?.disposed, code).toBe(1);
    }
    expect(r.saveNickname).not.toHaveBeenCalled();
    expect(r.clearHostClaim).not.toHaveBeenCalled();
  });

  it('TC-516c [FR-06] 대기실 미디어가 없는 상태의 입장 시도는 연결하지 않고 일반 오류 안내를 돌려준다', async () => {
    const lobby = await enter(st());
    r.cells.forEach((c, i) => {
      if (c && typeof c === 'object' && 'current' in c) (r.cells[i] as { current: unknown }).current = null; // mediaRef 비우기
    });
    const msg = await (lobby?.props.onJoin as (n: string, p: string) => Promise<string | null>)('a', '');
    expect(msg).toBe(S.state.error.body);
    expect(r.controllers.length).toBe(0);
  });
});

describe('RoomPage 종료 사유 화면 (unit-06 보강, FR-16, FR-21, FR-22, POL-19, UX-02)', () => {
  it('TC-517 [FR-16,FR-21,FR-22,POL-19] 회의 종료 사유별 화면: 강퇴·세션 만료·방 닫힘·서버 재시작·운영자 폐쇄·나가기가 서로 다른 안내로 이어지고, 미디어·컨트롤러 참조를 비운다', async () => {
    const cases: [string, (e: El | null) => void][] = [
      ['kicked', (e) => expect(titleOf(e)).toBe(S.state.kicked.title)],
      ['expired', (e) => expect(titleOf(e)).toBe(S.state.expired.title)],
      ['closed', (e) => (expect(titleOf(e)).toBe(S.state.gone.title), expect(bodyOf(e)).toBe(S.state.gone.closed))],
      ['restarted', (e) => (expect(titleOf(e)).toBe(S.state.gone.title), expect(bodyOf(e)).toBe(S.state.gone.restarted))],
      ['operator', (e) => expect(titleOf(e)).toBe(S.state.gone.operatorTitle)],
      ['left', (e) => expect(titleOf(e)).toBe(S.state.left.title)],
    ];
    for (const [reason, check] of cases) {
      r.cells.length = 0;
      const { page } = await join();
      expect(page?.type).toBe(Room);
      (page?.props.onEnded as (x: string) => void)(reason);
      const after = render();
      check(after);
      expect(after?.type).not.toBe(Room);
    }
  });

  it('TC-517b [FR-22,NFR-02] 페이지를 떠나면(언마운트) 진행 중 회의를 정리하고 카메라·마이크를 해제한다', async () => {
    const { page } = await join();
    expect(page?.type).toBe(Room);
    const media = r.medias.at(-1);
    const cleanup = r.effects[2]?.();
    (cleanup as () => void)();
    expect(r.controllers[0]?.disposed).toBe(1);
    expect(media?.stopped).toBeGreaterThan(0);
  });

  it('TC-517c [FR-06] 상태 확인 응답이 늦게 도착해도 이미 떠난 페이지(alive=false)는 화면을 바꾸지 않는다', async () => {
    let resolve: (v: unknown) => void = () => undefined;
    r.status.mockReturnValue(new Promise((res) => (resolve = res)));
    render();
    const cleanup = r.effects[0]?.();
    (cleanup as () => void)();
    resolve({ ok: true, data: st() });
    await flush();
    expect(titleOf(render())).toBe(S.state.loading.title);
    expect(r.medias.length).toBe(0);
  });
});

describe('RoomPage 자원 정리 보강 (unit-06 보강, FR-22, NFR-02)', () => {
  it('TC-517d [FR-22] 회의가 끝난 뒤 떠날 때는 이미 놓은 컨트롤러·미디어를 다시 건드리지 않는다(참조를 비운다)', async () => {
    const { page } = await join();
    const media = r.medias.at(-1);
    (page?.props.onEnded as (x: string) => void)('left');
    const before = media?.stopped ?? 0;
    (r.effects[2]?.() as () => void)();
    expect(r.controllers[0]?.disposed).toBe(0);
    expect(media?.stopped).toBe(before);
  });

  it('TC-514e [NFR-02,FR-06] 상태 확인을 다시 하면(재시도) 이전 대기실의 카메라·마이크를 먼저 해제하고 새 미디어를 만든다', async () => {
    await enter(st());
    const first = r.medias.at(-1);
    expect(first?.stopped).toBe(0);
    r.effects[0]?.();
    await flush();
    expect(first?.stopped).toBe(1);
    expect(r.medias.length).toBe(2);
  });
});

