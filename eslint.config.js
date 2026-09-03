import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

// react-hooks kurallari bu kod tabaninda ozellikle degerli: useMemo
// bagimlilik listeleri elle yonetiliyor ve Firestore her anlik
// goruntude yeni bir `settings` nesnesi veriyor.
export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended, prettier],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Context + hook ayni dosyada: bilincli bir tercih (saglayici ve
    // onu okuyan hook birlikte durur). Fast-refresh uyarisi burada
    // gecerli degil.
    files: [
      'src/components/ToastProvider.tsx',
      'src/data/DataProvider.tsx',
      'src/auth/AuthContext.tsx',
    ],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    // Testler Node ortaminda calisir.
    files: ['**/*.test.ts', '**/*.test.tsx'],
    languageOptions: { globals: { ...globals.node } },
  },
)
