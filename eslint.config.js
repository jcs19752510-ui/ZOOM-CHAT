import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

const nodeGlobals = { process: 'readonly', console: 'readonly', URL: 'readonly', Buffer: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', fetch: 'readonly', performance: 'readonly' };

export default defineConfig(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**', 'docs/**', 'templates/**', 'automation/**', '.claude/**', 'playwright-report/**', 'test-results/**', '.harness-tmp/**'],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      // 채팅 XSS 방지(SEC-07): HTML을 직접 주입하는 속성은 금지한다.
      'no-restricted-syntax': ['error', { selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']", message: 'dangerouslySetInnerHTML 사용 금지 (SEC-07)' }],
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: { ...reactHooks.configs.recommended.rules },
  },
  {
    files: ['**/*.{js,mjs}'],
    languageOptions: { globals: nodeGlobals },
  },
);
