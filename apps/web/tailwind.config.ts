import type { Config } from 'tailwindcss';
import { tokens } from './src/design/tokens';

// 색·간격·폰트는 src/design/tokens.ts 한 곳에서만 정의한다(UX-08).
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: tokens.color,
      borderRadius: tokens.radius,
      fontFamily: { sans: [...tokens.font.sans] },
      boxShadow: tokens.shadow,
      minHeight: { touch: tokens.touch },
      minWidth: { touch: tokens.touch },
    },
  },
  plugins: [],
} satisfies Config;
