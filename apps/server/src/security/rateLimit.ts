/** 토큰 버킷. capacity만큼 한꺼번에, 이후 초당 refillPerSec씩 보충된다. */
export class TokenBucket {
  private tokens: number;
  private last: number;
  constructor(
    private readonly capacity: number,
    private readonly refillPerSec: number,
    private readonly now: () => number = Date.now,
  ) {
    this.tokens = capacity;
    this.last = now();
  }
  take(): boolean {
    const t = this.now();
    this.tokens = Math.min(this.capacity, this.tokens + ((t - this.last) / 1000) * this.refillPerSec);
    this.last = t;
    if (this.tokens < 1) return false;
    this.tokens -= 1;
    return true;
  }
}

/** IP 원문을 키로 쓰는 제한기가 메모리에 키를 두는 최대 기준(D-6, POL-18): 미사용 10분 + 정리 주기 5분. */
export const IDLE_KEY_MS = 10 * 60_000;
export const SWEEP_INTERVAL_MS = 5 * 60_000;

/** 정기 정리 타이머. unref라서 프로세스 종료를 막지 않는다. */
function startSweeper(sweep: () => void, everyMs: number): NodeJS.Timeout | undefined {
  if (everyMs <= 0) return undefined;
  const timer = setInterval(sweep, everyMs);
  timer.unref();
  return timer;
}

export interface BucketSpec {
  capacity: number;
  refillPerSec: number;
}

/** 키(IP 등)별 버킷. 오래 안 쓴 키는 주기적으로 정리한다. */
export class KeyedRateLimiter {
  private buckets = new Map<string, { bucket: TokenBucket; seen: number }>();
  private readonly timer: NodeJS.Timeout | undefined;
  constructor(
    private readonly spec: BucketSpec,
    private readonly now: () => number = Date.now,
    sweepEveryMs: number = SWEEP_INTERVAL_MS,
  ) {
    this.timer = startSweeper(() => this.sweep(), sweepEveryMs);
  }
  get size(): number {
    return this.buckets.size;
  }
  dispose(): void {
    clearInterval(this.timer);
  }
  allow(key: string): boolean {
    const t = this.now();
    let e = this.buckets.get(key);
    if (!e) {
      if (this.buckets.size > 50_000) this.sweep();
      e = { bucket: new TokenBucket(this.spec.capacity, this.spec.refillPerSec, this.now), seen: t };
      this.buckets.set(key, e);
    }
    e.seen = t;
    return e.bucket.take();
  }
  /** 오래 쓰지 않은 키(IP 원문)를 지운다. 같은 키가 다시 오면 새 버킷이 만들어진다. */
  sweep(): void {
    const t = this.now();
    for (const [k, v] of this.buckets) if (t - v.seen > IDLE_KEY_MS) this.buckets.delete(k);
  }
}

/** 실패 횟수 제한(비밀번호 오답 등). windowMs 안에 limit회 실패하면 blockMs 동안 차단한다(SEC-02, POL-11). */
export class AttemptLimiter {
  private entries = new Map<string, { fails: number[]; blockedUntil: number }>();
  private readonly timer: NodeJS.Timeout | undefined;
  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly blockMs: number,
    private readonly now: () => number = Date.now,
    sweepEveryMs: number = SWEEP_INTERVAL_MS,
  ) {
    this.timer = startSweeper(() => this.sweep(), sweepEveryMs);
  }
  get size(): number {
    return this.entries.size;
  }
  dispose(): void {
    clearInterval(this.timer);
  }
  isBlocked(key: string): boolean {
    const e = this.entries.get(key);
    return !!e && e.blockedUntil > this.now();
  }
  recordFailure(key: string): void {
    const t = this.now();
    const e = this.entries.get(key) ?? { fails: [], blockedUntil: 0 };
    e.fails = e.fails.filter((f) => t - f < this.windowMs);
    e.fails.push(t);
    if (e.fails.length >= this.limit) {
      e.blockedUntil = t + this.blockMs;
      e.fails = [];
    }
    this.entries.set(key, e);
    if (this.entries.size > 50_000) this.sweep();
  }
  /** 차단이 끝났고 집계 창 안의 실패 기록도 없는 키를 지운다. */
  sweep(): void {
    const t = this.now();
    for (const [k, v] of this.entries) if (v.blockedUntil <= t && v.fails.every((f) => t - f >= this.windowMs)) this.entries.delete(k);
  }
  recordSuccess(key: string): void {
    this.entries.delete(key);
  }
}
