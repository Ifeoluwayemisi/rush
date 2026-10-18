"use client";

import { Component, type ReactNode } from "react";

/**
 * AppErrorBoundary — top-level React error boundary.
 *
 * Catches any unhandled render-time error in the component tree below
 * it and shows a friendly fallback instead of a white screen. Used
 * in layout.tsx to wrap the entire app.
 *
 * Why we need this: even with defensive guards on individual
 * components, a runtime error in any child (e.g. accessing
 * `.images[0]` on a malformed product) would crash the whole React
 * tree and show a blank page. The boundary catches it and gives the
 * user a "Something went wrong" + reload button.
 *
 * In development, we also render the error message + stack so the
 * developer can see what happened without opening DevTools.
 */
interface State {
  hasError: boolean;
  error?: Error;
}

export class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // Log to the server console so we can see it in Vercel logs.
    console.error("[AppErrorBoundary] caught:", error?.message ?? error);
    console.error("[AppErrorBoundary] stack:", info.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: undefined });
    // Hard reload — clears any stale client state that might have
    // caused the crash.
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      const isDev = process.env.NODE_ENV !== "production";
      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-background">
          <div className="h-16 w-16 rounded-2xl rush-gradient mx-auto flex items-center justify-center shadow-rush mb-4">
            <span className="text-white font-extrabold text-2xl">R</span>
          </div>
          <h1 className="text-xl font-extrabold text-ink mb-1">
            Something went wrong
          </h1>
          <p className="text-sm text-ink-soft mb-5 max-w-sm">
            The page hit an unexpected error. Try reloading — your data is safe.
          </p>
          {isDev && this.state.error && (
            <details className="mb-4 max-w-md w-full text-left">
              <summary className="text-xs font-semibold text-ink-soft cursor-pointer">
                Error details (dev only)
              </summary>
              <pre className="mt-2 p-3 rounded-lg bg-muted text-[10px] text-destructive overflow-auto max-h-40">
                {this.state.error.message}
                {"\n\n"}
                {this.state.error.stack}
              </pre>
            </details>
          )}
          <button
            onClick={this.handleReload}
            className="px-5 py-2.5 rounded-xl rush-gradient text-white font-bold text-sm shadow-rush"
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
