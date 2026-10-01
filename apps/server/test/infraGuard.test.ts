import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// unit-13(인프라) 소급 6단계 시험: Dockerfile·.dockerignore·ci.yml·compose·eslint·tsconfig의 "지켜야 할 불변식"을 정적으로 고정한다.
// INFRA_GUARD_ROOT로 다른 트리(변이 복사본)를 가리킬 수 있다. 변이 시험은 이 환경변수로 같은 시험을 변이본에 적용해 잡히는지 본다.
const root = resolve(process.env.INFRA_GUARD_ROOT ?? resolve(__dirname, '../../..'));
const read = (p: string): string => readFileSync(resolve(root, p), 'utf8');

/**
 * 의존성 없이 하는 YAML 구문 사고 점검. 과거 사고(DEC-017 ③): `- run: docker pull "$(sed ... image: ...)"`처럼
 * 따옴표 없는 한 줄 스칼라 안의 ": "가 매핑으로 해석돼 워크플로 전체가 무효가 되었다(3커밋 동안 CI 미실행).
 * 완전한 YAML 파서가 아니라 "자주 나는 구문 사고"만 잡는다: 들여쓰기 탭, 따옴표 없는 스칼라 안의 ": ", 따옴표 불균형.
 */
export function yamlSyntaxIssues(text: string): string[] {
  const issues: string[] = [];
  const lines = text.split('\n');
  let blockIndent = -1; // 블록 스칼라(| >) 본문 들여쓰기 기준
  lines.forEach((raw, i) => {
    const n = i + 1;
    if (raw.trim() === '') return;
    const indent = raw.length - raw.trimStart().length;
    if (blockIndent >= 0) {
      if (indent > blockIndent) return; // 블록 스칼라 본문: 어떤 문자든 허용
      blockIndent = -1;
    }
    if (/^\s*\t/.test(raw)) issues.push(`${n}: 들여쓰기에 탭`);
    const line = raw.trim();
    if (line.startsWith('#')) return;
    const m = /^(?:- )?([A-Za-z_][\w.-]*):(?:\s+(.*))?$/.exec(line);
    if (!m) return;
    const v = (m[2] ?? '').trim();
    if (/^[|>][+-]?\d*$/.test(v)) {
      blockIndent = indent;
      return;
    }
    if (v === '' || /^[[{&*!%@`]/.test(v)) return;
    if (v.startsWith("'") || v.startsWith('"')) {
      const q = v[0];
      const closed = v.length > 1 && v.lastIndexOf(q as string) > 0;
      if (!closed) issues.push(`${n}: 따옴표가 닫히지 않음`);
      return;
    }
    const plain = v.replace(/\s+#.*$/, '');
    if (/:\s/.test(plain) || /:$/.test(plain)) issues.push(`${n}: 따옴표 없는 스칼라 안의 ': ' (매핑으로 해석됨)`);
  });
  return issues;
}

/** ci.yml을 job 단위로 쪼갠다(2칸 들여쓰기 키). 파서 없이 구조를 점검하기 위한 최소 도구. */
export function jobsOf(yml: string): Record<string, string> {
  const after = yml.split(/^jobs:\s*$/m)[1] ?? '';
  const out: Record<string, string> = {};
  let cur: string | undefined;
  for (const line of after.split('\n')) {
    const m = /^ {2}([A-Za-z][\w-]*):\s*$/.exec(line);
    if (m) {
      cur = m[1] as string;
      out[cur] = '';
    } else if (cur) out[cur] += `${line}\n`;
  }
  return out;
}

/** Dockerfile 불변식 위반 목록(최종 단계 기준). 빈 배열이면 통과. */
export function dockerfileIssues(text: string): string[] {
  const issues: string[] = [];
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  const froms = lines.filter((l) => /^FROM /i.test(l));
  if (froms.length < 2) issues.push('멀티 스테이지가 아님(빌드 도구가 최종 이미지에 남을 수 있음)');
  for (const f of froms) if (!/^FROM node:\d+(\.\d+)*-alpine( AS \w+)?$/i.test(f)) issues.push(`베이스 이미지 고정 형식 아님: ${f}`);
  const lastFrom = lines.map((l, i) => (/^FROM /i.test(l) ? i : -1)).filter((i) => i >= 0).pop() ?? 0;
  const final = lines.slice(lastFrom);
  const userIdx = final.findIndex((l) => /^USER node$/.test(l));
  const cmdIdx = final.findIndex((l) => /^CMD /.test(l));
  if (userIdx < 0) issues.push('최종 단계에 USER node 없음(루트 실행)');
  else if (cmdIdx >= 0 && userIdx > cmdIdx) issues.push('USER가 CMD 뒤에 있음');
  if (!final.some((l) => /^HEALTHCHECK .*\/healthz/.test(l))) issues.push('최종 단계에 /healthz HEALTHCHECK 없음');
  if (!final.some((l) => /^ENV NODE_ENV=production$/.test(l))) issues.push('최종 단계에 NODE_ENV=production 없음');
  if (!final.some((l) => /npm ci --omit=dev/.test(l))) issues.push('최종 단계가 운영 의존성만(npm ci --omit=dev) 설치하지 않음');
  for (const l of lines) {
    if (/^COPY\s+(\.|\*|\.\/)\s/.test(l) || /^COPY\s+\.env/.test(l) || /^ADD\s/.test(l)) issues.push(`통째 복사/ADD 금지: ${l}`);
    if (/^(ENV|ARG)\s+\w*(SECRET|TOKEN|PASSWORD|KEY)\w*=/i.test(l)) issues.push(`비밀값을 이미지에 굽는 줄: ${l.replace(/=.*/, '=***')}`);
    if (/npm install\b/.test(l)) issues.push(`lockfile 무시(npm install): ${l}`);
  }
  if (!lines.some((l) => /RUN npm ci\b/.test(l))) issues.push('npm ci 없음');
  return issues;
}

/** .dockerignore가 반드시 제외해야 하는 항목 중 빠진 것. */
export function dockerignoreIssues(text: string): string[] {
  const entries = text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  return ['.git', '.env', '.env.*', 'node_modules', '**/node_modules', '**/dist'].filter((r) => !entries.includes(r)).map((r) => `.dockerignore에 ${r} 없음`);
}

describe('unit-13 인프라 불변식 (소급 6단계)', () => {
  const ci = read('.github/workflows/ci.yml');
  const compose = read('infra/docker-compose.yml');

  it('TC-490 [SEC-11,NFR-11] ci.yml에 YAML 구문 사고(탭·따옴표 없는 스칼라의 ": "·따옴표 불균형)가 없고 점검기는 과거 사고 줄을 실제로 잡는다', () => {
    expect(yamlSyntaxIssues(ci)).toEqual([]);
    // 음성 대조군: DEC-017 ③에서 워크플로 전체를 무효로 만든 실제 줄(6d31666 이전)
    const broken = ci.replace(/- run: \|\n\s+IMAGE=.*\n\s+docker pull "\$IMAGE"/, `- run: docker pull "$(sed -n 's/^ *image: *//p' infra/docker-compose.yml | head -1)"`);
    expect(broken).not.toBe(ci); // 치환이 실제로 일어났는지(대조군이 유효한지)
    expect(yamlSyntaxIssues(broken).some((x) => x.includes("': '"))).toBe(true);
    // 양성 대조군: 블록 스칼라 본문 안의 "image: "는 문제 없음
    expect(yamlSyntaxIssues('a:\n  - run: |\n      X="$(sed s/image: //)"\n')).toEqual([]);
    expect(yamlSyntaxIssues('a:\n\t- run: x\n')).not.toEqual([]);
    expect(yamlSyntaxIssues(`a:\n  - run: 'abc\n`)).not.toEqual([]);
  });

  it('TC-491 [SEC-11,NFR-08] ci.yml: 검증 단계(lint·typecheck·test·check:docs·audit)가 npm ci 뒤에 있고 e2e·coturn job은 verify에 의존하며 coturn은 REQUIRE_COTURN으로 건너뜀을 막는다', () => {
    expect(ci).toMatch(/^on:\s*$/m);
    expect(ci).toMatch(/branches:\s*\[[^\]]*\bPROD\b[^\]]*\]/);
    expect(ci).toMatch(/^ {2}pull_request:/m);
    const jobs = jobsOf(ci);
    expect(Object.keys(jobs).sort()).toEqual(['coturn', 'e2e', 'verify']);
    const runs = (job: string): string[] => [...(jobs[job] ?? '').matchAll(/^\s+- run: (.+)$/gm)].map((m) => (m[1] as string).trim());
    const verify = runs('verify');
    const order = ['npm ci', 'npm run lint', 'npm run typecheck', 'npm test', 'npm run check:docs', 'npm audit --audit-level=high'];
    const idx = order.map((c) => verify.indexOf(c));
    expect(idx.every((i) => i >= 0), `verify에 누락: ${order.filter((_, k) => (idx[k] as number) < 0).join(', ')}`).toBe(true);
    expect([...idx].sort((a, b) => a - b)).toEqual(idx); // 순서 유지(npm ci가 먼저)
    expect(jobs.e2e).toMatch(/needs: verify/);
    expect(jobs.coturn).toMatch(/needs: verify/);
    expect(runs('e2e')).toEqual(expect.arrayContaining(['npm ci', 'npx playwright install --with-deps chromium', 'npm run build', 'npm run test:e2e']));
    expect(jobs.coturn).toMatch(/COTURN_LIVE: '1'/);
    expect(jobs.coturn).toMatch(/REQUIRE_COTURN: '1'/);
    expect(jobs.coturn).toMatch(/COTURN_RUNNER: docker/);
    // 모든 액션은 v5 이상 고정(Node 20 폐기 경고 회귀 방지)
    const uses = [...ci.matchAll(/uses: ([\w./-]+)@v(\d+)/g)];
    expect(uses.length).toBeGreaterThan(0);
    for (const u of uses) expect(Number(u[2]), String(u[1])).toBeGreaterThanOrEqual(5);
    expect([...ci.matchAll(/uses: (\S+)/g)].every((m) => /@v\d+$/.test(m[1] as string))).toBe(true);
    // ci.yml이 부르는 npm 스크립트가 package.json에 실제로 있다
    const scripts = (JSON.parse(read('package.json')) as { scripts: Record<string, string> }).scripts;
    for (const c of verify.concat(runs('e2e'))) {
      const m = /^npm run ([\w:-]+)$/.exec(c);
      if (m) expect(scripts[m[1] as string], `package.json scripts.${m[1]}`).toBeTruthy();
    }
  });

  it('TC-492 [NFR-07,NFR-08,SEC-10] Dockerfile: 멀티 스테이지·고정 베이스·비루트·HEALTHCHECK·운영 의존성만·비밀값 미포함이고 점검기는 변이를 실제로 잡는다', () => {
    const df = read('Dockerfile');
    expect(dockerfileIssues(df)).toEqual([]);
    const mutants: Array<[string, string, string]> = [
      ['USER 제거', df.replace(/^USER node\n/m, ''), 'USER node'],
      ['HEALTHCHECK 제거', df.replace(/^HEALTHCHECK .*\n/m, ''), 'HEALTHCHECK'],
      ['.env 복사', df.replace('USER node', 'COPY .env .env\nUSER node'), '통째 복사'],
      ['전체 복사', df.replace('COPY packages packages', 'COPY . .'), '통째 복사'],
      ['비밀값 ENV', df.replace('USER node', 'ENV SESSION_SECRET=abc\nUSER node'), '비밀값'],
      ['dev 의존성 설치', df.replace('npm ci --omit=dev', 'npm ci'), 'omit=dev'],
      ['npm install', df.replace('RUN npm ci\n', 'RUN npm install\n'), 'npm install'],
      ['latest 베이스', df.replace(/FROM node:22-alpine AS run/, 'FROM node:latest AS run'), '베이스 이미지'],
      ['단일 스테이지', df.replace(/FROM node:22-alpine AS run/, ''), '멀티 스테이지'],
    ];
    for (const [name, m, expected] of mutants) {
      expect(m, `변이 ${name}이(가) 적용되지 않음`).not.toBe(df);
      expect(dockerfileIssues(m).join('|'), `변이 ${name}`).toContain(expected);
    }
  });

  it('TC-493 [SEC-10,SEC-09,NFR-07] .dockerignore가 .env·.git·node_modules를 제외하고, compose는 시크릿을 보간으로만 받으며 이미지 태그가 고정되고 점검기는 변이를 잡는다', () => {
    const di = read('.dockerignore');
    expect(dockerignoreIssues(di)).toEqual([]);
    expect(dockerignoreIssues(di.replace(/^\.env$/m, '')).join()).toContain('.env');
    expect(dockerignoreIssues(di.replace(/^\.git$/m, '')).join()).toContain('.git');
    // compose: 시크릿 리터럴 금지(변수 보간만), 필수 변수는 :? 로 누락 시 기동 거부, 특권·사설 마운트 없음
    expect(compose).toMatch(/TURN_SECRET: \$\{TURN_SECRET:\?[^}]+\}/);
    expect(compose).toMatch(/--static-auth-secret=\$\{TURN_SECRET\}/);
    expect(compose).not.toMatch(/TURN_SECRET[:=]\s*[A-Za-z0-9]{8,}/);
    expect(compose).not.toMatch(/privileged:\s*true/);
    expect(compose).not.toMatch(/docker\.sock/);
    expect(compose).toMatch(/turnserver\.conf:\/etc\/coturn\/turnserver\.conf:ro/);
    expect(compose).toMatch(/image:\s*coturn\/coturn:\d+\.\d+\s*$/m);
    // coturn 설정 파일에는 시크릿 값이 없다(명령행으로만 전달)
    const conf = read('infra/coturn/turnserver.conf');
    expect(conf.split('\n').filter((l) => /^\s*(static-auth-secret|user|cli-password|lt-cred-mech)(=|\s|$)/.test(l))).toEqual([]);
  });

  it('TC-494 [NFR-11,SEC-07] eslint가 any·dangerouslySetInnerHTML·미사용 변수를 오류로 잡고 모든 워크스페이스 tsconfig가 strict 기반을 상속한다', async () => {
    const { ESLint } = await import('eslint');
    const eslint = new ESLint({ cwd: root, overrideConfigFile: resolve(root, 'eslint.config.js') });
    const lint = async (code: string, file: string): Promise<string[]> => {
      const [r] = await eslint.lintText(code, { filePath: resolve(root, file) });
      return (r?.messages ?? []).filter((m) => m.severity === 2).map((m) => m.ruleId ?? 'parse');
    };
    expect(await lint('export const f = (x: any) => x;\n', 'apps/server/src/__probe.ts')).toContain('@typescript-eslint/no-explicit-any');
    expect(await lint('const unused = 1;\nexport {};\n', 'apps/server/src/__probe.ts')).toContain('@typescript-eslint/no-unused-vars');
    expect(await lint('import { Foo } from "./x";\nexport const a: Foo | undefined = undefined;\n', 'apps/server/src/__probe.ts')).toContain('@typescript-eslint/consistent-type-imports');
    expect(await lint('export const B = ({ h }: { h: string }) => <div dangerouslySetInnerHTML={{ __html: h }} />;\n', 'apps/web/src/__probe.tsx')).toContain('no-restricted-syntax');
    expect(await lint('export const ok = (x: number): number => x + 1;\n', 'apps/server/src/__probe.ts')).toEqual([]); // 양성 대조군
    const base = JSON.parse(read('tsconfig.base.json')) as { compilerOptions: Record<string, unknown> };
    expect(base.compilerOptions.strict).toBe(true);
    expect(base.compilerOptions.noUncheckedIndexedAccess).toBe(true);
    for (const p of ['apps/server/tsconfig.json', 'apps/web/tsconfig.json', 'packages/shared/tsconfig.json', 'e2e/tsconfig.json']) {
      const t = JSON.parse(read(p)) as { extends?: string; compilerOptions?: Record<string, unknown> };
      expect(t.extends, `${p} extends`).toMatch(/tsconfig\.base\.json$/);
      for (const k of ['strict', 'noImplicitAny', 'strictNullChecks', 'noUncheckedIndexedAccess']) expect(t.compilerOptions?.[k], `${p} ${k} 약화 금지`).not.toBe(false);
    }
  });
});
