import "server-only";

/**
 * MongoDB data layer for Rush.
 *
 * This module exposes a `db` object whose API intentionally mirrors the
 * subset of Prisma Client methods that the Rush API routes use
 * (findUnique, findMany, create, update, delete, count, upsert,
 * updateMany, createMany). Behind the scenes it talks to MongoDB
 * directly via the `mongodb` driver — no Prisma in between.
 *
 * Why this design:
 *  - The original Rush code was written against Prisma Client. Rather
 *    than rewrite all 44 API routes, we keep the same call shape so
 *    each route only needs to be touched if it relies on Prisma-
 *    specific semantics (e.g. nested writes that the shim doesn't
 *    support).
 *  - MongoDB doesn't enforce foreign keys. We emulate Prisma's
 *    `include` by doing a second query per relation and stitching
 *    the results in JS. Same pattern Prisma uses for MongoDB.
 *  - IDs are generated with `cuid`-compatible ids (we use MongoDB's
 *    ObjectId when no id is provided, but for compatibility with the
 *    existing Prisma-shaped schema we generate a 24-char hex id).
 *
 * Serverless-friendly: a single cached MongoClient is reused across
 * warm lambda invocations. Cold starts reconnect.
 */

import { MongoClient, ObjectId, type Collection, type Db as MongoDb } from "mongodb";
import { createHash, randomBytes } from "node:crypto";

// ─── Connection management ────────────────────────────────────────────────

const MONGODB_URI =
  process.env.MONGODB_URI ||
  // Dev fallback: an in-process placeholder is NOT used because MongoDB
  // cannot run inside the Next.js process. If no URI is set, we surface
  // a clear error at first query time rather than crashing the build.
  "";

const MONGODB_DB = process.env.MONGODB_DB || "rush";

interface CachedClient {
  // client + db are null while the connect promise is in flight;
  // they're populated once it resolves.
  client: MongoClient | null;
  db: MongoDb | null;
  promise: Promise<{ client: MongoClient; db: MongoDb }> | null;
}

declare global {
   
  var __mongoCache: CachedClient | undefined;
}

async function connect(): Promise<{ client: MongoClient; db: MongoDb }> {
  if (!MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is not set. Add it to your environment (e.g. Vercel project settings) — e.g. mongodb+srv://user:pass@cluster.mongodb.net/rush",
    );
  }

  // ─── Cache the PROMISE, not the result ─────────────────────────────
  // On a cold start (Vercel function boot, fresh dev server), many
  // concurrent requests hit `connect()` at the same time. If we
  // cached only the *resolved result*, each concurrent caller would
  // enter the IIFE below and create its own MongoClient — 5 parallel
  // cold-start requests = 5 MongoClients, 5 connection handshakes,
  // 5x the Atlas connection count, and a race to write the cache.
  //
  // By caching the IN-FLIGHT promise, every concurrent caller awaits
  // the same promise and gets the same client. If the connect fails,
  // we clear the cache so the next request retries fresh.
  if (globalThis.__mongoCache?.promise) {
    return globalThis.__mongoCache.promise;
  }
  if (globalThis.__mongoCache?.client && globalThis.__mongoCache?.db) {
    return { client: globalThis.__mongoCache.client, db: globalThis.__mongoCache.db };
  }

  const promise = (async () => {
    const client = new MongoClient(MONGODB_URI, {
      // Reasonable serverless defaults.
      maxPoolSize: 10,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 15000,
    });
    await client.connect();
    const db = client.db(MONGODB_DB);
    // Ensure indexes exist on first connect. Cheap to run repeatedly —
    // createIndex is a no-op if the index already exists.
    await ensureIndexes(db).catch((err) => {
      // Don't fail boot if index creation fails — it might just be a
      // permissions issue. Log and continue; queries will still work,
      // just slower.
      console.warn("[mongo] index creation warning:", err?.message ?? err);
    });
    return { client, db };
  })();

  // Store the in-flight promise immediately so concurrent callers see it.
  globalThis.__mongoCache = {
    client: null,
    db: null,
    promise,
  };

  try {
    const result = await promise;
    // Promote the cache from "in-flight" to "resolved" — keep the
    // promise field too so subsequent calls short-circuit on the
    // first check above without re-entering this block.
    globalThis.__mongoCache = {
      client: result.client,
      db: result.db,
      promise,
    };
    return result;
  } catch (err) {
    // Connection failed — clear the cache so the next request
    // retries fresh instead of awaiting a rejected promise forever.
    globalThis.__mongoCache = undefined;
    throw err;
  }
}

/** Public alias used by /api/health to verify DB reachability. */
export { connect };

async function getDb(): Promise<MongoDb> {
  const { db } = await connect();
  return db;
}

// ─── Index setup ─────────────────────────────────────────────────────────

async function ensureIndexes(db: MongoDb) {
  const tasks: Array<Promise<unknown>> = [
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("users").createIndex({ firebaseUid: 1 }, { unique: true, sparse: true }),
    db.collection("vendor_profiles").createIndex({ slug: 1 }, { unique: true }),
    db.collection("vendor_profiles").createIndex({ userId: 1 }, { unique: true }),
    db.collection("vendor_profiles").createIndex({ category: 1 }),
    db.collection("products").createIndex({ vendorId: 1 }),
    db.collection("products").createIndex({ category: 1 }),
    db.collection("providers").createIndex({ slug: 1 }, { unique: true }),
    db.collection("providers").createIndex({ userId: 1 }, { unique: true }),
    db.collection("service_jobs").createIndex({ code: 1 }, { unique: true }),
    db.collection("orders").createIndex({ code: 1 }, { unique: true }),
    db.collection("orders").createIndex({ customerId: 1 }),
    db.collection("orders").createIndex({ vendorId: 1 }),
    db.collection("rider_profiles").createIndex({ userId: 1 }, { unique: true }),
    db.collection("vehicles").createIndex({ riderId: 1 }, { unique: true }),
    db.collection("rides").createIndex({ code: 1 }, { unique: true }),
    db.collection("rides").createIndex({ customerId: 1 }),
    db.collection("rider_jobs").createIndex({ riderId: 1 }),
    db.collection("rider_jobs").createIndex({ orderId: 1 }, { sparse: true }),
    db.collection("rider_jobs").createIndex({ rideId: 1 }, { sparse: true }),
    db.collection("wallets").createIndex({ userId: 1 }, { unique: true }),
    db.collection("wallet_ledger_entries").createIndex({ walletId: 1 }),
    db.collection("payments").createIndex({ reference: 1 }, { unique: true }),
    db.collection("payments").createIndex({ customerId: 1 }),
    db.collection("payments").createIndex({ orderId: 1 }, { sparse: true }),
    // Follows — unique on (userId, targetType, targetId) so the same
    // user can't follow the same target twice.
    db.collection("follows").createIndex(
      { userId: 1, targetType: 1, targetId: 1 },
      { unique: true },
    ),
    db.collection("follows").createIndex({ userId: 1 }),
    // Notifications — recent-first per user is the hot read path.
    db.collection("notifications").createIndex({ userId: 1, createdAt: -1 }),
    db.collection("notifications").createIndex({ userId: 1, read: 1 }),

    // ─── Vendor KYC ────────────────────────────────────────────────────
    // Verification OTPs — lookup by (target, type) is the hot path; the
    // expiry check is a filter on top. We don't make this unique because
    // we want to allow a fresh OTP to be issued even if a previous one
    // for the same target hasn't expired yet (the send-otp handler
    // deletes prior OTPs for the same target before inserting).
    db.collection("verification_otps").createIndex({ target: 1, type: 1 }),
    db.collection("verification_otps").createIndex({ expiresAt: 1 }),
    // Auto-cleanup: a TTL index removes expired OTPs 1 hour after their
    // expiry. MongoDB runs the TTL monitor every ~60s, so this is "eventually
    // consistent" — fine for OTPs that are already invalidated on read.
    db.collection("verification_otps").createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 3600 },
    ),
    // Vendor profiles — KYC lookups.
    // Institutional email must be unique among APPROVED vendors so the
    // same LASU email can't be claimed by two Rush accounts. We use a
    // partial filter expression so the index only applies when the field
    // is non-null — otherwise every legacy vendor without an institutional
    // email would collide on null.
    db.collection("vendor_profiles").createIndex(
      { institutionalEmail: 1 },
      { unique: true, partialFilterExpression: { institutionalEmail: { $type: "string" }, kycStatus: "APPROVED" } },
    ),
    // Admin "pending KYC review" queue — sorted by submission time.
    db.collection("vendor_profiles").createIndex({ kycStatus: 1, verificationTier: 1 }),

    // ─── Vendor wallets + payouts ─────────────────────────────────────
    // One vendor wallet per vendor — enforced by a unique index on vendorId.
    db.collection("vendor_wallets").createIndex({ vendorId: 1 }, { unique: true }),
    // Ledger entries — hot path is "list entries for this wallet, recent first".
    db.collection("vendor_wallet_ledger_entries").createIndex({ vendorWalletId: 1, createdAt: -1 }),
    // Payouts — lookup by vendorId (vendor history) + by reference (webhook).
    db.collection("payouts").createIndex({ vendorId: 1, createdAt: -1 }),
    db.collection("payouts").createIndex({ reference: 1 }, { unique: true, sparse: true }),
    db.collection("payouts").createIndex({ transferCode: 1 }, { sparse: true }),
  ];
  await Promise.all(tasks);
}

// ─── ID generation ───────────────────────────────────────────────────────

/**
 * Generate a 24-char lowercase hex id, mimicking the format of
 * Prisma's cuid() output (which is what the existing client-side code
 * and external references expect). Not a real cuid, but the same shape
 * — 24 chars, hex, monotonically-sortable-ish.
 */
export function generateId(): string {
  // 12 bytes → 24 hex chars. Same length as ObjectId.toString().
  // We use randomBytes for simplicity; ObjectId would also work.
  return randomBytes(12).toString("hex");
}

// ─── Model registry ──────────────────────────────────────────────────────

type RelationKind = "1:1" | "1:many";

/**
 * All model names (camelCase, matching the `db.<model>` accessors).
 *
 * Defined as an explicit literal union BEFORE the `MODELS` constant to
 * break what would otherwise be a circular type reference (`MODELS:
 * Record<ModelName, ...>` references `ModelName`, and `type ModelName
 * = keyof typeof MODELS` would reference `MODELS`). Literal unions are
 * also faster for TS to resolve than `keyof typeof` queries.
 */
type ModelName =
  | "user"
  | "vendorProfile"
  | "product"
  | "provider"
  | "service"
  | "serviceJob"
  | "order"
  | "riderProfile"
  | "vehicle"
  | "ride"
  | "riderJob"
  | "wallet"
  | "walletLedgerEntry"
  | "payment"
  | "follow"
  | "notification"
  | "verificationOtp"
  | "vendorWallet"
  | "vendorWalletLedgerEntry"
  | "payout";

interface RelationSpec {
  /** Field name on the parent document (e.g. "vendor" on Product). */
  as: string;
  /** Foreign-key field on the parent (e.g. "vendorId" on Product). */
  fk: string;
  /** Target model name. */
  model: ModelName;
  /** "1:1" → at most one related document; "1:many" → array. */
  kind: RelationKind;
}

interface ModelSpec {
  collection: string;
  /** Prisma model field that maps to this collection (camelCase). */
  idField: string;
  /** Foreign-key field for relations, e.g. { vendorProfile: { model: "vendorProfile", fk: "id", localFk: "vendorProfileId" } } */
  relations: Record<string, RelationSpec>;
}

/**
 * Map of Prisma model names (camelCase, as used in db.user,
 * db.vendorProfile, etc.) to their MongoDB collection + relation specs.
 *
 * Relations here are the ones the API routes actually `include`. We
 * don't need to model every relation in the Prisma schema — only the
 * ones that get queried.
 */
const MODELS: Record<ModelName, ModelSpec> = {
  user: {
    collection: "users",
    idField: "id",
    relations: {
      // For 1:1 relations where the child holds the FK back to the
      // parent (e.g. a RiderProfile has `userId` pointing to a User),
      // `fk` is the field on the CHILD model. populateRelations uses
      // this to look up children by parent id.
      vendorProfile: { as: "vendorProfile", fk: "userId", model: "vendorProfile", kind: "1:1" },
      providerProfile: { as: "providerProfile", fk: "userId", model: "provider", kind: "1:1" },
      riderProfile: { as: "riderProfile", fk: "userId", model: "riderProfile", kind: "1:1" },
      wallet: { as: "wallet", fk: "userId", model: "wallet", kind: "1:1" },
      orders: { as: "orders", fk: "customerId", model: "order", kind: "1:many" },
      rides: { as: "rides", fk: "customerId", model: "ride", kind: "1:many" },
    },
  },
  vendorProfile: {
    collection: "vendor_profiles",
    idField: "id",
    relations: {
      user: { as: "user", fk: "userId", model: "user", kind: "1:1" },
      products: { as: "products", fk: "vendorId", model: "product", kind: "1:many" },
      orders: { as: "orders", fk: "vendorId", model: "order", kind: "1:many" },
    },
  },
  product: {
    collection: "products",
    idField: "id",
    relations: {
      vendor: { as: "vendor", fk: "vendorId", model: "vendorProfile", kind: "1:1" },
    },
  },
  provider: {
    collection: "providers",
    idField: "id",
    relations: {
      user: { as: "user", fk: "userId", model: "user", kind: "1:1" },
      services: { as: "services", fk: "providerId", model: "service", kind: "1:many" },
      jobs: { as: "jobs", fk: "providerId", model: "serviceJob", kind: "1:many" },
    },
  },
  service: {
    collection: "services",
    idField: "id",
    relations: {
      provider: { as: "provider", fk: "providerId", model: "provider", kind: "1:1" },
    },
  },
  serviceJob: {
    collection: "service_jobs",
    idField: "id",
    relations: {
      provider: { as: "provider", fk: "providerId", model: "provider", kind: "1:1" },
    },
  },
  order: {
    collection: "orders",
    idField: "id",
    relations: {
      customer: { as: "customer", fk: "customerId", model: "user", kind: "1:1" },
      vendor: { as: "vendor", fk: "vendorId", model: "vendorProfile", kind: "1:1" },
      riderJobs: { as: "riderJobs", fk: "orderId", model: "riderJob", kind: "1:many" },
    },
  },
  riderProfile: {
    collection: "rider_profiles",
    idField: "id",
    relations: {
      user: { as: "user", fk: "userId", model: "user", kind: "1:1" },
      vehicle: { as: "vehicle", fk: "riderId", model: "vehicle", kind: "1:1" },
      rides: { as: "rides", fk: "riderId", model: "ride", kind: "1:many" },
      riderJobs: { as: "riderJobs", fk: "riderId", model: "riderJob", kind: "1:many" },
    },
  },
  vehicle: {
    collection: "vehicles",
    idField: "id",
    relations: {
      rider: { as: "rider", fk: "riderId", model: "riderProfile", kind: "1:1" },
    },
  },
  ride: {
    collection: "rides",
    idField: "id",
    relations: {
      customer: { as: "customer", fk: "customerId", model: "user", kind: "1:1" },
      rider: { as: "rider", fk: "riderId", model: "riderProfile", kind: "1:1" },
      riderJobs: { as: "riderJobs", fk: "rideId", model: "riderJob", kind: "1:many" },
    },
  },
  riderJob: {
    collection: "rider_jobs",
    idField: "id",
    relations: {
      rider: { as: "rider", fk: "riderId", model: "riderProfile", kind: "1:1" },
      order: { as: "order", fk: "orderId", model: "order", kind: "1:1" },
      ride: { as: "ride", fk: "rideId", model: "ride", kind: "1:1" },
    },
  },
  wallet: {
    collection: "wallets",
    idField: "id",
    relations: {
      user: { as: "user", fk: "userId", model: "user", kind: "1:1" },
      entries: { as: "entries", fk: "walletId", model: "walletLedgerEntry", kind: "1:many" },
    },
  },
  walletLedgerEntry: {
    collection: "wallet_ledger_entries",
    idField: "id",
    relations: {
      wallet: { as: "wallet", fk: "walletId", model: "wallet", kind: "1:1" },
    },
  },
  payment: {
    collection: "payments",
    idField: "id",
    relations: {},
  },
  follow: {
    collection: "follows",
    idField: "id",
    relations: {
      user: { as: "user", fk: "userId", model: "user", kind: "1:1" },
    },
  },
  notification: {
    collection: "notifications",
    idField: "id",
    relations: {
      user: { as: "user", fk: "userId", model: "user", kind: "1:1" },
    },
  },
  verificationOtp: {
    collection: "verification_otps",
    idField: "id",
    relations: {},
  },
  vendorWallet: {
    collection: "vendor_wallets",
    idField: "id",
    relations: {
      vendor: { as: "vendor", fk: "vendorId", model: "vendorProfile", kind: "1:1" },
      entries: { as: "entries", fk: "vendorWalletId", model: "vendorWalletLedgerEntry", kind: "1:many" },
    },
  },
  vendorWalletLedgerEntry: {
    collection: "vendor_wallet_ledger_entries",
    idField: "id",
    relations: {
      vendorWallet: { as: "vendorWallet", fk: "vendorWalletId", model: "vendorWallet", kind: "1:1" },
    },
  },
  payout: {
    collection: "payouts",
    idField: "id",
    relations: {
      vendor: { as: "vendor", fk: "vendorId", model: "vendorProfile", kind: "1:1" },
    },
  },
};

// ─── Query translation ──────────────────────────────────────────────────

/**
 * Translate a Prisma-style `where` clause into a MongoDB filter.
 *
 * Supported operators (the subset Rush actually uses):
 *   { field: value }                      → equality
 *   { field: { not: value } }             → $ne
 *   { field: { in: [...] } }              → $in
 *   { field: { notIn: [...] } }            → $nin
 *   { field: { contains: "x" } }           → regex (case-insensitive)
 *   { field: { gte: n } }                  → $gte
 *   { field: { lte: n } }                  → $lte
 *   { field: { gt: n } }                   → $gt
 *   { field: { lt: n } }                   → $lt
 *   { AND: [...] }                         → $and
 *   { OR: [...] }                          → $or
 *   { field: null }                        → { field: null }  (matches missing or null)
 *   { field: { not: null } }                → { field: { $ne: null } }
 */
function translateWhere(where: any): Record<string, any> {
  if (!where || typeof where !== "object") return {};
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(where)) {
    if (key === "AND") {
      out.$and = (value as any[]).map(translateWhere);
      continue;
    }
    if (key === "OR") {
      out.$or = (value as any[]).map(translateWhere);
      continue;
    }
    if (key === "NOT") {
      out.$nor = (value as any[]).map(translateWhere);
      continue;
    }
    if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date) && !(value instanceof ObjectId)) {
      const sub: Record<string, any> = {};
      for (const [op, opVal] of Object.entries(value as object)) {
        switch (op) {
          case "not":
            sub.$ne = opVal;
            break;
          case "in":
            sub.$in = opVal;
            break;
          case "notIn":
            sub.$nin = opVal;
            break;
          case "contains":
            // Escape regex metacharacters so user input is treated as literal.
            sub.$regex = escapeRegex(String(opVal));
            sub.$options = "i";
            break;
          case "startsWith":
            sub.$regex = "^" + escapeRegex(String(opVal));
            sub.$options = "i";
            break;
          case "endsWith":
            sub.$regex = escapeRegex(String(opVal)) + "$";
            sub.$options = "i";
            break;
          case "equals":
            sub.$eq = opVal;
            break;
          case "gt":
            sub.$gt = opVal;
            break;
          case "gte":
            sub.$gte = opVal;
            break;
          case "lt":
            sub.$lt = opVal;
            break;
          case "lte":
            sub.$lte = opVal;
            break;
          case "mode":
            // Prisma's `mode: "insensitive"` is implicit in our regex translation.
            break;
          default:
            // Unknown operator — pass through verbatim. Lets us ignore
            // Prisma-specific relation filters without crashing.
            sub[`$${op}`] = opVal;
        }
      }
      if (Object.keys(sub).length === 0) {
        // Empty operator object — treat as equality with the object.
        out[key] = value;
      } else {
        out[key] = sub;
      }
    } else {
      out[key] = value;
    }
  }
  return out;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Translate a Prisma `orderBy` clause into a MongoDB sort spec.
 *   { createdAt: "desc" }  → { createdAt: -1 }
 *   { field: "asc" }       → { field: 1 }
 */
function translateOrderBy(orderBy: any): Record<string, 1 | -1> {
  if (!orderBy) return {};
  if (typeof orderBy === "string") {
    return { [orderBy]: 1 };
  }
  const out: Record<string, 1 | -1> = {};
  for (const [k, v] of Object.entries(orderBy)) {
    out[k] = v === "desc" ? -1 : 1;
  }
  return out;
}

// ─── Data preparation ────────────────────────────────────────────────────

/**
 * Recursively walk a `data` object used in create()/update() and apply
 * Prisma-compatible transformations:
 *   - Generate an `id` if missing on create
 *   - Set createdAt/updatedAt if missing on create
 *   - Set updatedAt on update
 *   - Inline nested writes: { wallet: { create: {...} } } → create the
 *     related doc and replace with the foreign key. (Limited support;
 *     covers the Rush usage patterns.)
 *
 * Deferred nested writes are stashed on the returned object under the
 * `__deferred__` key as an array of { kind: "create"|"upsert", rel, value }
 * records. The caller's create()/update() method is responsible for
 * executing them after the parent doc has been persisted (so the parent's
 * id is known).
 */
interface DeferredWrite {
  kind: "create" | "upsert" | "update" | "connect";
  rel: RelationSpec;
  value: any;
}

async function prepareCreateData(model: ModelName, data: any): Promise<any> {
  const spec = MODELS[model];
  const out: Record<string, any> = {};
  const deferred: DeferredWrite[] = [];
  const now = new Date();
  for (const [key, value] of Object.entries(data ?? {})) {
    if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      const nestedCreate = (value as any).create;
      const nestedConnect = (value as any).connect;
      const nestedUpsert = (value as any).upsert;
      const rel = spec.relations[key];

      if (rel && nestedConnect !== undefined) {
        // connect: link to an existing related document by its id.
        const connectWhere = nestedConnect;
        const connectId = connectWhere.id ?? connectWhere[Object.keys(connectWhere)[0]];
        if (connectId !== undefined) {
          // Determine which field on THIS document should hold the FK.
          // For Rush's schema, when the parent holds the FK (e.g.
          // Product.vendorId), the local field is `${relName}Id`.
          // For relations where the child holds the FK (e.g. Wallet.userId),
          // there's no local FK to set — we'd need to create/connect the
          // child separately. We handle that by falling through to the
          // "create" path with connect semantics if needed.
          if (`${key}Id` in (spec as any)) {
            out[`${key}Id`] = connectId;
          } else {
            // Convention: Rush's schema always uses `${relName}Id` as
            // the local FK when the parent holds it. If that field
            // doesn't exist in the spec, assume the child holds the FK
            // and defer the connect.
            deferred.push({ kind: "connect", rel, value: nestedConnect });
          }
        }
        continue;
      }
      if (rel && nestedCreate !== undefined) {
        deferred.push({ kind: "create", rel, value: nestedCreate });
        continue;
      }
      if (rel && nestedUpsert !== undefined) {
        deferred.push({ kind: "upsert", rel, value: nestedUpsert });
        continue;
      }
    }
    out[key] = value;
  }
  if (!out.id) out.id = generateId();
  if (!out.createdAt) out.createdAt = now;
  if (!out.updatedAt) out.updatedAt = now;
  out.__deferred__ = deferred;
  return out;
}

/**
 * Translate a Prisma `data` object for update() into a MongoDB update
 * document. Handles:
 *   - Scalar field sets
 *   - Atomic number ops: { field: { increment: n } } / decrement /
 *     multiply / divide → translated to Mongo $inc / $mul.
 *   - Nested updates like { vehicle: { update: { plate: "..." } } }
 *   - Nested connects/creates/upserts (deferred to run after the parent
 *     is updated)
 *
 * Returns an object with $set, $inc, $mul, deferred. Callers must
 * merge them into a single Mongo update doc — Mongo rejects an update
 * that mixes $set on field X with $inc on field X, but $set + $inc
 * on different fields is fine.
 */
async function prepareUpdateData(
  model: ModelName,
  data: any,
): Promise<{
  $set: Record<string, any>;
  $inc: Record<string, number>;
  $mul: Record<string, number>;
  deferred: Array<(parentId: string) => Promise<void>>;
}> {
  const spec = MODELS[model];
  const $set: Record<string, any> = {};
  const $inc: Record<string, number> = {};
  const $mul: Record<string, number> = {};
  const deferred: Array<(parentId: string) => Promise<void>> = [];
  for (const [key, value] of Object.entries(data ?? {})) {
    if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      // Prisma atomic number operators: { field: { increment: n } }
      // etc. These work on numeric fields and translate to Mongo's
      // $inc / $mul. We check for them BEFORE the relation path
      // because they look like objects.
      if ("increment" in value && typeof value.increment === "number") {
        $inc[key] = ($inc[key] ?? 0) + value.increment;
        continue;
      }
      if ("decrement" in value && typeof value.decrement === "number") {
        $inc[key] = ($inc[key] ?? 0) - value.decrement;
        continue;
      }
      if ("multiply" in value && typeof value.multiply === "number") {
        $mul[key] = value.multiply;
        continue;
      }
      if ("divide" in value && typeof value.divide === "number") {
        // Mongo's $mul accepts a fraction — divide by N == multiply by 1/N.
        $mul[key] = 1 / value.divide;
        continue;
      }

      const nestedUpdate = (value as any).update;
      const nestedConnect = (value as any).connect;
      const nestedCreate = (value as any).create;
      const nestedUpsert = (value as any).upsert;
      const rel = spec.relations[key];

      if (rel && nestedConnect !== undefined) {
        const connectWhere = nestedConnect;
        const connectId = connectWhere.id ?? connectWhere[Object.keys(connectWhere)[0]];
        if (connectId !== undefined) {
          $set[`${key}Id`] = connectId;
        }
        continue;
      }
      if (rel && nestedUpdate !== undefined) {
        // Defer the nested update so we know the parent's id.
        deferred.push(async (parentId: string) => {
          await getModelDelegate(rel.model).updateMany({
            where: { [rel.fk]: parentId } as any,
            data: nestedUpdate,
          });
        });
        continue;
      }
      if (rel && nestedCreate !== undefined) {
        deferred.push(async (parentId: string) => {
          await getModelDelegate(rel.model).create({
            data: { ...nestedCreate, [rel.fk]: parentId },
          });
        });
        continue;
      }
      if (rel && nestedUpsert !== undefined) {
        deferred.push(async (parentId: string) => {
          await getModelDelegate(rel.model).upsert({
            where: { [rel.fk]: parentId } as any,
            create: { ...nestedUpsert.create, [rel.fk]: parentId },
            update: nestedUpsert.update,
          });
        });
        continue;
      }
    }
    $set[key] = value;
  }
  $set.updatedAt = new Date();
  return { $set, $inc, $mul, deferred };
}

// ─── Relation resolution (include) ────────────────────────────────────────

async function populateRelations(
  model: ModelName,
  docs: any[],
  include: Record<string, any> | undefined,
): Promise<void> {
  if (!include || docs.length === 0) return;
  const spec = MODELS[model];
  for (const [relName, relInclude] of Object.entries(include)) {
    // Prisma's `_count: { select: { products: true, orders: true } }`
    // asks for per-doc counts of related rows. We emulate it by
    // running one count query per relation per parent id batch.
    // Previously this was silently dropped, which broke the three
    // admin-list routes that read `v._count.products` etc. (they
    // would crash with `Cannot read properties of undefined`).
    if (relName === "_count") {
      const selectMap =
        typeof relInclude === "object" && relInclude?.select
          ? relInclude.select
          : null;
      if (!selectMap) continue;
      // For each requested relation, batch-count by parent id.
      for (const countRelName of Object.keys(selectMap)) {
        const rel = spec.relations[countRelName];
        if (!rel) continue;
        const parentIds = unique(docs.map((d) => d.id).filter(Boolean));
        if (parentIds.length === 0) {
          docs.forEach((d) => {
            if (!d._count) d._count = {};
            d._count[countRelName] = 0;
          });
          continue;
        }
        // Child-collection case (1:many). For 1:1 the count is
        // always 0 or 1; we compute it the same way for simplicity.
        const childCol = await getDb().then((db) => db.collection(MODELS[rel.model].collection));
        const counts = await childCol.aggregate([
          { $match: { [rel.fk]: { $in: parentIds } } },
          { $group: { _id: `$${rel.fk}`, count: { $sum: 1 } } },
        ]).toArray();
        const countMap = new Map<string, number>(
          counts.map((c: any) => [c._id, c.count]),
        );
        docs.forEach((d) => {
          if (!d._count) d._count = {};
          d._count[countRelName] = countMap.get(d.id) ?? 0;
        });
      }
      continue;
    }

    const rel = spec.relations[relName];
    if (!rel) continue;
    // Determine the set of parent ids we need to look up.
    // For 1:1 relations where the child holds the FK, we query the
    // child collection by fk IN parentIds.
    // For relations where the parent holds the FK (e.g. Product.vendor),
    // the FK field is `${relName}Id` on the parent — we look up by
    // child.id IN parent.fkValues.
    const parentFkField = `${relName}Id`;
    const isParentFk = docs.some((d) => d[parentFkField] !== undefined);

    if (rel.kind === "1:1") {
      if (isParentFk) {
        const fkValues = unique(docs.map((d) => d[parentFkField]).filter(Boolean));
        if (fkValues.length === 0) {
          docs.forEach((d) => (d[relName] = null));
          continue;
        }
        const children = await getModelDelegate(rel.model).findManyRaw({
          filter: { id: { $in: fkValues } },
        });
        const byId = new Map(children.map((c) => [c.id, c]));
        docs.forEach((d) => {
          d[relName] = byId.get(d[parentFkField]) ?? null;
        });
        // Recursively populate nested includes on children.
        const nestedInclude = typeof relInclude === "object" && relInclude?.include ? relInclude.include : undefined;
        if (nestedInclude) {
          await populateRelations(rel.model, children, nestedInclude);
        }
      } else {
        // Child holds the FK back to parent.
        const parentIds = unique(docs.map((d) => d.id).filter(Boolean));
        if (parentIds.length === 0) {
          docs.forEach((d) => (d[relName] = null));
          continue;
        }
        const children = await getModelDelegate(rel.model).findManyRaw({
          filter: { [rel.fk]: { $in: parentIds } },
        });
        const byParent = new Map<string, any>();
        for (const c of children) {
          byParent.set(c[rel.fk], c);
        }
        docs.forEach((d) => {
          d[relName] = byParent.get(d.id) ?? null;
        });
        const nestedInclude = typeof relInclude === "object" && relInclude?.include ? relInclude.include : undefined;
        if (nestedInclude) {
          await populateRelations(rel.model, children, nestedInclude);
        }
      }
    } else {
      // 1:many — child holds FK back to parent.
      const parentIds = unique(docs.map((d) => d.id).filter(Boolean));
      if (parentIds.length === 0) {
        docs.forEach((d) => (d[relName] = []));
        continue;
      }
      let children = await getModelDelegate(rel.model).findManyRaw({
        filter: { [rel.fk]: { $in: parentIds } },
      });
      // Apply nested orderBy/take if specified.
      if (typeof relInclude === "object" && relInclude?.orderBy) {
        const sortSpec = translateOrderBy(relInclude.orderBy);
        const sortEntries = Object.entries(sortSpec);
        if (sortEntries.length > 0) {
          children = children.sort((a: any, b: any) => {
            for (const [field, dir] of sortEntries) {
              if (a[field] < b[field]) return -1 * dir;
              if (a[field] > b[field]) return 1 * dir;
            }
            return 0;
          });
        }
      }
      const byParent = new Map<string, any[]>();
      for (const c of children) {
        const list = byParent.get(c[rel.fk]) ?? [];
        list.push(c);
        byParent.set(c[rel.fk], list);
      }
      docs.forEach((d) => {
        d[relName] = byParent.get(d.id) ?? [];
      });
      const nestedInclude = typeof relInclude === "object" && relInclude?.include ? relInclude.include : undefined;
      if (nestedInclude) {
        await populateRelations(rel.model, children, nestedInclude);
      }
    }
  }
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

// ─── Field projection (select) ───────────────────────────────────────────

function translateSelect(select: Record<string, boolean> | undefined): Record<string, 1 | 0> | undefined {
  if (!select) return undefined;
  const out: Record<string, 1 | 0> = {};
  let hasTrue = false;
  let hasFalse = false;
  for (const [k, v] of Object.entries(select)) {
    if (v) { out[k] = 1; hasTrue = true; }
    else { out[k] = 0; hasFalse = true; }
  }
  // MongoDB requires consistent 0/1 (except for _id). If the caller
  // mixed them, prefer inclusion (1).
  if (hasTrue && hasFalse) {
    for (const k of Object.keys(out)) {
      if (out[k] === 0) delete out[k];
    }
    out.id = 1;
  }
  // Always include id so callers can reference it.
  out.id = 1;
  return out;
}

// ─── Model delegate ──────────────────────────────────────────────────────

interface ModelDelegate {
  findUnique(args: any): Promise<any | null>;
  findFirst(args: any): Promise<any | null>;
  findMany(args: any): Promise<any[]>;
  findManyRaw(args: { filter: any; sort?: any; limit?: number; skip?: number; projection?: any }): Promise<any[]>;
  count(args?: any): Promise<number>;
  create(args: any): Promise<any>;
  createMany(args: { data: any | any[] }): Promise<{ count: number }>;
  update(args: any): Promise<any>;
  updateMany(args: any): Promise<{ count: number }>;
  delete(args: any): Promise<any>;
  deleteMany(args: any): Promise<{ count: number }>;
  upsert(args: any): Promise<any>;
}

function getModelDelegate(model: ModelName): ModelDelegate {
  const spec = MODELS[model];

  async function collection(): Promise<Collection> {
    const db = await getDb();
    return db.collection(spec.collection);
  }

  return {
    async findUnique(args: any): Promise<any | null> {
      const col = await collection();
      const filter = translateWhere(args?.where ?? {});
      const projection = translateSelect(args?.select);
      let doc = await col.findOne(filter, projection ? { projection } : undefined);
      if (!doc) return null;
      doc = stripMongo(doc);
      if (args?.include) {
        await populateRelations(model, [doc], args.include);
      }
      if (args?.select) {
        return projectSelect(doc, args.select);
      }
      return doc;
    },

    async findFirst(args: any): Promise<any | null> {
      const col = await collection();
      const filter = translateWhere(args?.where ?? {});
      const sort = translateOrderBy(args?.orderBy);
      const projection = translateSelect(args?.select);
      let doc = await col.findOne(filter, {
        ...(sort ? { sort } : {}),
        ...(projection ? { projection } : {}),
      });
      if (!doc) return null;
      doc = stripMongo(doc);
      if (args?.include) {
        await populateRelations(model, [doc], args.include);
      }
      if (args?.select) {
        return projectSelect(doc, args.select);
      }
      return doc;
    },

    async findMany(args: any): Promise<any[]> {
      const col = await collection();
      const filter = translateWhere(args?.where ?? {});
      const sort = translateOrderBy(args?.orderBy);
      const projection = translateSelect(args?.select);
      let cursor = col.find(filter, projection ? { projection } : undefined);
      if (sort && Object.keys(sort).length > 0) cursor = cursor.sort(sort);
      if (typeof args?.skip === "number") cursor = cursor.skip(args.skip);
      if (typeof args?.take === "number") {
        if (args.take < 0) {
          // Prisma: negative take means "last N" — sort desc, take abs, then reverse.
          cursor = cursor.sort(sort && Object.keys(sort).length > 0 ? invertSort(sort) : { createdAt: -1 });
          cursor = cursor.limit(Math.abs(args.take));
        } else {
          cursor = cursor.limit(args.take);
        }
      }
      if (args?.distinct) {
        // Emulate distinct on the client. Only useful for small result sets.
        const docs = await cursor.toArray();
        const seen = new Set();
        const out: any[] = [];
        for (const d of docs) {
          const k = args.distinct.map((f: string) => d[f]).join("|");
          if (seen.has(k)) continue;
          seen.add(k);
          out.push(d);
        }
        const stripped = out.map(stripMongo);
        if (args?.include) await populateRelations(model, stripped, args.include);
        return args?.select ? stripped.map((d) => projectSelect(d, args.select)) : stripped;
      }
      let docs = await cursor.toArray();
      docs = docs.map(stripMongo);
      if (args?.include) await populateRelations(model, docs, args.include);
      return args?.select ? docs.map((d) => projectSelect(d, args.select)) : docs;
    },

    async findManyRaw(args: { filter: any; sort?: any; limit?: number; skip?: number; projection?: any }): Promise<any[]> {
      const col = await collection();
      let cursor = col.find(args.filter, args.projection ? { projection: args.projection } : undefined);
      if (args.sort) cursor = cursor.sort(args.sort);
      if (typeof args.skip === "number") cursor = cursor.skip(args.skip);
      if (typeof args.limit === "number") cursor = cursor.limit(args.limit);
      const docs = await cursor.toArray();
      return docs.map(stripMongo);
    },

    async count(args?: any): Promise<number> {
      const col = await collection();
      const filter = translateWhere(args?.where ?? {});
      return col.countDocuments(filter);
    },

    async create(args: any): Promise<any> {
      const col = await collection();
      const data = await prepareCreateData(model, args.data);
      // Pull out deferred nested writes.
      const deferred: DeferredWrite[] = data.__deferred__ ?? [];
      delete data.__deferred__;
      await col.insertOne(data);
      // Execute deferred nested writes (creates, upserts, connects).
      for (const d of deferred) {
        if (d.kind === "create") {
          await getModelDelegate(d.rel.model).create({
            data: { ...d.value, [d.rel.fk]: data.id },
          });
        } else if (d.kind === "upsert") {
          await getModelDelegate(d.rel.model).upsert({
            where: { [d.rel.fk]: data.id } as any,
            create: { ...d.value.create, [d.rel.fk]: data.id },
            update: d.value.update,
          });
        } else if (d.kind === "connect") {
          const connectId = d.value.id ?? d.value[Object.keys(d.value)[0]];
          if (connectId !== undefined) {
            await getModelDelegate(d.rel.model).update({
              where: { id: connectId },
              data: { [d.rel.fk]: data.id } as any,
            });
          }
        }
      }
      // Re-fetch the created doc so nested relations are populated if include was requested.
      if (args.include || args.select) {
        return getModelDelegate(model).findUnique({
          where: { id: data.id },
          include: args.include,
          select: args.select,
        });
      }
      return stripMongo(data);
    },

    async createMany(args: { data: any | any[] }): Promise<{ count: number }> {
      const col = await collection();
      const arr = Array.isArray(args.data) ? args.data : [args.data];
      const prepared = await Promise.all(arr.map((d) => prepareCreateData(model, d)));
      if (prepared.length === 0) return { count: 0 };
      const result = await col.insertMany(prepared);
      return { count: result.insertedCount };
    },

    async update(args: any): Promise<any> {
      const col = await collection();
      const filter = translateWhere(args.where ?? {});
      const updatePayload = await prepareUpdateData(model, args.data);
      // We need the doc's id to run nested updates. Fetch first.
      const existing = await col.findOne(filter);
      if (!existing) {
        // Prisma throws P2025 in this case; we throw a JS error with the same code.
        const err = new Error("Record not found") as any;
        err.code = "P2025";
        throw err;
      }
      // Build the Mongo update doc. Mongo rejects mixed operators on
      // the same field (e.g. $set + $inc on `stock`), but on different
      // fields they coexist fine. Our prepareUpdateData already
      // separates them per-field.
      const mongoUpdate: Record<string, Record<string, unknown>> = {};
      if (Object.keys(updatePayload.$set).length > 0) mongoUpdate.$set = updatePayload.$set;
      if (Object.keys(updatePayload.$inc).length > 0) mongoUpdate.$inc = updatePayload.$inc;
      if (Object.keys(updatePayload.$mul).length > 0) mongoUpdate.$mul = updatePayload.$mul;
      const result = await col.findOneAndUpdate(
        { id: existing.id },
        mongoUpdate,
        { returnDocument: "after" },
      );
      const updated = stripMongo(result ?? { ...stripMongo(existing), ...updatePayload.$set });
      // Run deferred nested updates with the parent id.
      for (const fn of updatePayload.deferred) {
        await fn(existing.id);
      }
      if (args.include || args.select) {
        return getModelDelegate(model).findUnique({
          where: { id: existing.id },
          include: args.include,
          select: args.select,
        });
      }
      return updated;
    },

    async updateMany(args: any): Promise<{ count: number }> {
      const col = await collection();
      const filter = translateWhere(args.where ?? {});
      const updatePayload = await prepareUpdateData(model, args.data);
      // For updateMany we don't run deferred nested updates — Prisma's
      // updateMany doesn't support nested writes either. Strip them.
      const mongoUpdate: Record<string, Record<string, unknown>> = {};
      if (Object.keys(updatePayload.$set).length > 0) mongoUpdate.$set = updatePayload.$set;
      if (Object.keys(updatePayload.$inc).length > 0) mongoUpdate.$inc = updatePayload.$inc;
      if (Object.keys(updatePayload.$mul).length > 0) mongoUpdate.$mul = updatePayload.$mul;
      const result = await col.updateMany(filter, mongoUpdate);
      return { count: result.modifiedCount };
    },

    async delete(args: any): Promise<any> {
      const col = await collection();
      const filter = translateWhere(args.where ?? {});
      const existing = await col.findOne(filter);
      if (!existing) {
        const err = new Error("Record not found") as any;
        err.code = "P2025";
        throw err;
      }
      await col.deleteOne({ id: existing.id });
      return stripMongo(existing);
    },

    async deleteMany(args: any): Promise<{ count: number }> {
      const col = await collection();
      const filter = translateWhere(args.where ?? {});
      const result = await col.deleteMany(filter);
      return { count: result.deletedCount };
    },

    async upsert(args: any): Promise<any> {
      const col = await collection();
      const filter = translateWhere(args.where ?? {});
      const existing = await col.findOne(filter);
      if (existing) {
        if (args.update && Object.keys(args.update).length > 0) {
          const updatePayload = await prepareUpdateData(model, args.update);
          const mongoUpdate: Record<string, Record<string, unknown>> = {};
          if (Object.keys(updatePayload.$set).length > 0) mongoUpdate.$set = updatePayload.$set;
          if (Object.keys(updatePayload.$inc).length > 0) mongoUpdate.$inc = updatePayload.$inc;
          if (Object.keys(updatePayload.$mul).length > 0) mongoUpdate.$mul = updatePayload.$mul;
          if (Object.keys(mongoUpdate).length > 0) {
            await col.updateOne({ id: existing.id }, mongoUpdate);
          }
          for (const fn of updatePayload.deferred) {
            await fn(existing.id);
          }
        }
        return getModelDelegate(model).findUnique({ where: { id: existing.id }, include: args.include, select: args.select });
      }
      // Create.
      return getModelDelegate(model).create({ data: args.create, include: args.include, select: args.select });
    },
  };
}

function invertSort(sort: Record<string, 1 | -1>): Record<string, 1 | -1> {
  const out: Record<string, 1 | -1> = {};
  for (const [k, v] of Object.entries(sort)) out[k] = v === 1 ? -1 : 1;
  return out;
}

function stripMongo(doc: any): any {
  if (!doc) return doc;
  const out = { ...doc };
  // Strip the Mongo _id so callers don't see it.
  delete out._id;
  return out;
}

function projectSelect(doc: any, select: Record<string, boolean>): any {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(select)) {
    if (v && doc[k] !== undefined) out[k] = doc[k];
  }
  // Always include id.
  out.id = doc.id;
  return out;
}

// ─── Public db object ─────────────────────────────────────────────────────

/**
 * Interactive transaction. The callback receives a `tx` client that
 * behaves like the top-level `db` object — same model delegates, same
 * query syntax.
 *
 * Implementation note: MongoDB standalone deployments (Atlas free tier
 * before 4.0, or any non-replica-set deployment) don't support multi-
 * document ACID transactions. We don't have a Mongo session here, so
 * this isn't a true transaction — it runs the callback with the regular
 * `db` object and lets any thrown error propagate. The caller (e.g.
 * the rider-accept flow in `/api/rider-jobs/[id]/route.ts`) catches
 * `ConcurrencyError` itself and reconciles state with an out-of-band
 * updateMany.
 *
 * Why this exists at all: the call sites were written against Prisma's
 * `$transaction` API and use it for atomicity on single-document
 * updates (which Mongo *does* guarantee). The `updateMany` calls
 * inside the callback are atomic per-document; the multi-document
 * race the rider-accept code defends against is handled by the
 * `where: { status: "OFFERED" }` clause on the first updateMany.
 *
 * If you need true multi-doc ACID, deploy a Mongo replica set and
 * rewrite this to use `clientSession.withTransaction(...)`.
 */
async function $transaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
  // We pass the same `db` object as the tx client. Each operation
  // is atomic at the document level; the caller's `where` clauses
  // enforce the multi-step invariant.
  return fn(db);
}

export const db = {
  get user() { return getModelDelegate("user"); },
  get vendorProfile() { return getModelDelegate("vendorProfile"); },
  get product() { return getModelDelegate("product"); },
  get provider() { return getModelDelegate("provider"); },
  get service() { return getModelDelegate("service"); },
  get serviceJob() { return getModelDelegate("serviceJob"); },
  get order() { return getModelDelegate("order"); },
  get riderProfile() { return getModelDelegate("riderProfile"); },
  get vehicle() { return getModelDelegate("vehicle"); },
  get ride() { return getModelDelegate("ride"); },
  get riderJob() { return getModelDelegate("riderJob"); },
  get wallet() { return getModelDelegate("wallet"); },
  get walletLedgerEntry() { return getModelDelegate("walletLedgerEntry"); },
  get payment() { return getModelDelegate("payment"); },
  get follow() { return getModelDelegate("follow"); },
  get notification() { return getModelDelegate("notification"); },
  get verificationOtp() { return getModelDelegate("verificationOtp"); },
  get vendorWallet() { return getModelDelegate("vendorWallet"); },
  get vendorWalletLedgerEntry() { return getModelDelegate("vendorWalletLedgerEntry"); },
  get payout() { return getModelDelegate("payout"); },
  /** Connect eagerly and verify connectivity. Used by /api/health. */
  async $connect() { await connect(); },
  /** True when a MongoDB connection is currently cached. */
  isConnected(): boolean { return !!globalThis.__mongoCache?.client; },
  /**
   * Interactive transaction. See the docstring on the private
   * `$transaction` function above for caveats. Exposed so API routes
   * written against Prisma's API continue to compile and run.
   */
  $transaction,
};

export type DbClient = typeof db;

// ─── Bootstrap test (dev only) ───────────────────────────────────────────
//
// In development, it's useful to know early whether the MONGODB_URI
// actually works. We do NOT do this in production — the first request
// will surface any error.
if (process.env.NODE_ENV !== "production" && process.env.MONGODB_URI) {
  connect().catch((err) => {
    console.error("[mongo] initial connection failed:", err?.message ?? err);
  });
}
