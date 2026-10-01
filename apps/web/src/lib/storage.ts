// 저장소가 막혀 있어도(사생활 보호 모드 등) 앱이 동작해야 하므로 모든 접근을 try/catch로 감싼다.
const NICK_KEY = 'meetlite:nickname';
const hostKey = (roomId: string): string => `meetlite:host:${roomId}`;

export function loadNickname(): string {
  try {
    return localStorage.getItem(NICK_KEY) ?? '';
  } catch {
    return '';
  }
}
export function saveNickname(nickname: string): void {
  try {
    localStorage.setItem(NICK_KEY, nickname);
  } catch {
    /* 무시 */
  }
}

/** 방 생성자의 호스트 클레임은 URL이 아니라 이 탭의 sessionStorage에만 둔다. */
export function saveHostClaim(roomId: string, claim: string): void {
  try {
    sessionStorage.setItem(hostKey(roomId), claim);
  } catch {
    /* 무시 */
  }
}
export function loadHostClaim(roomId: string): string | undefined {
  try {
    return sessionStorage.getItem(hostKey(roomId)) ?? undefined;
  } catch {
    return undefined;
  }
}
export function clearHostClaim(roomId: string): void {
  try {
    sessionStorage.removeItem(hostKey(roomId));
  } catch {
    /* 무시 */
  }
}
