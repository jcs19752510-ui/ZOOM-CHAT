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

export interface BucketSpec {
  capacity: number;
  refillPerSec: number;
}

/** 키(IP 등)별 버킷. 오래 안 쓴 키는 주기적으로 정리한다. */
export class KeyedRateLimiter {
  private buckets = new Map<string, { bucket: TokenBucket; seen: number }>();
  constructor(
    private readonly spec: BucketSpec,
    private readonly now: () => number = Date.now,
  ) {}
  allow(key: string): boolean {
    const t = this.now();
    let e = this.buckets.get(key);
    if (!e) {
      if (this.buckets.size > 50_000) this.sweep(t);
      e = { bucket: new TokenBucket(this.spec.capacity, this.spec.refillPerSec, this.now), seen: t };
      this.buckets.set(key, e);
    }
    e.seen = t;
    return e.bucket.take();
  }
  private sweep(t: number): void {
    for (const [k, v] of this.buckets) if (t - v.seen > 10 * 60_000) this.buckets.delete(k);
  }
}

/** 실패 횟수 제한(비밀번호 오답 등). windowMs 안에 limit회 실패하면 blockMs 동안 차단한다(SEC-02, POL-11). */
export class AttemptLimiter {
  private entries = new Map<string, { fails: number[]; blockedUntil: number }>();
  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly blockMs: number,
    private readonly now: () => number = Date.now,
  ) {}
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
    if (this.entries.size > 50_000) for (const [k, v] of this.entries) if (v.blockedUntil < t && v.fails.length === 0) this.entries.delete(k);
  }
  recordSuccess(key: string): void {
    this.entries.delete(key);
  }
}
