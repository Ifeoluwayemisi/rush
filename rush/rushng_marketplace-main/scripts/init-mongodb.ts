/**
 * MongoDB index initializer.
 *
 * Run with: `bun run scripts/init-mongodb.ts`
 *
 * Creates the indexes that the application expects (unique email,
 * unique slug, etc.). Safe to run repeatedly — createIndex is a no-op
 * if the index already exists.
 *
 * On Vercel, this runs automatically on first request via the
 * `ensureIndexes()` call in src/lib/db.ts. Running it manually here
 * is useful for verifying the connection works before deploying.
 */

import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || "rush";

if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set. Add it to .env or your Vercel project.");
  process.exit(1);
}

// After the `if (!MONGODB_URI) process.exit(1)` above, TypeScript
// still considers `MONGODB_URI` to be `string | undefined` because
// `process.exit` doesn't narrow. We use a runtime-asserted const
// here so the rest of the file gets the narrowed `string` type.
const URI: string = MONGODB_URI;

async function main() {
  const client = new MongoClient(URI, {
    serverSelectionTimeoutMS: 10000,
  });
  console.log(`Connecting to MongoDB at ${URI.replace(/:\/\/[^@]+@/, "://***:***@")}...`);
  await client.connect();
  const db = client.db(MONGODB_DB);
  console.log(`Connected. Database: ${db.databaseName}`);

  const tasks: Array<[string, Promise<unknown>]> = [
    ["users.email (unique)", db.collection("users").createIndex({ email: 1 }, { unique: true })],
    ["users.firebaseUid (unique, sparse)", db.collection("users").createIndex({ firebaseUid: 1 }, { unique: true, sparse: true })],
    ["vendor_profiles.slug (unique)", db.collection("vendor_profiles").createIndex({ slug: 1 }, { unique: true })],
    ["vendor_profiles.userId (unique)", db.collection("vendor_profiles").createIndex({ userId: 1 }, { unique: true })],
    ["vendor_profiles.category", db.collection("vendor_profiles").createIndex({ category: 1 })],
    ["products.vendorId", db.collection("products").createIndex({ vendorId: 1 })],
    ["products.category", db.collection("products").createIndex({ category: 1 })],
    ["providers.slug (unique)", db.collection("providers").createIndex({ slug: 1 }, { unique: true })],
    ["providers.userId (unique)", db.collection("providers").createIndex({ userId: 1 }, { unique: true })],
    ["service_jobs.code (unique)", db.collection("service_jobs").createIndex({ code: 1 }, { unique: true })],
    ["orders.code (unique)", db.collection("orders").createIndex({ code: 1 }, { unique: true })],
    ["orders.customerId", db.collection("orders").createIndex({ customerId: 1 })],
    ["orders.vendorId", db.collection("orders").createIndex({ vendorId: 1 })],
    ["rider_profiles.userId (unique)", db.collection("rider_profiles").createIndex({ userId: 1 }, { unique: true })],
    ["vehicles.riderId (unique)", db.collection("vehicles").createIndex({ riderId: 1 }, { unique: true })],
    ["rides.code (unique)", db.collection("rides").createIndex({ code: 1 }, { unique: true })],
    ["rides.customerId", db.collection("rides").createIndex({ customerId: 1 })],
    ["rider_jobs.riderId", db.collection("rider_jobs").createIndex({ riderId: 1 })],
    ["rider_jobs.orderId (sparse)", db.collection("rider_jobs").createIndex({ orderId: 1 }, { sparse: true })],
    ["rider_jobs.rideId (sparse)", db.collection("rider_jobs").createIndex({ rideId: 1 }, { sparse: true })],
    ["wallets.userId (unique)", db.collection("wallets").createIndex({ userId: 1 }, { unique: true })],
    ["wallet_ledger_entries.walletId", db.collection("wallet_ledger_entries").createIndex({ walletId: 1 })],
    ["payments.reference (unique)", db.collection("payments").createIndex({ reference: 1 }, { unique: true })],
    ["payments.customerId", db.collection("payments").createIndex({ customerId: 1 })],
    ["payments.orderId (sparse)", db.collection("payments").createIndex({ orderId: 1 }, { sparse: true })],

    // ─── Vendor KYC ───────────────────────────────────────────────────
    // OTPs — hot path lookup by (target, type). TTL reaper runs every ~60s.
    ["verification_otps.target+type", db.collection("verification_otps").createIndex({ target: 1, type: 1 })],
    ["verification_otps.expiresAt", db.collection("verification_otps").createIndex({ expiresAt: 1 })],
    ["verification_otps.expiresAt (TTL)", db.collection("verification_otps").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 3600 })],

    // An institutional email can only be claimed by ONE APPROVED vendor.
    // Partial filter so nulls on legacy vendors don't collide.
    ["vendor_profiles.institutionalEmail (unique, partial)",
      db.collection("vendor_profiles").createIndex(
        { institutionalEmail: 1 },
        { unique: true, partialFilterExpression: { institutionalEmail: { $type: "string" }, kycStatus: "APPROVED" } },
      )],
    ["vendor_profiles.kycStatus+verificationTier", db.collection("vendor_profiles").createIndex({ kycStatus: 1, verificationTier: 1 })],

    // ─── Vendor wallets + payouts ─────────────────────────────────────
    ["vendor_wallets.vendorId (unique)", db.collection("vendor_wallets").createIndex({ vendorId: 1 }, { unique: true })],
    ["vendor_wallet_ledger_entries.walletId+createdAt", db.collection("vendor_wallet_ledger_entries").createIndex({ vendorWalletId: 1, createdAt: -1 })],
    ["payouts.vendorId+createdAt", db.collection("payouts").createIndex({ vendorId: 1, createdAt: -1 })],
    ["payouts.reference (unique, sparse)", db.collection("payouts").createIndex({ reference: 1 }, { unique: true, sparse: true })],
    ["payouts.transferCode (sparse)", db.collection("payouts").createIndex({ transferCode: 1 }, { sparse: true })],
  ];

  for (const [name, p] of tasks) {
    try {
      await p;
      console.log(`  ✓ ${name}`);
    } catch (err: any) {
      console.error(`  ✗ ${name}: ${err?.message ?? err}`);
    }
  }

  await client.close();
  console.log("Done.");
}

main().catch((err) => {
  console.error("Index init failed:", err?.message ?? err);
  process.exit(1);
});
