import { z } from 'zod';
import { LIMITS, PROTOCOL_VERSION } from './limits';
import { normalizeNickname } from './text';

const v = z.literal(PROTOCOL_VERSION);

export const RoomIdSchema = z.string().regex(/^[A-Za-z0-9_-]{22}$/);
export const ParticipantIdSchema = z.string().regex(/^[A-Za-z0-9_-]{8,24}$/);
export const NicknameSchema = z
  .string()
  .max(LIMITS.nicknameRawMax)
  .refine((s) => normalizeNickname(s) !== null, 'invalid nickname');
export const PasswordSchema = z.string().min(LIMITS.passwordMin).max(LIMITS.passwordMax);
export const TokenSchema = z.string().min(20).max(LIMITS.tokenMax);

export const SessionDescriptionSchema = z.strictObject({
  type: z.enum(['offer', 'answer']),
  sdp: z.string().max(LIMITS.sdpMax),
});

export const IceCandidateSchema = z.strictObject({
  candidate: z.string().max(LIMITS.candidateMax),
  sdpMid: z.string().max(64).nullable().optional(),
  sdpMLineIndex: z.number().int().min(0).max(255).nullable().optional(),
  usernameFragment: z.string().max(64).nullable().optional(),
});

// REST
export const CreateRoomRequestSchema = z.strictObject({ v, password: PasswordSchema.optional() });

// Socket: 클라이언트 → 서버 (strict: 모르는 키, 특히 from 같은 발신자 필드는 거부한다)
export const JoinRequestSchema = z.strictObject({
  v,
  roomId: RoomIdSchema,
  nickname: NicknameSchema,
  password: PasswordSchema.optional(),
  hostClaim: TokenSchema.optional(),
});
export const ResumeRequestSchema = z.strictObject({ v, token: TokenSchema });
export const EmptyRequestSchema = z.strictObject({ v });
export const SignalRequestSchema = z
  .strictObject({
    v,
    to: ParticipantIdSchema,
    description: SessionDescriptionSchema.optional(),
    candidate: IceCandidateSchema.optional(),
  })
  .refine((m) => (m.description ? 1 : 0) + (m.candidate ? 1 : 0) === 1, 'exactly one of description/candidate');
export const ChatSendRequestSchema = z.strictObject({ v, text: z.string().min(1).max(LIMITS.chatMax * 4) });
export const MediaStateRequestSchema = z.strictObject({ v, audio: z.boolean(), video: z.boolean() });
export const LockRequestSchema = z.strictObject({ v, locked: z.boolean() });
export const KickRequestSchema = z.strictObject({ v, targetId: ParticipantIdSchema });

export type CreateRoomRequest = z.infer<typeof CreateRoomRequestSchema>;
export type JoinRequest = z.infer<typeof JoinRequestSchema>;
export type ResumeRequest = z.infer<typeof ResumeRequestSchema>;
export type EmptyRequest = z.infer<typeof EmptyRequestSchema>;
export type SignalRequest = z.infer<typeof SignalRequestSchema>;
export type ChatSendRequest = z.infer<typeof ChatSendRequestSchema>;
export type MediaStateRequest = z.infer<typeof MediaStateRequestSchema>;
export type LockRequest = z.infer<typeof LockRequestSchema>;
export type KickRequest = z.infer<typeof KickRequestSchema>;
export type SessionDescription = z.infer<typeof SessionDescriptionSchema>;
export type IceCandidatePayload = z.infer<typeof IceCandidateSchema>;
