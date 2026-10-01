import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';

// bcrypt는 72바이트 초과 입력을 잘라 버리므로(한글은 3바이트), SHA-256으로 먼저 줄인 뒤 해시한다.
const prehash = (plain: string): string => createHash('sha256').update(plain, 'utf8').digest('base64');

export const hashPassword = (plain: string): Promise<string> => bcrypt.hash(prehash(plain), 10);
export const verifyPassword = (plain: string, hash: string): Promise<boolean> => bcrypt.compare(prehash(plain), hash);
