"use client";

import { create } from "zustand";
import type {
  ViewId,
  NavParams,
  CartItem,
  Capability,
  User,
} from "./types";

interface RushState {
  // navigation
  view: ViewId;
  params: NavParams;
  history: Array<{ view: ViewId; params: NavParams }>;
  navigate: (view: ViewId, params?: NavParams) => void;
  back: () => void;

  // user + capabilities — hydrated from useMe() via setAuthenticatedUser
  user: User | null;
  activeWorkspace: Capability;
  setAuthenticatedUser: (u: User | null) => void;
  setWorkspace: (c: Capability) => void;

  // cart (client-side until checkout)
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartCount: () => number;
  cartSubtotal: () => number;

  // search
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // toasts
  toasts: Array<{ id: string; title: string; description?: string }>;
  pushToast: (t: { title: string; description?: string }) => void;
  dismissToast: (id: string) => void;
}

export const useRush = create<RushState>((set, get) => ({
  view: "home",
  params: {},
  history: [],

  navigate: (view, params = {}) => {
    const prev = { view: get().view, params: get().params };
    set({
      view,
      params,
      history: [...get().history, prev].slice(-30),
    });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
  },

  back: () => {
    const history = [...get().history];
    if (history.length === 0) {
      set({ view: "home", params: {} });
      return;
    }
    const prev = history.pop()!;
    set({ view: prev.view, params: prev.params, history });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
  },

  user: null,
  activeWorkspace: "CUSTOMER",
  setAuthenticatedUser: (u) => {
    set({
      user: u,
      activeWorkspace: u?.activeWorkspace || "CUSTOMER",
    });
  },
  setWorkspace: (c) => set({ activeWorkspace: c }),

  cart: [],
  addToCart: (item) => {
    const existing = get().cart.find((c) => c.productId === item.productId);
    if (existing) {
      set({
        cart: get().cart.map((c) =>
          c.productId === item.productId
            ? { ...c, quantity: c.quantity + item.quantity }
            : c,
        ),
      });
    } else {
      set({ cart: [...get().cart, item] });
    }
  },
  removeFromCart: (productId) =>
    set({ cart: get().cart.filter((c) => c.productId !== productId) }),
  updateQuantity: (productId, quantity) =>
    set({
      cart: get().cart
        .map((c) => (c.productId === productId ? { ...c, quantity } : c))
        .filter((c) => c.quantity > 0),
    }),
  clearCart: () => set({ cart: [] }),
  cartCount: () => get().cart.reduce((sum, i) => sum + i.quantity, 0),
  cartSubtotal: () =>
    get().cart.reduce((sum, i) => sum + i.price * i.quantity, 0),

  searchQuery: "",
  setSearchQuery: (q) => set({ searchQuery: q }),

  toasts: [],
  pushToast: (t) => {
    const id = Math.random().toString(36).slice(2);
    set({ toasts: [...get().toasts, { ...t, id }] });
    setTimeout(() => get().dismissToast(id), 2800);
  },
  dismissToast: (id) =>
    set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));
