import type { IceCandidatePayload, IceServerConfig, SessionDescription } from '@meetlite/shared';
import type { MediaTransport, MediaTransportEvents, NetworkQuality, SignalMessage } from './MediaTransport';

/** 인원별 영상 송신 상한(NFR-13, trd.md §5). mesh는 (인원-1)개 스트림을 올려야 하므로 인원이 늘면 낮춘다. */
export function qualityTier(total: number): { maxBitrate: number; scaleDown: number } {
  if (total <= 2) return { maxBitrate: 1_500_000, scaleDown: 1 };
  if (total <= 4) return { maxBitrate: 700_000, scaleDown: 1.5 };
  return { maxBitrate: 400_000, scaleDown: 2 };
}

const SCREEN_MAX_BITRATE = 1_500_000;
const MAX_ICE_RESTARTS = 3;

interface Peer {
  id: string;
  pc: RTCPeerConnection;
  /** perfect negotiation: 충돌 시 양보하는 쪽. 두 참가자 ID의 크기 비교로 결정해 항상 한쪽만 true. */
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
  /** 송신 트랜시버. 응답하는 쪽은 상대 offer를 받은 뒤에 채워진다. */
  audio?: RTCRtpTransceiver;
  camera?: RTCRtpTransceiver;
  screen?: RTCRtpTransceiver;
  cameraStream: MediaStream;
  screenStream: MediaStream;
  iceRestarts: number;
  disconnectTimer?: ReturnType<typeof setTimeout>;
}

/**
 * WebRTC mesh(P2P) 구현. 모든 참가자 쌍이 PeerConnection 하나를 갖는다.
 * 연결마다 m-line은 정확히 3개(마이크, 카메라, 화면)이며, 입장 순번이 더 늦은 쪽이 offer를 만들고 먼저 있던 쪽은 응답한다.
 * 받는 쪽은 같은 종류 m-line의 순서로 트랙의 역할을 구분한다(오디오 1개, 비디오 첫 번째=카메라, 두 번째=화면).
 */
export class MeshTransport implements MediaTransport {
  private peers = new Map<string, Peer>();
  private iceServers: RTCIceServer[] = [];
  private audioTrack: MediaStreamTrack | null = null;
  private videoTrack: MediaStreamTrack | null = null;
  private screenTrack: MediaStreamTrack | null = null;
  private total = 1;
  private closed = false;

  constructor(
    private readonly selfId: string,
    private readonly events: MediaTransportEvents,
  ) {}

  start(iceServers: IceServerConfig[]): void {
    this.iceServers = iceServers.map((s) => ({ urls: s.urls, ...(s.username ? { username: s.username } : {}), ...(s.credential ? { credential: s.credential } : {}) }));
  }

  addPeer(id: string, initiate: boolean): void {
    if (this.closed || this.peers.has(id) || id === this.selfId) return;
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    const peer: Peer = {
      id,
      pc,
      polite: this.selfId > id,
      makingOffer: false,
      ignoreOffer: false,
      cameraStream: new MediaStream(),
      screenStream: new MediaStream(),
      iceRestarts: 0,
    };
    this.peers.set(id, peer);
    this.wire(peer);
    if (initiate) {
      // 고정 순서: [0]=마이크, [1]=카메라, [2]=화면. 만들자마자 negotiationneeded가 발생해 offer를 보낸다.
      peer.audio = pc.addTransceiver('audio', { direction: 'sendrecv' });
      peer.camera = pc.addTransceiver('video', { direction: 'sendrecv' });
      peer.screen = pc.addTransceiver('video', { direction: 'sendrecv' });
      this.attachLocalTracks(peer);
    }
  }

  /** 현재 로컬 트랙을 송신 트랜시버에 연결하고 송신 품질을 설정한다. */
  private attachLocalTracks(peer: Peer): void {
    void peer.audio?.sender.replaceTrack(this.audioTrack).catch(() => undefined);
    void peer.camera?.sender.replaceTrack(this.videoTrack).catch(() => undefined);
    void peer.screen?.sender.replaceTrack(this.screenTrack).catch(() => undefined);
    if (peer.screen) void this.configureSender(peer.screen.sender, SCREEN_MAX_BITRATE, 1);
    this.applyQualityTo(peer);
  }

  /** 응답하는 쪽: 상대 offer로 생긴 m-line(오디오, 비디오, 비디오)을 송신 겸용으로 바꾸고 트랙을 붙인다. */
  private bindFromRemote(peer: Peer): void {
    if (peer.audio) return;
    const all = peer.pc.getTransceivers();
    const audio = all.find((t) => t.receiver.track.kind === 'audio');
    const videos = all.filter((t) => t.receiver.track.kind === 'video');
    const [camera, screen] = videos;
    if (!audio || !camera || !screen) return;
    for (const t of [audio, camera, screen]) t.direction = 'sendrecv';
    peer.audio = audio;
    peer.camera = camera;
    peer.screen = screen;
    this.attachLocalTracks(peer);
  }

  private wire(peer: Peer): void {
    const { pc, id } = peer;
    pc.onnegotiationneeded = async () => {
      try {
        peer.makingOffer = true;
        await pc.setLocalDescription();
        const d = pc.localDescription;
        if (d && (d.type === 'offer' || d.type === 'answer')) this.events.signal(id, { description: { type: d.type, sdp: d.sdp } });
      } catch {
        /* 다음 협상에서 복구 */
      } finally {
        peer.makingOffer = false;
      }
    };
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) this.events.signal(id, { candidate: candidate.toJSON() as IceCandidatePayload });
    };
    pc.ontrack = ({ track, transceiver }) => {
      // 같은 종류 m-line의 순서로 역할을 정한다. 양쪽 모두 [마이크, 카메라, 화면] 순서로 m-line이 만들어진다.
      const sameKind = pc.getTransceivers().filter((t) => t.receiver.track.kind === track.kind);
      const index = sameKind.indexOf(transceiver);
      if (track.kind === 'audio' && index === 0) {
        replaceTracks(peer.cameraStream, [...peer.cameraStream.getTracks().filter((t) => t.kind !== 'audio'), track]);
        this.events.remoteStream(id, 'camera', peer.cameraStream);
      } else if (track.kind === 'video' && index === 0) {
        replaceTracks(peer.cameraStream, [...peer.cameraStream.getTracks().filter((t) => t.kind !== 'video'), track]);
        this.events.remoteStream(id, 'camera', peer.cameraStream);
      } else if (track.kind === 'video' && index === 1) {
        replaceTracks(peer.screenStream, [track]);
        this.events.remoteStream(id, 'screen', peer.screenStream);
      }
    };
    pc.oniceconnectionstatechange = () => this.onIceState(peer);
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === 'connected') this.events.peerState(id, 'connected');
      else if (s === 'connecting' || s === 'new') this.events.peerState(id, 'connecting');
      else if (s === 'failed') this.events.peerState(id, 'failed');
    };
  }

  private onIceState(peer: Peer): void {
    const state = peer.pc.iceConnectionState;
    if (peer.disconnectTimer) {
      clearTimeout(peer.disconnectTimer);
      delete peer.disconnectTimer;
    }
    if (state === 'connected' || state === 'completed') {
      peer.iceRestarts = 0;
      this.events.peerState(peer.id, 'connected');
    } else if (state === 'disconnected') {
      this.events.peerState(peer.id, 'disconnected');
      // 잠깐 끊긴 것일 수 있으니 4초 기다린 뒤에도 그대로면 ICE를 다시 시작한다.
      peer.disconnectTimer = setTimeout(() => this.restartPeer(peer), 4000);
    } else if (state === 'failed') {
      this.events.peerState(peer.id, 'failed');
      this.restartPeer(peer);
    }
  }

  private restartPeer(peer: Peer): void {
    if (this.closed || !this.peers.has(peer.id)) return;
    if (peer.iceRestarts >= MAX_ICE_RESTARTS && peer.pc.iceConnectionState === 'failed') return;
    peer.iceRestarts++;
    peer.pc.restartIce();
  }

  removePeer(id: string): void {
    const peer = this.peers.get(id);
    if (!peer) return;
    if (peer.disconnectTimer) clearTimeout(peer.disconnectTimer);
    peer.pc.onnegotiationneeded = null;
    peer.pc.onicecandidate = null;
    peer.pc.ontrack = null;
    peer.pc.oniceconnectionstatechange = null;
    peer.pc.onconnectionstatechange = null;
    peer.pc.close();
    this.peers.delete(id);
  }

  /** perfect negotiation 수신 처리 */
  async handleSignal(from: string, msg: SignalMessage): Promise<void> {
    if (this.closed) return;
    if (!this.peers.has(from)) this.addPeer(from, false);
    const peer = this.peers.get(from);
    if (!peer) return;
    const { pc } = peer;
    try {
      if (msg.description) {
        const description: SessionDescription = msg.description;
        const collision = description.type === 'offer' && (peer.makingOffer || pc.signalingState !== 'stable');
        peer.ignoreOffer = !peer.polite && collision;
        if (peer.ignoreOffer) return;
        await pc.setRemoteDescription(description);
        if (description.type === 'offer') {
          this.bindFromRemote(peer);
          await pc.setLocalDescription();
          const d = pc.localDescription;
          if (d && (d.type === 'offer' || d.type === 'answer')) this.events.signal(from, { description: { type: d.type, sdp: d.sdp } });
        }
      } else if (msg.candidate) {
        try {
          await pc.addIceCandidate(msg.candidate);
        } catch (e) {
          if (!peer.ignoreOffer) throw e;
        }
      }
    } catch {
      /* 잘못된 메시지·순서 꼬임은 무시하고 다음 협상으로 복구 */
    }
  }

  async setAudioTrack(track: MediaStreamTrack | null): Promise<void> {
    this.audioTrack = track;
    await Promise.all([...this.peers.values()].map((p) => p.audio?.sender.replaceTrack(track).catch(() => undefined)));
  }

  async setVideoTrack(track: MediaStreamTrack | null): Promise<void> {
    this.videoTrack = track;
    await Promise.all([...this.peers.values()].map((p) => p.camera?.sender.replaceTrack(track).catch(() => undefined)));
    this.applyQuality(this.total);
  }

  async setScreenTrack(track: MediaStreamTrack | null): Promise<void> {
    this.screenTrack = track;
    if (track) track.contentHint = 'detail';
    await Promise.all([...this.peers.values()].map((p) => p.screen?.sender.replaceTrack(track).catch(() => undefined)));
  }

  restartIce(): void {
    for (const peer of this.peers.values()) {
      peer.iceRestarts = 0;
      peer.pc.restartIce();
    }
  }

  applyQuality(totalParticipants: number): void {
    this.total = Math.max(1, totalParticipants);
    for (const peer of this.peers.values()) this.applyQualityTo(peer);
  }

  private applyQualityTo(peer: Peer): void {
    const tier = qualityTier(this.total);
    if (peer.camera) void this.configureSender(peer.camera.sender, tier.maxBitrate, tier.scaleDown);
  }

  private async configureSender(sender: RTCRtpSender, maxBitrate: number, scaleDown: number): Promise<void> {
    try {
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
      const enc = params.encodings[0];
      if (!enc) return;
      enc.maxBitrate = maxBitrate;
      enc.scaleResolutionDownBy = scaleDown;
      await sender.setParameters(params);
    } catch {
      /* 협상 전에는 실패할 수 있다. 다음 호출에서 다시 적용된다. */
    }
  }

  /** 모든 연결의 왕복 지연과 패킷 손실로 네트워크 품질을 판단한다(FR-19). */
  async getQuality(): Promise<NetworkQuality> {
    let poor = false;
    for (const peer of this.peers.values()) {
      if (peer.pc.connectionState !== 'connected') continue;
      try {
        const stats = await peer.pc.getStats();
        let rtt = 0;
        let lost = 0;
        let received = 0;
        stats.forEach((r: RTCStats & Record<string, unknown>) => {
          if (r.type === 'candidate-pair' && r.state === 'succeeded' && r.nominated && typeof r.currentRoundTripTime === 'number') rtt = Math.max(rtt, r.currentRoundTripTime);
          if (r.type === 'inbound-rtp') {
            if (typeof r.packetsLost === 'number') lost += r.packetsLost;
            if (typeof r.packetsReceived === 'number') received += r.packetsReceived;
          }
        });
        const lossRate = received + lost > 200 ? lost / (received + lost) : 0;
        if (rtt > 0.4 || lossRate > 0.08) poor = true;
      } catch {
        /* 무시 */
      }
    }
    return poor ? 'poor' : 'good';
  }

  close(): void {
    this.closed = true;
    for (const id of [...this.peers.keys()]) this.removePeer(id);
  }
}

function replaceTracks(stream: MediaStream, tracks: MediaStreamTrack[]): void {
  for (const t of stream.getTracks()) if (!tracks.includes(t)) stream.removeTrack(t);
  for (const t of tracks) if (!stream.getTracks().includes(t)) stream.addTrack(t);
}
