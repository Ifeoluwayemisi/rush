import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

/**
 * Vitest config for Rush.
 *
 * We use jsdom for DOM-aware tests (component rendering via
 * @testing-library/react) and the @vitejs/plugin-react plugin so JSX
 * transforms work. The path alias `@` mirrors tsconfig.json so tests
 * can import from `@/lib/...` exactly like the app code does.
 *
 * Tests live next to source files (`*.test.ts` / `*.test.tsx`) and
 * also in a top-level `tests/` directory. Both are picked up.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: [
      "src/**/*.test.{ts,tsx}",
      "tests/**/*.test.{ts,tsx}",
    ],
    exclude: ["node_modules/**", ".next/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/**/*.ts", "src/app/api/**/*.ts"],
      exclude: ["**/*.test.{ts,tsx}"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // `server-only` is a Next.js convention that throws if a server
      // module ends up in a client bundle. In tests, there's no client/
      // server split — alias it to a no-op module so imports of server-
      // only libs (auth.ts, db.ts, etc.) don't fail.
      "server-only": path.resolve(__dirname, "./tests/stubs/empty.ts"),
    },
  },
});
