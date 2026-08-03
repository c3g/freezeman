import eslintReact from "@eslint-react/eslint-plugin"
import eslintJs from "@eslint/js"
import { defineConfig } from "eslint/config"
import tseslint from "typescript-eslint"
import css from "@eslint/css"
import globals from "globals"

export default defineConfig([
  {
    files: ["src/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],

    extends: [
      eslintJs.configs.recommended,
      tseslint.configs.recommended,
      eslintReact.configs["recommended-typescript"],
    ],

    // Configure language/parsing options
    languageOptions: {
      // Use TypeScript ESLint parser for TypeScript files
      parser: tseslint.parser,
      parserOptions: {
        // Enable project service for better TypeScript integration
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
        GIT_COMMITHASH: "readonly",
        GIT_BRANCH: "readonly",
        GIT_LASTUPDATE: "readonly",
        FMS_VERSION: "readonly",
        FMS_ENV: "readonly",
      },
    },

    // Custom rule overrides (modify rule levels or disable rules)
    rules: {
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "no-empty": "warn",
      "no-extra-boolean-cast": "warn",
      "no-useless-escape": "warn",
      "prefer-const": "warn",
    },
  },
  {
    files: ["**/*.css"],
    plugins: { css },
    language: "css/css",
    extends: ["css/recommended"],
    rules: {
      "css/no-important": "off",
    },
  },
  { ignores: ["node_modules", "dist"] },
])
