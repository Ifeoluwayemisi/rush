import { NextResponse } from "next/server";
import { activeDbBackend, dbBackendLabel, isMongoConfigured } from "@/lib/db-backend";
import { connect } from "@/lib/db";

/**
 * GET /api/health
 *
 * Lightweight DB reachability check. Used by:
 *   - the admin dashboard, to surface "API healthy" / "API degraded"
 *     in real time;
 *   - the client-side data layer (in development) to decide whether
 *     the mock fallback should be tried.
 *
 * Reports which persistence backend is active (always MongoDB now,
 * post-migration from Prisma/SQLite).
 *
 * This route is intentionally unauthenticated and does NOT fall back to
 * mock data — it's the source of truth for "is the server itself alive".
 */
export async function GET() {
  const start = Date.now();
  if (!isMongoConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        db: "down",
        backend: activeDbBackend,
        backendLabel: dbBackendLabel(),
        error: "MONGODB_URI is not set. Add it to your Vercel project env vars.",
        latencyMs: Date.now() - start,
        ts: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
  try {
    // A trivial MongoDB ping is enough to confirm the cluster is
    // reachable and our MongoClient is initialised.
    await connect();
    return NextResponse.json({
      ok: true,
      db: "up",
      backend: activeDbBackend,
      backendLabel: dbBackendLabel(),
      latencyMs: Date.now() - start,
      ts: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        db: "down",
        backend: activeDbBackend,
        backendLabel: dbBackendLabel(),
        error: err?.message || "DB unreachable",
        latencyMs: Date.now() - start,
        ts: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
