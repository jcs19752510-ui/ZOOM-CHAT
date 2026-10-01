#!/usr/bin/env node
// 부하 스모크(NFR-04): 동시 N개 방 × 6명이 mesh 시그널링(offer/answer/ICE)과 채팅을 주고받는 상황을 모의한다.
// 사용법: npm run build -w @meetlite/server && node scripts/load-smoke.mjs [방 수=30] [인원=6]
import { spawn, execFileSync } from 'node:child_process';
import { io } from 'socket.io-client';

const ROOMS = Number(process.argv[2] ?? 30);
const SIZE = Number(process.argv[3] ?? 6);
const PORT = 3290;
const ORIGIN = `http://localhost:${PORT}`;
const SDP = 'v=0\r\n' + 'a=x-padding:'.padEnd(5400, 'x'); // 실제 SDP(약 5.5KB)와 비슷한 크기

const server = spawn('node', ['apps/server/dist/index.js'], {
  env: { ...process.env, PORT: String(PORT), NODE_ENV: 'production', ALLOWED_ORIGINS: ORIGIN, SESSION_SECRET: 'load-secret-load-secret-load-secret-12', MAX_ROOMS: '500', IP_MAX_CONNECTIONS: '1000', RATE_LIMIT_SCALE: '1000', RECONNECT_GRACE_SEC: '1', LOG_LEVEL: 'silent' },
  stdio: ['ignore', 'ignore', 'inherit'],
});
await new Promise((r) => setTimeout(r, 1500));

const rss = () => Number(execFileSync('ps', ['-o', 'rss=', '-p', String(server.pid)]).toString().trim()) / 1024;
const cpuSec = () => {
  // /proc/<pid>/stat: 괄호 뒤 필드에서 utime(14번째), stime(15번째)
  const rest = execFileSync('cat', [`/proc/${server.pid}/stat`]).toString().split(')')[1].trim().split(' ');
  return (Number(rest[11]) + Number(rest[12])) / 100;
};
const latencies = [];
const emit = (socket, event, payload) =>
  new Promise((resolve) => {
    const t = performance.now();
    const timer = setTimeout(() => resolve({ ok: false, code: 'TIMEOUT' }), 8000);
    socket.emit(event, payload, (res) => {
      clearTimeout(timer);
      latencies.push(performance.now() - t);
      resolve(res);
    });
  });
const connect = () =>
  new Promise((resolve, reject) => {
    const s = io(ORIGIN, { transports: ['websocket'], forceNew: true, reconnection: false, extraHeaders: { origin: ORIGIN } });
    s.once('connect', () => resolve(s));
    s.once('connect_error', reject);
  });

const rss0 = rss();
const cpu0 = cpuSec();
const started = performance.now();
const all = [];
let relayed = 0;
let errors = 0;

// 방 생성과 입장
const rooms = [];
for (let r = 0; r < ROOMS; r++) {
  const created = await (await fetch(`${ORIGIN}/api/rooms`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"v":1}' })).json();
  const members = [];
  for (let m = 0; m < SIZE; m++) {
    const s = await connect();
    s.on('signal:recv', () => relayed++);
    const res = await emit(s, 'room:join', { v: 1, roomId: created.roomId, nickname: `u${m}`, ...(m === 0 ? { hostClaim: created.hostClaim } : {}) });
    if (!res.ok) errors++;
    members.push({ s, id: res.selfId, roomId: created.roomId });
    all.push(s);
  }
  rooms.push(members);
}
const joinedAt = performance.now();

// 모든 쌍이 offer와 ICE 후보 12개를 주고받는다. 소켓마다 순차 전송(실제 클라이언트처럼 응답을 기다리며 보냄), 소켓끼리는 동시.
const perSocket = [];
for (const members of rooms) {
  for (const a of members) {
    perSocket.push(
      (async () => {
        const out = [];
        for (const b of members) {
          if (a === b) continue;
          out.push(await emit(a.s, 'signal:send', { v: 1, to: b.id, description: { type: 'offer', sdp: SDP } }));
          for (let i = 0; i < 12; i++) out.push(await emit(a.s, 'signal:send', { v: 1, to: b.id, candidate: { candidate: `candidate:${i} 1 udp 2122260223 192.168.0.${i} 5000${i} typ host` } }));
        }
        out.push(await emit(a.s, 'chat:send', { v: 1, text: '안녕하세요' }));
        return out;
      })(),
    );
  }
}
const results = (await Promise.all(perSocket)).flat();
const jobs = results;
errors += results.filter((r) => !r.ok && r.code !== 'RATE_LIMITED').length;
const rateLimited = results.filter((r) => r.code === 'RATE_LIMITED').length;
const doneAt = performance.now();
await new Promise((r) => setTimeout(r, 500));
const rssPeak = rss();
const cpu1 = cpuSec();

// 정리: 모두 나가면 방이 즉시 삭제되어야 한다
for (const s of all) s.close();
await new Promise((r) => setTimeout(r, 2500)); // 재접속 유예(1초) 뒤 방이 정리된다
const remaining = rooms.length ? (await (await fetch(`${ORIGIN}/api/rooms/${rooms[0]?.[0]?.roomId ?? 'A'.repeat(22)}`)).json()).exists : false;
server.kill('SIGTERM');

latencies.sort((a, b) => a - b);
const pct = (p) => Math.round(latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * p))] * 10) / 10;
console.log(
  JSON.stringify(
    {
      방: ROOMS,
      방당인원: SIZE,
      동시소켓: all.length,
      입장소요초: Math.round((joinedAt - started) / 100) / 10,
      신호처리: { 요청수: jobs.length, 릴레이수신: relayed, 소요초: Math.round((doneAt - joinedAt) / 100) / 10, 초당요청: Math.round(jobs.length / ((doneAt - joinedAt) / 1000)) },
      ack지연ms: { p50: pct(0.5), p95: pct(0.95), p99: pct(0.99), max: pct(1) },
      오류: errors,
      속도제한거부: rateLimited,
      서버메모리MB: { 시작: Math.round(rss0), 최대: Math.round(rssPeak) },
      서버CPU초: Math.round((cpu1 - cpu0) * 100) / 100,
      모두나간뒤방존재: remaining,
    },
    null,
    2,
  ),
);
