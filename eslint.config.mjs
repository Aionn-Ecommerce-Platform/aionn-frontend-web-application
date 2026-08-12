import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier/flat";
import jsxA11y from "eslint-plugin-jsx-a11y";

const eslintConfig = defineConfig([
  globalIgnores([
    ".claude/**",
    ".agents/**",
    ".codex/**",
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
  ]),

  ...nextVitals,
  ...nextTs,

  {
    name: "aionn/accessibility",
    files: ["src/**/*.{ts,tsx}"],
    rules: jsxA11y.flatConfigs.recommended.rules,
  },

  {
    name: "aionn/project-rules",
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-console": "error",
      eqeqeq: ["error", "always", { null: "ignore" }],
      // Type-aware traversal is prohibitively slow for this app and makes the
      // lint gate time out. Layer direction is enforced by check:architecture.
      "import/no-cycle": "off",
      "react-hooks/exhaustive-deps": "error",
      "@next/next/no-img-element": "error",

      "react-hooks/set-state-in-effect": "error",
    },
  },

  {
    name: "aionn/logger-exception",
    files: ["src/shared/lib/logger.ts"],
    rules: {
      "no-console": "off",
    },
  },

  {
    name: "aionn/image-wrapper",
    files: ["src/shared/ui/AppImage.tsx"],
    rules: {
      "jsx-a11y/alt-text": "off",
    },
  },

  {
    name: "aionn/build-scripts",
    files: ["scripts/**/*.mjs"],
    rules: {
      "no-console": "off",
    },
  },

  {
    name: "aionn/config-files",
    files: ["*.config.{ts,mts,mjs,js}", "vitest.setup.ts"],
    rules: {
      "import/no-default-export": "off",
    },
  },

  // Must stay last so formatting-related rules are switched off.
  prettierConfig,
]);

export default eslintConfig;
