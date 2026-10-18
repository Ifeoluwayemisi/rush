/**
 * Promote a user to ADMIN.
 *
 * Usage:
 *   bun run scripts/make-admin.ts rush4service@gmail.com
 *   bun run db:admin rush4service@gmail.com    # via the package.json alias
 *
 * Auto-loads .env.local and .env from the project root (so you don't
 * need to manually export MONGODB_URI first).
 *
 * Behaviour:
 *   1. Load env from .env.local / .env if present.
 *   2. Connect to MongoDB via MONGODB_URI.
 *   3. Look up the user by email (case-insensitive).
 *   4. If the user doesn't exist, exit with a helpful message
 *      asking them to register first via the sign-in screen.
 *   5. If the user exists, parse their capabilities JSON, add the
 *      ADMIN capability with status ACTIVE if not already present,
 *      and persist back to the user record.
 *   6. Idempotent: running twice is a no-op the second time.
 *
 * Why this is a script and not an API route: the first admin can't
 * be created via the API because every admin-mutation endpoint
 * requires an existing admin to call it. This script is the
 * bootstrap — run it once on a fresh DB to seed the first admin.
 */

import { MongoClient } from "mongodb";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// ─── Auto-load .env.local / .env ──────────────────────────────────────────
// Walk from the script's directory up to the project root looking
// for .env.local or .env files. Simple KEY=VALUE parser — handles
// quoted values, # comments, blank lines. Doesn't handle the full
// dotenv spec (no variable interpolation, no multiline strings)
// but covers everything Rush's .env.example declares.
function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // Strip surrounding quotes (single or double).
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    // Don't overwrite — explicit process.env wins over .env file.
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

const PROJECT_ROOT = join(process.cwd());
loadEnvFile(join(PROJECT_ROOT, ".env.local"));
loadEnvFile(join(PROJECT_ROOT, ".env"));

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || "rush";

const email = process.argv[2];

if (!email) {
  console.error("Usage: bun run scripts/make-admin.ts <email>");
  console.error("Example: bun run scripts/make-admin.ts rush4service@gmail.com");
  process.exit(1);
}

if (!MONGODB_URI) {
  console.error(
    "MONGODB_URI is not set. Add it to .env.local (or your env) first —\n" +
      'e.g. MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/rush?retryWrites=true&w=majority"\n\n' +
      "Tip: this script auto-loads .env.local and .env from the project root.",
  );
  process.exit(1);
}

// Runtime-asserted const so TS narrows string|undefined → string
// (process.exit doesn't narrow).
const URI: string = MONGODB_URI;

interface Capability {
  type: string;
  status: string;
  profileId?: string;
}

function parseCapabilities(raw: string | null | undefined): Capability[] {
  if (!raw) return [{ type: "CUSTOMER", status: "ACTIVE" }];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as Capability[];
    return [{ type: "CUSTOMER", status: "ACTIVE" }];
  } catch {
    return [{ type: "CUSTOMER", status: "ACTIVE" }];
  }
}

async function main() {
  const client = new MongoClient(URI, {
    serverSelectionTimeoutMS: 10000,
  });
  console.log(
    `Connecting to MongoDB at ${URI.replace(/:\/\/[^@]+@/, "://***:***@")}...`,
  );
  await client.connect();
  const db = client.db(MONGODB_DB);
  console.log(`Connected. Database: ${db.databaseName}`);

  const users = db.collection("users");

  // Case-insensitive email lookup — emails are stored verbatim but
  // we don't want a typo (e.g. mixed case in the local part) to miss.
  const user = await users.findOne({
    email: { $regex: `^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
  });

  if (!user) {
    console.error(
      `\n❌ No user found with email "${email}".\n\n` +
        "Have them register first via the sign-in screen (/account → Sign in / Create account),\n" +
        "then re-run this script.\n\n" +
        "If you're sure the email is correct, check that MONGODB_URI points to the\n" +
        "right cluster and MONGODB_DB matches the database the app is using.",
    );
    await client.close();
    process.exit(1);
  }

  // Parse + add ADMIN capability if not present.
  const caps = parseCapabilities(user.capabilities as string | null);
  const existing = caps.find((c) => c.type === "ADMIN");
  if (existing && existing.status === "ACTIVE") {
    console.log(
      `\n✓ ${user.email} is already an admin (status=ACTIVE). Nothing to do.`,
    );
    await client.close();
    return;
  }

  if (existing) {
    // Promote from SUSPENDED/PENDING_VERIFICATION → ACTIVE.
    existing.status = "ACTIVE";
    console.log(`→ Promoted existing ADMIN capability to ACTIVE.`);
  } else {
    caps.push({ type: "ADMIN", status: "ACTIVE" });
    console.log(`→ Added ADMIN capability (status=ACTIVE).`);
  }

  await users.updateOne(
    { _id: user._id },
    {
      $set: {
        capabilities: JSON.stringify(caps),
        updatedAt: new Date(),
      },
    },
  );

  const otherCaps = caps.filter((c) => c.type !== "ADMIN").map((c) => `${c.type}=${c.status}`).join(", ");
  console.log(
    `\n✓ Done. ${user.email} is now an admin.\n` +
      "Sign in at /account — the Admin Panel tab will appear for this account.\n" +
      "Other capabilities on this account (untouched): " + (otherCaps || "(none)"),
  );

  await client.close();
}

main().catch((err) => {
  console.error("Admin promotion failed:", err?.message ?? err);
  process.exit(1);
});

