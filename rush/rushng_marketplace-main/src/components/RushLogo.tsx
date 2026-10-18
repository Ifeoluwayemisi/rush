"use client";

import { useRouter } from "next/navigation";

/**
 * RushLogo — the Rush brand mark.
 *
 * Renders the real `/rush-logo.jpg` asset (a 1024×1024 JPEG from the
 * brand kit). The image is cropped with `object-cover` so the Z mark
 * fills the entire square — no letterboxing, no padding. Very visible.
 *
 * No wordmark — the logo image itself contains the brand identity.
 *
 * Clickable: tapping the logo navigates to the home page. This is the
 * standard web app pattern (click logo → go home).
 *
 * Why `<img>` and not `next/image`:
 *   - The asset lives in `/public` and is a fixed-size JPEG — no
 *     optimizer benefit, no responsive sizes needed.
 *   - Skipping next/image avoids configuring a remote pattern and
 *     keeps the component usable in client/server contexts alike.
 *
 * Props:
 *   - size: pixel size of the square mark (defaults to 40 — bigger
 *     than the old 32 so the Z is clearly visible).
 *   - className: extra classes for the button wrapper.
 *   - clickable: when true (default), wraps in a button that
 *     navigates home. Set to false for non-interactive contexts
 *     (e.g. the landing page hero where the logo is decorative).
 */
interface RushLogoProps {
  size?: number;
  className?: string;
  clickable?: boolean;
}

export function RushLogo({
  size = 40,
  className = "",
  clickable = true,
}: RushLogoProps) {
  const router = useRouter();

  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/rush-logo.jpg"
      alt="Rush"
      width={size}
      height={size}
      className="rounded-xl object-cover"
      style={{ width: size, height: size }}
      draggable={false}
    />
  );

  if (!clickable) {
    return <span className={`inline-block ${className}`}>{img}</span>;
  }

  return (
    <button
      onClick={() => router.push("/")}
      className={`inline-block hover:opacity-90 active:scale-95 transition-all ${className}`}
      aria-label="Go home"
    >
      {img}
    </button>
  );
}
