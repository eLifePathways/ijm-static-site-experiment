import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginAstro from 'eslint-plugin-astro';

export default [
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...eslintPluginAstro.configs.recommended,
  {
    rules: {
      // Warn on any, but allow it during Phase 1 while schemas are still loose
      '@typescript-eslint/no-explicit-any': 'warn',
      // Allow passthrough/unknown in content schemas
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },
  {
    ignores: ['dist/', '.astro/', 'node_modules/'],
  },
];
