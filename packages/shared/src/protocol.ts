import type {
  ChatSendRequest,
  EmptyRequest,
  IceCandidatePayload,
  JoinRequest,
  KickRequest,
  LockRequest,
  MediaStateRequest,
  MetricsPathRequest,
  ResumeRequest,
  SessionDescription,
  SignalRequest,
} from './schemas';

export const ERROR_CODES = [
  'INVALID_PAYLOAD',
  'RATE_LIMITED',
  'NOT_JOINED',
  'ALREADY_JOINED',
  'ROOM_NOT_FOUND',
  'ROOM_FULL',
  'ROOM_LOCKED',
  'WRONG_PASSWORD',
  'TOO_MANY_ATTEMPTS',
  'KICKED',
  'HOST_NOT_PRESENT',
  'TOKEN_INVALID',
  'PARTICIPANT_GONE',
  'FORBIDDEN',
  'TARGET_NOT_FOUND',
  'CANNOT_KICK_SELF',
  'SCREEN_BUSY',
  'SERVER_BUSY',
  'INTERNAL',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export interface AckError {
  ok: false;
  code: ErrorCode;
  message: string;
}
export type Ack<T = object> = ({ ok: true } & T) | AckError;

export type ConnectionState = 'connected' | 'reconnecting';

export interface PublicParticipant {
  id: string;
  nickname: string;
  isHost: boolean;
  audio: boolean;
  video: boolean;
  screen: boolean;
  connection: ConnectionState;
  joinSeq: number;
}

export interface IceServerConfig {
  urls: string[];
  username?: string;
  credential?: string;
}

export interface JoinResult {
  selfId: string;
  token: string;
  hostId: string | null;
  locked: boolean;
  participants: PublicParticipant[];
  iceServers: IceServerConfig[];
  config: { maxParticipants: number; reconnectGraceSec: number };
}

// REST
export interface CreateRoomResponse {
  v: 1;
  roomId: string;
  hostClaim: string;
}
export interface RoomStatusResponse {
  v: 1;
  exists: boolean;
  locked: boolean;
  needsPassword: boolean;
  full: boolean;
  hostPresent: boolean;
}

/** GET /api/meta: 값이 설정되지 않은 항목은 null이며 클라이언트는 "미정"으로 표시한다. */
export interface MetaResponse {
  v: 1;
  operator: { contact: string | null; privacyOfficer: string | null };
  legal: { effectiveDate: string | null };
  network: { stunHosts: string[]; turnHosts: string[] };
}

// 서버 → 클라이언트 페이로드
export interface SignalRelay {
  v: 1;
  from: string;
  description?: SessionDescription;
  candidate?: IceCandidatePayload;
}
export interface ChatMessage {
  v: 1;
  id: string;
  from: string;
  nickname: string;
  text: string;
  ts: number;
}

type Cb<T> = (res: Ack<T>) => void;

export interface ClientToServerEvents {
  'room:join': (p: JoinRequest, ack: Cb<JoinResult>) => void;
  'room:resume': (p: ResumeRequest, ack: Cb<JoinResult>) => void;
  'room:leave': (p: EmptyRequest, ack: Cb<object>) => void;
  'signal:send': (p: SignalRequest, ack: Cb<object>) => void;
  'chat:send': (p: ChatSendRequest, ack: Cb<object>) => void;
  'media:state': (p: MediaStateRequest, ack: Cb<object>) => void;
  'screen:start': (p: EmptyRequest, ack: Cb<object>) => void;
  'screen:stop': (p: EmptyRequest, ack: Cb<object>) => void;
  'host:lock': (p: LockRequest, ack: Cb<object>) => void;
  'host:kick': (p: KickRequest, ack: Cb<object>) => void;
  'host:muteAll': (p: EmptyRequest, ack: Cb<object>) => void;
  'metrics:path': (p: MetricsPathRequest, ack: Cb<object>) => void;
}

export interface ServerToClientEvents {
  'room:participantJoined': (p: { v: 1; participant: PublicParticipant }) => void;
  'room:participantLeft': (p: { v: 1; id: string; reason: 'left' | 'timeout' | 'kicked' }) => void;
  'room:participantUpdated': (p: {
    v: 1;
    id: string;
    audio?: boolean;
    video?: boolean;
    screen?: boolean;
    connection?: ConnectionState;
  }) => void;
  'room:hostChanged': (p: { v: 1; hostId: string }) => void;
  'room:locked': (p: { v: 1; locked: boolean }) => void;
  'signal:recv': (p: SignalRelay) => void;
  'chat:message': (p: ChatMessage) => void;
  'host:muteAll': (p: { v: 1; by: string }) => void;
  'room:kicked': (p: { v: 1; reason: string }) => void;
  'room:closed': (p: { v: 1 }) => void;
}
