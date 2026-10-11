import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      "react-refresh/only-export-components": "off",
      "@typescript-eslint/no-unused-vars": "off",
      // 以下规则在第三方 SDK 胶水层 / 受控表单预填等场景属有意为之，降为警告（仍可见、不阻断 CI）
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/exhaustive-deps": "warn",
    }
  },
  {
    // 地图 SDK 胶水：大量回调占位空块（catch / 事件无操作）属有意为之，逐处加 disable 反而增加噪音
    files: ["src/components/TravelMap.tsx"],
    rules: {
      "no-empty": "off",
    },
  },
])
