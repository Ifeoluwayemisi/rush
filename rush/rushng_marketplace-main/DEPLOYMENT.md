# Vercel / Rush deployment notes

This document summarizes everything required to deploy Rush to Vercel
after the Prisma → MongoDB migration.

## 1. Environment variables

Set the following in your Vercel project (Settings → Environment Variables).
Mark each as Production / Preview / Development as appropriate.

| Variable | Required? | Notes |
|---|---|---|
| `MONGODB_URI` | ✅ Required | MongoDB Atlas connection string, e.g. `mongodb+srv://user:pass@cluster.mongodb.net/rush?retryWrites=true&w=majority` |
| `MONGODB_DB` | Optional | Database name. Defaults to `rush`. |
| `JWT_SECRET` | ✅ Required | A long random string used to sign session JWTs. Use `openssl rand -hex 32`. |
| `FIREBASE_SERVICE_ACCOUNT` | Optional | Required only if you want Google Sign-In. Paste the entire service-account JSON (single line). |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Optional | Firebase client config — all six `NEXT_PUBLIC_FIREBASE_*` vars must be set together for the "Continue with Google" button to appear. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Optional | |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Optional | |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Optional | |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Optional | |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Optional | |
| `PAYSTACK_SECRET_KEY` | Optional | Required to actually charge cards. Without it the payments layer falls back to a mock. |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Optional | Same. |
| `NEXT_PUBLIC_APP_URL` | Optional | Auto-detected by Vercel; set explicitly only if you front Vercel with a custom domain. |

## 2. MongoDB Atlas setup

1. Create a free cluster at https://cloud.mongodb.com (M0 tier is fine
   for development).
2. Add a database user (Database Access → Add new user → password auth).
3. Allow Vercel IPs: Network Access → Add IP address → `0.0.0.0/0`
   (Atlas free tier doesn't support Vercel's specific IPs).
4. Click Connect → Drivers → Node.js → copy the connection string.
5. Set `MONGODB_URI` in Vercel with that string, replacing `<password>`
   with your database user's password.

## 3. Firebase setup (for Google Sign-In)

1. https://console.firebase.google.com → create a project.
2. Project Settings → General → Your apps → Web app → register the app
   with your Vercel domain in authorized domains.
3. Authentication → Sign-in method → Google → enable.
4. Add your Vercel domain to Authentication → Settings → Authorized
   domains.
5. Project Settings → Service Accounts → Generate new private key →
   copy the JSON.
6. Set `FIREBASE_SERVICE_ACCOUNT` in Vercel to the JSON contents.
7. Set the six `NEXT_PUBLIC_FIREBASE_*` vars.

## 4. OAuth flow

The OAuth flow is now redirect-based (no popup). User clicks
"Continue with Google" → browser navigates to accounts.google.com →
user picks account → Google redirectss back to the app → the
`AuthScreen` component picks up the redirect result on mount and
exchanges the Firebase ID token for a RUSH session cookie via
`/api/auth/firebase`.

The previous popup-based flow (`signInWithPopup`) was incompatible
with Safari ITP, mobile webviews, and corporate-network popup
blockers. The new flow works everywhere because it's a full-page
navigation.

## 5. Build & deploy

- Push to your `main` branch; Vercel auto-builds.
- The `vercel.json` file pins the framework to `nextjs` and sets
  the build command to `next build --webpack` (required because
  `@ducanh2912/next-pwa` injects a webpack config).
- MongoDB indexes are created automatically on first request via
  `ensureIndexes()` in `src/lib/db.ts`. No `prisma migrate` step
  is required.

## 6. Local development

```bash
bun install
bun run dev
```

You can also run `bun run db:init-mongo` once to verify the
connection and pre-create indexes:
```bash
MONGODB_URI=mongodb://localhost:27017 bun run scripts/init-mongodb.ts
```

## 7. Removed packages

The following were removed during the migration:
- `@prisma/client` — replaced by `mongodb` driver.
- `prisma` — no longer needed; `prisma/schema.prisma` and the
  `db/` SQLite directory were also deleted.

## 8. UI enhancements

A subtle ambient animated gradient background was added
(`src/components/AmbientBackground.tsx`) — three softly-drifting
radial blobs that sit at z-index -1 behind all app content. The
animation respects `prefers-reduced-motion: reduce`.
