# Rush — Multi-Capability Marketplace

A real, working full-stack Next.js 16 app for shopping from local vendors, hiring service providers, and booking rides. One account, multiple capabilities.

> Built around the mental model: **Jiji's clarity for browsing and selling + Chowdeck's simplicity for ordering and fulfilment + Rush's multi-service ecosystem.**

## Quick start

```bash
# 1. Install dependencies
bun install

# 2. Configure environment variables (see DEPLOYMENT.md for the full list)
#    At minimum you need:
#      MONGODB_URI   — MongoDB Atlas connection string
#      JWT_SECRET    — 32+ char random string (`openssl rand -hex 32`)
cp -n .env.example .env.local   # if .env.example exists, otherwise create one

# 3. (Optional) Verify MongoDB connectivity + pre-create indexes
bun run db:init-mongo

# 4. Run the dev server
bun run dev
```

Open `http://localhost:3000`.

> **Required env vars.** `MONGODB_URI` and `JWT_SECRET` are required — the server refuses to boot without them. There is no hardcoded fallback; missing secrets throw a clear error at first request rather than silently degrading security. See `DEPLOYMENT.md` for the full environment table.

## Tech stack

- **Framework**: Next.js 16 (App Router) + TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui (New York) + Lucide icons
- **Database**: MongoDB Atlas via the `mongodb` Node driver. The data layer in `src/lib/db.ts` exposes a Prisma-shaped API (`findUnique`, `findMany`, `create`, `update`, `upsert`, `updateMany`, `createMany`, `count`, `_count` include, `$transaction` compatibility shim) so call sites read like Prisma Client code without a Prisma dependency. Indexes are created automatically on first request via `ensureIndexes()`.
- **Auth**: Firebase (Google Sign-In) as primary, bcryptjs (cost factor 12) + jose (JWT, HS256) + HTTP-only cookies as fallback when Firebase isn't configured. Sessions are 30 days, `HttpOnly`, `Secure` in production, `SameSite=lax`.
- **Payments**: Paystack (NGN cards / bank transfer / USSD). A mock-payment mode auto-succeeds every verify call **in development only**; in production, a missing `PAYSTACK_SECRET_KEY` throws — the server refuses to silently mark orders as paid.
- **Email**: Resend with MongoDB-backed idempotency keys, retry, and a delivery log.
- **Server state**: TanStack Query v5
- **Client state**: Zustand
- **PWA**: installable, offline-capable via `@ducanh2912/next-pwa`
- **Package manager**: Bun (recommended) — also works with npm/pnpm

## What's inside

### Multi-capability architecture

One `User` can hold any combination of:
- `CUSTOMER` — buy products, hire services, book rides
- `VENDOR` — run a store, sell products
- `SERVICE_PROVIDER` — offer services, quote on jobs
- `RIDER` — deliver products, transport passengers

Capabilities are stored as a JSON array on `User.capabilities` with per-capability status:
`ACTIVE` | `PENDING_VERIFICATION` | `SUSPENDED`.

The UI keeps the multi-capability system **invisible** until the user taps **Sell** in the bottom nav. From there they can onboard into any of the three earning capabilities.

### Project structure

```
src/
  app/
    api/                     # All REST API routes
      auth/{login,logout,me,register,firebase}/route.ts
      products/[id]/route.ts
      stores/[slug]/route.ts
      orders/[id]/route.ts
      providers/[slug]/route.ts
      onboarding/{vendor,provider,rider}/route.ts
      rides/[id]/route.ts
      rider-jobs/[id]/route.ts
      payments/{initiate,verify,webhook}/route.ts
      admin/{users,vendors,providers,riders,products,orders,rides,service-jobs,stats,system}/route.ts
    globals.css              # Rush brand design system (orange, ink, warm surface)
    layout.tsx
    page.tsx                 # Client-side view router
  components/
    layout/                  # TopBar, BottomNav, DesktopSideNav
    screens/                 # 20 screens (Home, Shop, Product, Cart, Checkout, etc.)
    onboarding/              # Vendor/Provider/Rider onboarding flows
    shared/                  # ProductCard, VendorCard, EmptyState
    ui/                      # shadcn/ui primitives
    AuthHydrator.tsx         # Syncs useMe() into Zustand
    QueryProvider.tsx
  lib/
    api-client.ts            # fetch wrapper with credentials + error handling
    auth.ts                  # bcrypt + JWT + cookie helpers (requireUser, requireAdmin)
    db.ts                    # MongoDB data layer with Prisma-shaped API
    db-backend.ts            # DB backend detection (MongoDB-only)
    hooks.ts                 # All TanStack Query hooks
    store.ts                 # Zustand store (view router, cart, toasts)
    types.ts                 # All TypeScript domain types
    errors.ts                # Centralized error → friendly message mapping
    payments/{provider,paystack}.ts   # Paystack + mock provider
    email/                   # Resend client + templates + send pipeline
    auth-providers/          # Firebase client + admin + Google OAuth
scripts/
  init-mongodb.ts            # Verifies connectivity + pre-creates indexes
  capture-screens.{py,sh}    # Screenshot helper (platform-internal)
  gen-pwa-icons.mjs          # Regenerates PWA icons from source.svg
tests/
  fixtures/seed-data.ts     # Sample data for ad-hoc demos (not wired to a
                            # seed script — see "Demo data" below)
```

### The 20 screens

| Screen | Purpose |
|--------|---------|
| **Home** | 3 primary actions (Shop / Services / Rides) + Popular near you + Top stores + Service providers |
| **Explore** | Browse all categories + all stores |
| **Shop** | Jiji-style category chips + 2-col product grid with search |
| **Product Detail** | Image carousel + vendor link + quantity selector + Add to cart / Buy now |
| **Cart** | Grouped by vendor + quantity steppers |
| **Checkout** | Delivery/Pickup + 4 payment methods + order summary |
| **Order Tracking** | Live status banner + rider card + timeline (auto-refreshes every 5s) |
| **Vendor Storefront** | Mini-site with cover/logo/CTAs + Products/About/Reviews tabs |
| **Services** | Category chips + provider cards with cover, rating, starting price |
| **Provider Profile** | Cover + services list with Request buttons + portfolio |
| **Ride Booking** | Uber-style map + pickup/destination + 4 ride types (Bike/Car/Keke/Van) |
| **Ride Tracking** | Live map + rider card + trip details + share safety |
| **Sell / Earn Hub** | Active businesses + 3 capability cards (gateway to multi-capability) |
| **Vendor Dashboard** | Store banner + stats + recent orders + product list |
| **Provider Dashboard** | Verification status + open jobs + services list |
| **Rider Dashboard** | Pending verification gate + mobility capabilities + vehicle |
| **Account** | Consumer view + My Businesses + wallet/settings + sign out |
| **Activity** | Orders / Services / Rides tabs with history |
| **Search** | Trending + recent + live results across products/stores/providers |
| **Auth** | Combined login/register with brand header + Google sign-in |

### Bottom navigation

```
Home | Explore | [+ Sell] | Activity | Account
```

The center **Sell** button is the prominent gateway to multi-capability onboarding.

## Database schema

The collections live in MongoDB and are defined in `src/lib/db.ts` (see the `MODELS` constant and `ensureIndexes()`):

- `users` — single account, holds capabilities JSON
- `vendor_profiles` — store, slug, visibility (PUBLIC / LINK_ONLY / PRIVATE)
- `products` — belongs to vendor
- `providers` — service business, has many `services`
- `services` — service offered by a provider
- `service_jobs` — customer-posted job (OPEN / QUOTED / ASSIGNED / etc.)
- `orders` — products order with timeline JSON
- `rider_profiles` — rider with PENDING_VERIFICATION / ACTIVE status
- `vehicles` — registered to a rider
- `rides` — passenger ride
- `rider_jobs` — per-rider offer/accept state (OFFERED → ACCEPTED → IN_PROGRESS → COMPLETED/CANCELLED)
- `wallets` + `wallet_ledger_entries` — Rush Wallet for escrow / payouts
- `payments` — Paystack transaction records (reference, amount, status, providerResponse)
- `email_deliveries` — per-email delivery log for idempotency

## API routes

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/auth/register` | Create account, set session cookie |
| POST | `/api/auth/login` | Verify password, set session cookie |
| POST | `/api/auth/logout` | Clear session cookie |
| GET | `/api/auth/me` | Current authenticated user (or null) |
| POST | `/api/auth/firebase` | Exchange Firebase ID token for a RUSH session cookie |
| GET | `/api/products` | List products (filter by category, q, vendorId) |
| GET | `/api/products/:id` | Single product with vendor |
| GET | `/api/stores` | List vendors (filter by visibility) |
| GET | `/api/stores/:slug` | Single vendor with products (PRIVATE stores excluded) |
| GET | `/api/providers` | List providers (filter by category, q) |
| GET | `/api/providers/:slug` | Single provider with services |
| POST | `/api/orders` | Create order (server-authoritative pricing, stock-checked) |
| GET | `/api/orders` | Current user's orders (capped at 50) |
| GET | `/api/orders/:id` | Single order with vendor + rider (3-way owner check) |
| PATCH | `/api/orders/:id` | Update status, push timeline step |
| POST | `/api/onboarding/vendor` | Create VendorProfile + add VENDOR capability |
| POST | `/api/onboarding/provider` | Create Provider + add SERVICE_PROVIDER capability |
| POST | `/api/onboarding/rider` | Create RiderProfile + Vehicle + add RIDER capability |
| GET | `/api/rides` | Current user's rides (capped at 50) |
| POST | `/api/rides` | Request a ride (requires auth) |
| GET | `/api/rides/:id` | Single ride with rider + vehicle |
| GET | `/api/rider-jobs` | Rider's job queue (capped at 50, polled every 8s) |
| PATCH | `/api/rider-jobs/:id` | ACCEPT / DECLINE / ADVANCE a job (atomic with $transaction) |
| GET | `/api/service-jobs` | List service jobs |
| PATCH | `/api/service-jobs/:id` | Update service job |
| POST | `/api/payments/initiate` | Initiate Paystack transaction for an order |
| POST | `/api/payments/verify` | Verify Paystack transaction + re-check amount + advance order |
| POST | `/api/payments/webhook` | Paystack webhook (HMAC-verified, defense-in-depth verify) |
| GET | `/api/riders/available` | List active riders |
| GET/PATCH | `/api/riders/me` | Current rider's profile / go online-offline |
| GET | `/api/health` | Real health check: MongoDB ping + latency |
| GET/POST/PATCH | `/api/admin/*` | Admin-only: users, vendors, providers, riders, products, orders, rides, service-jobs, stats, system |

## What's intentionally stubbed

These are operational flows that need business-logic decisions:

- **Order status progression** — orders start in `PLACED` but the timeline doesn't auto-advance (no vendor acceptance / rider assignment logic yet)
- **Rider auto-assignment** — orders don't get a rider assigned automatically
- **Wallet debit on order** — placing an order with `paymentMethod: "WALLET"` does not yet deduct from the wallet (see `TODO` in `CheckoutScreen.tsx`)
- **Ride matching** — requested rides are broadcast to up to 8 eligible riders; first-to-accept wins via an atomic `$transaction`-guarded flip
- **Image uploads** — currently using Unsplash URLs. Real product/logo uploads would need S3-compatible storage
- **Real-time updates** — order/ride tracking polls every 5s. WebSocket would be cleaner

## Demo data

There is **no seed script wired to `bun run`**. A fixture module exists at `tests/fixtures/seed-data.ts` for ad-hoc demos and manual testing; if you want to populate a fresh DB, import the symbols from that file in a one-off script.

To wipe the database:
```bash
# Drop all collections via the mongo shell, or just delete the cluster
# in the Atlas UI. There's no `bun run db:reset` yet.
```

## Local development

```bash
bun install
bun run dev
```

You can also run `bun run db:init-mongo` once to verify the connection and pre-create indexes:
```bash
MONGODB_URI=mongodb://localhost:27017 bun run scripts/init-mongodb.ts
```

## Bootstrapping the first admin

The first admin can't be created via the API — every admin-mutation endpoint requires an existing admin to call it. There's a bootstrap script for that:

```bash
# After the user has registered via the sign-in screen:
bun run db:admin rush4service@gmail.com
```

The script auto-loads `.env.local` and `.env` from the project root, so you just need `MONGODB_URI` set there. It looks up the user by email (case-insensitive), parses their capabilities JSON, adds `{ type: "ADMIN", status: "ACTIVE" }` if not already present, and persists back to the user record. Idempotent — running twice is a no-op the second time. If the user doesn't exist yet, the script tells you to register first.

After promotion, sign in at `/account` — the Admin Panel tab will appear.

Note: the script runs under Node (via the `db:admin` package.json alias) because Bun has an incompatibility with bson v7's `node:v8` startup-snapshot call. This only affects the script runner — `bun run dev` and `bun run build` work normally.

## License

MIT — build, fork, ship.
