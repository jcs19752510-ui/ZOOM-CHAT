export type PathType = 'direct' | 'relay';

type Report = Record<string, unknown>;
const isReport = (r: unknown): r is Report => typeof r === 'object' && r !== null;
const DIRECT_TYPES = new Set(['host', 'srflx', 'prflx']);

/**
 * getStats() 결과에서 선택된 후보쌍을 찾아 경로를 판정한다. 로컬·원격 중 하나라도 relay면 'relay'.
 * 선택된 쌍이 없거나 후보 타입을 알 수 없으면 null(보고하지 않음).
 */
export function classifyPath(reports: Iterable<unknown>): PathType | null {
  const byId = new Map<string, Report>();
  const pairs: Report[] = [];
  let selectedId: string | undefined;
  for (const r of reports) {
    if (!isReport(r)) continue;
    if (typeof r.id === 'string') byId.set(r.id, r);
    if (r.type === 'transport' && typeof r.selectedCandidatePairId === 'string') selectedId = r.selectedCandidatePairId;
    if (r.type === 'candidate-pair') pairs.push(r);
  }
  const pair = (selectedId ? byId.get(selectedId) : undefined) ?? pairs.find((p) => p.nominated === true && p.state === 'succeeded');
  if (!pair) return null;
  const types = [pair.localCandidateId, pair.remoteCandidateId].map((id) => {
    const c = typeof id === 'string' ? byId.get(id) : undefined;
    return typeof c?.candidateType === 'string' ? c.candidateType : undefined;
  });
  if (types.includes('relay')) return 'relay';
  return types.every((t) => t !== undefined && DIRECT_TYPES.has(t)) ? 'direct' : null;
}
