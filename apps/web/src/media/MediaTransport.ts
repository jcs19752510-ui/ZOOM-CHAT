import type { IceCandidatePayload, IceServerConfig, SessionDescription } from '@meetlite/shared';

export type PeerConnState = 'connecting' | 'connected' | 'disconnected' | 'failed';
export type RemoteKind = 'camera' | 'screen';
export type NetworkQuality = 'good' | 'poor';

export interface SignalMessage {
  description?: SessionDescription;
  candidate?: IceCandidatePayload;
}

export interface MediaTransportEvents {
  /** 상대에게 보낼 시그널링 메시지 */
  signal: (to: string, msg: SignalMessage) => void;
  /** 상대의 카메라(+마이크) 또는 화면 스트림이 준비/갱신됨 */
  remoteStream: (id: string, kind: RemoteKind, stream: MediaStream) => void;
  /** 상대와의 연결 상태 변화 */
  peerState: (id: string, state: PeerConnState) => void;
}

/**
 * 미디어 계층 경계. UI와 방 로직은 이 인터페이스만 안다.
 * 지금은 MeshTransport(P2P)가 구현하며, 나중에 SFU 구현체로 교체할 수 있다(NFR-11, trd.md §2).
 */
export interface MediaTransport {
  start(iceServers: IceServerConfig[]): void;
  /**
   * 상대와의 연결을 만든다. initiate=true면 이쪽이 offer를 만든다(입장 순번이 더 늦은 쪽).
   * false면 상대의 offer를 기다렸다가 그 m-line에 맞춰 송신 트랙을 붙인다. 이렇게 한쪽만 만들면 m-line이 중복되지 않는다.
   */
  addPeer(id: string, initiate: boolean): void;
  removePeer(id: string): void;
  handleSignal(from: string, msg: SignalMessage): Promise<void>;
  setAudioTrack(track: MediaStreamTrack | null): Promise<void>;
  setVideoTrack(track: MediaStreamTrack | null): Promise<void>;
  setScreenTrack(track: MediaStreamTrack | null): Promise<void>;
  /** 소켓 재연결 뒤 모든 연결의 ICE를 다시 시작한다 */
  restartIce(): void;
  /** 전체 참가자 수에 맞춰 보내는 영상의 해상도·비트레이트를 낮춘다(NFR-13) */
  applyQuality(totalParticipants: number): void;
  getQuality(): Promise<NetworkQuality>;
  close(): void;
}
