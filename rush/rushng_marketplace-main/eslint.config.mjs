import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const eslintConfig = [...nextCoreWebVitals, ...nextTypescript, {
  rules: {
    // ─── Re-enabled: the most high-signal rules. ──────────────────
    // Previously this entire block was off; lint was theatre. We now
    // turn back on the rules that catch real bugs without producing
    // tons of false positives on a codebase that uses `any` heavily.
    //
    // Rules that produce too much noise right now (we should fix the
    // underlying issues and then re-enable in a later sprint):
    //   - @typescript-eslint/no-explicit-any  (181 usages — Sprint 3)
    //   - @typescript-eslint/no-non-null-assertion  (many !s — Sprint 3)
    //   - @next/next/no-img-element  (raw <img> everywhere — Sprint 3)
    //   - react-hooks/exhaustive-deps  (stale-deps everywhere — Sprint 3)
    "@typescript-eslint/no-unused-vars": "warn",
    "@typescript-eslint/ban-ts-comment": "warn",
    "@typescript-eslint/prefer-as-const": "warn",
    // NOTE: previously had `@typescript-eslint/no-unused-disable-directive`
    // here, but that rule doesn't exist in the installed @typescript-eslint
    // plugin (it was renamed and moved to ESLint core as
    // `reportUnusedDisableDirectives`). Removed so `bun run lint` actually
    // runs instead of crashing at config-load time.

    // React
    "react/no-unescaped-entities": "off",
    "react/display-name": "off",
    "react/prop-types": "off",
    "react-compiler/react-compiler": "off",

    // Next.js
    "@next/next/no-img-element": "off",        // Sprint 3
    "@next/next/no-html-link-for-pages": "off",

    // General JavaScript — these are all real bug-catchers.
    "prefer-const": "warn",
    "no-console": "off",                       // we explicitly use console.{log,error,warn}
    "no-debugger": "error",
    "no-empty": "warn",
    "no-irregular-whitespace": "warn",
    "no-case-declarations": "warn",
    "no-fallthrough": "error",
    "no-mixed-spaces-and-tabs": "error",
    "no-redeclare": "error",
    "no-undef": "error",
    "no-unreachable": "error",
    "no-useless-escape": "warn",
  },
}, {
  ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts", "examples/**", "skills", "rush-existing/**", "upload/**"]
}];

export default eslintConfig;
