/**
 * Test fixtures for RUSH — controlled sample data used ONLY for
 * automated tests and one-shot dev database seeding.
 *
 * ─── STRICT RULE ─────────────────────────────────────────────────────
 * This file MUST NOT be imported by:
 *   - any component in src/components/
 *   - any route in src/app/
 *   - any module in src/lib/ (except tests/fixtures/)
 *
 * The RUSH production application never reads this data. Only the
 * seed script (scripts/seed.ts) and tests/ import from here.
 * ─────────────────────────────────────────────────────────────────────
 *
 * Why this exists: automated tests need deterministic data. The seed
 * script also needs initial records so a freshly-provisioned database
 * has something to render. Both purposes are legitimate; "fake data
 * shown to real users" was not.
 *
 * The data below mirrors the original mock-data.ts payload, so
 * existing tests/scripts that depended on it keep working unchanged.
 * The difference is location: this file lives under tests/fixtures/
 * so it's structurally isolated from the application code.
 */

import type {
  VendorProfile, Product, Provider, Order, Ride, User,
} from "@/lib/types";

// All images use Unsplash with stable IDs — deterministic, royalty-free.
const img = (id: string, w = 800) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

export const FIXTURE_USER: User = {
  id: "u_001",
  name: "Jesuloluwa Adeyemi",
  email: "jesu@rush.app",
  phone: "+234 803 555 0142",
  avatar: img("photo-1531123897727-8f129e1688ce", 200),
  location: "Yaba, Lagos",
  capabilities: [
    { type: "CUSTOMER", status: "ACTIVE" },
    { type: "VENDOR", status: "ACTIVE", profileId: "v_001" },
    { type: "SERVICE_PROVIDER", status: "PENDING_VERIFICATION", profileId: "p_002" },
  ],
  activeWorkspace: "CUSTOMER",
  createdAt: "2025-03-12T10:00:00Z",
};

export const FIXTURE_VENDORS: VendorProfile[] = [
  {
    id: "v_001",
    userId: "u_001",
    businessName: "Campus Gadgets",
    slug: "campus-gadgets",
    description:
      "Affordable, verified gadgets for students. Phones, accessories, and small electronics — all tested before listing. Pickup at Yaba or delivery across Lagos.",
    category: "Electronics",
    logo: img("photo-1512054502232-10a0a035d387"),
    coverImage: img("photo-1505740420928-5e560c06a30e", 1600),
    phone: "+234 803 555 0142",
    whatsapp: "+234 803 555 0142",
    email: "hello@campusgadgets.rush",
    location: "Yaba, Lagos",
    instagram: "@campusgadgets",
    tiktok: "@campusgadgets",
    theme: { coverColor: "#FF6B1A" },
    visibility: "PUBLIC",
    deliveryEnabled: true,
    deliveryFee: 1500,
    deliveryTimeMin: 45,
    rating: 4.8,
    reviewCount: 127,
    followers: 840,
    verified: true,
    createdAt: "2025-04-02T10:00:00Z",
  },
  {
    id: "v_002",
    userId: "u_002",
    businessName: "Aunty Bisi Kitchen",
    slug: "aunty-bisi-kitchen",
    description:
      "Home-cooked Nigerian meals made fresh daily. Jollof, amala, efo riro, swallow, and cold drinks. Order before 2pm for same-day delivery.",
    category: "Food",
    logo: img("photo-1574484284002-1f10741e6f46"),
    coverImage: img("photo-1546069901-ba9599a7e63c", 1600),
    phone: "+234 805 222 7788",
    whatsapp: "+234 805 222 7788",
    location: "Surulere, Lagos",
    instagram: "@auntybisikitchen",
    theme: { coverColor: "#D94814" },
    visibility: "PUBLIC",
    deliveryEnabled: true,
    deliveryFee: 1000,
    deliveryTimeMin: 30,
    rating: 4.9,
    reviewCount: 312,
    followers: 1450,
    verified: true,
    createdAt: "2025-02-14T10:00:00Z",
  },
  {
    id: "v_003",
    userId: "u_003",
    businessName: "Sneaker Plug NG",
    slug: "sneaker-plug-ng",
    description:
      "Original sneakers only. Nike, Adidas, New Balance, Yeezy. We authenticate every pair before listing.",
    category: "Fashion",
    logo: img("photo-1542291026-7eec264c27ff"),
    coverImage: img("photo-1556906781-9a412961c28c", 1600),
    phone: "+234 708 999 3322",
    whatsapp: "+234 708 999 3322",
    location: "Lekki, Lagos",
    instagram: "@sneakerplugng",
    theme: { coverColor: "#1F2937" },
    visibility: "PUBLIC",
    deliveryEnabled: true,
    deliveryFee: 2500,
    deliveryTimeMin: 60,
    rating: 4.7,
    reviewCount: 89,
    followers: 560,
    verified: true,
    createdAt: "2025-05-20T10:00:00Z",
  },
  {
    id: "v_004",
    userId: "u_004",
    businessName: "Gracious Groceries",
    slug: "gracious-groceries",
    description:
      "Fresh produce and pantry essentials sourced every morning from Mile 12 market. Quality you can trust.",
    category: "Groceries",
    logo: img("photo-1542838132-92c53300491e"),
    coverImage: img("photo-1542838132-92c53300491e", 1600),
    phone: "+234 802 444 1190",
    location: "Ikeja, Lagos",
    theme: { coverColor: "#15803D" },
    visibility: "PUBLIC",
    deliveryEnabled: true,
    deliveryFee: 1200,
    deliveryTimeMin: 50,
    rating: 4.6,
    reviewCount: 64,
    followers: 320,
    verified: false,
    createdAt: "2025-06-08T10:00:00Z",
  },
  {
    id: "v_005",
    userId: "u_005",
    businessName: "Tunde Phones",
    slug: "tunde-phones",
    description:
      "Brand-new and UK-used phones with 7-day money-back guarantee. Trade-ins welcome.",
    category: "Electronics",
    logo: img("photo-1592750475338-74b7b21085ab"),
    coverImage: img("photo-1511707171634-5f897ff02aa9", 1600),
    phone: "+234 807 666 4400",
    whatsapp: "+234 807 666 4400",
    location: "Computer Village, Ikeja",
    instagram: "@tundephones",
    theme: { coverColor: "#0EA5E9" },
    visibility: "LINK_ONLY",
    deliveryEnabled: true,
    deliveryFee: 2000,
    deliveryTimeMin: 60,
    rating: 4.5,
    reviewCount: 203,
    followers: 980,
    verified: true,
    createdAt: "2025-01-30T10:00:00Z",
  },
];

export const FIXTURE_PRODUCTS: Product[] = [
  {
    id: "p_001", vendorId: "v_001", vendorName: "Campus Gadgets", vendorSlug: "campus-gadgets",
    name: "Wireless Bluetooth Headphones",
    description: "Active noise-cancelling over-ear headphones with 30-hour battery life. Includes USB-C fast charging and a 3.5mm aux cable. Tested, fully functional, in original box.",
    price: 15000, compareAtPrice: 22000,
    images: [img("photo-1505740420928-5e560c06a30e"), img("photo-1583394838336-acd977736f90"), img("photo-1484704849700-f032a568e944")],
    category: "Electronics", condition: "LIKE_NEW", stock: 4, rating: 4.8, reviewCount: 23,
    location: "Yaba, Lagos", createdAt: "2025-08-15T10:00:00Z",
    tags: ["audio", "bluetooth", "student-pick"],
  },
  {
    id: "p_002", vendorId: "v_001", vendorName: "Campus Gadgets", vendorSlug: "campus-gadgets",
    name: "Power Bank 20,000mAh",
    description: "Fast-charging power bank with USB-C PD and dual USB-A outputs. Can charge a phone 4-5 times. LED battery indicator.",
    price: 8500,
    images: [img("photo-1609592424823-bd5b6d4f4e09"), img("photo-1609592806784-f5d4a9c7c80b")],
    category: "Electronics", condition: "NEW", stock: 12, rating: 4.6, reviewCount: 41,
    location: "Yaba, Lagos", createdAt: "2025-08-22T10:00:00Z",
  },
  {
    id: "p_003", vendorId: "v_001", vendorName: "Campus Gadgets", vendorSlug: "campus-gadgets",
    name: "Bluetooth Mini Speaker",
    description: "Compact waterproof speaker with deep bass. 8-hour battery. Pairs with any phone or laptop.",
    price: 6500, compareAtPrice: 9000,
    images: [img("photo-1608043152269-423dbba4e7e1")],
    category: "Electronics", condition: "NEW", stock: 7, rating: 4.5, reviewCount: 18,
    location: "Yaba, Lagos", createdAt: "2025-08-25T10:00:00Z",
  },
  {
    id: "p_004", vendorId: "v_001", vendorName: "Campus Gadgets", vendorSlug: "campus-gadgets",
    name: "Laptop Stand (Aluminium)",
    description: "Foldable aluminium laptop stand. Improves airflow and posture. Fits 11-17 inch laptops.",
    price: 4500,
    images: [img("photo-1496181133206-80ce9b88a853")],
    category: "Electronics", condition: "NEW", stock: 20, rating: 4.7, reviewCount: 9,
    location: "Yaba, Lagos", createdAt: "2025-08-28T10:00:00Z",
  },
  {
    id: "p_005", vendorId: "v_002", vendorName: "Aunty Bisi Kitchen", vendorSlug: "aunty-bisi-kitchen",
    name: "Jollof Rice + Chicken (Large)",
    description: "Generous portion of smoky party jollof with grilled chicken and coleslaw. Order before 2pm.",
    price: 2500,
    images: [img("photo-1546069901-ba9599a7e63c")],
    category: "Food", stock: 30, rating: 4.9, reviewCount: 156,
    location: "Surulere, Lagos", createdAt: "2025-09-04T10:00:00Z",
  },
  {
    id: "p_006", vendorId: "v_002", vendorName: "Aunty Bisi Kitchen", vendorSlug: "aunty-bisi-kitchen",
    name: "Amala & Ewedu with Assorted",
    description: "Three wraps of amala with ewedu, gbegiri, and assorted meat. Peppered to taste.",
    price: 2000,
    images: [img("photo-1565299624946-b28f40a0ae38")],
    category: "Food", stock: 25, rating: 4.8, reviewCount: 98,
    location: "Surulere, Lagos", createdAt: "2025-09-04T10:00:00Z",
  },
  {
    id: "p_007", vendorId: "v_002", vendorName: "Aunty Bisi Kitchen", vendorSlug: "aunty-bisi-kitchen",
    name: "Pounded Yam & Egusi Soup",
    description: "Two wraps of pounded yam with rich egusi soup loaded with meat and fish.",
    price: 2800,
    images: [img("photo-1604908554007-f3c4c9d4e4b6")],
    category: "Food", stock: 18, rating: 4.9, reviewCount: 72,
    location: "Surulere, Lagos", createdAt: "2025-09-04T10:00:00Z",
  },
  {
    id: "p_008", vendorId: "v_003", vendorName: "Sneaker Plug NG", vendorSlug: "sneaker-plug-ng",
    name: "Nike Air Force 1 '07 (White)",
    description: "Classic all-white AF1. Size UK 7-12 available. 100% authentic, with original box and receipt.",
    price: 95000, compareAtPrice: 115000,
    images: [img("photo-1542291026-7eec264c27ff"), img("photo-1556906781-9a412961c28c")],
    category: "Fashion", condition: "NEW", stock: 6, rating: 4.8, reviewCount: 34,
    location: "Lekki, Lagos", createdAt: "2025-08-30T10:00:00Z",
  },
  {
    id: "p_009", vendorId: "v_003", vendorName: "Sneaker Plug NG", vendorSlug: "sneaker-plug-ng",
    name: "Adidas Samba OG (Black/White)",
    description: "Timeless Samba silhouette. Unisex sizing. Original Adidas product.",
    price: 78000,
    images: [img("photo-1514989940723-e8e51635b588")],
    category: "Fashion", condition: "NEW", stock: 4, rating: 4.7, reviewCount: 12,
    location: "Lekki, Lagos", createdAt: "2025-09-01T10:00:00Z",
  },
  {
    id: "p_010", vendorId: "v_004", vendorName: "Gracious Groceries", vendorSlug: "gracious-groceries",
    name: "Fresh Tomatoes (5kg Basket)",
    description: "Fresh plum tomatoes sourced this morning. Perfect for stew and puree.",
    price: 6000,
    images: [img("photo-1546470427-e26264be0b34")],
    category: "Groceries", stock: 14, rating: 4.5, reviewCount: 22,
    location: "Ikeja, Lagos", createdAt: "2025-09-04T10:00:00Z",
  },
  {
    id: "p_011", vendorId: "v_004", vendorName: "Gracious Groceries", vendorSlug: "gracious-groceries",
    name: "Bag of Rice (5kg)",
    description: "Premium long-grain parboiled rice. Clean, stone-free, double-polished.",
    price: 9500,
    images: [img("photo-1586201375761-83865049e8ac")],
    category: "Groceries", stock: 30, rating: 4.6, reviewCount: 48,
    location: "Ikeja, Lagos", createdAt: "2025-09-03T10:00:00Z",
  },
  {
    id: "p_012", vendorId: "v_005", vendorName: "Tunde Phones", vendorSlug: "tunde-phones",
    name: "iPhone 13 Pro 128GB (UK Used)",
    description: "Excellent condition. Battery health 91%. Face ID, True Tone, all working. Comes with charger and case.",
    price: 650000, compareAtPrice: 720000,
    images: [img("photo-1592750475338-74b7b21085ab"), img("photo-1510557880182-3d4d3cba35a5")],
    category: "Electronics", condition: "USED", stock: 2, rating: 4.6, reviewCount: 17,
    location: "Computer Village, Ikeja", createdAt: "2025-09-02T10:00:00Z",
  },
  {
    id: "p_013", vendorId: "v_005", vendorName: "Tunde Phones", vendorSlug: "tunde-phones",
    name: "Samsung A14 (Brand New)",
    description: "Sealed in box. 4GB RAM, 64GB storage. Comes with 12-month warranty.",
    price: 145000,
    images: [img("photo-1610945265064-0e34e5519bbf")],
    category: "Electronics", condition: "NEW", stock: 8, rating: 4.4, reviewCount: 26,
    location: "Computer Village, Ikeja", createdAt: "2025-08-29T10:00:00Z",
  },
  {
    id: "p_014", vendorId: "v_003", vendorName: "Sneaker Plug NG", vendorSlug: "sneaker-plug-ng",
    name: "New Balance 530 (Silver)",
    description: "Dad-shoe silhouette in silver/navy. Comfortable for all-day wear.",
    price: 82000,
    images: [img("photo-1539185441755-769473a23570")],
    category: "Fashion", condition: "NEW", stock: 3, rating: 4.6, reviewCount: 8,
    location: "Lekki, Lagos", createdAt: "2025-09-03T10:00:00Z",
  },
];

export const FIXTURE_PROVIDERS: Provider[] = [
  {
    id: "p_001", userId: "u_010",
    businessName: "John Electrical Services", slug: "john-electrical",
    tagline: "Licensed electrician — wiring, repairs, installations",
    description: "NABTEB-certified electrician with 9 years of experience. Residential and small commercial work. Free inspection within Yaba, Surulere, and Ikeja.",
    category: "Electrical",
    coverImage: img("photo-1621905251189-08b45d6a269e", 1600),
    avatar: img("photo-1507003211169-0a1dd7228f2d"),
    location: "Yaba, Lagos", rating: 4.9, reviewCount: 184, startingPrice: 5000,
    responseTimeMin: 15, verified: true, completedJobs: 412,
    services: [
      { id: "s_001", name: "Home Wiring Inspection", description: "Full inspection of wiring, sockets, and switchboard. Detailed report included.", price: 5000, duration: "1 hour" },
      { id: "s_002", name: "Socket / Switch Repair", description: "Repair or replacement of faulty sockets, switches, or breakers.", price: 7500, duration: "1-2 hours" },
      { id: "s_003", name: "Inverter Installation", description: "Supply and installation of solar inverter systems (1.5KVA - 5KVA).", price: 85000, duration: "Half day" },
    ],
    portfolio: [img("photo-1621905251189-08b45d6a269e"), img("photo-1581094288338-2314dddb7ece"), img("photo-1565608438257-fb4e1f5f7cae")],
  },
  {
    id: "p_002", userId: "u_011",
    businessName: "Bright Laundry Co.", slug: "bright-laundry",
    tagline: "Pickup & delivery laundry service",
    description: "Wash, dry, fold, and iron. 48-hour turnaround. Free pickup and delivery within Surulere, Yaba, and Lagos Island.",
    category: "Cleaning",
    coverImage: img("photo-1545173168-9f1947eebb7f", 1600),
    avatar: img("photo-1494790108377-be9c29b29330"),
    location: "Surulere, Lagos", rating: 4.8, reviewCount: 221, startingPrice: 2000,
    responseTimeMin: 30, verified: true, completedJobs: 587,
    services: [
      { id: "s_004", name: "Wash & Fold (5kg)", description: "Up to 5kg of regular clothing. Washed, dried, and folded.", price: 2000, duration: "48 hours" },
      { id: "s_005", name: "Ironing Only (10 pieces)", description: "Ironing of 10 pieces of clothing. Pickup and delivery included.", price: 1500, duration: "24 hours" },
      { id: "s_006", name: "Bedding & Duvet Cleaning", description: "Deep cleaning of duvets, blankets, and bedsheets.", price: 3500, duration: "48 hours" },
    ],
    portfolio: [img("photo-1545173168-9f1947eebb7f"), img("photo-1610557892470-55d9e80c0bce")],
  },
  {
    id: "p_003", userId: "u_012",
    businessName: "David Plumbing Solutions", slug: "david-plumbing",
    tagline: "Plumber — leaks, fittings, installations",
    description: "Fast, clean plumbing work. Pipes, taps, water closets, showers, water heater installation. 30-day warranty on all jobs.",
    category: "Plumbing",
    coverImage: img("photo-1581244277943-fe4a9c1fe196", 1600),
    avatar: img("photo-1500648767791-00dcc994a43e"),
    location: "Ikeja, Lagos", rating: 4.7, reviewCount: 96, startingPrice: 4000,
    responseTimeMin: 45, verified: true, completedJobs: 178,
    services: [
      { id: "s_007", name: "Leak Detection & Repair", description: "Locate and fix leaks in pipes, taps, or fittings.", price: 4000, duration: "1-2 hours" },
      { id: "s_008", name: "Water Closet Installation", description: "Supply and install new WC. Old one removed and disposed.", price: 25000, duration: "Half day" },
    ],
    portfolio: [img("photo-1581244277943-fe4a9c1fe196"), img("photo-1558618666-fcd25c85cd64")],
  },
  {
    id: "p_004", userId: "u_013",
    businessName: "Tola Beauty Studio", slug: "tola-beauty",
    tagline: "Mobile makeup & nail services",
    description: "Home and event makeup, manicure, pedicure, and gel nails. We come to you anywhere in Lagos Island and mainland.",
    category: "Beauty",
    coverImage: img("photo-1560066984-138dadb4c035", 1600),
    avatar: img("photo-1438761681033-6461ffad8d80"),
    location: "Lekki, Lagos", rating: 4.9, reviewCount: 143, startingPrice: 8000,
    responseTimeMin: 20, verified: true, completedJobs: 240,
    services: [
      { id: "s_009", name: "Event Makeup (Full Face)", description: "Full-face makeup for events. Lashes included.", price: 15000, duration: "1.5 hours" },
      { id: "s_010", name: "Gel Manicure", description: "Gel polish manicure. Lasts up to 3 weeks.", price: 8000, duration: "1 hour" },
    ],
    portfolio: [img("photo-1560066984-138dadb4c035"), img("photo-1604654894610-df63bc536371")],
  },
];

export const FIXTURE_ORDERS: Order[] = [
  {
    id: "o_001",
    code: "RSH-20394",
    vendorId: "v_002", vendorName: "Aunty Bisi Kitchen", vendorSlug: "aunty-bisi-kitchen",
    items: [
      { productId: "p_005", vendorId: "v_002", vendorName: "Aunty Bisi Kitchen", name: "Jollof Rice + Chicken (Large)", image: img("photo-1546069901-ba9599a7e63c"), price: 2500, quantity: 2 },
      { productId: "p_006", vendorId: "v_002", vendorName: "Aunty Bisi Kitchen", name: "Amala & Ewedu with Assorted", image: img("photo-1565299624946-b28f40a0ae38"), price: 2000, quantity: 1 },
    ],
    subtotal: 7000, deliveryFee: 1000, total: 8000,
    fulfilment: "DELIVERY", paymentMethod: "WALLET",
    status: "ON_THE_WAY",
    deliveryAddress: "14 Adeniran Street, Yaba, Lagos",
    customerName: "Jesuloluwa Adeyemi", customerPhone: "+234 803 555 0142",
    rider: { name: "Emeka Johnson", avatar: img("photo-1500648767791-00dcc994a43e"), vehicleType: "Bike", plate: "LAG-482-QD", rating: 4.9 },
    createdAt: "2025-09-05T11:42:00Z", updatedAt: "2025-09-05T12:10:00Z",
    timeline: [
      { label: "Order placed", timestamp: "11:42 AM", completed: true },
      { label: "Vendor confirmed", timestamp: "11:48 AM", completed: true },
      { label: "Order being prepared", timestamp: "11:52 AM", completed: true },
      { label: "Rider assigned", timestamp: "12:05 PM", completed: true },
      { label: "On the way", timestamp: "12:10 PM", completed: true },
      { label: "Delivered", timestamp: "—", completed: false },
    ],
  },
  {
    id: "o_002",
    code: "RSH-20390",
    vendorId: "v_001", vendorName: "Campus Gadgets", vendorSlug: "campus-gadgets",
    items: [
      { productId: "p_001", vendorId: "v_001", vendorName: "Campus Gadgets", name: "Wireless Bluetooth Headphones", image: img("photo-1505740420928-5e560c06a30e"), price: 15000, quantity: 1 },
    ],
    subtotal: 15000, deliveryFee: 1500, total: 16500,
    fulfilment: "DELIVERY", paymentMethod: "CARD",
    status: "DELIVERED",
    deliveryAddress: "14 Adeniran Street, Yaba, Lagos",
    customerName: "Jesuloluwa Adeyemi", customerPhone: "+234 803 555 0142",
    createdAt: "2025-09-01T14:20:00Z", updatedAt: "2025-09-01T16:30:00Z",
    timeline: [
      { label: "Order placed", timestamp: "2:20 PM", completed: true },
      { label: "Vendor confirmed", timestamp: "2:30 PM", completed: true },
      { label: "Rider assigned", timestamp: "3:45 PM", completed: true },
      { label: "Delivered", timestamp: "4:30 PM", completed: true },
    ],
  },
];

export const FIXTURE_RIDES: Ride[] = [
  {
    id: "r_001",
    code: "RSH-RIDE-5821",
    type: "BIKE",
    rider: { name: "Emeka Johnson", avatar: img("photo-1500648767791-00dcc994a43e"), rating: 4.9, vehiclePlate: "LAG-482-QD", vehicleModel: "Bajaj Boxer" },
    pickup: "Yaba Market",
    destination: "Maryland Mall",
    fare: 1500, distanceKm: 6.4, estimatedMin: 22,
    status: "IN_PROGRESS",
    createdAt: "2025-09-05T12:00:00Z",
  },
];
