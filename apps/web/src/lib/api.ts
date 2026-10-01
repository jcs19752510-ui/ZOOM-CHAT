import type { CreateRoomResponse, RoomStatusResponse } from '@meetlite/shared';

export type ApiResult<T> = { ok: true; data: T } | { ok: false; code: string };

async function call<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, { ...init, headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) } });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) return { ok: false, code: typeof body.code === 'string' ? body.code : 'INTERNAL' };
    return { ok: true, data: body as T };
  } catch {
    return { ok: false, code: 'NETWORK' };
  }
}

export const createRoom = (password?: string): Promise<ApiResult<CreateRoomResponse>> =>
  call<CreateRoomResponse>('/api/rooms', { method: 'POST', body: JSON.stringify({ v: 1, ...(password ? { password } : {}) }) });

export const getRoomStatus = (roomId: string): Promise<ApiResult<RoomStatusResponse>> =>
  call<RoomStatusResponse>(`/api/rooms/${encodeURIComponent(roomId)}`);
