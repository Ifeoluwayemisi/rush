"use client";

import type { HTMLAttributes } from "react";
import { useRush } from "@/lib/store";
import { RushLogo } from "@/components/RushLogo";
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
  ShieldCheck,
  BadgeCheck,
  LifeBuoy,
  type LucideIcon,
} from "lucide-react";

/**
 * LandingScreen — the marketing homepage shown to unauthenticated visitors.
 * Premium, Lagos-first, and aligned to the approved homepage reference.
 *
 * Structure (in order), mirroring the reference:
 *   1. Sticky navigation bar (logo, links, Log in, Get Started)
 *   2. Hero (headline, copy, CTAs, marketplace visual + floating labels)
 *   3. Marketplace overview — four cards (Shop / Hire / Ride / Delivery)
 *   4. Service cards with imagery-style headers and CTAs (Shop / Hire / Ride)
 *   5. Everyday-use journey
 *   6. Account + wallet feature (dark section)
 *   7. Business onboarding
 *   8. Professional registration
 *   9. Lagos skyline + trust indicators
 *  10. Full-width final CTA banner
 *  +  Structured dark footer
 *
 * Brand rules:
 *   - Uses ONLY the existing RUSH palette/tokens (`--rush`, `--rush-soft`,
 *     `--rush-deep`, `--ink`, `--background`, `--card`, `--border`). No new
 *     brand colours, no purple.
 *   - Primary CTAs use the `.cta-primary` utility (ink label on brand orange)
 *     so contrast passes WCAG AA without changing the brand hue. Large display
 *     text uses `text-rush-deep` for the same reason.
 *
 * Functional rules:
 *   - Auth-gated CTAs keep their existing destinations: `account`,
 *     `onboarding-vendor`, `onboarding-provider`. No destination changes.
 *   - Navigation links are real in-page anchors (valid destinations).
 *   - Footer entries are informational only (no valid destinations yet) and
 *     are therefore rendered as plain text — no fake links.
 *
 * No app chrome — rendered standalone in the landing branch of
 * `src/app/page.tsx` (no TopBar, no BottomNav).
 */
export function LandingScreen() {
  const navigate = useRush((s) => s.navigate);
  const goAccount = () => navigate("account");
  const goVendor = () => navigate("onboarding-vendor");
  const goProvider = () => navigate("onboarding-provider");

  return (
    <div className="relative flex min-h-screen scroll-smooth flex-col bg-background text-ink motion-reduce:scroll-auto">
      {/* ─── 1. Sticky Navbar ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <a
            href="#top"
            className="flex items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            aria-label="RUSH home"
          >
            <RushLogo size={36} clickable={false} />
            <span className="text-lg font-extrabold tracking-tight text-ink">
              rush
            </span>
          </a>

          {/* In-page navigation — anchors point at real sections below. */}
          <nav className="hidden items-center gap-8 md:flex" aria-label="Homepage sections">
            <a
              href="#shop"
              className="rounded text-sm font-medium text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Shop
            </a>
            <a
              href="#hire"
              className="rounded text-sm font-medium text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Hire
            </a>
            <a
              href="#ride"
              className="rounded text-sm font-medium text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Rides
            </a>
            <a
              href="#business"
              className="rounded text-sm font-medium text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              For Businesses
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={goAccount}
              className="rounded-full px-3 py-2 text-sm font-semibold text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:px-4"
            >
              Log in
            </button>
            <button
              onClick={goAccount}
              className="cta-primary px-4 py-2 text-sm sm:px-5"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="flex-1">
        {/* ─── 2. Hero ────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          {/* Ambient gradient blobs behind the hero (decorative) */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-20 -left-16 h-72 w-72 rounded-full bg-rush/30 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute top-40 -right-20 h-80 w-80 rounded-full bg-rush-deep/20 blur-3xl"
          />

          <div className="relative mx-auto grid max-w-5xl items-center gap-12 px-6 py-14 sm:py-20 lg:grid-cols-2 lg:gap-14 lg:py-24">
            {/* Left: copy */}
            <div className="flex flex-col items-start text-left animate-in fade-in slide-in-from-bottom-3 duration-700 motion-reduce:animate-none">
              <p className="text-xs font-bold uppercase tracking-wider text-rush-deep sm:text-sm">
                The everyday marketplace for Lagos
              </p>
              <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight text-ink sm:text-5xl">
                Everything you need.{" "}
                <span className="text-rush-deep">One RUSH.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
                Shop from local businesses. Hire trusted professionals. Book
                rides across Lagos. Get what you need delivered — all from one
                account.
              </p>

              <div className="mt-7 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <button
                  onClick={goAccount}
                  className="cta-primary px-6 py-3.5 text-sm"
                >
                  Get Started
                </button>
                <button
                  onClick={goAccount}
                  className="cta-secondary px-6 py-3.5 text-sm"
                >
                  Explore RUSH
                </button>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium text-ink-soft">
                <span>One account.</span>
                <span>One wallet.</span>
                <span>One trusted marketplace.</span>
              </div>
            </div>

            {/* Right: marketplace visual with floating category labels */}
            <div className="relative mx-auto flex w-full max-w-md items-center justify-center animate-in fade-in zoom-in-50 duration-700 motion-reduce:animate-none">
              <div
                aria-hidden
                className="absolute h-56 w-56 rounded-full bg-rush/30 blur-3xl sm:h-72 sm:w-72"
              />
              <div
                aria-hidden
                className="absolute h-40 w-40 translate-x-8 translate-y-8 rounded-full bg-rush-deep/25 blur-3xl sm:h-56 sm:w-56"
              />

              <div className="relative w-full rounded-[2rem] border border-border bg-card p-5 shadow-rush sm:p-6">
                <div className="flex items-center gap-3">
                  <RushLogo size={40} clickable={false} />
                  <div>
                    <div className="text-sm font-extrabold tracking-tight text-ink">
                      RUSH Marketplace
                    </div>
                    <div className="text-xs text-ink-soft">
                      Shop · Hire · Ride · Delivery
                    </div>
                  </div>
                </div>

                <div className="relative mt-5 flex h-52 items-end justify-center overflow-hidden rounded-2xl bg-rush-soft/60 sm:h-60">
                  <div className="absolute inset-x-0 top-6 flex justify-center">
                    <RushLogo size={96} clickable={false} />
                  </div>
                  <Skyline className="justify-center" />
                </div>
              </div>

              {/* Floating labels matching the reference composition */}
              <FloatPill
                icon={ShoppingBag}
                label="Shop"
                className="-left-2 top-8 sm:-left-5"
              />
              <FloatPill
                icon={Wrench}
                label="Hire"
                className="-right-2 top-20 sm:-right-5"
              />
              <FloatPill
                icon={Car}
                label="Ride"
                className="-left-2 bottom-24 sm:-left-4"
              />
              <FloatPill
                icon={Truck}
                label="Delivery"
                className="-right-2 bottom-10 sm:-right-4"
              />
            </div>
          </div>
        </section>

        {/* ─── 3. Marketplace overview — four cards ───────────────────── */}
        <section
          id="marketplace"
          className="mx-auto max-w-5xl scroll-mt-24 px-6 py-12 text-center sm:py-20"
        >
          <h2 className="text-3xl font-extrabold tracking-tight text-ink animate-in fade-in slide-in-from-bottom-2 duration-700 motion-reduce:animate-none sm:text-4xl">
            One app. More ways to get things done.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-ink-soft sm:text-lg">
            RUSH brings shopping, services, delivery, and rides together in one
            marketplace built for everyday life.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <OverviewCard
              icon={ShoppingBag}
              tag="SHOP"
              title="Find it. Order it. Get it."
            />
            <OverviewCard
              icon={Wrench}
              tag="HIRE"
              title="Need it done? Find someone."
            />
            <OverviewCard
              icon={Car}
              tag="RIDE"
              title="Need to move? RUSH."
            />
            <OverviewCard
              icon={Truck}
              tag="DELIVERY"
              title="Get it delivered."
            />
          </div>
        </section>

        {/* ─── 4. Service cards — imagery headers + CTAs ──────────────── */}
        <section id="services" className="scroll-mt-24">
          <div className="mx-auto max-w-5xl px-6 py-12 sm:py-20">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
                Whatever you need, RUSH.
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-base text-ink-soft">
                Shop, hire, ride, or get it delivered — pick one or use them
                all.
              </p>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              <ServiceCard
                anchorId="shop"
                tone="soft"
                icon={ShoppingBag}
                tag="SHOP"
                title="Find it. Order it. Get it."
                desc="Discover products from local businesses and have them delivered to you."
                cta="Shop on RUSH"
                onClick={goAccount}
              />
              <ServiceCard
                anchorId="hire"
                tone="ink"
                icon={Wrench}
                tag="HIRE"
                title="Need it done? Find someone."
                desc="Connect with trusted professionals offering services around you."
                cta="Find a Pro"
                onClick={goAccount}
              />
              <ServiceCard
                anchorId="ride"
                tone="gradient"
                icon={Car}
                tag="RIDE"
                title="Need to move? RUSH."
                desc="Book a ride and get where you're going."
                cta="Book a Ride"
                onClick={goAccount}
              />
            </div>
          </div>
        </section>

        {/* ─── 5. Built around your day ───────────────────────────────── */}
        <section
          id="journey"
          className="mx-auto max-w-5xl scroll-mt-24 px-6 py-12 text-center sm:py-20"
        >
          <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            One place for the things you do every day.
          </h2>

          <div className="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:items-stretch">
            <DayItem icon={Coffee} label="Morning" sub="Order breakfast" />
            <DayArrow />
            <DayItem icon={Wrench} label="Afternoon" sub="Book a pro" />
            <DayArrow />
            <DayItem icon={ShoppingBag} label="Evening" sub="Shop & deliver" />
            <DayArrow />
            <DayItem icon={Car} label="Later" sub="Ride home" />
          </div>

          <p className="mx-auto mt-10 max-w-2xl text-base leading-relaxed text-ink-soft sm:text-lg">
            From your first order to your last ride, RUSH keeps everything
            connected.
          </p>
        </section>

        {/* ─── 6. One Account / One Wallet (dark) ─────────────────────── */}
        <section className="bg-ink text-white">
          <div className="mx-auto max-w-5xl px-6 py-16 text-center sm:py-24">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              One account. One wallet. One trusted marketplace.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">
              No jumping between different apps. Your purchases, services,
              rides, payments, and activity live together in RUSH.
            </p>

            {/* Diagram: RUSH ACCOUNT → SHOP/HIRE/RIDE → RUSH WALLET */}
            <div className="mt-12 flex flex-col items-center gap-6">
              <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-6 py-4 backdrop-blur-sm">
                <RushLogo size={36} clickable={false} />
                <div className="text-left">
                  <div className="text-sm font-bold uppercase tracking-wider text-rush">
                    Rush Account
                  </div>
                  <div className="text-xs text-white/75">Sign in once</div>
                </div>
              </div>

              <ArrowDown />

              <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
                <PillarPill icon={ShoppingBag} label="SHOP" />
                <PillarPill icon={Wrench} label="HIRE" />
                <PillarPill icon={Car} label="RIDE" />
              </div>

              <ArrowDown />

              <div className="flex items-center gap-3 rounded-2xl bg-rush-deep px-6 py-4 shadow-rush">
                <Wallet className="h-6 w-6 text-white" aria-hidden />
                <div className="text-left">
                  <div className="text-sm font-bold uppercase tracking-wider">
                    Rush Wallet
                  </div>
                  <div className="text-xs text-white/85">
                    One balance for everything
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 7. Seller / Business Section ───────────────────────────── */}
        <section
          id="business"
          className="mx-auto max-w-5xl scroll-mt-24 px-6 py-14 sm:py-20"
        >
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="inline-block rounded-full bg-rush-soft px-3 py-1 text-xs font-bold uppercase tracking-wider text-rush-deep">
                For Businesses
              </span>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
                Your business deserves to be found.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-ink-soft sm:text-lg">
                Join RUSH for free. List your products. We only make money when
                you make money.
              </p>

              <div className="mt-6 flex flex-col gap-3">
                <PointItem icon={Store} title="Open your store" />
                <PointItem icon={MapPin} title="Reach customers" />
                <PointItem icon={TrendingUp} title="Grow your sales" />
              </div>

              <button
                onClick={goVendor}
                className="cta-primary mt-7 px-6 py-3.5 text-sm"
              >
                Join RUSH as a Business
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            </div>

            {/* Visual card */}
            <div className="relative">
              <div
                aria-hidden
                className="absolute inset-0 -z-10 rounded-3xl bg-rush-soft opacity-60 blur-2xl"
              />
              <div className="rounded-3xl border border-border bg-card p-8 shadow-card">
                <div className="flex items-center gap-3">
                  <RushLogo size={48} clickable={false} />
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-rush-deep">
                      Rush for Business
                    </div>
                    <div className="text-lg font-extrabold text-ink">
                      Free to start
                    </div>
                  </div>
                </div>
                <div className="mt-6 space-y-3">
                  <CheckRow label="No setup fees" />
                  <CheckRow label="List unlimited products" />
                  <CheckRow label="We only earn when you earn" />
                </div>
                <div className="mt-6 grid grid-cols-3 gap-2 text-center">
                  <Stat label="Free" sub="to join" />
                  <Stat label="0%" sub="setup fee" />
                  <Stat label="1" sub="account" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 8. Professional Section ────────────────────────────────── */}
        <section id="professionals" className="scroll-mt-24 bg-rush-soft/40">
          <div className="mx-auto max-w-5xl px-6 py-14 sm:py-20">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
              {/* Visual card — second on mobile, first (left) on desktop */}
              <div className="order-2 lg:order-1">
                <div className="rounded-3xl border border-border bg-card p-8 shadow-card">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rush-soft"
                    aria-hidden
                  >
                    <Wrench className="h-7 w-7 text-rush-deep" />
                  </div>
                  <div className="mt-4 text-2xl font-extrabold text-ink">
                    Your skills, in demand
                  </div>
                  <div className="mt-2 text-sm text-ink-soft">
                    List your service. Get booked. Get paid.
                  </div>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {[
                      "Technician",
                      "Cleaner",
                      "Stylist",
                      "Designer",
                      "Repairer",
                      "Specialist",
                    ].map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-rush-soft px-3 py-1 text-xs font-semibold text-rush-deep"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Copy — first on mobile, second (right) on desktop */}
              <div className="order-1 lg:order-2">
                <span className="inline-block rounded-full bg-rush-soft px-3 py-1 text-xs font-bold uppercase tracking-wider text-rush-deep">
                  For Professionals
                </span>
                <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
                  Your skills can take you further.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-ink-soft sm:text-lg">
                  Whether you're a technician, cleaner, stylist, designer,
                  repairer, or specialist, RUSH helps you connect with people
                  who need what you do.
                </p>

                <button
                  onClick={goProvider}
                  className="cta-primary mt-7 px-6 py-3.5 text-sm"
                >
                  Become a RUSH Pro
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 9. Lagos + Trust ───────────────────────────────────────── */}
        <section
          id="trust"
          className="relative scroll-mt-24 overflow-hidden"
        >
          <div className="mx-auto max-w-5xl px-6 py-14 text-center sm:py-20">
            <Skyline
              className="mb-8 justify-center opacity-90"
              aria-hidden
            />
            <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
              Built for Lagos. Made for everyday life.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-ink-soft sm:text-lg">
              Lagos moves fast. RUSH is built to help you keep up — connecting
              you to local businesses, trusted professionals, delivery, and
              rides in one place.
            </p>

            <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <TrustBadge icon={Store} label="Trusted businesses" />
              <TrustBadge icon={BadgeCheck} label="Verified professionals" />
              <TrustBadge icon={ShieldCheck} label="Secure payments" />
              <TrustBadge icon={LifeBuoy} label="Support when you need it" />
            </div>

            <p className="mt-10 text-base font-semibold text-ink sm:text-lg">
              Your trust is what makes RUSH work.
            </p>
          </div>
        </section>

        {/* ─── 10. Final CTA (full-width banner) ──────────────────────── */}
        <section className="relative overflow-hidden border-y border-border bg-gradient-to-b from-rush-soft/70 via-background to-background">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-20 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-rush/25 blur-3xl"
          />
          <div className="relative mx-auto max-w-3xl px-6 py-20 text-center sm:py-28">
            <div className="flex justify-center animate-in fade-in zoom-in-50 duration-700 motion-reduce:animate-none">
              <div className="rounded-3xl border border-rush/20 bg-card p-5 shadow-rush">
                <RushLogo size={96} clickable={false} />
              </div>
            </div>

            <h2 className="mt-8 text-4xl font-extrabold tracking-tight text-ink animate-in fade-in slide-in-from-bottom-2 duration-700 motion-reduce:animate-none sm:text-6xl">
              Whatever you need, just RUSH.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-ink-soft sm:text-xl">
              Shop it. Hire it. Ride it. Get it delivered.
            </p>

            <button
              onClick={goAccount}
              className="cta-primary mt-9 px-10 py-4 text-base animate-in fade-in slide-in-from-bottom-2 duration-700 delay-75 motion-reduce:animate-none"
            >
              Get Started
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>

            <p className="mt-6 text-sm font-medium text-ink-soft">
              One account. One wallet. Everything you need.
            </p>
          </div>
        </section>
      </main>

      {/* ─── Footer (dark) ───────────────────────────────────────────── */}
      <footer className="bg-ink text-white">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <div className="flex flex-col items-start gap-3">
              <div className="flex items-center gap-2">
                <RushLogo size={32} clickable={false} />
                <span className="text-lg font-extrabold tracking-tight text-white">
                  rush
                </span>
              </div>
              <p className="max-w-xs text-sm text-white/70">
                Everything you need. One RUSH.
              </p>
            </div>

            <FooterGroup
              title="Marketplace"
              items={["Shop", "Hire", "Rides", "Delivery"]}
            />
            <FooterGroup title="Company" items={["About", "Help", "Contact"]} />
            <FooterGroup title="Legal" items={["Terms", "Privacy"]} />
          </div>

          <div className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} RUSH</span>
            <span>One account. One wallet. Everything you need.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── Subcomponents ──────────────────────────────────────────────────── */

/**
 * Skyline — a decorative, token-coloured skyline silhouette used behind the
 * hero visual and above the trust section to evoke Lagos. Purely aesthetic;
 * hidden from assistive tech by the parent `aria-hidden` where applicable.
 */
function Skyline({
  className = "",
  ...rest
}: { className?: string } & HTMLAttributes<HTMLDivElement>) {
  const bars = [14, 22, 30, 18, 38, 26, 44, 20, 32, 16, 28, 36, 24, 40, 18, 30, 22, 34, 26, 20];
  return (
    <div
      aria-hidden
      className={`flex items-end gap-1 ${className}`}
      {...rest}
    >
      {bars.map((h, i) => (
        <span
          key={i}
          className={`w-2 rounded-t-sm sm:w-2.5 ${
            i % 3 === 0 ? "bg-rush/30" : "bg-rush-deep/20"
          }`}
          style={{ height: h }}
        />
      ))}
    </div>
  );
}

/** A floating category label over the hero visual (Shop / Hire / Ride / Delivery). */
function FloatPill({
  icon: Icon,
  label,
  className = "",
}: {
  icon: LucideIcon;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={`absolute z-10 flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold text-ink shadow-card animate-in fade-in zoom-in-50 duration-700 motion-reduce:animate-none ${className}`}
    >
      <Icon className="h-3.5 w-3.5 text-rush-deep" aria-hidden />
      {label}
    </div>
  );
}

/** A marketplace overview card (Shop / Hire / Ride / Delivery). */
function OverviewCard({
  icon: Icon,
  tag,
  title,
}: {
  icon: LucideIcon;
  tag: string;
  title: string;
}) {
  return (
    <div className="flex flex-col items-start rounded-3xl border border-border bg-card p-5 text-left shadow-card transition-all hover:border-rush/40 hover:shadow-rush sm:p-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rush-soft">
        <Icon className="h-6 w-6 text-rush-deep" aria-hidden />
      </div>
      <div className="mt-4 text-xs font-bold uppercase tracking-wider text-rush-deep">
        {tag}
      </div>
      <h3 className="mt-1 text-lg font-extrabold tracking-tight text-ink">
        {title}
      </h3>
    </div>
  );
}

/** A service card with an imagery-style header (token-composed) and a CTA. */
function ServiceCard({
  anchorId,
  tone,
  icon: Icon,
  tag,
  title,
  desc,
  cta,
  onClick,
}: {
  anchorId: string;
  tone: "soft" | "ink" | "gradient";
  icon: LucideIcon;
  tag: string;
  title: string;
  desc: string;
  cta: string;
  onClick: () => void;
}) {
  const header =
    tone === "soft"
      ? "bg-rush-soft"
      : tone === "ink"
        ? "bg-ink"
        : "rush-gradient";
  const iconColor =
    tone === "ink" ? "text-rush" : tone === "gradient" ? "text-ink" : "text-rush-deep";

  return (
    <div
      id={anchorId}
      className="group flex scroll-mt-24 flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-card transition-all hover:border-rush/40 hover:shadow-rush"
    >
      {/* Imagery-style header — token composition standing in for photography */}
      <div
        className={`relative flex h-40 items-center justify-center overflow-hidden ${header}`}
      >
        <div
          aria-hidden
          className="absolute -left-6 -top-8 h-24 w-24 rounded-full bg-white/20 blur-2xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-10 -right-4 h-28 w-28 rounded-full bg-white/15 blur-2xl"
        />
        <Icon className={`relative h-16 w-16 ${iconColor}`} aria-hidden />
      </div>

      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <div className="text-xs font-bold uppercase tracking-wider text-rush-deep">
          {tag}
        </div>
        <h3 className="mt-1 text-xl font-extrabold tracking-tight text-ink">
          {title}
        </h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">
          {desc}
        </p>
        <button
          onClick={onClick}
          className="mt-5 inline-flex items-center gap-1 self-start rounded text-sm font-bold text-rush-deep transition-all hover:gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {cta}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

/** A day-stage card (Morning / Afternoon / Evening / Later). */
function DayItem({
  icon: Icon,
  label,
  sub,
}: {
  icon: LucideIcon;
  label: string;
  sub: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-4 py-5 text-center shadow-card sm:flex-1">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rush-soft">
        <Icon className="h-5 w-5 text-rush-deep" aria-hidden />
      </div>
      <div>
        <div className="text-sm font-extrabold tracking-tight text-ink">
          {label}
        </div>
        <div className="text-xs text-ink-soft">{sub}</div>
      </div>
    </div>
  );
}

/** Arrow between day items — down on mobile, right on desktop. */
function DayArrow() {
  return (
    <ArrowRight
      aria-hidden
      className="h-6 w-6 shrink-0 self-center text-rush-deep rotate-90 sm:rotate-0"
    />
  );
}

/** Downward arrow between the dark-section diagram steps. */
function ArrowDown() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-6 w-6 text-white/40"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14M19 12l-7 7-7-7" />
    </svg>
  );
}

/** A small pill (SHOP / HIRE / RIDE) inside the dark-section diagram. */
function PillarPill({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-4 backdrop-blur-sm">
      <Icon className="h-5 w-5 text-rush" aria-hidden />
      <span className="text-sm font-bold tracking-tight">{label}</span>
    </div>
  );
}

/** A bullet point (icon + title) in the Seller section. */
function PointItem({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rush-soft">
        <Icon className="h-5 w-5 text-rush-deep" aria-hidden />
      </div>
      <div className="text-sm font-bold text-ink">{title}</div>
    </div>
  );
}

/** A checkmark row used inside the seller visual card. */
function CheckRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-ink-soft">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rush-deep">
        <Check className="h-3 w-3 text-white" aria-hidden />
      </span>
      {label}
    </div>
  );
}

/** A small stat tile (label + sub) inside the seller visual card. */
function Stat({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="rounded-2xl bg-rush-soft/60 px-2 py-3">
      <div className="text-lg font-extrabold text-rush-deep">{label}</div>
      <div className="text-xs text-ink-soft">{sub}</div>
    </div>
  );
}

/** A trust badge in section 9. */
function TrustBadge({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-3.5 shadow-card">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rush-deep">
        <Icon className="h-3.5 w-3.5 text-white" aria-hidden />
      </span>
      <span className="text-sm font-semibold text-ink">{label}</span>
    </div>
  );
}

/**
 * A footer column. Entries have no valid in-app destinations yet, so they are
 * rendered as plain informational text — not fake links.
 */
function FooterGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wider text-white/50">
        {title}
      </div>
      <ul className="mt-3 space-y-2">
        {items.map((l) => (
          <li key={l} className="text-sm text-white/70">
            {l}
          </li>
        ))}
      </ul>
    </div>
  );
}
