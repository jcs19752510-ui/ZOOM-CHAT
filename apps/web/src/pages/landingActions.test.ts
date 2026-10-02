import type * as React from 'react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { byId, byTestId, byType, fire, mount, submitEvent, textOf, type Mounted } from '../testing/hookHarness';

vi.mock('react', async (orig) => {
  const actual = await orig<typeof React>();
  const { fakeHooks } = await import('../testing/hookHarness');
  return { ...actual, ...fakeHooks, default: { ...actual, ...fakeHooks } };
});
vi.mock('../lib/api', () => ({ createRoom: vi.fn() }));
vi.mock('../lib/storage', () => ({ loadNickname: vi.fn(() => ''), saveNickname: vi.fn(), saveHostClaim: vi.fn() }));

import { createRoom } from '../lib/api';
import { loadNickname, saveHostClaim, saveNickname } from '../lib/storage';
import { S } from '../strings';
import { Landing } from './Landing';

const ROOM = 'AbCdEfGhIjKlMnOpQrStUv'; // 22자 URL-safe
const createRoomMock = vi.mocked(createRoom);
let navigate: ReturnType<typeof vi.fn<(to: string) => void>>;
let view: Mounted<{ navigate: (to: string) => void }>;

const type = (testId: string, value: string): void => void fire(byTestId(view.tree, testId), 'onChange', { target: { value } });
const check = (on: boolean): void => void fire(byTestId(view.tree, 'use-password'), 'onChange', { target: { checked: on } });
const forms = (): ReactElement<Record<string, unknown>>[] => byType(view.tree, 'form');
const submitCreate = async (): Promise<void> => void (await fire(forms()[0], 'onSubmit', submitEvent()));
const submitJoin = (): void => void fire(forms()[1], 'onSubmit', submitEvent());
const alertText = (): string => byType(view.tree, 'p').filter((p) => p.props.role === 'alert').map(textOf).join('|');

beforeEach(() => {
  navigate = vi.fn<(to: string) => void>();
  createRoomMock.mockReset();
  vi.mocked(saveNickname).mockReset();
  vi.mocked(saveHostClaim).mockReset();
  vi.mocked(loadNickname).mockReturnValue('');
  view = mount<{ navigate: (to: string) => void }>(Landing, { navigate });
});
afterEach(() => view.unmount());

describe('랜딩 방 만들기·링크 입장 동작 (unit-08, FR-01, FR-05, NFR-01)', () => {
  it('TC-469k [FR-01,UX-03] 닉네임이 비었거나 규칙 위반이면 서버를 부르지 않고 사유를 role=alert로 알린다', async () => {
    for (const bad of ['', '   ', '<b>x</b>', 'a'.repeat(21)]) {
      type('nickname', bad);
      await submitCreate();
      expect(alertText(), `닉네임 "${bad}"`).toBe(S.lobby.invalidNickname);
    }
    expect(createRoomMock).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(saveHostClaim).not.toHaveBeenCalled();
  });

  it('TC-469l [FR-01,FR-05] 비밀번호는 4~32자만 통과한다(3자·33자 거부, 4자·32자 허용) — 검증은 서버 호출 전에 한다', async () => {
    createRoomMock.mockResolvedValue({ ok: true, data: { roomId: ROOM, hostClaim: 'claim' } } as never);
    type('nickname', '민지');
    check(true);
    for (const bad of ['', 'abc', 'x'.repeat(33)]) {
      type('room-password', bad);
      await submitCreate();
      expect(alertText(), `길이 ${bad.length}`).toBe(S.landing.passwordHint);
    }
    expect(createRoomMock).not.toHaveBeenCalled();
    for (const ok of ['abcd', 'x'.repeat(32)]) {
      type('room-password', ok);
      await submitCreate();
    }
    expect(createRoomMock).toHaveBeenCalledTimes(2);
    expect(createRoomMock.mock.calls.map((c) => c[0])).toEqual(['abcd', 'x'.repeat(32)]);
  });

  it('TC-469m [FR-01,SEC-02] 성공하면 닉네임(정규화)·호스트 클레임을 저장하고 /r/<방ID>로 이동한다. 비밀번호 칸을 껐으면 입력해 둔 값도 보내지 않는다', async () => {
    createRoomMock.mockResolvedValue({ ok: true, data: { roomId: ROOM, hostClaim: 'claim-1' } } as never);
    type('nickname', '  민지  ');
    check(true);
    type('room-password', 'secret1');
    check(false); // 껐다 → 값이 남아 있어도 보내지 않는다
    await submitCreate();
    expect(createRoomMock).toHaveBeenCalledTimes(1);
    expect(createRoomMock.mock.calls[0]).toEqual([undefined]);
    expect(saveNickname).toHaveBeenCalledWith('민지');
    expect(saveHostClaim).toHaveBeenCalledWith(ROOM, 'claim-1');
    expect(navigate).toHaveBeenCalledWith(`/r/${ROOM}`);
    expect(navigate.mock.calls[0]?.[0]).not.toContain('secret1'); // 비밀번호는 URL에 넣지 않는다
  });

  it('TC-469n [FR-01,UX-03] 서버 오류는 원인별 문구(RATE_LIMITED, 그 밖)로 알리고 저장·이동하지 않으며 버튼은 다시 쓸 수 있다', async () => {
    type('nickname', '민지');
    createRoomMock.mockResolvedValueOnce({ ok: false, code: 'RATE_LIMITED' });
    await submitCreate();
    expect(alertText()).toBe(S.lobby.rateLimited);
    for (const code of ['NETWORK', 'INTERNAL', 'ROOM_LIMIT']) {
      createRoomMock.mockResolvedValueOnce({ ok: false, code });
      await submitCreate();
      expect(alertText(), code).toBe(S.state.error.body);
    }
    expect(saveNickname).not.toHaveBeenCalled();
    expect(saveHostClaim).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(byTestId(view.tree, 'create-room')?.props.disabled).toBe(false);
    expect(textOf(byTestId(view.tree, 'create-room'))).toBe(S.landing.createButton);
  });

  it('TC-469o [FR-01,NFR-10] 요청 중에는 버튼이 비활성화되고 "만드는 중…"이며 응답 뒤 풀린다; 이전 오류는 새 시도에서 지워진다', async () => {
    type('nickname', '민지');
    createRoomMock.mockResolvedValueOnce({ ok: false, code: 'NETWORK' });
    await submitCreate();
    expect(alertText()).toBe(S.state.error.body);
    let release: (v: never) => void = () => undefined;
    createRoomMock.mockReturnValueOnce(new Promise<never>((r) => (release = r)));
    const pending = submitCreate();
    expect(alertText()).toBe(''); // 새 시도 시작 시 이전 오류 제거
    expect(byTestId(view.tree, 'create-room')?.props.disabled).toBe(true);
    expect(textOf(byTestId(view.tree, 'create-room'))).toBe(S.landing.creating);
    release({ ok: false, code: 'NETWORK' } as never);
    await pending;
    expect(byTestId(view.tree, 'create-room')?.props.disabled).toBe(false);
  });

  it('TC-469p [FR-03,SEC-07] 링크 입장: 22자 방 코드·초대 링크는 /r/<ID>로 이동하고, 잘못된 입력은 이동 없이 안내한다', () => {
    const bad = ['', 'abc', `https://x.test/r/${ROOM}/extra`, `javascript:alert(1)//r/${ROOM}`, `${ROOM}x`, `https://x.test/room/${ROOM}`];
    for (const input of bad) {
      type('join-link', input);
      submitJoin();
      expect(alertText(), JSON.stringify(input)).toBe(S.landing.joinInvalid);
    }
    expect(navigate).not.toHaveBeenCalled();
    for (const input of [ROOM, `  https://meet.example/r/${ROOM}  `, `https://meet.example/r/${ROOM}/`]) {
      type('join-link', input);
      submitJoin();
    }
    expect(navigate.mock.calls.map((c) => c[0])).toEqual([`/r/${ROOM}`, `/r/${ROOM}`, `/r/${ROOM}`]);
  });

  it('TC-469q [FR-01,NFR-01] 저장된 닉네임이 있으면 입력 칸에 미리 채워지고(재방문 시 입력 생략), 제출 시 그 값이 쓰인다', async () => {
    view.unmount();
    vi.mocked(loadNickname).mockReturnValue('저장된이름');
    view = mount<{ navigate: (to: string) => void }>(Landing, { navigate });
    expect(byTestId(view.tree, 'nickname')?.props.value).toBe('저장된이름');
    createRoomMock.mockResolvedValue({ ok: true, data: { roomId: ROOM, hostClaim: 'c' } } as never);
    await submitCreate();
    expect(saveNickname).toHaveBeenCalledWith('저장된이름');
    expect(navigate).toHaveBeenCalledWith(`/r/${ROOM}`);
  });

  it('TC-469r [FR-05,UX-10] 비밀번호 칸은 체크하면 나타나고(type=password, 라벨·힌트 연결, maxLength 32), 끄면 사라진다', () => {
    expect(byId(view.tree, 'room-password')).toBeUndefined();
    check(true);
    const pw = byId(view.tree, 'room-password');
    expect(pw?.props.type).toBe('password');
    expect(pw?.props.maxLength).toBe(32);
    expect(pw?.props.autoComplete).toBe('new-password'); // 비밀번호 관리자가 저장된 로그인 비밀번호를 채우지 않게
    expect(pw?.props['aria-describedby']).toBe('pw-hint');
    expect(byId(view.tree, 'pw-hint')).toBeDefined();
    check(false);
    expect(byId(view.tree, 'room-password')).toBeUndefined();
  });
});
