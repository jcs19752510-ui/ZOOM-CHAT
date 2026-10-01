import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

// unit-14(E2E·QA) 소급 6단계 시험: E2E 소스의 위생 불변식과 scripts/check-docs.mjs가 일부러 깨뜨린 문서·시험에서 실제로 실패하는지.
const root = resolve(process.env.E2E_GUARD_ROOT ?? resolve(__dirname, '../../..'));
const E2E = resolve(root, 'e2e');
const specs = readdirSync(E2E).filter((f) => f.endsWith('.spec.ts')).sort();
const src = (f: string): string => readFileSync(join(E2E, f), 'utf8');

interface Block { file: string; title: string; body: string; start: number }
/** 줄 맨 앞(들여쓰기 허용)의 test( 호출을 한 블록으로 본다. 다음 test( 직전까지가 본문이다. */
export function blocksOf(file: string, text: string): Block[] {
  const lines = text.split('\n');
  const starts = lines.map((l, i) => (/^\s*test\((['"`])/.test(l) ? i : -1)).filter((i) => i >= 0);
  return starts.map((s, k) => {
    const end = starts[k + 1] ?? lines.length;
    const title = /^\s*test\((['"`])(.*?)\1\s*,/.exec(lines[s] as string)?.[2] ?? '';
    return { file, title, body: lines.slice(s, end).join('\n'), start: s + 1 };
  });
}
const all = specs.flatMap((f) => blocksOf(f, src(f)));

describe('unit-14 E2E 소스 위생 (소급 6단계)', () => {
  it('TC-495 [NFR-11,NFR-08] E2E 시험에 .only/.fixme가 없고 skip은 허용 목록·사유가 있으며 모든 시험은 ID 형식 제목과 단언을 가진다(검사기는 변이를 잡는다)', () => {
    expect(all.length).toBeGreaterThan(30);
    const problems: string[] = [];
    const ids = new Map<string, string>();
    for (const b of all) {
      const where = `${b.file}:${b.start}`;
      const m = /^((?:IT|TC)-\d+[a-z]?) \[([A-Z]+-\d+(?:,[A-Z]+-\d+)*)\] \S/.exec(b.title);
      if (!m) problems.push(`${where} 제목이 'IT-n [요구ID] 제목' 형식이 아님: ${b.title.slice(0, 40)}`);
      else if (!b.title.includes('${')) {
        if (ids.has(m[1] as string)) problems.push(`${where} ID 중복 ${m[1]} (${ids.get(m[1] as string)})`);
        ids.set(m[1] as string, where);
      }
      if (!/\bexpect\w*[.(]/.test(b.body)) problems.push(`${where} 단언(expect)이 없는 시험`);
      // 대기 뒤에는 반드시 단언(또는 waitFor/noHScroll 같은 실패하는 확인)이 따라온다(마지막 sleep이 시험의 끝이면 아무것도 확인하지 않은 것)
      const lines = b.body.split('\n');
      const lastWait = lines.map((l, i) => (/waitForTimeout\(|setTimeout\(r(es)?/.test(l) ? i : -1)).filter((i) => i >= 0).pop();
      if (lastWait !== undefined && !lines.slice(lastWait + 1).some((l) => /\bexpect\w*[.(]|\.waitFor\(|\bnoHScroll\(/.test(l))) problems.push(`${where} 마지막 대기 뒤에 단언이 없음`);
    }
    for (const f of specs) {
      const t = src(f);
      if (/\b(test|describe|it)\.only\(/.test(t)) problems.push(`${f} .only 금지`);
      if (/\.fixme\(|test\.describe\.skip\(/.test(t)) problems.push(`${f} fixme/describe.skip 금지`);
      const skips = [...t.matchAll(/test\.skip\(([^;]*)\);/g)];
      if (skips.length && !['turn.spec.ts', 'soak.spec.ts'].includes(f)) problems.push(`${f} 허용 목록 밖의 test.skip`);
      for (const s of skips) if (!/,\s*'[^']{8,}'/.test(s[1] as string)) problems.push(`${f} test.skip에 사유 문자열 없음`);
      for (const s of t.matchAll(/test\.fail\(([^;]*)\);/g)) if (!/,\s*'[^']{8,}'/.test(s[1] as string)) problems.push(`${f} test.fail에 사유 문자열 없음`);
    }
    expect(problems).toEqual([]);
    // 음성 대조군: 검사기가 위반을 실제로 잡는지(단언 없는 시험, 대기로 끝나는 시험, 형식 위반, .only)
    const T = 'test' + '(';
    const bad = blocksOf('x.spec.ts', `${T}'이름만', async () => {\n  await page.waitForTimeout(100);\n});\n`);
    expect(bad[0]?.title).toBe('이름만');
    expect(/\bexpect\w*[.(]/.test(bad[0]?.body ?? '')).toBe(false);
    const good = blocksOf('y.spec.ts', `${T}'IT-99 ` + `[FR-01] 제목', async () => {\n  await page.waitForTimeout(100);\n  await expect(x).toBeVisible();\n});\n`);
    expect(/^((?:IT|TC)-\d+[a-z]?) \[([A-Z]+-\d+(?:,[A-Z]+-\d+)*)\] \S/.test(good[0]?.title ?? '')).toBe(true);
    expect(/\b(test|describe|it)\.only\(/.test("test.only('a', () => {})")).toBe(true);
  });

  it('TC-496 [NFR-11,NFR-08] E2E 독립성: Playwright는 workers=1·retries=0, 서버는 시험마다 빈 포트, 하드코딩 포트는 TURN 시험 한 곳뿐이며 세션 컨텍스트는 afterEach로 정리하고 IT-14는 50ms 폴링(DEC-015)을 유지한다', () => {
    const cfg = readFileSync(resolve(root, 'playwright.config.ts'), 'utf8');
    expect(cfg).toMatch(/workers:\s*1\b/);
    expect(cfg).toMatch(/retries:\s*0\b/); // 재시도는 플레이크를 숨긴다
    expect(cfg).toMatch(/fullyParallel:\s*false/);
    expect(cfg).toMatch(/--use-fake-device-for-media-stream/);
    expect(cfg).toMatch(/--use-fake-ui-for-media-stream/);
    const fixtures = src('fixtures.ts');
    expect(fixtures).toMatch(/s\.listen\(0,/); // 빈 포트를 OS에게 받는다
    expect(fixtures).not.toMatch(/PORT:\s*['"]\d+['"]/);
    const fixedPorts: string[] = [];
    for (const f of specs) {
      const t = src(f);
      for (const m of t.matchAll(/(?:localhost|127\.0\.0\.1):(\d{3,5})\b/g)) fixedPorts.push(`${f} ${m[0]}`);
      for (const m of t.matchAll(/\b([A-Z_]*PORT)\s*=\s*(\d+)\b/g)) fixedPorts.push(`${f} ${m[1]}=${m[2]}`);
      if (/hostMeeting|guestMeeting/.test(t)) expect(/afterEach\(/.test(t) && /closeAll\(\)/.test(t), `${f}에 afterEach(closeAll) 없음`).toBe(true);
    }
    expect(fixedPorts).toEqual(['turn.spec.ts TURN_PORT=34780']);
    // DEC-015: 주기 신호(합성 음성 2초)의 '해제' 구간은 짧아서 기본 폴링으로는 놓친다
    expect(src('states.spec.ts')).toMatch(/expect\.poll\(speakingCount,\s*\{\s*timeout:\s*40_000,\s*intervals:\s*\[50\]\s*\}\)\.toBe\(0\)/);
  });

  it('TC-498 [NFR-11] 인수 계획의 IT-01~IT-30이 E2E 시험에 빠짐없이 있다', () => {
    const present = new Set<number>();
    for (const b of all) {
      const m = /^IT-(\d+)[a-z]? /.exec(b.title);
      if (m) present.add(Number(m[1]));
    }
    const missing = Array.from({ length: 30 }, (_, i) => i + 1).filter((n) => !present.has(n));
    expect(missing).toEqual([]);
  });
});

describe('unit-14 scripts/check-docs.mjs 변이 시험 (소급 6단계)', () => {
  const tmp = resolve(root, '.harness-tmp', `unit14_checkdocs_${process.pid}`);
  afterAll(() => rmSync(tmp, { recursive: true, force: true }));

  /** 문서(.md)·시험 소스·check-docs를 임시 트리로 복사한다. 이미지·node_modules는 제외. */
  function makeTree(name: string): string {
    const dir = join(tmp, name);
    mkdirSync(dir, { recursive: true });
    const keep = (s: string): boolean => !/node_modules|[\\/]dist([\\/]|$)|\.(png|jpe?g|webp)$/.test(s);
    for (const d of ['docs', 'apps/server/test', 'packages/shared/src', 'apps/web/src', 'e2e']) {
      if (existsSync(resolve(root, d))) cpSync(resolve(root, d), join(dir, d), { recursive: true, filter: keep });
    }
    mkdirSync(join(dir, 'scripts'), { recursive: true });
    cpSync(resolve(root, 'scripts/check-docs.mjs'), join(dir, 'scripts/check-docs.mjs'));
    return dir;
  }
  function check(dir: string): { code: number; out: string } {
    try {
      return { code: 0, out: execFileSync('node', ['scripts/check-docs.mjs'], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
    } catch (e) {
      const x = e as { status?: number; stdout?: string };
      return { code: x.status ?? 1, out: x.stdout ?? '' };
    }
  }
  const edit = (dir: string, rel: string, fn: (t: string) => string): void => {
    const p = join(dir, rel);
    const before = readFileSync(p, 'utf8');
    const after = fn(before);
    expect(after, `${rel} 변이가 적용되지 않음`).not.toBe(before);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, after);
  };

  const cases: Array<[string, (dir: string) => void, RegExp]> = [
    ['TC 중복 ID', (d) => edit(d, 'apps/server/test/config.test.ts', (t) => t.replace(/it\('TC-\d+[a-z]? \[/, `it('TC-100 ` + '[')), /TC\/IT ID 중복: TC-100/],
    ['문서 첫 줄(용도) 삭제', (d) => edit(d, 'docs/01-planning/policies.md', (t) => t.replace(/^.*\n/, '# 제목만\n')), /첫 줄이 용도 한 줄이 아님: 01-planning\/policies\.md/],
    ['정의되지 않은 요구 ID 참조', (d) => edit(d, 'docs/01-planning/policies.md', (t) => `${t}\n참조 FR-99\n`), /정의되지 않은 ID FR-99/],
    ['FR 인수 조건(G/W/T) 삭제', (d) => edit(d, 'docs/01-planning/prd.md', (t) => t.replace(/^\| FR-01 \| .*G .*\n/m, '')), /인수 조건\(Given-When-Then\) 없음: FR-01/],
    ['문서 인덱스 누락', (d) => edit(d, 'docs/README.md', (t) => t.split('03-engineering/api-spec').join('')), /docs\/README\.md에 없음: 03-engineering\/api-spec\.md/],
    ['api-spec §7 EVT 매핑 삭제', (d) => edit(d, 'docs/03-engineering/api-spec.md', (t) => t.replace(/^\| FR-01(, FR-\d+)* \| EVT-[^|]*\|\s*$/m, '| FR-01 | 없음 |')), /FR-01 EVT 열이 문서와 불일치/],
    ['추적성 매트릭스 수동 변조', (d) => edit(d, 'docs/traceability.md', (t) => t.replace(/(\| FR-01 \|[^\n]*?)IT-01/, '$1IT-77')), /FR-01 TC 열이 문서와 불일치/],
    ['시험 제목의 요구 태그 오타(FR-99)', (d) => edit(d, 'apps/server/test/config.test.ts', (t) => t.replace(/(it\('TC-\d+[a-z]? \[)[A-Z]+-\d+/, '$1FR-99')), /요구 태그 FR-99가 어떤 문서에도 정의되어 있지 않음/],
    ['test-cases.md에서 시험 행 삭제', (d) => edit(d, 'docs/05-qa/test-cases.md', (t) => t.replace(/^\| TC-419g \|.*\n/m, '')), /TC-419g가 05-qa\/test-cases\.md에 행이 없음/],
    ['PRD 요구 목록에 같은 ID 중복 정의', (d) => edit(d, 'docs/01-planning/prd.md', (t) => t.replace(/^(\| FR-01 \| [MSCW] \|.*)\n/m, '$1\n$1\n')), /같은 문서에서 ID를 두 번 정의함: FR-01/],
    ['모든 시험에서 요구 연결을 끊음(M 요구 미연결)', (d) => {
      // SEC-04를 태그한 모든 시험 제목에서 SEC-04를 지운다 → 연결된 TC/IT/UAT/MC가 없는 요구가 생긴다
      for (const dir of ['apps/server/test', 'e2e']) {
        for (const f of readdirSync(join(d, dir))) {
          const p = join(d, dir, f);
          if (/\.(test|spec)\.ts$/.test(f)) writeFileSync(p, readFileSync(p, 'utf8').replace(/(\b(?:it|test)\(\s*['"`](?:TC|IT)-\d+[a-z]? \[[^\]]*?)\bSEC-04\b,?/g, '$1'));
        }
      }
    }, /요구에 연결된 TC\/IT\/UAT\/MC가 없음: SEC-04|추적성\] SEC-04 TC 열이 문서와 불일치/],
  ];

  it('TC-497 [NFR-11,SEC-11] check-docs는 중복 TC·양식 위반·미정의 ID·인수 조건 누락·인덱스 누락·EVT 매핑 삭제·매트릭스 변조·요구 미연결을 실제로 실패시킨다(대조군 포함)', () => {
    const control = makeTree('control');
    const base = check(control);
    for (const [, , re] of cases) expect(base.out, '무변이 대조군에 이미 같은 오류가 있음').not.toMatch(re);
    for (const [name, mutate, re] of cases) {
      const dir = makeTree(name.replace(/\W/g, '_'));
      mutate(dir);
      const r = check(dir);
      expect(r.code, `${name}: 종료 코드`).toBe(1);
      expect(r.out, `${name}: 오류 메시지`).toMatch(re);
    }
  }, 180_000);
});
