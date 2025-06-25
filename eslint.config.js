import antfu from '@antfu/eslint-config';
import { globalIgnores } from 'eslint/config';
import prettier from 'eslint-plugin-prettier/recommended';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import typescript from 'typescript-eslint';

export default antfu(
  {
    typescript: true,
    jsonc: false,
    yaml: false,
    markdown: false,
    formatters: false,
  },
  [
    prettier,
    {
      languageOptions: {
        globals: {
          ...globals.browser,
          ...globals.node,
        },
        ecmaVersion: 6,
        sourceType: 'module',

        parserOptions: {
          parser: typescript.parser,
          allowImportExportEverywhere: true,
        },
      },

      plugins: {
        'simple-import-sort': simpleImportSort,
      },

      settings: {
        'import/extensions': ['.js', '.ts'],
      },

      rules: {
        /* Closed due to template running
         * (Recommended to open!)
         */
        'no-console': 'off',
        'ts/no-explicit-any': 'off',
        'ts/no-redeclare': 'off',

        /* Disallow person rules */
        'antfu/top-level-function': 'off',
        'antfu/if-newline': 'off',
        'n/prefer-global/process': 'off',

        /* If you need control the imports sequence, must be off
         *  https://github.com/vuejs/vue-eslint-parser/issues/58
         */
        'import/first': 'off',

        /* Allow start with _ */
        '@typescript-eslint/no-unused-vars': [
          'error',
          {
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
          },
        ],
        // Using ts/no-unused-vars instead
        'no-unused-vars': 'off',

        /* Some variables are initialized in the function */
        '@typescript-eslint/no-use-before-define': 'off',
        'no-use-before-define': 'off',

        /* Disable antfu sort, use simple sort import */
        'perfectionist/sort-imports': 'off',
        'perfectionist/sort-named-imports': 'off',
        'simple-import-sort/imports': 'error',
        'simple-import-sort/exports': 'error',
        // Disable unused-imports rules in other presets
        'unused-imports/no-unused-imports': 'off',
        'unused-imports/no-unused-vars': 'off',
      },
    },
    globalIgnores([
      '**/dist',
      '**/lib/',
      '**/node_modules',
      '**/es/',
      '**/*.js',
    ]),
  ],
);
