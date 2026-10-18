import "server-only";

/**
 * Detect which persistence backend the API is currently configured to use.
 *
 * Post-migration: Rush is now MongoDB-only. This file is kept for
 * backward compatibility with code that still imports `dbBackendLabel`
 * (e.g. the admin "System" panel) — it always reports MongoDB now.
 */

export type DbBackend = "sqlite" | "mongodb";

export const activeDbBackend: DbBackend = "mongodb";

export function dbBackendLabel(): string {
  return "MongoDB Atlas";
}

export const isMongoDb = true;

/**
 * Returns true if a MONGODB_URI is configured. Used by /api/health to
 * surface a clear "DB not configured" status when env vars are missing.
 */
export function isMongoConfigured(): boolean {
  return Boolean(process.env.MONGODB_URI);
}
