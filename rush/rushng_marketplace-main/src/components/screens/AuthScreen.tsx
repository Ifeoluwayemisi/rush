"use client";

import * as React from "react";
import { useState } from "react";
import { useLogin, useRegister } from "@/lib/hooks";
import { useRush } from "@/lib/store";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  User as UserIcon,
} from "lucide-react";
import { RushLogo } from "@/components/RushLogo";
import { isFirebaseConfigured } from "@/lib/auth-providers/firebase-client";
import { signInWithGoogle } from "@/lib/auth-providers/google";
import { toAppError } from "@/lib/errors";

type Mode = "login" | "register";

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");

  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  const loginMut = useLogin();
  const registerMut = useRegister();
  const { pushToast, back } = useRush();

  const loading =
    loginMut.isPending ||
    registerMut.isPending ||
    googleLoading;

  const handleBack = () => {
    back();
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      if (mode === "login") {
        await loginMut.mutateAsync({
          email,
          password,
        });

        pushToast({
          title: "Welcome back!",
        });
      } else {
        await registerMut.mutateAsync({
          name,
          email,
          password,
          phone,
          location,
        });

        pushToast({
          title: "Account created!",
          description: "Welcome to Rush.",
        });
      }

      window.location.href = "/";
    } catch (err) {
      setError(toAppError(err).message);
    }
  };

  /**
   * Google sign-in.
   *
   * The guard is important because Firebase's popup flow must only
   * have one active popup attempt at a time.
   */
  const handleGoogle = async () => {
    // Prevent double-clicks / repeated submissions while a popup
    // authentication attempt is already running.
    if (googleLoading) {
      return;
    }

    setError("");
    setGoogleLoading(true);

    try {
      await signInWithGoogle();

      pushToast({
        title: "Welcome to Rush!",
      });

      // The backend has created the RUSH session cookie.
      window.location.href = "/";
    } catch (err) {
      setError(toAppError(err).message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] lg:min-h-[calc(100vh-2.5rem)] bg-background flex flex-col">
      <div className="flex-1 w-full max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:flex lg:items-center lg:gap-14 lg:px-8 lg:py-10">
        {/* ─── Desktop brand panel ─────────────────────────────────── */}
        <div className="hidden lg:flex lg:flex-1 lg:flex-col relative">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-16 -left-16 h-64 w-64 rounded-full bg-rush/15 blur-3xl"
          />

          <div className="relative">
            <RushLogo size={56} clickable={false} />

            <h2 className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight text-ink">
              One account.
              <span className="block text-rush-deep">Many possibilities.</span>
            </h2>

            <p className="mt-4 max-w-md text-base leading-relaxed text-ink-soft">
              Shop from local businesses, hire trusted professionals, book
              rides across Lagos — all from one Rush account.
            </p>

            <ul className="mt-7 space-y-3">
              {[
                "Verified local sellers",
                "Secure payments with Paystack",
                "Riders and pros across Lagos",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm font-semibold text-ink">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rush-soft">
                    <CheckCircle2 className="h-4 w-4 text-rush-deep" aria-hidden />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ─── Form column ─────────────────────────────────────────── */}
        <div className="w-full max-w-md mx-auto lg:mx-0 lg:w-[420px] lg:shrink-0">
          {/* Back + mobile logo row */}
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={handleBack}
              className="h-10 w-10 rounded-full bg-card border border-border shadow-card flex items-center justify-center text-ink hover:bg-muted transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              aria-label="Go back"
              type="button"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <span className="lg:hidden">
              <RushLogo size={36} clickable={false} />
            </span>
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-card p-5 sm:p-6">
            <h1 className="text-2xl font-extrabold tracking-tight text-ink">
              {mode === "login"
                ? "Welcome back"
                : "Create your account"}
            </h1>

            <p className="mt-1 text-sm text-ink-soft">
              One account. Shop, sell, offer services, and ride.
            </p>

            {/* Mode tabs */}
            <div
              className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1"
              role="group"
              aria-label="Authentication mode"
            >
              <button
                type="button"
                onClick={() => switchMode("login")}
                aria-pressed={mode === "login"}
                disabled={loading}
                className={`rounded-lg py-2 text-sm font-bold transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                  mode === "login"
                    ? "bg-card text-ink shadow-card"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                Log in
              </button>

              <button
                type="button"
                onClick={() => switchMode("register")}
                aria-pressed={mode === "register"}
                disabled={loading}
                className={`rounded-lg py-2 text-sm font-bold transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                  mode === "register"
                    ? "bg-card text-ink shadow-card"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                Sign up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              {/* Google Sign-In */}
              {isFirebaseConfigured && (
                <>
                  <button
                    type="button"
                    onClick={handleGoogle}
                    disabled={loading}
                    aria-busy={googleLoading}
                    className="w-full h-12 rounded-xl bg-card border border-border text-ink font-bold text-sm flex items-center justify-center gap-2.5 hover:bg-muted transition-colors shadow-card disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {googleLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <GoogleIcon />
                    )}

                    {googleLoading
                      ? "Signing in..."
                      : "Continue with Google"}
                  </button>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-border" />

                    <span className="text-[10px] font-semibold text-ink-soft uppercase">
                      or
                    </span>

                    <div className="flex-1 h-px bg-border" />
                  </div>
                </>
              )}

              {/* Registration fields */}
              {mode === "register" && (
                <>
                  <Field
                    icon={<UserIcon className="h-4 w-4" />}
                    label="Full name"
                  >
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jesuloluwa Adeyemi"
                      required
                      className="auth-input"
                      autoComplete="name"
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      icon={<Phone className="h-4 w-4" />}
                      label="Phone"
                    >
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+234 803..."
                        className="auth-input"
                        autoComplete="tel"
                      />
                    </Field>

                    <Field
                      icon={<MapPin className="h-4 w-4" />}
                      label="Location"
                    >
                      <input
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Yaba, Lagos"
                        className="auth-input"
                        autoComplete="address-level2"
                      />
                    </Field>
                  </div>
                </>
              )}

              {/* Email */}
              <Field
                icon={<Mail className="h-4 w-4" />}
                label="Email"
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  required
                  className="auth-input"
                  autoComplete="email"
                />
              </Field>

              {/* Password */}
              <Field
                icon={<Lock className="h-4 w-4" />}
                label="Password"
              >
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="auth-input"
                  autoComplete={
                    mode === "login"
                      ? "current-password"
                      : "new-password"
                  }
                />
              </Field>

              {/* Error */}
              {error && (
                <div
                  role="alert"
                  className="rounded-xl bg-destructive/10 border border-destructive/30 px-3.5 py-2.5 text-sm text-destructive font-medium flex items-start gap-2"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
                  <span>{error}</span>
                </div>
              )}

              {/* Email/password submit */}
              <button
                type="submit"
                disabled={loading}
                className="cta-primary w-full h-12 rounded-xl text-sm disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none"
              >
                {(loginMut.isPending || registerMut.isPending) && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}

                {mode === "login"
                  ? "Log in"
                  : "Create account"}
              </button>

              {/* Switch mode */}
              <p className="text-center text-xs text-ink-soft pt-1">
                {mode === "login"
                  ? "Don't have an account? "
                  : "Already have an account? "}

                <button
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    switchMode(
                      mode === "login"
                        ? "register"
                        : "login",
                    )
                  }
                  className="font-bold text-rush-deep hover:underline disabled:opacity-50 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {mode === "login"
                    ? "Sign up"
                    : "Log in"}
                </button>
              </p>
            </form>
          </div>

          <p className="mt-5 text-center text-xs text-ink-soft">
            Rush · One account, many possibilities
          </p>
        </div>
      </div>

      <style jsx>{`
        .auth-input {
          width: 100%;
          background: var(--muted);
          border: 1px solid color-mix(in oklch, var(--border) 70%, transparent);
          border-radius: 0.75rem;
          padding: 0.75rem 0.875rem 0.75rem 2.5rem;
          font-size: 0.875rem;
          color: var(--ink);
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease,
            background-color 0.15s ease;
        }

        .auth-input:focus {
          border-color: color-mix(in oklch, var(--rush) 40%, transparent);
          background: var(--card);
          box-shadow: 0 0 0 2px
            color-mix(in oklch, var(--rush) 20%, transparent);
        }

        .auth-input::placeholder {
          color: var(--ink-soft);
        }
      `}</style>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />

      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
      />

      <path
        fill="#FBBC05"
        d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V6.958H.957C.347 8.173 0 9.548 0 11s.348 2.827.957 4.042l3.007-2.332z"
      />

      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block cursor-text">
      <span className="block text-xs font-bold text-ink mb-1.5">
        {label}
      </span>

      <span className="relative block">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft flex pointer-events-none">
          {icon}
        </span>

        {children}
      </span>
    </label>
  );
}
