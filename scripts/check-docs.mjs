#!/usr/bin/env node
// 문서 정합성 점검: ID 정의/참조/추적성/상단 양식.
// 사용법: node scripts/check-docs.mjs          (점검만, 실패 시 종료 코드 1)
//         node scripts/check-docs.mjs --gen    (docs/traceability.md 표를 문서 기준으로 재생성, EVT/TC/비고 칸은 보존)
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const docs = (p) => path.join(root, 'docs', p);
const read = (p) => fs.readFileSync(docs(p), 'utf8');
const exists = (p) => fs.existsSync(docs(p));

const PLANNING = ['product-brief', 'prd', 'personas-journeys', 'ia-flows', 'policies', 'screen-spec', 'glossary', 'roadmap'].map(
  (n) => `01-planning/${n}.md`,
);
const ID_RE = /\b(FR|NFR|UX|SEC|POL|SCR|FLOW|RISK|KPI|A|E|SC|U|EVT|UAT|MC)-(\d{1,2})\b/g;
const REQ_TYPES = ['FR', 'NFR', 'UX', 'SEC'];
const errors = [];
const err = (m) => errors.push(m);
const idsIn = (text) => [...text.matchAll(ID_RE)].map((m) => `${m[1]}-${m[2].padStart(2, '0')}`);
const uniq = (a) => [...new Set(a)];
const byNum = (a, b) => a.localeCompare(b, 'en', { numeric: true });

// 1) 문서 상단 양식
for (const f of PLANNING) {
  if (!exists(f)) { err(`[양식] 파일 없음: ${f}`); continue; }
  const t = read(f);
  if (!t.split('\n')[0].startsWith('> **이 문서의 용도**')) err(`[양식] 첫 줄이 용도 한 줄이 아님: ${f}`);
  for (const k of ['버전', '작성일', '상태', '주도', '변경 이력']) if (!t.includes(k)) err(`[양식] '${k}' 누락: ${f}`);
}

// 2) 정의된 ID 수집
const defined = new Set();
const rowDef = (text, re) => { for (const m of text.matchAll(re)) defined.add(m[1].replace(/-(\d)$/, '-0$1')); };
const prd = read('01-planning/prd.md');
rowDef(prd, /^\| ((?:FR|NFR|UX|SEC|A|E)-\d+) \|/gm);
rowDef(read('01-planning/policies.md'), /^## (POL-\d+)/gm);
rowDef(read('01-planning/screen-spec.md'), /^\| (SCR-\d+) \|/gm);
rowDef(read('01-planning/ia-flows.md'), /^### (FLOW-\d+)/gm);
rowDef(read('01-planning/product-brief.md'), /^\| ((?:RISK|KPI)-\d+) \|/gm);
rowDef(read('01-planning/personas-journeys.md'), /^\| (SC-\d+) \|/gm);
if (exists('00-gates/gate-0A.md')) rowDef(read('00-gates/gate-0A.md'), /^\| (U-\d+) \|/gm);

// 2-b) 테스트 케이스(TC/IT), EVT, UAT, MC 수집. 테스트 제목 형식: 'TC-12 [FR-07,POL-01] 제목' 또는 'IT-03 [..] 제목'
const TEST_DIRS = [['apps/server/test', '서버'], ['packages/shared/src', '공유'], ['apps/web/src', '웹'], ['e2e', 'E2E']];
const tests = [];
function walk(dir, kind) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return;
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    const full = path.join(abs, e.name);
    if (e.isDirectory()) walk(path.join(dir, e.name), kind);
    else if (/\.(test|spec)\.ts$/.test(e.name)) {
      const text = fs.readFileSync(full, 'utf8');
      for (const m of text.matchAll(/(?:\bit|\btest)\(\s*(['"`])((?:TC|IT)-\d+[a-z]?) \[([^\]]+)\] (.+?)\1\s*,/g)) {
        tests.push({ id: m[2], reqs: m[3].split(',').map((x) => x.trim()), title: m[4].replace(/\s+/g, ' '), file: path.join(dir, e.name), kind: m[2].startsWith('IT') ? 'E2E' : kind });
      }
    }
  }
}
for (const [d, k] of TEST_DIRS) walk(d, k);
const dupTests = tests.map((t) => t.id).filter((id, i, a) => a.indexOf(id) !== i);
for (const id of uniq(dupTests)) err(`[테스트] TC/IT ID 중복: ${id}`);
for (const t of tests) defined.add(t.id);
// EVT: api-spec 표의 행
if (exists('03-engineering/api-spec.md')) rowDef(read('03-engineering/api-spec.md'), /^\| (EVT-\d+) \|/gm);
// UAT, MC: 품질 문서의 행. 형식: | UAT-01 | 제목 | FR-.. | ... |
const extra = [];
for (const [f, pre] of [['05-qa/uat.md', 'UAT'], ['05-qa/manual-checks.md', 'MC']]) {
  if (!exists(f)) continue;
  for (const m of read(f).matchAll(new RegExp(`^\\| (${pre}-\\d+) \\| (.*?) \\| ([^|]*) \\|`, 'gm'))) {
    defined.add(m[1]);
    extra.push({ id: m[1], title: m[2], reqs: idsIn(m[3]).filter((i) => /^(FR|NFR|UX|SEC)-/.test(i)), file: f, kind: pre });
  }
}
// 요구 ID → TC/IT/UAT/MC
const coverage = {};
for (const t of [...tests, ...extra]) for (const r of t.reqs) (coverage[r] ??= []).push(t.id);
// 요구 ID → EVT (api-spec §7 매핑 표)
const evtMap = {};
if (exists('03-engineering/api-spec.md')) {
  const sec7 = read('03-engineering/api-spec.md').split('## 7.')[1] ?? '';
  const expand = (txt) => txt.split(',').flatMap((tok) => {
    const t = tok.trim();
    const range = t.match(/^([A-Z]+)-(\d+)~(\d+)$/);
    if (range) return Array.from({ length: Number(range[3]) - Number(range[2]) + 1 }, (_, i) => `${range[1]}-${String(Number(range[2]) + i).padStart(2, '0')}`);
    return t ? [t] : [];
  });
  for (const m of sec7.matchAll(/^\| ([^|]+) \| ([^|]+) \|\s*$/gm)) {
    const reqIds = expand(m[1]).filter((x) => /^(FR|NFR|UX|SEC)-\d+$/.test(x));
    if (/클라이언트 전용/.test(m[2])) {
      for (const r of reqIds) evtMap[r] = ['클라이언트 전용'];
      continue;
    }
    const evts = expand(m[2]).map((x) => x.replace(/^EVT-(\d)$/, 'EVT-0$1'));
    for (const r of reqIds) evtMap[r] = uniq([...(evtMap[r] ?? []), ...evts.filter((x) => /^EVT-\d+$/.test(x))]);
  }
}

// 3) 댕글링 참조
const scan = [...PLANNING, 'traceability.md', '03-engineering/api-spec.md'].filter(exists);
for (const f of scan) {
  for (const id of uniq(idsIn(read(f)))) if (!defined.has(id)) err(`[참조] 정의되지 않은 ID ${id} (in ${f})`);
}

// 4) 요구 ID 정의 목록, 우선순위·인수 조건
const reqs = [...defined].filter((id) => REQ_TYPES.includes(id.split('-')[0])).sort(byNum);
const prio = {};
for (const m of prd.matchAll(/^\| ((?:FR|NFR|UX)-\d+) \| ([MSCW]) \|/gm)) prio[m[1]] = m[2];
for (const id of reqs.filter((i) => !i.startsWith('SEC')))
  if (!prio[id]) err(`[PRD] 우선순위 없음: ${id}`);
const acSection = prd.split('## 4. 인수 조건')[1]?.split('\n## 5.')[0] ?? '';
for (const id of reqs.filter((i) => i.startsWith('FR')))
  if (!new RegExp(`^\\| ${id} \\| .*G `, 'm').test(acSection)) err(`[PRD] 인수 조건(Given-When-Then) 없음: ${id}`);

// 5) 정책/화면/플로우 → 요구 참조 도출
function sectionsOf(file, idPrefix) {
  const out = {}; let cur = null;
  for (const line of read(file).split('\n')) {
    if (/^#{2,3} /.test(line)) {
      const m = line.match(new RegExp(`^#{2,3} (${idPrefix}-\\d+)`));
      cur = m ? m[1] : (/공통/.test(line) ? '공통' : null);
      if (cur && !out[cur]) out[cur] = [];
    }
    if (cur) out[cur].push(line);
  }
  return out;
}
const refs = {}; // reqId -> {POL:Set, SCR:Set, FLOW:Set}
const add = (req, kind, from) => { (refs[req] ??= { POL: new Set(), SCR: new Set(), FLOW: new Set() })[kind].add(from); };
for (const [kind, file, prefix] of [['POL', '01-planning/policies.md', 'POL'], ['SCR', '01-planning/screen-spec.md', 'SCR'], ['FLOW', '01-planning/ia-flows.md', 'FLOW']]) {
  const secs = sectionsOf(file, prefix);
  for (const [sid, lines] of Object.entries(secs)) {
    for (const id of uniq(idsIn(lines.slice(1).join('\n')))) if (REQ_TYPES.includes(id.split('-')[0])) add(id, kind, sid);
  }
}
const fmt = (s) => [...(s ?? [])].sort(byNum).join(', ');

// 6) 커버리지: FR/UX는 미참조 0건 필수, NFR/SEC는 미참조 시 후속 게이트 지정 필요
const unref = reqs.filter((id) => {
  const r = refs[id]; return !r || (r.POL.size + r.SCR.size + r.FLOW.size === 0);
});
for (const id of unref) {
  const t = id.split('-')[0];
  if (t === 'FR' || t === 'UX') err(`[커버리지] 정책/화면/플로우에서 참조되지 않음: ${id}`);
}

// 7) 추적성 매트릭스 생성/검증
const BEGIN = '<!-- BEGIN GENERATED -->', END = '<!-- END GENERATED -->';
const summary = {};
for (const m of prd.matchAll(/^\| ((?:FR|NFR|UX|SEC)-\d+) \|(.*)\|\s*$/gm)) {
  const cells = m[2].split('|').map((c) => c.trim());
  if (summary[m[1]]) continue; // 첫 등장(요구 표)만 사용, 인수 조건 표는 건너뜀
  const text = cells[cells.length - 1].replace(/\s+/g, ' ');
  summary[m[1]] = text.length > 38 ? `${text.slice(0, 38)}…` : text;
}
const old = {};
if (exists('traceability.md')) {
  for (const line of read('traceability.md').split('\n')) {
    const c = line.split('|').map((x) => x.trim());
    if (/^(FR|NFR|UX|SEC)-\d+$/.test(c[1] ?? '')) old[c[1]] = { evt: c[7], tc: c[8], note: c[9] };
  }
}
const sortIds = (a) => [...a].sort(byNum);
const row = (id) => {
  const r = refs[id] ?? {};
  const pr = prio[id] ?? '-';
  const none = !r.POL?.size && !r.SCR?.size && !r.FLOW?.size;
  const tcs = sortIds(uniq(coverage[id] ?? []));
  const notes = [];
  if (none) notes.push('정책·화면 대신 EVT/TC로 추적');
  if (!tcs.length) notes.push('⚠ 테스트 연결 없음');
  return `| ${id} | ${pr} | ${summary[id]} | ${fmt(r.POL) || '-'} | ${fmt(r.SCR) || '-'} | ${fmt(r.FLOW) || '-'} | ${(evtMap[id] ?? []).join(', ') || '-'} | ${tcs.join(', ') || '-'} | ${notes.join('; ')} |`;
};
const header = '| 요구 ID | 우선 | 요약 | POL | SCR | FLOW | EVT | TC | 비고 |\n|---|---|---|---|---|---|---|---|---|';
const table = `${header}\n${reqs.map(row).join('\n')}`;

if (process.argv.includes('--gen')) {
  const intro = `> **이 문서의 용도** — 누가: 기획자, 개발자, 보안 담당자 / 언제: 요구가 바뀔 때, 게이트·Phase를 승인할 때 / 무엇을: 모든 요구가 정책·화면·이벤트·테스트에 연결되어 있는지(미연결=결함)를 결정한다.

# 추적성 매트릭스

| 항목 | 내용 |
|---|---|
| 버전 | 0.1 |
| 작성일 | 2026-10-01 |
| 상태 | 승인 (전 열 자동 도출, 2026-10-01) |
| 주도 | ① 기획자(PM) |

## 변경 이력
| 버전 | 날짜 | 내용 |
|---|---|---|
| 0.1 | 2026-10-01 | 최초 작성 |
| 0.2 | 2026-10-01 | EVT는 api-spec §7, TC는 테스트 제목의 [요구 ID]에서 자동 도출 |

규칙: 모든 열을 문서와 테스트에서 **자동 도출**한다(손으로 고치지 않는다, \`node scripts/check-docs.mjs --gen\`). POL/SCR/FLOW는 정책서·화면 정의서·플로우의 "요구 참조", EVT는 \`api-spec.md\` §7, TC는 테스트 제목의 \`[요구 ID]\`, UAT/MC는 \`uat.md\`·\`manual-checks.md\`의 행에서 가져온다. "공통"은 모든 화면에 적용되는 규칙이다. 미연결은 결함으로 보고한다.

`;
  fs.writeFileSync(docs('traceability.md'), `${intro}${BEGIN}\n${table}\n${END}\n`);
  // 테스트 케이스 목록(05-qa/test-cases.md의 표 부분)을 테스트 코드에서 생성
  const caseRows = [...tests].sort((a, b) => byNum(a.id, b.id)).map((t) => `| ${t.id} | ${t.title.replace(/\|/g, '/')} | ${t.reqs.join(', ')} | ${t.kind} | \`${t.file}\` | 자동 |`);
  const manualRows = extra.map((t) => `| ${t.id} | ${t.title} | ${t.reqs.join(', ')} | ${t.kind === 'UAT' ? '사용자 수행' : '수동/명령'} | \`${t.file}\` | ${t.kind === 'UAT' ? '미수행' : '수행 기록 참조'} |`);
  fs.mkdirSync(docs('05-qa'), { recursive: true });
  const casesIntro = fs.existsSync(docs('05-qa/test-cases.md')) ? read('05-qa/test-cases.md').split(BEGIN)[0] : '';
  fs.writeFileSync(docs('05-qa/test-cases.md'), `${casesIntro}${BEGIN}\n| ID | 제목 | 연결 요구 | 유형 | 파일 | 실행 |\n|---|---|---|---|---|---|\n${[...caseRows, ...manualRows].join('\n')}\n${END}\n`);
  console.log(`traceability.md 생성: 요구 ${reqs.length}개, 테스트 ${tests.length}개, 수동/UAT ${extra.length}개`);
  process.exit(0);
}

if (!exists('traceability.md')) err('[추적성] docs/traceability.md 없음 (--gen으로 생성)');
else {
  const cur = read('traceability.md');
  const cells = (l) => l.split('|').map((x) => x.trim());
  const have = {};
  for (const l of cur.split('\n')) { const c = cells(l); if (/^(FR|NFR|UX|SEC)-\d+$/.test(c[1] ?? '')) have[c[1]] = c; }
  for (const id of reqs) {
    const c = have[id];
    if (!c) { err(`[추적성] 매트릭스에 행 없음: ${id}`); continue; }
    const exp = cells(row(id));
    for (const [i, name] of [[4, 'POL'], [5, 'SCR'], [6, 'FLOW'], [7, 'EVT'], [8, 'TC']]) if (c[i] !== exp[i]) err(`[추적성] ${id} ${name} 열이 문서와 불일치 (표: ${c[i]} / 문서: ${exp[i]}) → --gen 실행`);
  }
  for (const id of Object.keys(have)) if (!reqs.includes(id)) err(`[추적성] 정의되지 않은 행: ${id}`);
}

// 7-b) 요구 대비 테스트 미연결(결함): M 우선순위 FR/NFR/UX는 TC/IT/UAT/MC 중 하나 이상 필요
const untested = reqs.filter((id) => !(coverage[id]?.length));
for (const id of untested) if (prio[id] === 'M' || id.startsWith('SEC')) err(`[테스트] 요구에 연결된 TC/IT/UAT/MC가 없음: ${id}`);
const noEvt = reqs.filter((id) => id.startsWith('FR') && !(evtMap[id]?.length));
for (const id of noEvt) err(`[기술] FR이 EVT에 매핑되지 않음(api-spec §7): ${id}`);

// 8) 문서 인덱스
if (!exists('README.md')) err('[인덱스] docs/README.md 없음');
else {
  const idx = read('README.md');
  for (const f of PLANNING) if (!idx.includes(f.replace('01-planning/', '01-planning/'))) err(`[인덱스] docs/README.md에 없음: ${f}`);
}

// 결과
const count = (t) => reqs.filter((i) => i.startsWith(t)).length;
console.log(`요구 ID: FR ${count('FR')} / NFR ${count('NFR')} / UX ${count('UX')} / SEC ${count('SEC')}  (합계 ${reqs.length})`);
console.log(`정의 ID 합계: ${defined.size} (POL ${[...defined].filter((i) => i.startsWith('POL')).length}, SCR ${[...defined].filter((i) => i.startsWith('SCR')).length}, FLOW ${[...defined].filter((i) => i.startsWith('FLOW')).length})`);
console.log(`테스트(TC/IT) ${tests.length}개, 수동/UAT ${extra.length}개, 테스트 미연결 요구 ${untested.length}건${untested.length ? ' → ' + untested.join(', ') : ''}`);
console.log(`정책/화면/플로우 미참조 요구: ${unref.length}건 ${unref.length ? `→ ${unref.join(', ')}` : ''}`);
const unrefFRUX = unref.filter((i) => /^(FR|UX)-/.test(i));
console.log(`  그중 FR/UX 미참조(실패 조건): ${unrefFRUX.length}건`);
if (errors.length) {
  console.log(`\n실패 ${errors.length}건`);
  for (const e of errors) console.log(` - ${e}`);
  process.exit(1);
}
console.log('\n점검 통과');
