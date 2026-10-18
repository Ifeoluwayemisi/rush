import { Home, Compass, Plus, ClipboardList, User } from "lucide-react";
import type { ViewId } from "@/lib/types";

export const NAV_TABS: Array<{
  id: ViewId;
  label: string;
  icon: typeof Home;
  match: ViewId[];
}> = [
  { id: "home", label: "Home", icon: Home, match: ["home"] },
  { id: "explore", label: "Explore", icon: Compass, match: ["explore", "shop", "services", "store", "provider", "search"] },
  { id: "sell", label: "Sell", icon: Plus, match: ["sell", "vendor-dashboard", "provider-dashboard", "rider-dashboard", "onboarding-vendor", "onboarding-provider", "onboarding-rider"] },
  { id: "activity", label: "Activity", icon: ClipboardList, match: ["activity", "order-tracking", "ride-tracking", "service-job-tracking"] },
  { id: "account", label: "Account", icon: User, match: ["account", "cart", "checkout", "product", "ride"] },
];
