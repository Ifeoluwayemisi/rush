"use client";

// Single entry point so consumers don't need to know which domain file
// a repository lives in.
export { productsRepo } from "./products";
export { storesRepo } from "./stores";
export { providersRepo } from "./providers";
export { ordersRepo, type OrderScope } from "./orders";
export { ridesRepo, type RideScope } from "./rides";
export { serviceJobsRepo, type ServiceJobScope } from "./service-jobs";
export { riderJobsRepo, type RiderJobSummary } from "./rider-jobs";
export { ridersRepo, type AvailableRider } from "./riders";
export { authRepo } from "./auth";
export { onboardingRepo, type VendorOnboardInput } from "./onboarding";

// Pure utility constants (these are NOT mock data — they're
// production catalogue / formatting helpers).
export { naira } from "./format";
export {
  SHOP_CATEGORIES,
  SERVICE_CATEGORIES,
  type ShopCategory,
  type ServiceCategory,
} from "./catalog";
