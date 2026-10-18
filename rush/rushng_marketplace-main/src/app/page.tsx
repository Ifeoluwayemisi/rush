"use client";

import { useRush } from "@/lib/store";
import { useMe } from "@/lib/hooks";
import { AuthHydrator } from "@/components/AuthHydrator";
import { PaymentReturnHandler } from "@/components/PaymentReturnHandler";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { DesktopSideNav } from "@/components/layout/DesktopSideNav";
import { CONTENT_WIDTH } from "@/lib/layout";
import { HomeScreen } from "@/components/screens/HomeScreen";
import { ExploreScreen } from "@/components/screens/ExploreScreen";
import { ShopScreen } from "@/components/screens/ShopScreen";
import { ProductScreen } from "@/components/screens/ProductScreen";
import { CartScreen } from "@/components/screens/CartScreen";
import { CheckoutScreen } from "@/components/screens/CheckoutScreen";
import { OrderTrackingScreen } from "@/components/screens/OrderTrackingScreen";
import { ServiceJobTrackingScreen } from "@/components/screens/ServiceJobTrackingScreen";
import { StoreScreen } from "@/components/screens/StoreScreen";
import { ServicesScreen } from "@/components/screens/ServicesScreen";
import { SavedItemsScreen } from "@/components/screens/SavedItemsScreen";
import { ProviderScreen } from "@/components/screens/ProviderScreen";
import { RideScreen, RideTrackingScreen } from "@/components/screens/RideScreen";
import { SellScreen } from "@/components/screens/SellScreen";
import { VendorDashboard } from "@/components/screens/VendorDashboard";
import { ProviderDashboard } from "@/components/screens/ProviderDashboard";
import { RiderDashboard } from "@/components/screens/RiderDashboard";
import { AccountScreen } from "@/components/screens/AccountScreen";
import { ActivityScreen } from "@/components/screens/ActivityScreen";
import { SearchScreen } from "@/components/screens/SearchScreen";
import { AuthScreen } from "@/components/screens/AuthScreen";
import {
  OnboardingVendorScreen,
  OnboardingProviderScreen,
  OnboardingRiderScreen,
} from "@/components/onboarding/OnboardingFlows";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { LandingScreen } from "@/components/screens/LandingScreen";

// Screens that should NOT show the global TopBar (they have their own header)
const HIDE_TOPBAR: string[] = [
  "product",
  "cart",
  "checkout",
  "order-tracking",
  "service-job-tracking",
  "store",
  "provider",
  "ride",
  "ride-tracking",
  "vendor-dashboard",
  "provider-dashboard",
  "rider-dashboard",
  "onboarding-vendor",
  "onboarding-provider",
  "onboarding-rider",
  "search",
  "admin",
  "admin-users",
  "admin-verifications",
  "admin-marketplace",
  "admin-operations",
];

// Screens where the TopBar IS shown but the search input + location row
// should be suppressed (dashboard-style screens where the user is
// managing their own stuff rather than browsing the marketplace).
const HIDE_SEARCHBAR: string[] = ["sell", "activity", "account", "saved-items"];

// Screens that should NOT show the bottom nav (immersive flows)
const HIDE_BOTTOMNAV: string[] = [
  "product",
  "cart",
  "checkout",
  "ride",
  "ride-tracking",
  "onboarding-vendor",
  "onboarding-provider",
  "onboarding-rider",
  "search",
  "admin",
  "admin-users",
  "admin-verifications",
  "admin-marketplace",
  "admin-operations",
];

// Screens that REQUIRE authentication
const PROTECTED: string[] = [
  "cart",
  "checkout",
  "order-tracking",
  "service-job-tracking",
  "sell",
  "vendor-dashboard",
  "provider-dashboard",
  "rider-dashboard",
  "account",
  "activity",
  "onboarding-vendor",
  "onboarding-provider",
  "onboarding-rider",
  "admin",
  "admin-users",
  "admin-verifications",
  "admin-marketplace",
  "admin-operations",
  "saved-items",
];

export default function HomePage() {
  const view = useRush((s) => s.view);
  const user = useRush((s) => s.user);
  const { isLoading: meLoading, data: meData } = useMe();

  // Show auth screen if user tries to access protected route without login
  const isProtected = PROTECTED.includes(view);
  const showAuth = !meLoading && isProtected && !user;

  // ─── Landing gate with splash screen ─────────────────────────────
  //
  // The three possible states:
  //   1. meLoading = true → we don't know yet if the user is logged in.
  //      Show a splash screen (logo + spinner) while we wait. This
  //      prevents the landing page from flashing for logged-in users
  //      and prevents the app from flashing for logged-out users.
  //
  //   2. meLoading = false, user = null → user is NOT logged in.
  //      Show the landing page.
  //
  //   3. meLoading = false, user = <record> → user IS logged in.
  //      Show the app.
  //
  // Previously, during meLoading the app rendered with the app chrome
  // (TopBar + HomeScreen loading), which caused a visible flash for
  // logged-out users (app → landing page) and could briefly show the
  // landing page for logged-in users if the TanStack Query cache was
  // stale. The splash screen eliminates both flashes.

  const showLanding = !meLoading && !user && !isProtected;
  const showSplash = meLoading && !user; // Only splash if we don't have a cached user yet

  if (showSplash) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <AuthHydrator />
        <div className="animate-pulse">
          <img
            src="/rush-logo.jpg"
            alt="Rush"
            width={64}
            height={64}
            className="rounded-2xl object-cover"
            style={{ width: 64, height: 64 }}
            draggable={false}
          />
        </div>
        <div className="mt-4 h-1 w-24 rounded-full bg-rush/20 overflow-hidden">
          <div className="h-full bg-rush rounded-full animate-[rush-pulse_1.5s_ease-in-out_infinite]" style={{ width: "40%" }} />
        </div>
        <Toasts />
      </div>
    );
  }

  if (showLanding) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AuthHydrator />
        <LandingScreen />
        <Toasts />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AuthHydrator />
      {/* Confirms Paystack payments when the customer returns to /?pay=…&reference=… */}
      <PaymentReturnHandler />

      {/* TopBar */}
      {!HIDE_TOPBAR.includes(view) && !showAuth && (
        <TopBar hideSearch={HIDE_SEARCHBAR.includes(view)} />
      )}

      <div className="flex-1 flex w-full lg:px-6 xl:px-10">
        {/* Desktop side nav — replaces BottomNav at the lg breakpoint */}
        {!HIDE_BOTTOMNAV.includes(view) && !showAuth && <DesktopSideNav />}

        {/* Main scrollable content */}
        <main className={`flex-1 min-w-0 mx-auto w-full ${CONTENT_WIDTH} pb-20 lg:pb-10`}>
          {showAuth ? (
            <AuthScreen />
          ) : (
            <ViewRouter />
          )}
        </main>
      </div>

      {/* BottomNav (mobile/tablet only) */}
      {!HIDE_BOTTOMNAV.includes(view) && !showAuth && <BottomNav />}

      <Toasts />
    </div>
  );
}

/**
 * Toasts — top-center stack. Extracted into its own component so the
 * landing-gate branch above can render it without duplicating the
 * markup. Always rendered at the top level so toasts fire even on
 * the landing screen (e.g. "Welcome to Rush" after sign-in).
 */
function Toasts() {
  const toasts = useRush((s) => s.toasts);
  const dismissToast = useRush((s) => s.dismissToast);
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismissToast(t.id)}
          className="bg-ink text-white rounded-xl px-4 py-3 text-sm font-semibold shadow-lg animate-in fade-in slide-in-from-top-2 w-full pointer-events-auto"
        >
          <p className="leading-tight">{t.title}</p>
          {t.description && (
            <p className="text-xs font-normal opacity-80 mt-0.5">{t.description}</p>
          )}
        </button>
      ))}
    </div>
  );
}

function ViewRouter() {
  // Select only `view` — this component is just a switch. Selecting
  // the whole store would re-render the active screen on every store
  // update (cart, toasts, auth hydration) for no reason.
  const view = useRush((s) => s.view);

  switch (view) {
    case "home":
      return <HomeScreen />;
    case "explore":
      return <ExploreScreen />;
    case "shop":
      return <ShopScreen />;
    case "product":
      return <ProductScreen />;
    case "cart":
      return <CartScreen />;
    case "checkout":
      return <CheckoutScreen />;
    case "order-tracking":
      return <OrderTrackingScreen />;
    case "service-job-tracking":
      return <ServiceJobTrackingScreen />;
    case "store":
      return <StoreScreen />;
    case "services":
      return <ServicesScreen />;
    case "saved-items":
      return <SavedItemsScreen />;
    case "provider":
      return <ProviderScreen />;
    case "ride":
      return <RideScreen />;
    case "ride-tracking":
      return <RideTrackingScreen />;
    case "sell":
      return <SellScreen />;
    case "vendor-dashboard":
      return <VendorDashboard />;
    case "provider-dashboard":
      return <ProviderDashboard />;
    case "rider-dashboard":
      return <RiderDashboard />;
    case "account":
      return <AccountScreen />;
    case "activity":
      return <ActivityScreen />;
    case "search":
      return <SearchScreen />;
    case "onboarding-vendor":
      return <OnboardingVendorScreen />;
    case "onboarding-provider":
      return <OnboardingProviderScreen />;
    case "onboarding-rider":
      return <OnboardingRiderScreen />;
    case "admin":
    case "admin-users":
    case "admin-verifications":
    case "admin-marketplace":
    case "admin-operations":
      return <AdminPanel />;
    default:
      return <HomeScreen />;
  }
}
