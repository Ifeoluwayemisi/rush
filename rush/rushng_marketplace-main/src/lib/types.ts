// Rush domain types — aligned with the multi-capability architecture
// User can hold CUSTOMER + VENDOR + SERVICE_PROVIDER + RIDER simultaneously

export type Capability =
  | "CUSTOMER"
  | "VENDOR"
  | "SERVICE_PROVIDER"
  | "RIDER"
  | "ADMIN";
export type SystemRole = "ADMIN" | "DISPATCHER" | "SUPPORT";
export type CapabilityStatus = "ACTIVE" | "PENDING_VERIFICATION" | "SUSPENDED";

export type StoreVisibility = "PUBLIC" | "LINK_ONLY" | "PRIVATE";

// ─── Vendor KYC ───────────────────────────────────────────────────────────
/**
 * Verification tier for a vendor. Decoupled from account auth — a user
 * can log in with their personal Gmail but hold any of these tiers on
 * their VendorProfile.
 *
 *   UNVERIFIED         — no KYC submitted yet (default for new vendors)
 *   STUDENT_LASU       — verified LASU student email (instant OTP)
 *   STAFF_LASU         — verified LASU staff email + PF number
 *   COMMUNITY_EXTERNAL — non-LASU vendor, admin-reviewed government ID
 */
export type VerificationTier =
  | "UNVERIFIED"
  | "STUDENT_LASU"
  | "STAFF_LASU"
  | "COMMUNITY_EXTERNAL";

export type KycStatus =
  | "UNSUBMITTED"
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

export type KycIdType = "NIN" | "VOTER_ID" | "DRIVERS_LICENSE";

/** Public-safe KYC view — embedded in vendor responses shown to buyers. */
export interface VendorKycPublic {
  verificationTier: VerificationTier;
  kycStatus: KycStatus;
  verifiedAt: string | null;
  /** Optional reason a submission was rejected (only set when REJECTED). */
  rejectionReason?: string | null;
}

/** Owner-scoped KYC view — includes PII like institutional email, PF/matric,
 *  ID card URL, residential address. Only returned to the vendor themselves
 *  or to admins. */
export interface VendorKycPrivate extends VendorKycPublic {
  institutionalEmail: string | null;
  matricOrPfNumber: string | null;
  idCardUrl: string | null;
  idType: KycIdType | null;
  residentialAddress: string | null;
  ninNumber?: string | null;
  reviewedByAdminId?: string | null;
  reviewedAt?: string | null;
}

export interface User {
  id: string;
  /** Stable Firebase UID for accounts created via Google Sign-In.
   * Null for legacy email/password accounts. This is the canonical
   * identity link — emails can change, but Firebase UIDs don't. */
  firebaseUid?: string | null;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  location: string;
  capabilities: Array<{
    type: Capability;
    status: CapabilityStatus;
    profileId?: string;
  }>;
  activeWorkspace?: Capability;
  createdAt: string;
  wallet?: { balance: number } | null;
}

export interface VendorProfile {
  id: string;
  userId: string;
  businessName: string;
  slug: string;
  description: string;
  category: string;
  logo: string;
  coverImage: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  location: string;
  instagram?: string;
  tiktok?: string;
  facebook?: string;
  theme: {
    coverColor: string;
  };
  visibility: StoreVisibility;
  deliveryEnabled: boolean;
  deliveryFee: number;
  deliveryTimeMin: number;
  rating: number;
  reviewCount: number;
  followers: number;
  verified: boolean;
  /** KYC verification state (public-safe subset). Null on legacy vendors
   *  created before KYC shipped — treated as UNVERIFIED / UNSUBMITTED. */
  kyc?: VendorKycPublic;
  createdAt: string;
}

export interface Product {
  id: string;
  vendorId: string;
  vendorName: string;
  vendorSlug: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  images: string[];
  category: string;
  condition?: "NEW" | "LIKE_NEW" | "USED" | "REFURBISHED";
  stock: number;
  rating: number;
  reviewCount: number;
  location: string;
  createdAt: string;
  tags?: string[];
}

export interface CartItem {
  productId: string;
  vendorId: string;
  vendorName: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
}

export type OrderStatus =
  | "PLACED"
  | "CONFIRMED"
  | "PREPARING"
  | "RIDER_ASSIGNED"
  | "ON_THE_WAY"
  | "DELIVERED"
  | "PICKED_UP"
  | "CANCELLED";

export type FulfilmentType = "DELIVERY" | "PICKUP";
export type PaymentMethod = "CARD" | "TRANSFER" | "WALLET" | "CASH_ON_DELIVERY";

export interface Order {
  id: string;
  code: string;
  vendorId: string;
  vendorName: string;
  vendorSlug: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  fulfilment: FulfilmentType;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  deliveryAddress?: string;
  customerName: string;
  customerPhone: string;
  rider?: {
    name: string;
    avatar: string;
    vehicleType: string;
    plate: string;
    rating: number;
  };
  createdAt: string;
  updatedAt: string;
  timeline: Array<{
    label: string;
    timestamp: string;
    completed: boolean;
    type?: string;
  }>;
}

export interface Provider {
  id: string;
  userId: string;
  businessName: string;
  slug: string;
  tagline: string;
  description: string;
  category: string;
  coverImage: string;
  avatar: string;
  location: string;
  rating: number;
  reviewCount: number;
  startingPrice: number;
  responseTimeMin: number;
  verified: boolean;
  completedJobs: number;
  services: Array<{
    id: string;
    name: string;
    description: string;
    price: number;
    duration: string;
  }>;
  portfolio: string[];
}

export type RideType = "BIKE" | "CAR" | "KEKE" | "VAN";

export interface Ride {
  id: string;
  code: string;
  type: RideType;
  rider?: {
    name: string;
    avatar: string;
    rating: number;
    vehiclePlate: string;
    vehicleModel: string;
  };
  pickup: string;
  destination: string;
  fare: number;
  distanceKm: number;
  estimatedMin: number;
  status: "SEARCHING" | "ASSIGNED" | "EN_ROUTE_PICKUP" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  createdAt: string;
}

export interface Vehicle {
  id: string;
  type: RideType;
  plate: string;
  model: string;
  color: string;
  licenseNumber: string;
  verified: boolean;
}

export interface ServiceJob {
  id: string;
  code: string;
  customerId: string;
  providerId: string | null;
  providerName: string | null;
  title: string;
  description: string;
  category: string;
  budget: number | null;
  quotedPrice: number | null;
  location: string;
  status: "OPEN" | "QUOTED" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  scheduledFor: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RiderProfile {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  phone: string;
  rating: number;
  trips: number;
  earningsToday: number;
  online: boolean;
  status: "PENDING_VERIFICATION" | "ACTIVE" | "OFFLINE";
  mobility: Array<"DELIVERY" | "PASSENGER_RIDES">;
  vehicle: Vehicle;
  licenseUploaded: boolean;
  documentsVerified: boolean;
}

// View identifiers for client-side navigation
export type ViewId =
  | "home"
  | "explore"
  | "shop"
  | "product"
  | "cart"
  | "checkout"
  | "order-tracking"
  | "store"
  | "services"
  | "provider"
  | "ride"
  | "ride-tracking"
  | "sell"
  | "vendor-dashboard"
  | "provider-dashboard"
  | "rider-dashboard"
  | "account"
  | "activity"
  | "onboarding-vendor"
  | "onboarding-provider"
  | "onboarding-rider"
  | "search"
  | "service-job-tracking"
  | "admin"
  | "admin-users"
  | "admin-verifications"
  | "admin-marketplace"
  | "admin-operations"
  | "auth"
  | "saved-items";

export interface NavParams {
  productId?: string;
  vendorId?: string;
  storeSlug?: string;
  providerId?: string;
  orderId?: string;
  rideId?: string;
  category?: string;
  query?: string;
  jobId?: string;
  /** Active admin sub-tab. Only meaningful when `view === "admin"`. */
  tab?: string;
}
