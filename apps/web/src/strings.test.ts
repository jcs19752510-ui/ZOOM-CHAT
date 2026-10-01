import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { S } from './strings';

// 기대값은 docs/harness/04-ux-design.md §3.5 키 계약표에서 옮겨 적은 것이다(구현에서 복사하지 않음).
describe('문구 키 계약 04 §3.5 (UX-01, UX-03)', () => {
  it('TC-305 [UX-01,POL-17] legalLinks는 04 §3.5와 정확히 일치한다(키 5개, aria는 함수)', () => {
    expect(Object.keys(S.legalLinks).sort()).toEqual(['aria', 'contact', 'nav', 'privacy', 'terms']);
    expect(S.legalLinks.privacy).toBe('개인정보 처리방침');
    expect(S.legalLinks.terms).toBe('이용약관');
    expect(S.legalLinks.contact).toBe('문의·신고');
    expect(S.legalLinks.nav).toBe('법적 고지와 문의');
    expect(typeof S.legalLinks.aria).toBe('function');
    expect(S.legalLinks.aria('이용약관')).toBe('이용약관 (새 탭에서 열림)');
    expect(S.legalLinks.aria('')).toBe(' (새 탭에서 열림)');
  });
  it('TC-305b [UX-01,UX-13] inApp은 04 §3.5와 정확히 일치한다(steps 2개)', () => {
    expect(Object.keys(S.inApp).sort()).toEqual(['copySite', 'dismiss', 'howClose', 'howOpen', 'permissionExtra', 'proceed', 'steps', 'summary', 'title']);
    expect(S.inApp.title).toBe('앱 안의 브라우저로 열었다면 카메라가 막힐 수 있어요');
    expect(S.inApp.summary).toBe('Chrome이나 Safari 같은 기본 브라우저에서 여는 것을 권장합니다.');
    expect([S.inApp.howOpen, S.inApp.howClose]).toEqual(['방법 보기', '방법 접기']);
    expect(Array.isArray(S.inApp.steps)).toBe(true);
    expect(S.inApp.steps).toEqual([
      '화면의 메뉴(⋮ 또는 공유 아이콘)에서 "다른 브라우저로 열기" 또는 "기본 브라우저로 열기"를 찾아 누르세요.',
      '메뉴에 없으면 "링크 복사"를 누른 뒤 Chrome이나 Safari 주소창에 붙여넣으세요.',
    ]);
    expect(S.inApp.proceed).toBe('이 브라우저에서도 계속 진행할 수 있습니다.');
    expect([S.inApp.copySite, S.inApp.dismiss]).toEqual(['주소 복사', '안내 닫기']);
    expect(S.inApp.permissionExtra).toBe('앱 안의 브라우저가 카메라·마이크를 막았을 수 있습니다. 위 방법으로 기본 브라우저에서 다시 열어 주세요.');
  });
  it('TC-305c [UX-01,UX-14,UX-15] autoplay·background는 04 §3.5와 일치하고 mediaLost는 3종 입력별 문구를 만든다', () => {
    expect(Object.keys(S.autoplay).sort()).toEqual(['banner', 'button', 'started', 'stillBlocked']);
    expect(S.autoplay.banner).toBe('일부 참가자의 영상이나 소리가 브라우저 설정 때문에 멈춰 있습니다.');
    expect(S.autoplay.button).toBe('탭하여 재생');
    expect(S.autoplay.started).toBe('재생을 시작했습니다');
    expect(S.autoplay.stillBlocked).toBe('아직 재생되지 않는 영상이 있습니다. 한 번 더 누르거나 브라우저 설정에서 자동 재생을 허용해 주세요.');
    expect(Object.keys(S.background).sort()).toEqual(['mediaLost', 'platformNote', 'returned']);
    expect(S.background.returned).toBe('앱으로 돌아와 연결을 다시 확인하고 있습니다. 자리는 잠시 유지됩니다.');
    expect(S.background.platformNote).toBe('휴대폰은 화면을 끄거나 다른 앱으로 이동하면 통화를 멈출 수 있습니다. 회의 중에는 이 브라우저를 켜 둔 채로 유지해 주세요.');
    expect(S.background.mediaLost('camera')).toBe('화면이 꺼져 있는 동안 카메라가 중단되었습니다. 카메라 버튼을 눌러 다시 켜 주세요.');
    expect(S.background.mediaLost('mic')).toBe('화면이 꺼져 있는 동안 마이크가 중단되었습니다. 마이크 버튼을 눌러 다시 켜 주세요.');
    expect(S.background.mediaLost('both')).toBe('화면이 꺼져 있는 동안 카메라와 마이크가 중단되었습니다. 카메라와 마이크 버튼을 눌러 다시 켜 주세요.');
    expect(new Set([S.background.mediaLost('camera'), S.background.mediaLost('mic'), S.background.mediaLost('both')]).size).toBe(3);
  });
  it('TC-305d [UX-01,UX-03] state.gone 운영자 종료 문구와 기존 키 보존, legal UI 크롬 키가 04 §3.5와 일치한다', () => {
    expect(S.state.gone.operatorTitle).toBe('운영자가 이 회의를 종료했습니다');
    expect(S.state.gone.operator).toBe('이 링크로는 다시 입장할 수 없습니다. 새 회의를 만들어 시작하거나, 이유가 궁금하면 문의 안내를 확인해 주세요.');
    for (const k of ['title', 'closed', 'restarted', 'newRoom'] as const) expect(S.state.gone[k], `기존 키 ${k}`).toBeTruthy();
    // legal은 unit-15가 본문 키를 더할 수 있으므로 UI 크롬 키는 "포함" 검사
    const legal = S.legal as Record<string, unknown>;
    expect(legal).toMatchObject({
      home: 'MeetLite 처음으로',
      navLabel: '문서 목록',
      tocLabel: '이 문서의 목차',
      draftRibbon: '초안(법률 검토 전) — 내용이 바뀔 수 있습니다',
      labels: { contact: '문의 연락처', officer: '개인정보 책임자', effectiveDate: '시행일', stun: 'STUN 서버', turn: 'TURN 서버' },
      meta: {
        loading: '불러오는 중…',
        pending: '운영자가 아직 정하지 않았습니다(공개 전 필수)',
        officerPending: '지정 전 — 필요 여부는 법률 검토 후 결정합니다',
        datePending: '시행일이 아직 정해지지 않았습니다(공개 전 필수)',
        error: '운영자 정보를 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요. 문서의 나머지 내용에는 영향이 없습니다.',
        retry: '다시 불러오기',
        newTab: '(새 탭)',
        none: '없음',
      },
    });
    expect(Object.keys(S.legal.labels).sort()).toEqual(['contact', 'effectiveDate', 'officer', 'stun', 'turn']);
    expect(Object.keys(S.legal.meta).sort()).toEqual(['datePending', 'error', 'loading', 'newTab', 'none', 'officerPending', 'pending', 'retry']);
  });
  it('TC-305e [UX-01] 새 문구 키의 모든 문자열 값은 비어 있지 않다(빈 문구 방지)', () => {
    const empties: string[] = [];
    const visit = (v: unknown, p: string): void => {
      if (typeof v === 'string') {
        if (v.trim() === '') empties.push(p);
      } else if (Array.isArray(v)) v.forEach((x, i) => visit(x, `${p}[${i}]`));
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) visit(x, `${p}.${k}`);
    };
    visit(S, 'S');
    expect(empties).toEqual([]);
  });
  it('TC-306 [UX-01,POL-17] 푸터 링크 경로는 문구가 아닌 코드에 있고 LegalFooter는 링크 3개를 /privacy /terms /contact 순서로, _blank+noopener noreferrer로 연다(소스 정적 점검)', () => {
    const src = fs.readFileSync(path.resolve(__dirname, 'components/LegalFooter.tsx'), 'utf8');
    expect([...src.matchAll(/href: "(\/[a-z]+)"/g)].map((m) => m[1])).toEqual(['/privacy', '/terms', '/contact']);
    expect(src).toContain('target="_blank"');
    expect(src).toContain('rel="noopener noreferrer"');
    expect(src).toContain('min-h-touch');
    expect(src).not.toContain('dangerouslySetInnerHTML');
  });
});
