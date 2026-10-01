import { createHash, createHmac, randomBytes } from 'node:crypto';
import dgram from 'node:dgram';
import { isIPv4, isIPv6 } from 'node:net';

/** SEC-12 L2 시험용 최소 TURN(RFC 8656) 클라이언트. 의존성 없이 Allocate와 CreatePermission만 구현한다. */

const COOKIE = 0x2112a442;
const T = {
  allocate: 0x0003,
  createPermission: 0x0008,
  username: 0x0006,
  messageIntegrity: 0x0008,
  errorCode: 0x0009,
  realm: 0x0014,
  nonce: 0x0015,
  xorPeerAddress: 0x0012,
  requestedTransport: 0x0019,
} as const;

export interface TurnResult {
  ok: boolean;
  /** 오류 응답의 ERROR-CODE(예: 403, 443, 486). 성공이면 undefined */
  code?: number;
}

type Attr = { type: number; value: Buffer };

const pad4 = (n: number): number => (4 - (n % 4)) % 4;

function encodeAttrs(attrs: Attr[]): Buffer {
  return Buffer.concat(attrs.map((a) => {
    const head = Buffer.alloc(4);
    head.writeUInt16BE(a.type, 0);
    head.writeUInt16BE(a.value.length, 2);
    return Buffer.concat([head, a.value, Buffer.alloc(pad4(a.value.length))]);
  }));
}

function header(type: number, bodyLen: number, txid: Buffer): Buffer {
  const h = Buffer.alloc(20);
  h.writeUInt16BE(type, 0);
  h.writeUInt16BE(bodyLen, 2);
  h.writeUInt32BE(COOKIE, 4);
  txid.copy(h, 8);
  return h;
}

function parseAttrs(msg: Buffer): Map<number, Buffer> {
  const out = new Map<number, Buffer>();
  const end = 20 + msg.readUInt16BE(2);
  for (let off = 20; off + 4 <= end;) {
    const type = msg.readUInt16BE(off);
    const len = msg.readUInt16BE(off + 2);
    out.set(type, msg.subarray(off + 4, off + 4 + len));
    off += 4 + len + pad4(len);
  }
  return out;
}

/** IPv6 문자열을 16바이트로 푼다. `::ffff:1.2.3.4` 표기 지원. */
export function ipv6ToBytes(ip: string): Buffer {
  let s = ip;
  const m = /^(.*:)(\d+\.\d+\.\d+\.\d+)$/.exec(s);
  if (m) {
    const [a, b, c, d] = (m[2] ?? '').split('.').map(Number) as [number, number, number, number];
    s = `${m[1]}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const [left = '', right] = s.split('::');
  const l = left ? left.split(':') : [];
  const r = right === undefined ? [] : right ? right.split(':') : [];
  const groups = right === undefined ? l : [...l, ...Array<string>(8 - l.length - r.length).fill('0'), ...r];
  if (groups.length !== 8) throw new Error(`잘못된 IPv6: ${ip}`);
  const buf = Buffer.alloc(16);
  groups.forEach((g, i) => buf.writeUInt16BE(parseInt(g, 16), i * 2));
  return buf;
}

function xorPeer(ip: string, port: number, txid: Buffer): Buffer {
  const cookie = Buffer.alloc(4);
  cookie.writeUInt32BE(COOKIE);
  const key = Buffer.concat([cookie, txid]);
  const addr = isIPv4(ip) ? Buffer.from(ip.split('.').map(Number)) : isIPv6(ip) ? ipv6ToBytes(ip) : null;
  if (!addr) throw new Error(`잘못된 IP: ${ip}`);
  const v = Buffer.alloc(4 + addr.length);
  v[1] = isIPv4(ip) ? 0x01 : 0x02;
  v.writeUInt16BE(port ^ (COOKIE >>> 16), 2);
  addr.forEach((b, i) => { v[4 + i] = b ^ (key[i] ?? 0); });
  return v;
}

export function turnCredential(secret: string, id = 'probe', ttlSec = 600): { username: string; password: string } {
  const username = `${Math.floor(Date.now() / 1000) + ttlSec}:${id}`;
  return { username, password: createHmac('sha1', secret).update(username).digest('base64') };
}

export class TurnProbe {
  private readonly sock = dgram.createSocket('udp4');
  private realm = '';
  private nonce: Buffer = Buffer.alloc(0);
  private readonly waiters: Array<(m: Buffer) => void> = [];

  constructor(
    private readonly host: string,
    private readonly port: number,
    private readonly cred: { username: string; password: string },
  ) {
    this.sock.on('message', (m) => this.waiters.shift()?.(m));
  }

  close(): void {
    this.sock.close();
  }

  private request(type: number, attrs: Attr[], authed: boolean, timeoutMs = 3000, txid = randomBytes(12)): Promise<Buffer> {
    let body = encodeAttrs(attrs);
    if (authed) {
      const key = createHash('md5').update(`${this.cred.username}:${this.realm}:${this.cred.password}`).digest();
      const pre = Buffer.concat([header(type, body.length + 24, txid), body]);
      const mi = createHmac('sha1', key).update(pre).digest();
      body = Buffer.concat([body, encodeAttrs([{ type: T.messageIntegrity, value: mi }])]);
    }
    const msg = Buffer.concat([header(type, body.length, txid), body]);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('TURN 응답 시간 초과')), timeoutMs);
      this.waiters.push((m) => { clearTimeout(timer); resolve(m); });
      this.sock.send(msg, this.port, this.host, (err) => { if (err) { clearTimeout(timer); reject(err); } });
    });
  }

  private authAttrs(): Attr[] {
    return [
      { type: T.username, value: Buffer.from(this.cred.username) },
      { type: T.realm, value: Buffer.from(this.realm) },
      { type: T.nonce, value: this.nonce },
    ];
  }

  private static result(res: Buffer, okType: number): TurnResult {
    const type = res.readUInt16BE(0);
    if (type === okType) return { ok: true };
    const ec = parseAttrs(res).get(T.errorCode);
    return { ok: false, code: ec ? ec.readUInt8(2) * 100 + ec.readUInt8(3) : undefined };
  }

  /** 무인증 Allocate로 REALM·NONCE를 받아 온다. 서버가 아직 뜨지 않았으면 예외. */
  async hello(): Promise<void> {
    const res = await this.request(T.allocate, [{ type: T.requestedTransport, value: Buffer.from([17, 0, 0, 0]) }], false, 800);
    const a = parseAttrs(res);
    const realm = a.get(T.realm);
    const nonce = a.get(T.nonce);
    if (!realm || !nonce) throw new Error('401 응답에 REALM/NONCE가 없습니다');
    this.realm = realm.toString();
    this.nonce = nonce;
  }

  async allocate(): Promise<TurnResult> {
    const attrs = [{ type: T.requestedTransport, value: Buffer.from([17, 0, 0, 0]) }, ...this.authAttrs()];
    return TurnProbe.result(await this.request(T.allocate, attrs, true), 0x0103);
  }

  async createPermission(peerIp: string): Promise<TurnResult> {
    const txid = randomBytes(12);
    const attrs = [{ type: T.xorPeerAddress, value: xorPeer(peerIp, 0, txid) }, ...this.authAttrs()];
    const res = await this.request(T.createPermission, attrs, true, 3000, txid);
    return TurnProbe.result(res, 0x0108);
  }
}
