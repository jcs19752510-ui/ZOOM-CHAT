// 콘텐츠 가이드 생성: apps/web/src/strings.ts의 모든 문구를 표로 만든다. 사용법: npx tsx scripts/gen-content-guide.ts
import fs from 'node:fs';
import { S } from '../apps/web/src/strings';

const rows: string[] = [];
const walk = (obj: unknown, prefix: string): void => {
  if (typeof obj === 'string') rows.push(`| \`${prefix}\` | ${obj.replace(/\|/g, '\\|')} |`);
  else if (typeof obj === 'function') rows.push(`| \`${prefix}\` | ${(obj as (...a: unknown[]) => string)('{이름}', '{값}')} (함수형 문구) |`);
  else if (obj && typeof obj === 'object') for (const [k, v] of Object.entries(obj)) walk(v, prefix ? `${prefix}.${k}` : k);
};
walk(S, '');
const head = `> **이 문서의 용도** — 누가: 디자이너, 기획자, 개발자 / 언제: 문구를 쓰거나 고칠 때 / 무엇을: UX 라이팅 규칙과 전체 문구 목록(키 포함)을 결정한다.

# 콘텐츠 가이드

| 항목 | 내용 |
|---|---|
| 버전 | 0.1 |
| 작성일 | 2026-10-01 |
| 상태 | 승인 (표는 strings.ts에서 자동 생성) |
| 주도 | ③ 디자이너 |

## 변경 이력
| 버전 | 날짜 | 내용 |
|---|---|---|
| 0.1 | 2026-10-01 | 최초 작성. 문구 표는 \`npx tsx scripts/gen-content-guide.ts\`로 생성 |

## 작성 규칙
1. 한국어 존댓말, 짧고 직접적으로. 사과나 꾸밈 문구 없이 사실과 다음 행동을 쓴다.
2. 오류 문구는 **원인 + 해결 방법**(UX-03). 예) "카메라 권한이 차단되었습니다. 주소창의 자물쇠 아이콘에서 허용한 뒤 새로고침해 주세요."
3. 서버 오류 코드는 사용자에게 보이지 않는다. 코드→문구 변환은 \`strings.ts\`의 \`errorText\`와 각 화면이 한다.
4. 모든 문구는 \`apps/web/src/strings.ts\`에만 둔다(UX-01, TC-213이 컴포넌트의 한글 직접 사용을 막는다).
5. 용어는 \`glossary.md\`와 맞춘다(방, 호스트, 참가자, 대기실).

## 전체 문구 (키 → 문구)
| 키 | 문구 |
|---|---|
`;
fs.writeFileSync('docs/02-design/content-guide.md', `${head}${rows.join('\n')}\n`);
console.log(`문구 ${rows.length}개`);
