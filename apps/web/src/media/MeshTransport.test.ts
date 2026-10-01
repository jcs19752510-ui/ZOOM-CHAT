import { describe, expect, it } from 'vitest';
import { qualityTier } from './MeshTransport';

describe('송신 품질 상한 (NFR-13)', () => {
  it('TC-210 [NFR-13] 인원이 늘수록 비트레이트 상한이 낮아지고 해상도가 줄어든다', () => {
    const t = [1, 2, 3, 4, 5, 6].map((n) => qualityTier(n));
    expect(t.map((x) => x.maxBitrate)).toEqual([1_500_000, 1_500_000, 700_000, 700_000, 400_000, 400_000]);
    expect(t[0]?.scaleDown).toBe(1);
    expect(t[5]?.scaleDown).toBe(2);
  });
  it('TC-211 [NFR-13,RISK-01] 6명 mesh의 총 업링크는 약 2Mbps 이하(5개 스트림 × 400kbps)다', () => {
    const t = qualityTier(6);
    expect((6 - 1) * t.maxBitrate).toBeLessThanOrEqual(2_000_000);
  });
});
