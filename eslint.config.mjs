import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Prettier가 포맷을 담당하므로 충돌하는 ESLint 스타일 규칙은 끈다 (항상 마지막에 둘 것)
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Playwright 산출물
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
