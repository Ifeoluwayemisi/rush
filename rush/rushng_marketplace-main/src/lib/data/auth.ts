"use client";

import type { User } from "@/lib/types";
import { api } from "./shared";

/**
 * Authentication repository.
 *
 * No mock fallback. If the API is unreachable, `me()` rejects and the
 * caller (AuthHydrator) treats it as "unauthenticated" or surfaces a
 * friendly error.
 *
 * Login / register / logout always hit the real API — they MUST
 * succeed to set or clear the session cookie. There is no "demo
 * account" or "auto sign in" — every session is a real session.
 */
export const authRepo = {
  me(): Promise<{ user: User | null }> {
    return api.get("/api/auth/me");
  },

  login(body: { email: string; password: string }): Promise<{ id: string }> {
    return api.post("/api/auth/login", body);
  },

  register(body: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    location?: string;
  }): Promise<{ id: string }> {
    return api.post("/api/auth/register", body);
  },

  logout(): Promise<{ ok: true }> {
    return api.post("/api/auth/logout");
  },
};
