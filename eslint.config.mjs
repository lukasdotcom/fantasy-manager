import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  {
    ignores: [
      "**/.next",
      "**/.cache",
      "**/node_modules",
      "**/public",
      "scripts/data/*.js",
      "scripts/*.js",
      "Modules/*.js",
      "scripts/data",
      "**/cypress.config.js",
      "cypress/e2e/*.js",
      "!cypress/e2e/*.cy.js",
      "**/next.config.js",
      "eslint.config.mjs",
      "next-env.d.ts",
    ],
  },
  ...compat.extends(
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
  ),
  {
    plugins: {
      "@typescript-eslint": typescriptEslint,
    },

    languageOptions: {
      parser: tsParser,
    },

    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "no-var": "error",
      "no-implied-eval": "error",
      "no-eval": "error",
      "no-const-assign": "error",
      "cypress/unsafe-to-chain-command": "off",
      "@typescript-eslint/no-unused-expressions": "off",

      "no-restricted-imports": [
        "error",
        {
          patterns: ["@mui/*/*/*", "!@mui/material/test-utils/*"],
        },
      ],
    },
  },
];
