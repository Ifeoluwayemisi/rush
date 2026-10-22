"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { useRush } from "@/lib/store";
import {
  ShoppingBag,
  Wrench,
  Car,
  Truck,
  Store,
  MapPin,
  TrendingUp,
  Check,
  Coffee,
  Wallet,
  ArrowRight,
  ChevronDown,
  Search,
  Heart,
  BadgeCheck,
  Scissors,
  Hammer,
  PenTool,
  Sparkles,
  User,
  Home,
  Package,
  type LucideIcon,
} from "lucide-react";

/**
 * LandingScreen — the marketing homepage shown to unauthenticated visitors.
 *
 * Visually rebuilt against the approved reference in
 * `design-reference/rush-homepage-reference.png` (9 bands):
 *   1. Navbar: logo + section links (+ "For Businesses" menu), Log in, Get Started
 *   2. Hero: badge pill / two-line headline / copy / CTAs / avatar row —
 *      with a full-bleed Lagos art panel + floating category pills on the right
 *   3. "One app. More ways…" split: copy left, 4 pastel overview cards right
 *   4. "Whatever you need, RUSH.": 3 service cards + phone mockup
 *   5. "One place…": journey pills left, account/wallet card right
 *   6. Business pitch + "Rush for Business" card + "List your service" card
 *   7. Lagos scene + trust copy + trust card
 *   8. Full-bleed final CTA banner
 *   9. Dark footer
 *
 * Brand rules (reference is layout truth, RUSH is colour truth):
 *   - Uses ONLY existing RUSH tokens (--rush, --rush-soft, --rush-deep, --ink,
 *     --ink-soft, --background, --card, --muted, --border, --success, --warning).
 *     The reference's purple/lavender/green/pink accents are translated to
 *     orange / burnt-orange / peach / warm-neutral / existing success+warning
 *     tints. No purple, no new colours, no new dependencies.
 *   - Small orange text uses `text-rush-deep` (WCAG AA on light surfaces);
 *     primary CTAs use `.cta-primary` (ink label on brand orange ≈5.6:1);
 *     the CTA banner uses white on `--rush-deep` (≈5.3:1).
 *   - The real brand asset `/rush-logo.jpg` is reused (cropped via RushWordmark
 *     / RushMark helpers). No generated logos, no external image URLs.
 *
 * Functional rules (unchanged behaviour):
 *   - Auth-gated CTAs keep established destinations: `account`,
 *     `onboarding-vendor`, `onboarding-provider`.
 *   - Nav / overview / footer "Marketplace" links are real in-page anchors.
 *   - Company / Legal footer entries have no destination yet → plain text
 *     (not fake links). The phone mockup is a decorative illustration
 *     (aria-hidden, pointer-events-none, non-semantic).
 *
 * No app chrome — rendered standalone in the landing branch of
 * `src/app/page.tsx` (no TopBar, no BottomNav).
 */

/** Shared page gutter: matches the reference's ~100px margins at 1440px. */
const CONTAINER = "mx-auto w-full max-w-7xl px-6 sm:px-8";

export function LandingScreen() {
  const navigate = useRush((s) => s.navigate);
  const goAccount = () => navigate("account");
  const goVendor = () => navigate("onboarding-vendor");
  const goProvider = () => navigate("onboarding-provider");

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-ink">
      {/* ─── 1. Navbar ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-background/85 backdrop-blur-md">
        <div className={`${CONTAINER} flex h-16 items-center justify-between gap-4`}>
          <div className="flex items-center gap-6 lg:gap-9">
            <a
              href="#top"
              aria-label="RUSH home"
              className="shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <RushWordmark h={22} />
            </a>

            <nav
              aria-label="Homepage sections"
              className="hidden items-center gap-7 lg:flex"
            >
              <NavLink href="#shop">Shop</NavLink>
              <NavLink href="#hire">Services</NavLink>
              <NavLink href="#ride">Rides</NavLink>

              {/* Native <details> — keyboard accessible dropdown with real
                  in-page destinations (no fake navigation). */}
              <details className="group relative">
                <summary className="flex cursor-pointer list-none items-center gap-1 rounded-lg px-1 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
                  For Businesses
                  <ChevronDown
                    className="h-3.5 w-3.5 transition-transform group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <div className="absolute left-0 top-full z-50 mt-1 w-60 rounded-2xl border border-border bg-card p-2 shadow-card">
                  <a
                    href="#business"
                    className="block rounded-xl px-3 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    Join RUSH as a Business
                  </a>
                  <a
                    href="#professionals"
                    className="block rounded-xl px-3 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    Become a RUSH Pro
                  </a>
                </div>
              </details>
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={goAccount}
              className="cursor-pointer rounded-full px-2 py-2 text-sm font-semibold text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:px-3"
            >
              Log in
            </button>
            <button
              onClick={goAccount}
              className="cta-primary cursor-pointer rounded-full px-4 py-2 text-sm sm:px-5"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="flex-1">
        {/* ─── 2. Hero ────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-gradient-to-b from-rush-soft/70 via-rush-soft/50 to-rush-soft/30">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -left-20 h-72 w-72 rounded-full bg-rush/30 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-rush-deep/15 blur-3xl"
          />

          {/* Desktop: art bleeds to the right viewport edge (reference hero). */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46%] lg:block"
          >
            <HeroArt />
          </div>

          <div className={`${CONTAINER} relative`}>
            <div className="py-14 lg:w-[52%] lg:py-24 lg:pr-10">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rush/25 bg-card px-3.5 py-1.5 text-xs font-bold text-rush-deep shadow-card sm:text-sm animate-in fade-in slide-in-from-bottom-2 duration-500 motion-reduce:animate-none">
                <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
                The everyday marketplace for Lagos
              </span>

              <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight text-ink animate-in fade-in slide-in-from-bottom-3 duration-700 motion-reduce:animate-none sm:text-5xl lg:text-[3.5rem]">
                <span className="block">Everything you need.</span>
                <span className="block text-rush-deep">One RUSH.</span>
              </h1>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg animate-in fade-in slide-in-from-bottom-3 duration-700 delay-75 motion-reduce:animate-none">
                Shop from local businesses. Hire trusted professionals. Book
                rides across Lagos. Get what you need delivered — all from one
                account.
              </p>

              <div className="mt-7 flex flex-wrap gap-3 animate-in fade-in slide-in-from-bottom-3 duration-700 delay-100 motion-reduce:animate-none">
                <button
                  onClick={goAccount}
                  className="cta-primary cursor-pointer rounded-xl px-6 py-3.5 text-sm"
                >
                  Get Started
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
                <button
                  onClick={goAccount}
                  className="cta-secondary cursor-pointer rounded-xl px-6 py-3.5 text-sm"
                >
                  Explore RUSH
                </button>
              </div>

              {/* Avatar cluster + tagline (decorative avatars, real copy) */}
              <div className="mt-8 flex items-center gap-3">
                <div className="flex -space-x-2.5" aria-hidden>
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-rush-soft text-rush-deep shadow-card"
                    >
                      <User className="h-4 w-4" />
                    </span>
                  ))}
                </div>
                <p className="text-xs font-medium leading-snug text-ink-soft sm:text-sm">
                  One account. One wallet.
                  <br />
                  One trusted marketplace.
                </p>
              </div>
            </div>

            {/* Mobile / tablet: art in flow, bleeding to both edges */}
            <div aria-hidden className="pointer-events-none -mx-6 sm:-mx-8 lg:hidden">
              <HeroArt />
            </div>
          </div>
        </section>

        {/* ─── 3. Marketplace overview — copy left, 4 pastel cards right ─ */}
        <section id="marketplace" className="bg-rush-soft/30 py-14 sm:py-16 lg:py-20">
          <div
            className={`${CONTAINER} grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.7fr)] lg:items-center lg:gap-10`}
          >
            <div>
              <span className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-card">
                <RushWordmark h={16} />
              </span>
              <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl">
                One app. More ways to get things done.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-soft sm:text-base">
                RUSH brings shopping, services, delivery, and rides together in
                one marketplace built for everyday life.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <OverviewCard href="#shop" label="SHOP" sub="Products" card="bg-rush-soft/70">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rush-deep text-white">
                  <ShoppingBag className="h-5 w-5" aria-hidden />
                </span>
              </OverviewCard>
              <OverviewCard href="#hire" label="HIRE" sub="Services" card="bg-warning/15">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink text-white">
                  <Wrench className="h-5 w-5" aria-hidden />
                </span>
              </OverviewCard>
              <OverviewCard href="#ride" label="RIDE" sub="Mobility" card="bg-success/15">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-success text-white">
                  <Car className="h-5 w-5" aria-hidden />
                </span>
              </OverviewCard>
              <OverviewCard href="#journey" label="RUSH" sub="One marketplace" card="bg-muted/80">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card">
                  <RushMark size={26} />
                </span>
              </OverviewCard>
            </div>
          </div>
        </section>

        {/* ─── 4. Service cards + phone mockup ─────────────────────────── */}
        <section id="services" className="bg-card py-14 sm:py-16 lg:py-20">
          <div className={CONTAINER}>
            <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
              Whatever you need, <span className="text-rush-deep">RUSH.</span>
            </h2>
            <p className="mt-2 text-sm text-ink-soft sm:text-base">
              Three ways to use RUSH — pick one or use them all.
            </p>

            <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-6">
              <div className="grid flex-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <ServiceCard
                  anchorId="shop"
                  tone="shop"
                  tag="SHOP"
                  title="Find it. Order it. Get it."
                  desc="Discover products from local businesses and have them delivered to you."
                  cta="Shop on RUSH"
                  onClick={goAccount}
                />
                <ServiceCard
                  anchorId="hire"
                  tone="hire"
                  tag="HIRE"
                  title="Need it done? Find someone."
                  desc="Connect with trusted professionals offering services around you."
                  cta="Find a Pro"
                  onClick={goAccount}
                />
                <ServiceCard
                  anchorId="ride"
                  tone="ride"
                  tag="RIDE"
                  title="Need to move? RUSH."
                  desc="Book a ride and get where you're going."
                  cta="Book a Ride"
                  onClick={goAccount}
                />
              </div>

              <div className="flex justify-center lg:w-[260px] lg:shrink-0 lg:justify-end">
                <PhoneMockup />
              </div>
            </div>
          </div>
        </section>

        {/* ─── 5. Everyday journey + account/wallet card ───────────────── */}
        <section id="journey" className="bg-muted py-14 sm:py-16 lg:py-20">
          <div
            className={`${CONTAINER} grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-center lg:gap-10`}
          >
            <div>
              <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl">
                One place for the things you do every day.
              </h2>
              <p className="mt-3 max-w-2xl text-sm text-ink-soft sm:text-base">
                From your first order to your last ride, RUSH keeps everything
                connected.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <DayItem
                  icon={Coffee}
                  iconClass="text-rush-deep"
                  tint="bg-rush-soft/80"
                  label="Morning"
                  sub="Order breakfast"
                />
                <DayArrow />
                <DayItem
                  icon={Wrench}
                  iconClass="text-ink"
                  tint="bg-warning/15"
                  label="Afternoon"
                  sub="Book a pro"
                />
                <DayArrow />
                <DayItem
                  icon={ShoppingBag}
                  iconClass="text-rush-deep"
                  tint="bg-card"
                  label="Evening"
                  sub="Shop & deliver"
                />
                <DayArrow />
                <DayItem
                  icon={Car}
                  iconClass="text-success"
                  tint="bg-success/15"
                  label="Later"
                  sub="Ride home"
                />
              </div>
            </div>

            {/* Account / wallet card (replaces the old full-width dark band) */}
            <div className="rounded-3xl border border-rush/20 bg-rush-soft/70 p-6 shadow-card lg:p-7">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rush-deep text-white shadow-rush">
                <Wallet className="h-6 w-6" aria-hidden />
              </span>
              <h3 className="mt-4 text-lg font-extrabold leading-snug text-ink">
                One account. One wallet.
                <br />
                One trusted marketplace.
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                No jumping between different apps. Your purchases, services,
                rides, payments, and activity live together in RUSH.
              </p>
              <a
                href="#get-started"
                className="cta-secondary mt-5 rounded-full px-5 py-2.5 text-sm"
              >
                Learn more
                <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
            </div>
          </div>
        </section>

        {/* ─── 6. Business + professionals (3-column row) ──────────────── */}
        <section id="business" className="bg-card py-14 sm:py-16 lg:py-20">
          <div className={`${CONTAINER} grid gap-6 lg:grid-cols-3 lg:items-start lg:gap-6`}>
            {/* Business pitch */}
            <div>
              <span className="inline-block rounded-full bg-rush-soft px-3 py-1 text-xs font-bold uppercase tracking-wider text-rush-deep">
                For Businesses
              </span>
              <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl">
                Your business deserves to be found.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-ink-soft sm:text-base">
                Join RUSH for free. List your products. We only make money when
                you make money.
              </p>

              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3">
                <PointItem icon={Store} title="Open your store" />
                <PointItem icon={MapPin} title="Reach customers" />
                <PointItem icon={TrendingUp} title="Grow your sales" />
              </div>

              <button
                onClick={goVendor}
                className="cta-primary mt-7 cursor-pointer rounded-xl px-6 py-3.5 text-sm"
              >
                Join RUSH as a Business
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            </div>

            {/* Rush for Business card */}
            <div className="rounded-3xl border border-rush/20 bg-rush-soft/60 p-6 lg:p-7">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-extrabold text-ink">
                  Rush for Business
                </h3>
                <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-bold text-ink-soft">
                  Free to start
                </span>
              </div>

              <div className="mt-5 space-y-2.5">
                <CheckRow label="No setup fees" />
                <CheckRow label="List unlimited products" />
                <CheckRow label="We only earn when you earn" />
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                <Stat value="Free" label="to join" />
                <Stat value="0%" label="setup fee" />
                <Stat value="1" label="account" />
              </div>
            </div>

            {/* Professionals card */}
            <div id="professionals" className="rounded-3xl border border-rush/20 bg-rush-soft/60 p-6 lg:p-7">
              <span className="inline-block rounded-full bg-card px-3 py-1 text-xs font-bold uppercase tracking-wider text-rush-deep">
                Your skills, in demand
              </span>
              <h3 className="mt-3 text-xl font-extrabold leading-snug tracking-tight text-ink">
                List your service. Get booked. Get paid.
              </h3>

              <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3">
                <ProfessionItem icon={Wrench} label="Technician" />
                <ProfessionItem icon={PenTool} label="Designer" />
                <ProfessionItem icon={Sparkles} label="Cleaner" />
                <ProfessionItem icon={Hammer} label="Repairer" />
                <ProfessionItem icon={Scissors} label="Stylist" />
                <ProfessionItem icon={BadgeCheck} label="Specialist" />
              </div>

              <button
                onClick={goProvider}
                className="cta-primary mt-6 cursor-pointer rounded-xl px-5 py-3 text-sm"
              >
                Become a RUSH Pro
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        </section>

        {/* ─── 7. Lagos scene + trust ──────────────────────────────────── */}
        <section id="trust" className="bg-background py-14 sm:py-16 lg:py-20">
          <div
            className={`${CONTAINER} grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)_230px] lg:items-center lg:gap-6`}
          >
            <LagosScene />

            <div>
              <h2 className="text-2xl font-extrabold leading-tight tracking-tight text-ink sm:text-3xl">
                Built for Lagos. Made for everyday life.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
                Lagos moves fast. RUSH is built to help you keep up — connecting
                you to local businesses, trusted professionals, delivery, and
                rides in one place.
              </p>

              <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-3">
                {[
                  "Trusted businesses",
                  "Verified professionals",
                  "Secure payments",
                  "Support when you need it",
                ].map((label) => (
                  <li
                    key={label}
                    className="flex items-center gap-2 text-sm font-medium text-ink-soft"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rush-deep">
                      <Check className="h-3 w-3 text-white" aria-hidden />
                    </span>
                    {label}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center gap-3 rounded-3xl border border-rush/20 bg-rush-soft/70 p-5 shadow-card">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rush-deep text-white">
                <Heart className="h-5 w-5" aria-hidden />
              </span>
              <p className="text-sm font-extrabold leading-snug text-ink">
                Your trust is what makes RUSH work.
              </p>
            </div>
          </div>
        </section>

        {/* ─── 8. Final CTA banner ─────────────────────────────────────── */}
        <section id="get-started" className="relative overflow-hidden bg-rush-deep text-white">
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-r from-ink/55 via-ink/25 to-transparent"
          />
          <div
            aria-hidden
            className="absolute -right-16 -bottom-24 h-72 w-72 rounded-full bg-rush/40 blur-3xl"
          />
          <div
            aria-hidden
            className="absolute -top-16 right-[32%] h-52 w-52 rotate-45 rounded-3xl bg-white/10 blur-2xl"
          />

          <div className={`${CONTAINER} relative flex flex-col gap-6 py-10 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:py-12`}>
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                Whatever you need, just RUSH.
              </h2>
              <p className="mt-1.5 text-sm text-white/90">
                Shop it. Hire it. Ride it. Get it delivered.
              </p>
            </div>

            <div className="flex items-center gap-5">
              <button
                onClick={goAccount}
                className="cursor-pointer rounded-full bg-white px-6 py-3 text-sm font-bold text-rush-deep transition-all hover:bg-white/90 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Get Started
                <ArrowRight className="inline h-4 w-4" aria-hidden />
              </button>
              <span aria-hidden className="hidden h-10 w-px bg-white/40 sm:block" />
              <p className="text-sm leading-snug text-white/90">
                One account. One wallet.
                <br />
                Everything you need.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ─── 9. Footer (dark) ─────────────────────────────────────────── */}
      <footer className="bg-ink text-white">
        <div className={`${CONTAINER} py-14`}>
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
            <div>
              <span className="inline-flex rounded-xl bg-white px-3 py-2">
                <RushWordmark h={18} />
              </span>
              <p className="mt-3 text-sm text-white/70">
                Everything you need. One RUSH.
              </p>
            </div>

            <FooterGroup
              title="Marketplace"
              items={[
                { label: "Shop", href: "#shop" },
                { label: "Services", href: "#hire" },
                { label: "Rides", href: "#ride" },
                { label: "Businesses", href: "#business" },
              ]}
            />
            <FooterGroup
              title="Company"
              items={[{ label: "About" }, { label: "Help" }, { label: "Contact" }]}
            />
            <FooterGroup
              title="Legal"
              items={[{ label: "Terms" }, { label: "Privacy" }]}
            />
          </div>

          <div className="mt-12 flex justify-end border-t border-white/10 pt-6 text-xs text-white/60">
            <span>© {new Date().getFullYear()} RUSH</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── Brand asset helpers (reuse /rush-logo.jpg — never regenerated) ───── */

/**
 * RushWordmark — the full RushNG lockup cropped to its content box.
 * The source is a 1024² white canvas; a wide object-cover box shows the
 * centre band (the wordmark) so it stays legible at small heights.
 */
function RushWordmark({ h = 22, className = "" }: { h?: number; className?: string }) {
  const w = Math.round(h * 4.9);
  return (
    <img
      src="/rush-logo.jpg"
      alt="RUSH"
      width={w}
      height={h}
      draggable={false}
      className={`rounded object-cover object-center ${className}`}
      style={{ width: w, height: h }}
    />
  );
}

/**
 * RushMark — the "R" mark alone, cropped out of the same 1024² canvas
 * (mark ≈ x 13–33%, y 42–58%). Decorative by default: surrounding text
 * always carries the accessible name.
 */
function RushMark({ size = 24, className = "" }: { size?: number; className?: string }) {
  const bgSize = size * 4.45;
  return (
    <span
      aria-hidden
      className={`inline-block rounded ${className}`}
      style={{
        width: size,
        height: size,
        backgroundImage: "url(/rush-logo.jpg)",
        backgroundSize: `${bgSize}px ${bgSize}px`,
        backgroundPosition: `${-0.51 * size}px ${-1.725 * size}px`,
        backgroundRepeat: "no-repeat",
      }}
    />
  );
}

/* ─── Hero artwork (decorative; no photography available in the repo) ─── */

/**
 * HeroArt — the reference's hero photo (person + Lagos skyline + bridge)
 * translated into a brand-token composition: skyline + cable-stayed bridge
 * silhouettes, the logo plate, floating category pills and the LAGOS script.
 * Purely decorative → aria-hidden at every call site.
 */
function HeroArt() {
  return (
    <div className="relative h-full min-h-[340px] overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-rush-soft/60 via-rush-soft/30 to-card/80" />
      <div className="absolute top-[6%] right-[12%] h-56 w-56 rounded-full bg-rush/35 blur-3xl" />
      <div className="absolute bottom-[18%] left-[6%] h-52 w-52 rounded-full bg-rush-deep/20 blur-3xl" />

      {/* Water + skyline along the bottom */}
      <div className="absolute inset-x-0 bottom-0 h-[48%] bg-gradient-to-t from-rush-soft/80 to-transparent" />
      <Skyline className="absolute inset-x-0 bottom-7 justify-center" scale={1.7} />
      <div className="absolute inset-x-0 bottom-0 h-7 bg-gradient-to-b from-rush-soft to-card/90" />
      <Bridge className="absolute right-[4%] bottom-4 w-[34%] text-rush-deep/45" />

      {/* Brand plate (desktop focal point) */}
      <div className="absolute left-1/2 top-[40%] hidden -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-border/60 bg-white/95 p-6 shadow-rush sm:block">
        <RushMark size={84} className="rounded-2xl" />
      </div>

      {/* Floating category pills (reference composition) */}
      <FloatingPill icon={ShoppingBag} label="Shop" tile="bg-rush-deep text-white" className="left-[5%] top-[9%]" />
      <FloatingPill icon={Wrench} label="Hire" tile="bg-ink text-white" className="right-[6%] top-[21%]" />
      <FloatingPill icon={Car} label="Ride" tile="bg-success text-white" className="right-[10%] top-[47%]" />
      <FloatingPill icon={Truck} label="Delivery" tile="bg-rush-deep text-white" className="left-[7%] top-[57%]" />

      {/* Handwritten "LAGOS" accent (italic Geist — closest on-brand stand-in) */}
      <div className="absolute right-[6%] bottom-[24%] -rotate-6 text-rush-deep/85">
        <span className="text-xl font-extrabold italic tracking-[0.28em] sm:text-2xl">
          LAGOS
        </span>
        <span className="ml-1 inline-block align-super text-sm">✦</span>
      </div>

      {/* Decorative dashes, top-right */}
      <div className="absolute top-[12%] right-[4%] flex flex-col gap-1" aria-hidden>
        <span className="block h-1 w-5 -rotate-45 rounded-full bg-rush-deep/70" />
        <span className="block h-1 w-3.5 -rotate-45 rounded-full bg-rush-deep/50" />
        <span className="block h-1 w-2.5 -rotate-45 rounded-full bg-rush-deep/40" />
      </div>
    </div>
  );
}

/** White pill with a coloured icon tile — hero category label. */
function FloatingPill({
  icon: Icon,
  label,
  tile,
  className = "",
}: {
  icon: LucideIcon;
  label: string;
  tile: string;
  className?: string;
}) {
  return (
    <div
      className={`absolute z-10 flex items-center gap-2.5 rounded-2xl border border-border/60 bg-white px-3 py-2 shadow-card sm:px-4 sm:py-2.5 ${className}`}
    >
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${tile}`}>
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="text-xs font-bold text-ink sm:text-sm">{label}</span>
    </div>
  );
}

/** Decorative Lagos skyline — token-tinted building silhouettes. */
function Skyline({
  className = "",
  scale = 1,
  ...rest
}: { className?: string; scale?: number } & HTMLAttributes<HTMLDivElement>) {
  const bars: Array<{ h: number; w: number }> = [
    { h: 14, w: 11 }, { h: 24, w: 7 }, { h: 32, w: 13 }, { h: 18, w: 8 },
    { h: 40, w: 10 }, { h: 27, w: 7 }, { h: 46, w: 14 }, { h: 21, w: 8 },
    { h: 34, w: 11 }, { h: 16, w: 7 }, { h: 28, w: 9 }, { h: 38, w: 12 },
    { h: 23, w: 8 }, { h: 42, w: 10 }, { h: 19, w: 7 }, { h: 31, w: 13 },
    { h: 25, w: 9 }, { h: 36, w: 8 }, { h: 27, w: 11 }, { h: 20, w: 7 },
  ];
  return (
    <div
      aria-hidden
      className={`flex items-end ${className}`}
      style={{ gap: `${Math.round(2.5 * scale)}px` }}
      {...rest}
    >
      {bars.map((bar, i) => (
        <span
          key={i}
          className={`rounded-t-sm ${i % 3 === 0 ? "bg-rush-deep/40" : "bg-rush/30"}`}
          style={{ height: bar.h * scale, width: Math.round(bar.w * scale) }}
        />
      ))}
    </div>
  );
}

/** Cable-stayed bridge silhouette (echo of the Lekki–Ikoyi bridge). */
function Bridge({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 220 130"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* deck */}
      <path d="M0 96 H220" strokeWidth="3" />
      {/* A-frame pylon */}
      <path d="M148 96 L158 14 M172 96 L162 14 M152 36 H168" strokeWidth="3" />
      {/* stay cables */}
      <path
        d="M160 16 L56 96 M160 16 L92 96 M160 16 L126 96 M160 16 L196 96 M160 16 L218 96"
        strokeWidth="1.5"
      />
      {/* piers */}
      <path d="M40 96 v18 M104 96 v18 M196 96 v18" strokeWidth="2" />
    </svg>
  );
}

/* ─── Section subcomponents ────────────────────────────────────────────── */

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="rounded-lg text-sm font-medium text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {children}
    </a>
  );
}

/**
 * OverviewCard — pastel marketplace card (SHOP/HIRE/RIDE/RUSH) with a real
 * in-page destination, so its arrow affordance is genuine.
 */
function OverviewCard({
  href,
  label,
  sub,
  card,
  children,
}: {
  href: string;
  label: string;
  sub: string;
  card: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className={`group flex min-h-[150px] flex-col rounded-3xl border border-border/70 p-4 shadow-card transition-all hover:-translate-y-1 hover:shadow-rush focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:p-5 ${card}`}
    >
      {children}
      <div className="mt-3.5 text-sm font-bold tracking-wide text-ink">{label}</div>
      <div className="text-sm text-ink-soft">{sub}</div>
      <span className="mt-auto flex h-9 w-9 items-center justify-center rounded-full bg-white text-rush-deep shadow-card transition-transform group-hover:translate-x-0.5">
        <ArrowRight className="h-4 w-4" aria-hidden />
      </span>
    </a>
  );
}

/**
 * ServiceCard — media-topped service card. The media area is a token-based
 * composition (the repo ships no photography) standing in for the
 * reference's photos; the CTA keeps its established auth-gate destination.
 */
function ServiceCard({
  anchorId,
  tone,
  tag,
  title,
  desc,
  cta,
  onClick,
}: {
  anchorId: string;
  tone: "shop" | "hire" | "ride";
  tag: string;
  title: string;
  desc: string;
  cta: string;
  onClick: () => void;
}) {
  const media =
    tone === "shop"
      ? "bg-gradient-to-br from-rush-soft to-card"
      : tone === "hire"
        ? "bg-gradient-to-br from-warning/25 to-card"
        : "bg-gradient-to-br from-success/25 to-card";
  const bigIcon =
    tone === "shop" ? "text-rush-deep" : tone === "hire" ? "text-ink" : "text-success";
  const chip =
    tone === "shop"
      ? "bg-rush-deep text-white"
      : tone === "hire"
        ? "bg-ink text-white"
        : "bg-success text-white";
  const Icon = tone === "shop" ? ShoppingBag : tone === "hire" ? Wrench : Car;

  return (
    <div
      id={anchorId}
      className="flex flex-col overflow-hidden rounded-3xl border border-border bg-background shadow-card transition-all hover:border-rush/40 hover:shadow-rush"
    >
      <div className={`relative flex h-36 items-center justify-center overflow-hidden sm:h-40 ${media}`}>
        <span
          aria-hidden
          className="absolute -left-8 -top-10 h-28 w-28 rounded-full bg-white/50 blur-2xl"
        />
        <span
          aria-hidden
          className="absolute -bottom-12 -right-6 h-32 w-32 rounded-full bg-white/60 blur-2xl"
        />
        <span
          aria-hidden
          className="relative flex h-24 w-24 items-center justify-center rounded-full border-[6px] border-white/40 bg-white/25"
        >
          <Icon className={`h-12 w-12 ${bigIcon}`} />
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${chip}`}>
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <span className="text-xs font-bold tracking-wide text-ink">{tag}</span>
        </div>
        <h3 className="mt-3 text-lg font-extrabold tracking-tight text-ink">{title}</h3>
        <p className="mt-1.5 flex-1 text-sm leading-relaxed text-ink-soft">{desc}</p>
        <button
          onClick={onClick}
          className="mt-4 inline-flex cursor-pointer items-center gap-1 self-start rounded text-sm font-bold text-rush-deep transition-all hover:gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {cta}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

/**
 * PhoneMockup — static illustration of the RUSH app (reference's phone
 * mockup). Entirely decorative: aria-hidden, pointer-events-none, plain
 * divs only (no interactive elements).
 */
function PhoneMockup() {
  const cats: { icon: LucideIcon; label: string }[] = [
    { icon: ShoppingBag, label: "Shop" },
    { icon: Wrench, label: "Hire" },
    { icon: Car, label: "Ride" },
    { icon: Truck, label: "Delivery" },
  ];
  const tabs: { icon: LucideIcon; label: string; active?: boolean }[] = [
    { icon: Home, label: "Home", active: true },
    { icon: Package, label: "Orders" },
    { icon: Wallet, label: "Wallet" },
    { icon: User, label: "Account" },
  ];

  return (
    <div
      aria-hidden
      className="pointer-events-none relative w-[240px] shrink-0 select-none"
    >
      {/* Decorative accent dashes around the device */}
      <span className="absolute -left-6 top-16 flex flex-col gap-1.5">
        <span className="block h-1 w-5 rotate-45 rounded-full bg-rush-deep" />
        <span className="block h-1 w-3.5 rotate-45 rounded-full bg-rush-deep/70" />
        <span className="block h-1 w-2.5 rotate-45 rounded-full bg-rush-deep/50" />
      </span>
      <span className="absolute -right-6 top-28 flex flex-col items-end gap-1.5">
        <span className="block h-1 w-5 -rotate-45 rounded-full bg-rush-deep" />
        <span className="block h-1 w-3.5 -rotate-45 rounded-full bg-rush-deep/70" />
        <span className="block h-1 w-2.5 -rotate-45 rounded-full bg-rush-deep/50" />
      </span>

      <div className="rounded-[2.25rem] border-[3px] border-ink bg-ink p-2.5 shadow-rush">
        <div className="overflow-hidden rounded-[1.75rem] bg-background">
          {/* Status bar */}
          <div className="flex items-center justify-between px-4 pt-2.5 text-[9px] font-bold text-ink-soft">
            <span>9:41</span>
            <span className="flex items-center gap-0.5">
              <span className="block h-2 w-1 rounded-sm bg-ink-soft" />
              <span className="block h-2.5 w-1 rounded-sm bg-ink-soft" />
              <span className="block h-3 w-1 rounded-sm bg-ink-soft" />
              <span className="ml-1 block h-2 w-4 rounded-sm border border-ink-soft" />
            </span>
          </div>

          {/* App header */}
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="flex items-center gap-1.5">
              <RushMark size={16} />
              <span className="text-[11px] font-extrabold text-ink">Rush</span>
            </span>
            <span className="h-5 w-5 rounded-full bg-rush-soft" />
          </div>

          {/* Pitch */}
          <p className="px-4 text-[12px] font-extrabold leading-snug text-ink">
            Shop. Hire. Ride.
            <br />
            Get it delivered.
          </p>

          {/* Search */}
          <div className="mx-4 mt-2.5 flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5">
            <Search className="h-3 w-3 text-ink-soft" />
            <span className="text-[9px] text-ink-soft">Search on RUSH…</span>
          </div>

          {/* Categories */}
          <div className="mt-3 grid grid-cols-4 gap-1 px-3">
            {cats.map((c) => (
              <div key={c.label} className="flex flex-col items-center gap-1">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rush-soft text-rush-deep">
                  <c.icon className="h-4 w-4" />
                </span>
                <span className="text-[8px] font-semibold text-ink-soft">{c.label}</span>
              </div>
            ))}
          </div>

          {/* Activity */}
          <div className="mx-3 mt-3 rounded-xl border border-border bg-card p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-ink">Your activity</span>
              <span className="text-[8px] font-bold text-rush-deep">View all</span>
            </div>
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-muted px-2 py-1.5">
              <span className="h-4 w-4 rounded-full bg-rush-soft" />
              <span className="text-[8px] text-ink-soft">No recent orders yet</span>
            </div>
          </div>

          {/* Bottom tab bar */}
          <div className="mt-3 grid grid-cols-4 border-t border-border bg-card px-1 py-2">
            {tabs.map((t) => (
              <div key={t.label} className="flex flex-col items-center gap-0.5">
                <t.icon
                  className={`h-3.5 w-3.5 ${t.active ? "text-rush-deep" : "text-ink-soft"}`}
                />
                <span
                  className={`text-[7px] ${t.active ? "font-bold text-rush-deep" : "text-ink-soft"}`}
                >
                  {t.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Journey stage pill (Morning / Afternoon / Evening / Later). */
function DayItem({
  icon: Icon,
  iconClass,
  tint,
  label,
  sub,
}: {
  icon: LucideIcon;
  iconClass: string;
  tint: string;
  label: string;
  sub: string;
}) {
  return (
    <div
      className={`flex flex-1 items-center gap-3 rounded-full border border-border/70 px-3 py-2.5 shadow-card ${tint}`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-card">
        <Icon className={`h-5 w-5 ${iconClass}`} aria-hidden />
      </span>
      <div className="min-w-0">
        <div className="text-sm font-extrabold text-ink">{label}</div>
        <div className="text-xs text-ink-soft">{sub}</div>
      </div>
    </div>
  );
}

/** Arrow between journey pills — down on mobile, right from sm up. */
function DayArrow() {
  return (
    <ArrowRight
      aria-hidden
      className="mx-auto h-5 w-5 shrink-0 rotate-90 text-ink-soft sm:mx-1 sm:rotate-0"
    />
  );
}

/** Bullet point (icon tile + title) in the business pitch. */
function PointItem({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rush-soft text-rush-deep">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="text-sm font-semibold text-ink">{title}</span>
    </div>
  );
}

/** Profession chip icon + label in the professionals card. */
function ProfessionItem({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card text-rush-deep shadow-card">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="text-sm font-semibold text-ink">{label}</span>
    </div>
  );
}

/** Checklist row in the Rush for Business card. */
function CheckRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-ink-soft">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rush-deep">
        <Check className="h-3 w-3 text-white" aria-hidden />
      </span>
      {label}
    </div>
  );
}

/** Stat cell (value + label) in the Rush for Business card. */
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-white/70 px-2 py-3 text-center">
      <div className="text-xl font-extrabold text-rush-deep">{value}</div>
      <div className="text-[11px] text-ink-soft">{label}</div>
    </div>
  );
}

/**
 * LagosScene — rounded panel standing in for the reference's Lagos
 * waterfront photo (no photography exists in the repo): sky wash,
 * skyline + bridge, water, LAGOS script. Decorative → aria-hidden.
 */
function LagosScene() {
  return (
    <div
      aria-hidden
      className="relative aspect-[16/9] overflow-hidden rounded-3xl border border-border bg-gradient-to-b from-rush-soft to-card shadow-card"
    >
      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-rush/15 to-transparent" />
      <Skyline className="absolute inset-x-0 bottom-5 justify-center" scale={1.15} />
      <Bridge className="absolute right-[6%] bottom-4 w-[42%] text-rush-deep/50" />
      <div className="absolute inset-x-0 bottom-0 h-5 bg-gradient-to-b from-rush-soft to-background" />
      <div className="absolute right-4 top-3 -rotate-6 text-rush-deep">
        <span className="text-sm font-extrabold italic tracking-[0.28em]">LAGOS</span>
        <span className="ml-0.5 inline-block align-super text-xs">✦</span>
      </div>
    </div>
  );
}

/**
 * Footer column. "Marketplace" entries map to real in-page sections (links);
 * Company / Legal have no destinations yet → plain text, not fake links.
 */
function FooterGroup({
  title,
  items,
}: {
  title: string;
  items: { label: string; href?: string }[];
}) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wider text-white/50">
        {title}
      </div>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.label}>
            {item.href ? (
              <a
                href={item.href}
                className="rounded text-sm text-white/70 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
              >
                {item.label}
              </a>
            ) : (
              <span className="text-sm text-white/60">{item.label}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
