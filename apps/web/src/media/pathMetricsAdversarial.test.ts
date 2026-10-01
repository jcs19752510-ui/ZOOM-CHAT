import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { classifyPath } from './pathType';
import { MeshTransport } from './MeshTransport';
import type { MediaTransportEvents } from './MediaTransport';

// unit-19 6단계 적대 시험: 경로 판정 경계와 MeshTransport의 보고 규칙(NFR-15)

const cand = (id: string, candidateType: unknown): Record<string, unknown> => ({ id, type: 'local-candidate', candidateType });
const pair = (extra: Record<string, unknown> = {}): Record<string, unknown> => ({ id: 'P', type: 'candidate-pair', state: 'succeeded', nominated: true, localCandidateId: 'L', remoteCandidateId: 'R', ...extra });
const transport = (selectedCandidatePairId: unknown): Record<string, unknown> => ({ id: 'T', type: 'transport', selectedCandidatePairId });

describe('경로 판정 적대 시험 (NFR-15)', () => {
  it('TC-416 [NFR-15] 후보 타입 조합표: 한쪽만 relay여도 relay, host/srflx/prflx 조합은 direct, 하나라도 미상이면 relay가 아닌 한 null이다', () => {
    const kinds = ['host', 'srflx', 'prflx', 'relay'];
    for (const l of kinds)
      for (const r of kinds) {
        const want = l === 'relay' || r === 'relay' ? 'relay' : 'direct';
        expect(classifyPath([pair(), cand('L', l), cand('R', r)]), `${l}/${r}`).toBe(want);
      }
    // 한쪽이 relay이면 반대쪽이 미상·누락이어도 relay(릴레이 과소 집계 방지), relay 없이 미상이면 null
    expect(classifyPath([pair(), cand('L', 'relay'), cand('R', 'weird')])).toBe('relay');
    expect(classifyPath([pair(), cand('L', 'relay')])).toBe('relay');
    expect(classifyPath([pair(), cand('L', 'weird'), cand('R', 'weird')])).toBeNull();
    expect(classifyPath([pair(), cand('L', 'host')])).toBeNull();
  });

  it('TC-417 [NFR-15] 대소문자·공백·undefined·프로토타입 이름은 인식하지 않는다(오보 금지): RELAY/Host/" host"/constructor/__proto__는 null', () => {
    for (const bad of ['RELAY', 'Relay', 'HOST', 'Host', ' host', 'host ', 'constructor', '__proto__', 'toString', '', undefined, null, 0, {}, ['host']]) {
      expect(classifyPath([pair(), cand('L', bad), cand('R', 'host')]), String(bad)).toBeNull();
    }
    // RELAY는 relay로도 안 쳐서 반대쪽이 host여도 direct가 되지 않는다
    expect(classifyPath([pair(), cand('L', 'RELAY'), cand('R', 'host')])).toBeNull();
  });

  it('TC-418 [NFR-15] 선택 규칙: selected 우선·없는 id면 nominated+succeeded 폴백·여러 쌍이면 선택된 쌍만·형식이 틀린 selected/transport는 무시', () => {
    const q = pair({ id: 'Q', localCandidateId: 'L2' });
    const base = [cand('L', 'host'), cand('L2', 'relay'), cand('R', 'host')];
    // selected가 relay 쌍을 가리키면 nominated된 direct 쌍이 있어도 relay
    expect(classifyPath([pair(), q, ...base, transport('Q')])).toBe('relay');
    // selected가 가리키는 쌍이 아직 succeeded가 아니어도 selected 규칙이 우선(브라우저가 선택한 쌍)
    expect(classifyPath([pair(), pair({ id: 'Q', localCandidateId: 'L2', state: 'in-progress', nominated: false }), ...base, transport('Q')])).toBe('relay');
    // selected id가 존재하지 않으면 폴백
    expect(classifyPath([pair(), ...base, transport('nope')])).toBe('direct');
    // selected가 쌍이 아닌 후보를 가리키면(형식 이상) 보고하지 않는다
    expect(classifyPath([pair(), ...base, transport('L')])).toBeNull();
    // selected가 비문자열이면 무시하고 폴백
    for (const s of [null, undefined, 5, {}, ['P']]) expect(classifyPath([pair(), ...base, transport(s)]), String(s)).toBe('direct');
    // 폴백: nominated만(succeeded 아님)·succeeded만(nominated 아님)은 null, 둘 다면 첫 번째 쌍
    expect(classifyPath([pair({ nominated: undefined }), ...base])).toBeNull();
    expect(classifyPath([pair({ state: undefined }), ...base])).toBeNull();
    expect(classifyPath([pair({ nominated: 'true' }), ...base])).toBeNull();
    expect(classifyPath([pair({ state: 'Succeeded' }), ...base])).toBeNull();
    expect(classifyPath([q, pair({ id: 'P2' }), ...base])).toBe('relay'); // 첫 nominated+succeeded 쌍(q)
    // 쌍은 있는데 후보 보고가 전혀 없음
    expect(classifyPath([pair()])).toBeNull();
  });

  it('TC-419 [NFR-15] 입력 형식: Map.values()·Set·제너레이터도 받고, 빈/잡다한 항목·id 충돌·거대한 통계에서도 예외 없이 제때 끝난다', () => {
    const m = new Map<string, unknown>([['P', pair()], ['L', cand('L', 'srflx')], ['R', cand('R', 'host')]]);
    expect(classifyPath(m.values())).toBe('direct');
    expect(classifyPath(new Set([pair(), cand('L', 'relay'), cand('R', 'host')]))).toBe('relay');
    expect(classifyPath([])).toBeNull();
    expect(classifyPath([undefined, null, 0, '', [], () => 1, { id: 5 }, { type: 'candidate-pair' }, { type: 'transport' }])).toBeNull();
    // id가 중복되면 나중 항목이 이긴다(오류 없이 결정적)
    expect(classifyPath([pair(), cand('L', 'host'), cand('L', 'relay'), cand('R', 'host')])).toBe('relay');
    // 거대: 20만 건의 잡음 통계 + 정답 쌍
    const big: unknown[] = [];
    for (let i = 0; i < 200_000; i++) big.push({ id: `x${i}`, type: i % 3 === 0 ? 'candidate-pair' : 'inbound-rtp', nominated: false, state: 'waiting' });
    big.push(pair(), cand('L', 'host'), cand('R', 'host'));
    const t0 = performance.now();
    expect(classifyPath(big)).toBe('direct');
    expect(performance.now() - t0).toBeLessThan(1000);
    // 호출자가 undefined를 넘기면 예외를 던진다 — MeshTransport가 try/catch로 삼키는지는 TC-419b에서 확인
    expect(() => classifyPath(undefined as unknown as Iterable<unknown>)).toThrow();
  });
});

// ---- MeshTransport 보고 규칙(가짜 RTCPeerConnection) ----
type Stats = unknown[] | 'throw' | 'reject' | 'hang';
class FakePc {
  static all: FakePc[] = [];
  iceConnectionState = 'new';
  connectionState = 'new';
  signalingState = 'stable';
  oniceconnectionstatechange: (() => void) | null = null;
  onconnectionstatechange: (() => void) | null = null;
  onnegotiationneeded: unknown = null;
  onicecandidate: unknown = null;
  ontrack: unknown = null;
  onsignalingstatechange: unknown = null;
  statsCalls = 0;
  closed = false;
  next: Stats = [];
  resolveHang: (() => void) | null = null;
  constructor() {
    FakePc.all.push(this);
  }
  getStats(): Promise<{ forEach: (cb: (r: unknown) => void) => void }> {
    this.statsCalls++;
    if (this.next === 'throw') throw new Error('sync boom');
    if (this.next === 'reject') return Promise.reject(new Error('boom'));
    const reports = this.next === 'hang' ? [] : this.next;
    const make = (): { forEach: (cb: (r: unknown) => void) => void } => ({ forEach: (cb) => reports.forEach(cb) });
    if (this.next === 'hang') return new Promise((r) => (this.resolveHang = () => r(make())));
    return Promise.resolve(make());
  }
  getTransceivers(): unknown[] {
    return [];
  }
  restartIce(): void {}
  close(): void {
    this.closed = true;
  }
  setIce(state: string): void {
    this.iceConnectionState = state;
    this.oniceconnectionstatechange?.();
  }
}
class FakeStream {
  getTracks(): unknown[] {
    return [];
  }
}
const direct = [pair(), cand('L', 'host'), cand('R', 'srflx')];
const relay = [pair(), cand('L', 'relay'), cand('R', 'host')];
const flush = async (): Promise<void> => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

function make(): { t: MeshTransport; paths: [string, string][]; pc: () => FakePc } {
  const paths: [string, string][] = [];
  const events: MediaTransportEvents = {
    signal: () => undefined,
    remoteStream: () => undefined,
    pathType: (id, p) => void paths.push([id, p]),
    peerState: () => undefined,
  };
  const t = new MeshTransport('zzzzzzzz', events);
  t.start([]);
  t.addPeer('aaaaaaaa', false);
  return { t, paths, pc: () => FakePc.all[FakePc.all.length - 1] as FakePc };
}

describe('MeshTransport 경로 보고 규칙 (NFR-15)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakePc.all = [];
    vi.stubGlobal('RTCPeerConnection', FakePc);
    vi.stubGlobal('MediaStream', FakeStream);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('TC-419b [NFR-15] 연결당 1회: connected/completed가 반복돼도 같은 경로는 1번만, ICE restart 뒤 경로가 바뀌면 1번 더 보고한다', async () => {
    const { paths, pc } = make();
    pc().next = direct;
    pc().setIce('connected');
    await flush();
    pc().setIce('completed');
    await flush();
    pc().setIce('disconnected');
    pc().setIce('connected');
    await flush();
    expect(paths).toEqual([['aaaaaaaa', 'direct']]);
    pc().next = relay;
    pc().setIce('connected');
    await flush();
    expect(paths).toEqual([['aaaaaaaa', 'direct'], ['aaaaaaaa', 'relay']]);
    pc().setIce('completed');
    await flush();
    expect(paths).toHaveLength(2);
    // 4초 disconnected 타이머가 남아 있어도 보고와 무관
    await vi.advanceTimersByTimeAsync(10_000);
    expect(paths).toHaveLength(2);
  });

  it('TC-419c [NFR-15] 통계가 늦으면 1초 간격 최대 2회만 재시도하고(총 3회), 그 뒤엔 포기하며 재시도 중 성공하면 1번 보고한다', async () => {
    const a = make();
    a.pc().next = [];
    a.pc().setIce('connected');
    await flush();
    expect(a.pc().statsCalls).toBe(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(a.pc().statsCalls).toBe(2);
    await vi.advanceTimersByTimeAsync(1000);
    expect(a.pc().statsCalls).toBe(3);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(a.pc().statsCalls).toBe(3);
    expect(a.paths).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);

    FakePc.all = [];
    const b = make();
    b.pc().next = [];
    b.pc().setIce('connected');
    await flush();
    b.pc().next = direct;
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(5000);
    expect(b.paths).toEqual([['aaaaaaaa', 'direct']]);
    expect(b.pc().statsCalls).toBe(2);
  });

  it('TC-419d [NFR-15] 통계 예외(동기 throw·reject)·getStats 미지원·형식 이상은 조용히 건너뛰고 예외를 밖으로 내지 않으며 처리되지 않은 거부가 없다', async () => {
    const unhandled: unknown[] = [];
    const h = (e: unknown): void => void unhandled.push(e);
    process.on('unhandledRejection', h);
    try {
      for (const mode of ['throw', 'reject'] as const) {
        FakePc.all = [];
        const m = make();
        m.pc().next = mode;
        expect(() => m.pc().setIce('connected')).not.toThrow();
        await vi.advanceTimersByTimeAsync(5000);
        expect(m.paths, mode).toEqual([]);
        expect(m.pc().statsCalls, mode).toBe(3);
      }
      FakePc.all = [];
      const nostats = make();
      (nostats.pc() as unknown as { getStats?: unknown }).getStats = undefined;
      expect(() => nostats.pc().setIce('connected')).not.toThrow();
      expect(vi.getTimerCount()).toBe(0); // 미지원이면 재시도 타이머도 만들지 않는다
      await vi.advanceTimersByTimeAsync(5000);
      expect(nostats.paths).toEqual([]);
      FakePc.all = [];
      const weird = make();
      weird.pc().next = [null, 7, 'x', { type: 'candidate-pair' }] as unknown[];
      weird.pc().setIce('connected');
      await vi.advanceTimersByTimeAsync(5000);
      expect(weird.paths).toEqual([]);
    } finally {
      await flush();
      process.off('unhandledRejection', h);
    }
    expect(unhandled).toEqual([]);
  });

  it('TC-419e [NFR-15] 정리: removePeer·close 뒤에는 대기 중 타이머가 없고, 늦게 도착한 통계도 보고하지 않으며, 진행 중 중복 호출은 getStats 1회로 합쳐진다', async () => {
    const a = make();
    a.pc().next = [];
    a.pc().setIce('connected');
    await flush();
    expect(vi.getTimerCount()).toBe(1);
    a.t.removePeer('aaaaaaaa');
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(5000);
    expect(a.pc().statsCalls).toBe(1);
    expect(a.pc().closed).toBe(true);

    FakePc.all = [];
    const b = make();
    b.pc().next = 'hang';
    b.pc().setIce('connected');
    b.pc().setIce('completed');
    b.pc().setIce('connected');
    expect(b.pc().statsCalls).toBe(1); // pathProbing 가드
    b.t.close();
    b.pc().next = direct;
    b.pc().resolveHang?.();
    await flush();
    await vi.advanceTimersByTimeAsync(5000);
    expect(b.paths).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);

    // 같은 id로 피어를 새로 만들어도 이전 피어의 늦은 응답은 무시된다
    FakePc.all = [];
    const c = make();
    const first = c.pc();
    first.next = 'hang';
    first.setIce('connected');
    c.t.removePeer('aaaaaaaa');
    c.t.addPeer('aaaaaaaa', false);
    first.next = direct;
    first.resolveHang?.();
    await flush();
    expect(c.paths).toEqual([]);
    c.t.close();
    expect(vi.getTimerCount()).toBe(0);
  });
});
