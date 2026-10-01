import type { Ack, ChatMessage, ErrorCode, JoinResult, PublicParticipant, SignalRelay } from '@meetlite/shared';
import { supportsScreenShare, type LocalMedia } from '../lib/media';
import { SignalingClient } from '../lib/signaling';
import { MeshTransport } from '../media/MeshTransport';
import type { MediaTransport, NetworkQuality, PeerConnState } from '../media/MediaTransport';
import { S, errorText } from '../strings';
import { decideForeground, type ForegroundAction, type ProbeResult } from './foreground';

export interface RemoteMedia {
  camera?: MediaStream;
  screen?: MediaStream;
  state: PeerConnState;
}
export interface ChatItem {
  id: string;
  from: string;
  nickname: string;
  text: string;
  ts: number;
  mine: boolean;
}
export interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'warn';
}
export type MeetingStatus = 'idle' | 'joining' | 'live' | 'reconnecting' | 'ended';
export type EndReason = 'left' | 'kicked' | 'expired' | 'closed' | 'restarted';

export interface MeetingState {
  status: MeetingStatus;
  endReason?: EndReason;
  selfId: string;
  hostId: string | null;
  locked: boolean;
  participants: PublicParticipant[];
  remote: Record<string, RemoteMedia>;
  chat: ChatItem[];
  unread: number;
  micOn: boolean;
  camOn: boolean;
  sharing: boolean;
  quality: NetworkQuality;
  graceSec: number;
  reconnectingSince: number | null;
  /** 재연결을 시작한 원인. 'foreground'면 배너가 복귀 안내 문구를 쓴다(UX-14). */
  reconnectCause: 'network' | 'foreground';
  toasts: Toast[];
}

const initial: MeetingState = {
  status: 'idle',
  selfId: '',
  hostId: null,
  locked: false,
  participants: [],
  remote: {},
  chat: [],
  unread: 0,
  micOn: true,
  camOn: true,
  sharing: false,
  quality: 'good',
  graceSec: 20,
  reconnectingSince: null,
  reconnectCause: 'network',
  toasts: [],
};

type Listener = () => void;

export interface JoinParams {
  roomId: string;
  nickname: string;
  password?: string;
  hostClaim?: string;
  media: LocalMedia;
}
export type JoinOutcome = { ok: true } | { ok: false; code: ErrorCode | 'NETWORK' };

/**
 * 한 번의 회의 참여를 관리한다: 소켓, 방 상태, 미디어 계층(MediaTransport), 로컬 장치, 알림.
 * React와는 subscribe/getSnapshot(useSyncExternalStore)으로만 연결된다.
 */
export class MeetingController {
  private state: MeetingState = initial;
  private listeners = new Set<Listener>();
  private signaling: SignalingClient | null = null;
  private transport: MediaTransport | null = null;
  private media: LocalMedia | null = null;
  private screenTrack: MediaStreamTrack | null = null;
  private token = '';
  private roomId = '';
  private toastSeq = 1;
  private qualityTimer: ReturnType<typeof setInterval> | undefined;
  private reconnectTimer: ReturnType<typeof setInterval> | undefined;
  private poorCount = 0;
  private leaving = false;
  private selfIdFromJoin = '';
  private foregroundBusy = false;
  private kicking = false;

  subscribe = (l: Listener): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  getSnapshot = (): MeetingState => this.state;

  private set(patch: Partial<MeetingState>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }

  // ---------------------------------------------------------------- 입장
  async join(p: JoinParams): Promise<JoinOutcome> {
    this.media = p.media;
    this.roomId = p.roomId;
    this.set({ status: 'joining' });
    const signaling = new SignalingClient();
    this.signaling = signaling;
    try {
      await signaling.connect();
    } catch {
      signaling.close();
      this.signaling = null;
      this.set({ status: 'idle' });
      return { ok: false, code: 'NETWORK' };
    }
    const res = await signaling.request('room:join', {
      v: 1,
      roomId: p.roomId,
      nickname: p.nickname,
      ...(p.password ? { password: p.password } : {}),
      ...(p.hostClaim ? { hostClaim: p.hostClaim } : {}),
    });
    if (!res.ok) {
      signaling.close();
      this.signaling = null;
      this.set({ status: 'idle' });
      return { ok: false, code: res.code };
    }
    this.begin(res);
    this.listen(signaling);
    return { ok: true };
  }

  private begin(res: Extract<Ack<JoinResult>, { ok: true }>): void {
    const media = this.media;
    this.token = res.token;
    this.selfIdFromJoin = res.selfId;
    const transport = new MeshTransport(res.selfId, {
      signal: (to, msg) => {
        void this.signaling?.request('signal:send', { v: 1, to, ...msg });
      },
      remoteStream: (id, kind, stream) => {
        const prev = this.state.remote[id] ?? { state: 'connecting' as PeerConnState };
        this.set({ remote: { ...this.state.remote, [id]: { ...prev, [kind]: stream } } });
      },
      peerState: (id, state) => {
        const prev = this.state.remote[id];
        if (prev && prev.state !== state) this.set({ remote: { ...this.state.remote, [id]: { ...prev, state } } });
      },
    });
    this.transport = transport;
    transport.start(res.iceServers);
    void transport.setAudioTrack(media?.audio ?? null);
    void transport.setVideoTrack(media?.video ?? null);
    this.set({
      status: 'live',
      selfId: res.selfId,
      hostId: res.hostId,
      locked: res.locked,
      participants: res.participants,
      micOn: !!media?.audio && media.micOn,
      camOn: !!media?.video && media.camOn,
      graceSec: res.config.reconnectGraceSec,
      reconnectingSince: null,
    });
    this.addPeers(res.participants);
    transport.applyQuality(res.participants.length);
    this.pushMediaState();
    this.qualityTimer = setInterval(() => void this.pollQuality(), 3000);
  }

  /** 입장 순번이 더 늦은 쪽이 offer를 만든다(m-line 중복 방지, MeshTransport 참고). */
  private addPeers(participants: PublicParticipant[]): void {
    const self = participants.find((x) => x.id === this.state.selfId || x.id === this.selfIdFromJoin);
    for (const part of participants) {
      if (part.id === this.state.selfId || part.id === this.selfIdFromJoin) continue;
      this.transport?.addPeer(part.id, self ? self.joinSeq > part.joinSeq : false);
    }
  }

  private listen(signaling: SignalingClient): void {
    const sock = signaling.socket;
    sock.on('room:participantJoined', ({ participant }) => {
      if (this.state.participants.some((x) => x.id === participant.id)) return;
      const participants = [...this.state.participants, participant];
      this.set({ participants });
      this.addPeers(participants);
      this.transport?.applyQuality(participants.length);
      this.toast(S.room.joined(participant.nickname));
    });
    sock.on('room:participantLeft', ({ id, reason }) => {
      const gone = this.state.participants.find((x) => x.id === id);
      const participants = this.state.participants.filter((x) => x.id !== id);
      const remote = { ...this.state.remote };
      delete remote[id];
      this.transport?.removePeer(id);
      this.transport?.applyQuality(participants.length);
      this.set({ participants, remote });
      if (gone) this.toast(reason === 'timeout' ? S.room.timedOut(gone.nickname) : S.room.left(gone.nickname));
    });
    sock.on('room:participantUpdated', ({ id, ...patch }) => {
      this.set({ participants: this.state.participants.map((x) => (x.id === id ? { ...x, ...stripUndefined(patch) } : x)) });
    });
    sock.on('room:hostChanged', ({ hostId }) => {
      const name = this.state.participants.find((x) => x.id === hostId)?.nickname ?? '';
      this.set({ hostId, participants: this.state.participants.map((x) => ({ ...x, isHost: x.id === hostId })) });
      this.toast(hostId === this.state.selfId ? S.room.youAreHost : S.room.hostChanged(name));
    });
    sock.on('room:locked', ({ locked }) => {
      this.set({ locked });
      this.toast(locked ? S.room.lockedToast : S.room.unlockedToast);
    });
    sock.on('signal:recv', (m: SignalRelay) => {
      void this.transport?.handleSignal(m.from, { ...(m.description ? { description: m.description } : {}), ...(m.candidate ? { candidate: m.candidate } : {}) });
    });
    sock.on('chat:message', (m: ChatMessage) => {
      const mine = m.from === this.state.selfId;
      this.set({ chat: [...this.state.chat.slice(-199), { id: m.id, from: m.from, nickname: m.nickname, text: m.text, ts: m.ts, mine }], unread: mine ? this.state.unread : this.state.unread + 1 });
    });
    sock.on('host:muteAll', () => {
      this.media?.setMic(false);
      this.set({ micOn: false });
      this.pushMediaState();
      this.toast(S.room.micMutedByHost, 'warn');
    });
    sock.on('room:kicked', () => this.end('kicked'));
    sock.on('disconnect', () => {
      if (this.leaving || this.state.status === 'ended') return;
      this.set({ status: 'reconnecting', reconnectingSince: Date.now(), reconnectCause: this.kicking ? 'foreground' : 'network' });
      // 네트워크 단절은 Socket.IO가 알아서 재연결한다. 서버가 먼저 끊은 경우(재시작 등)에는 자동 재연결이 없으므로 직접 다시 연결한다.
      clearInterval(this.reconnectTimer);
      this.reconnectTimer = setInterval(() => {
        if (this.leaving || this.state.status !== 'reconnecting') return clearInterval(this.reconnectTimer);
        if (!sock.connected && !sock.active) sock.connect();
      }, 1500);
    });
    sock.on('connect', () => {
      clearInterval(this.reconnectTimer);
      if (this.state.status === 'reconnecting') void this.resume();
    });
  }

  /** 소켓이 다시 연결되면 세션 토큰으로 같은 자리를 복구한다(FR-20, SEC-03). */
  private async resume(): Promise<void> {
    const signaling = this.signaling;
    if (!signaling) return;
    const res = await signaling.request('room:resume', { v: 1, token: this.token });
    if (this.state.status === 'ended') return;
    if (!res.ok) {
      if (res.code === 'ROOM_NOT_FOUND') this.end('restarted');
      else if (res.code === 'TOKEN_INVALID' || res.code === 'PARTICIPANT_GONE') this.end('expired');
      // NETWORK 등 일시 오류는 다음 'connect'에서 다시 시도한다.
      return;
    }
    const liveIds = new Set(res.participants.map((x) => x.id));
    const remote = { ...this.state.remote };
    for (const id of Object.keys(remote)) {
      if (!liveIds.has(id)) {
        this.transport?.removePeer(id);
        delete remote[id];
      }
    }
    this.addPeers(res.participants);
    this.set({ status: 'live', reconnectingSince: null, reconnectCause: 'network', hostId: res.hostId, locked: res.locked, participants: res.participants, remote });
    this.transport?.restartIce();
    this.transport?.applyQuality(res.participants.length);
    this.toast(S.room.reconnected);
  }

  // ---------------------------------------------------------------- 복귀(UX-14)
  /**
   * 백그라운드·화면 잠금에서 돌아왔을 때 연결을 능동 확인한다. 끊김을 이미 알면 즉시 재연결하고,
   * 연결된 것처럼 보이면 3초 프로브로 확인해 죽은 소켓이면 기존 끊김 경로(배너·resume·ICE restart)에 합류시킨다.
   * 세션 토큰은 새로 저장하지 않는다(ADR-0003).
   */
  async onForeground(_source: 'visibility' | 'pageshow'): Promise<void> {
    const sig = this.signaling;
    if (!sig || this.foregroundBusy) return;
    this.foregroundBusy = true;
    try {
      const input = () => ({ status: this.state.status, socketConnected: sig.socket.connected, peerStates: Object.values(this.state.remote).map((r) => r.state) });
      let actions = decideForeground(input());
      if (actions.includes('probe')) {
        const probe = await this.probe(sig);
        actions = [...actions.filter((a) => a !== 'probe'), ...decideForeground({ ...input(), probe })];
      }
      if (this.signaling !== sig) return;
      for (const a of actions) this.runForeground(a, sig);
    } finally {
      this.foregroundBusy = false;
    }
  }

  private async probe(sig: SignalingClient): Promise<ProbeResult> {
    const res = await sig.request('media:state', { v: 1, audio: this.state.micOn, video: this.state.camOn }, 3000);
    if (res.ok) return 'ok';
    if (res.code === 'NETWORK') return 'timeout';
    if (res.code === 'NOT_JOINED') return 'notBound';
    // 이 소켓이 이미 정리된 자리에 묶여 있으면 새 소켓으로 resume해야 expired 판정까지 이어진다.
    if (res.code === 'PARTICIPANT_GONE') return 'timeout';
    return 'ok';
  }

  private runForeground(a: ForegroundAction, sig: SignalingClient): void {
    const sock = sig.socket;
    switch (a) {
      case 'reconcileMedia':
        return this.reconcileMedia();
      case 'connectNow':
        this.set({ reconnectCause: 'foreground' });
        if (!sock.connected) sock.connect();
        return;
      case 'kickSocket':
        this.kicking = true;
        try {
          sock.disconnect();
        } finally {
          this.kicking = false;
        }
        sock.connect();
        return;
      case 'resumeNow':
        if (this.state.status === 'live') this.set({ status: 'reconnecting', reconnectingSince: Date.now() });
        this.set({ reconnectCause: 'foreground' });
        void this.resume();
        return;
      case 'restartIce':
        this.transport?.restartIce();
        return;
      case 'probe':
        return;
    }
  }

  private reconcileMedia(): void {
    const media = this.media;
    if (!media) return;
    const { audioLost, videoLost } = media.reconcile();
    // 비디오 트랙은 ended 이벤트가 먼저 정리해 reconcile이 못 볼 수 있어, 켜져 있어야 하는데 트랙이 없는 경우도 잃은 것으로 본다.
    const camLost = videoLost || (this.state.camOn && !media.video);
    const micLost = audioLost && this.state.micOn;
    if (!camLost && !micLost) return;
    if (micLost) {
      this.set({ micOn: false });
      void this.transport?.setAudioTrack(null);
    }
    if (camLost) {
      this.set({ camOn: false });
      void this.transport?.setVideoTrack(null);
    }
    this.pushMediaState();
    this.toast(S.background.mediaLost(camLost && micLost ? 'both' : camLost ? 'camera' : 'mic'), 'warn');
  }

  // ---------------------------------------------------------------- 로컬 미디어
  private pushMediaState(): void {
    void this.signaling?.request('media:state', { v: 1, audio: this.state.micOn, video: this.state.camOn });
  }

  toggleMic(): void {
    const media = this.media;
    if (!media) return;
    if (!media.audio) {
      void media.start({ audio: true, video: false }).then(() => {
        if (!media.audio) return this.toast(S.room.micFailed, 'warn');
        media.setMic(true);
        void this.transport?.setAudioTrack(media.audio);
        this.set({ micOn: true });
        this.pushMediaState();
      });
      return;
    }
    const on = !this.state.micOn;
    media.setMic(on);
    this.set({ micOn: on });
    this.pushMediaState();
  }

  async toggleCamera(): Promise<void> {
    const media = this.media;
    if (!media) return;
    const on = !this.state.camOn;
    const ok = await media.setCamera(on);
    if (!ok) {
      this.toast(S.room.cameraFailed, 'warn');
      return;
    }
    await this.transport?.setVideoTrack(media.video);
    this.set({ camOn: on && !!media.video });
    this.pushMediaState();
  }

  async switchDevice(kind: 'audio' | 'video', deviceId: string): Promise<void> {
    const media = this.media;
    if (!media) return;
    const ok = await media.switchDevice(kind, deviceId);
    if (!ok) {
      this.toast(S.room.deviceChangeFailed, 'warn');
      return;
    }
    if (kind === 'audio') await this.transport?.setAudioTrack(media.audio);
    else await this.transport?.setVideoTrack(media.video);
  }

  async startShare(): Promise<void> {
    if (!supportsScreenShare()) return this.toast(S.room.shareUnsupportedMobile, 'warn');
    const busy = this.state.participants.find((x) => x.screen && x.id !== this.state.selfId);
    if (busy) return this.toast(S.room.shareBusy(busy.nickname), 'warn');
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    } catch (e) {
      if (!(e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'AbortError'))) this.toast(S.room.shareDenied, 'warn');
      return;
    }
    const track = stream.getVideoTracks()[0];
    if (!track) return;
    const res = await this.signaling?.request('screen:start', { v: 1 });
    if (!res?.ok) {
      track.stop();
      const who = this.state.participants.find((x) => x.screen)?.nickname ?? '';
      this.toast(res && res.code === 'SCREEN_BUSY' ? S.room.shareBusy(who) : S.room.actionFailed, 'warn');
      return;
    }
    this.screenTrack = track;
    track.onended = () => void this.stopShare();
    await this.transport?.setScreenTrack(track);
    this.set({ sharing: true });
  }

  async stopShare(): Promise<void> {
    const track = this.screenTrack;
    this.screenTrack = null;
    track?.stop();
    await this.transport?.setScreenTrack(null);
    this.set({ sharing: false });
    await this.signaling?.request('screen:stop', { v: 1 });
  }

  // ---------------------------------------------------------------- 채팅·호스트
  async sendChat(text: string): Promise<ErrorCode | 'NETWORK' | null> {
    const res = await this.signaling?.request('chat:send', { v: 1, text });
    if (!res) return 'NETWORK';
    return res.ok ? null : res.code;
  }

  markChatRead(): void {
    if (this.state.unread !== 0) this.set({ unread: 0 });
  }

  async setLocked(locked: boolean): Promise<void> {
    await this.hostAction(this.signaling?.request('host:lock', { v: 1, locked }));
  }
  async kick(targetId: string): Promise<void> {
    await this.hostAction(this.signaling?.request('host:kick', { v: 1, targetId }));
  }
  async muteAll(): Promise<void> {
    await this.hostAction(this.signaling?.request('host:muteAll', { v: 1 }));
  }
  private async hostAction(p: Promise<Ack<object> | { ok: false; code: string }> | undefined): Promise<void> {
    const res = await p;
    if (res && !res.ok) this.toast(errorText(res.code), 'warn');
  }

  // ---------------------------------------------------------------- 종료·알림
  async leave(): Promise<void> {
    this.leaving = true;
    await this.signaling?.request('room:leave', { v: 1 });
    this.end('left');
  }

  /** 회의를 끝내고 모든 자원을 정리한다. */
  end(reason: EndReason): void {
    if (this.state.status === 'ended') return;
    this.leaving = true;
    clearInterval(this.qualityTimer);
    clearInterval(this.reconnectTimer);
    this.screenTrack?.stop();
    this.screenTrack = null;
    this.transport?.close();
    this.transport = null;
    this.media?.stopAll();
    this.signaling?.close();
    this.signaling = null;
    this.set({ status: 'ended', endReason: reason, remote: {}, sharing: false });
  }

  dispose(): void {
    if (this.state.status !== 'ended') this.end('left');
    this.listeners.clear();
  }

  toast(text: string, kind: 'info' | 'warn' = 'info'): void {
    const id = this.toastSeq++;
    this.set({ toasts: [...this.state.toasts.slice(-3), { id, text, kind }] });
    setTimeout(() => this.dismissToast(id), 4500);
  }
  dismissToast(id: number): void {
    if (this.state.toasts.some((t) => t.id === id)) this.set({ toasts: this.state.toasts.filter((t) => t.id !== id) });
  }

  private async pollQuality(): Promise<void> {
    const q = await this.transport?.getQuality();
    if (!q) return;
    this.poorCount = q === 'poor' ? this.poorCount + 1 : 0;
    const next: NetworkQuality = this.poorCount >= 2 ? 'poor' : 'good';
    if (next !== this.state.quality) this.set({ quality: next });
  }

  get currentRoomId(): string {
    return this.roomId;
  }
}

function stripUndefined<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}
