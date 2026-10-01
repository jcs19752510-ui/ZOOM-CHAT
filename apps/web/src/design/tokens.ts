/**
 * 디자인 토큰 단일 출처(UX-08). 하드코딩 색상은 이 파일 밖에 쓰지 않는다.
 * 대비(WCAG AA 4.5:1 이상 확인): text/surface 약 13:1, textMuted/surface 약 7:1, 흰 글자/accent 약 5.4:1, 흰 글자/danger 약 5.6:1.
 */
export const tokens = {
  color: {
    bg: '#16181D',
    surface: '#1F2229',
    raised: '#2A2E37',
    tile: '#262A33',
    line: '#3A404D',
    text: '#F2F4F8',
    muted: '#A9B1C1',
    accent: '#3B63D6',
    'accent-hover': '#4A73E6',
    danger: '#C9323B',
    'danger-hover': '#DB4650',
    success: '#2FBF71',
    warning: '#F0B429',
    speaking: '#3DD68C',
    focus: '#8FB4FF',
    overlay: 'rgba(8, 10, 14, 0.72)',
  },
  radius: { sm: '6px', md: '10px', lg: '14px', pill: '999px' },
  shadow: { pop: '0 8px 28px rgba(0, 0, 0, 0.45)' },
  font: {
    sans: ['"Pretendard Variable"', 'Pretendard', '"Apple SD Gothic Neo"', '"Malgun Gothic"', '"Noto Sans KR"', 'system-ui', 'sans-serif'],
  },
  /** 터치 타깃 최소 크기(NFR-10) */
  touch: '44px',
} as const;
