"use client";

import { useMemo } from "react";

/**
 * NameAvatar — deterministic vibrant gradient avatar.
 *
 * Renders a circular (or square) avatar filled with a vibrant OKLCH
 * gradient picked deterministically from the input `name`. Shows 1–2
 * character initials in bold white text, centered. Used as a fallback
 * anywhere we'd otherwise show a blank avatar — TopBar, AccountScreen,
 * VendorCard, provider rows, etc.
 *
 * Why OKLCH:
 *   - OKLCH gives perceptually-uniform lightness, so picking a fixed
 *     lightness (≈65%) and chroma (≈0.18) for every gradient stop
 *     guarantees vibrant-but-not-eye-bleeding colors regardless of hue.
 *   - All modern browsers ship OKLCH as of 2023; Safari <15.4 falls
 *     back to no gradient (solid background-color from the first stop),
 *     which still looks fine.
 *
 * Determinism:
 *   - We hash the name (simple djb2) and modulo into 12 preset hue
 *     pairs. Same name → same avatar every render. Different names →
 *     different gradients (collisions are rare with 12 buckets).
 */

const GRADIENTS: Array<{ from: string; to: string; label: string }> = [
  // 12 vibrant pairs in OKLCH — fixed L=0.65, C=0.18, varying H.
  { from: "oklch(0.65 0.18 35)",  to: "oklch(0.62 0.20 12)",  label: "orange"  },
  { from: "oklch(0.65 0.18 180)", to: "oklch(0.60 0.20 200)", label: "teal"    },
  { from: "oklch(0.60 0.20 300)", to: "oklch(0.55 0.22 330)", label: "purple"  },
  { from: "oklch(0.70 0.18 350)", to: "oklch(0.65 0.20 5)",   label: "pink"    },
  { from: "oklch(0.70 0.16 200)", to: "oklch(0.65 0.18 230)", label: "cyan"    },
  { from: "oklch(0.75 0.18 140)", to: "oklch(0.70 0.20 160)", label: "lime"    },
  { from: "oklch(0.65 0.20 320)", to: "oklch(0.60 0.22 350)", label: "fuchsia" },
  { from: "oklch(0.60 0.20 280)", to: "oklch(0.55 0.22 310)", label: "violet"  },
  { from: "oklch(0.72 0.16 90)",  to: "oklch(0.68 0.18 70)",  label: "gold"    },
  { from: "oklch(0.62 0.18 240)", to: "oklch(0.55 0.20 260)", label: "blue"    },
  { from: "oklch(0.70 0.18 20)",  to: "oklch(0.65 0.20 40)",  label: "amber"   },
  { from: "oklch(0.65 0.18 160)", to: "oklch(0.60 0.20 180)", label: "emerald" },
];

/**
 * djb2 — a small, fast, well-distributed string hash. We don't need
 * cryptographic strength here, just a stable integer per name.
 */
function hashName(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) + s.charCodeAt(i); // h * 33 + c
    h = h >>> 0; // force unsigned 32-bit
  }
  return h;
}

/**
 * Build 1–2 character initials from a name.
 *   - "Tunde Adeyemi" → "TA"
 *   - "Tunde"         → "T"
 *   - ""              → "?"
 */
function getInitials(name: string): string {
  const trimmed = (name || "").trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0]!.slice(0, 1).toUpperCase();
  }
  return (parts[0]!.slice(0, 1) + parts[parts.length - 1]!.slice(0, 1)).toUpperCase();
}

interface NameAvatarProps {
  name: string;
  size?: number;
  shape?: "circle" | "square";
  className?: string;
}

export function NameAvatar({
  name,
  size = 40,
  shape = "circle",
  className = "",
}: NameAvatarProps) {
  // useMemo — same name → same gradient every render, but we recompute
  // if the name prop changes (rare; mostly stable per mount).
  const { gradient, initials } = useMemo(() => {
    const h = hashName(name || "");
    const g = GRADIENTS[h % GRADIENTS.length]!;
    return {
      gradient: `linear-gradient(135deg, ${g.from} 0%, ${g.to} 100%)`,
      initials: getInitials(name),
    };
  }, [name]);

  const radiusCls = shape === "circle" ? "rounded-full" : "rounded-xl";

  // Font-size scales with the avatar size, clamped so 1-char initials
  // on a 24px avatar don't overflow and 2-char initials on a 96px one
  // don't look tiny.
  const fontSize = Math.max(11, Math.round(size * 0.4));

  return (
    <span
      className={`inline-flex items-center justify-center text-white font-bold select-none ${radiusCls} ${className}`}
      style={{
        width: size,
        height: size,
        background: gradient,
        fontSize,
        lineHeight: 1,
        // The fallback background-color is the gradient's first stop
        // (rendered as a solid). Used by browsers that don't support
        // OKLCH — they ignore the `background:` line and fall back to
        // `backgroundColor`.
        backgroundColor: "#f97316",
      }}
      aria-label={name || "Avatar"}
      role="img"
    >
      {initials}
    </span>
  );
}
