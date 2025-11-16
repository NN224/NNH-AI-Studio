// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

export default tseslint.config(// Base configs
js.configs.recommended, ...tseslint.configs.recommended, {
  files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'],
  plugins: {
    react: reactPlugin,
    'react-hooks': reactHooksPlugin,
  },
  languageOptions: {
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
  rules: {
    // React rules
    'react/react-in-jsx-scope': 'off', // Not needed in Next.js
    'react/prop-types': 'off', // Using TypeScript
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    
    // TypeScript rules
    '@typescript-eslint/no-unused-vars': ['warn', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    
    // General rules
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'warn',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
}, // Ignore patterns
{
  ignores: [
    'node_modules/**',
    '.next/**',
    'out/**',
    'build/**',
    'dist/**',
    'public/**',
    '*.config.js',
    '*.config.mjs',
  ],
}, storybook.configs["flat/recommended"]);
