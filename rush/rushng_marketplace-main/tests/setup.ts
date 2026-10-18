/**
 * Vitest global setup — runs before each test file.
 *
 * Adds jest-dom matchers (`toBeInTheDocument`, `toHaveTextContent`,
 * etc.) so component tests can assert on DOM state ergonomically.
 *
 * Also stubs `next/headers`'s `cookies()` so server-only modules
 * that read cookies don't crash in tests. Individual test files
 * override these as needed.
 */
import "@testing-library/jest-dom/vitest";

// jsdom doesn't implement matchMedia. Some shadcn UI components call
// it on mount; we stub it as a no-op so tests don't crash.
if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// jsdom doesn't implement IntersectionObserver. Stub it.
if (typeof window !== "undefined" && !("IntersectionObserver" in window)) {
  // @ts-expect-error minimal stub for tests
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  };
}

// Silence the React act() warning in tests — we use waitFor/findby
// queries which already act. Set only during test runs.
if (typeof process !== "undefined") {
  // NODE_ENV is typed as read-only in Bun's types; cast to bypass.
  (process as { env: Record<string, string | undefined> }).env.NODE_ENV = "test";
}
