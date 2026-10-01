import { describe, expect, it } from 'vitest';
import { classifyPath } from './pathType';

const cand = (id: string, candidateType: unknown): Record<string, unknown> => ({ id, type: 'local-candidate', candidateType });
const pair = (extra: Record<string, unknown> = {}): Record<string, unknown> => ({ id: 'P', type: 'candidate-pair', state: 'succeeded', nominated: true, localCandidateId: 'L', remoteCandidateId: 'R', ...extra });

describe('경로 판정 (NFR-15)', () => {
  it('TC-400 [NFR-15] 선택된 쌍의 후보 타입으로 direct(host/srflx/prflx)와 relay를 판정한다', () => {
    for (const t of ['host', 'srflx', 'prflx']) expect(classifyPath([pair(), cand('L', t), cand('R', 'host')])).toBe('direct');
    expect(classifyPath([pair(), cand('L', 'relay'), cand('R', 'host')])).toBe('relay');
    expect(classifyPath([pair(), cand('L', 'host'), cand('R', 'relay')])).toBe('relay');
    expect(classifyPath([pair(), cand('L', 'relay'), cand('R', 'relay')])).toBe('relay');
  });
  it('TC-401 [NFR-15] transport.selectedCandidatePairId가 있으면 그 쌍을 우선하고, 선택 안 된 다른 쌍은 무시한다', () => {
    const other = pair({ id: 'Q', localCandidateId: 'L2', remoteCandidateId: 'R' });
    const stats = [other, pair(), cand('L', 'host'), cand('L2', 'relay'), cand('R', 'host'), { id: 'T', type: 'transport', selectedCandidatePairId: 'P' }];
    expect(classifyPath(stats)).toBe('direct');
  });
  it('TC-402 [NFR-15] 빈 통계·쌍 없음·nominated/succeeded 아님·후보 누락·알 수 없는 타입·이상한 항목은 null(보고 안 함)이다', () => {
    expect(classifyPath([])).toBeNull();
    expect(classifyPath([cand('L', 'host'), cand('R', 'host')])).toBeNull();
    expect(classifyPath([pair({ nominated: false }), cand('L', 'host'), cand('R', 'host')])).toBeNull();
    expect(classifyPath([pair({ state: 'in-progress' }), cand('L', 'host'), cand('R', 'host')])).toBeNull();
    expect(classifyPath([pair(), cand('L', 'host')])).toBeNull();
    expect(classifyPath([pair(), cand('L', 'host'), cand('R', 'weird')])).toBeNull();
    expect(classifyPath([pair(), cand('L', 'host'), cand('R', 5)])).toBeNull();
    expect(classifyPath([null, 3, 'x', pair(), cand('L', 'srflx'), cand('R', 'host')])).toBe('direct');
    expect(classifyPath([{ id: 'T', type: 'transport', selectedCandidatePairId: 'none' }, pair(), cand('L', 'host'), cand('R', 'host')])).toBe('direct');
  });
});
