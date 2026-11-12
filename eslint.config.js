import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '.aistudio/**',
      'scripts/**',
      '*.config.js',
      '*.config.ts'
    ]
  },
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off'
    }
  }
);
