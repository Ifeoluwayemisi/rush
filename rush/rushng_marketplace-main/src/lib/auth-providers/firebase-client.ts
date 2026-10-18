"use client";

/**
 * Firebase client SDK initialization.
 *
 * Reads its config from `NEXT_PUBLIC_FIREBASE_*` env vars. When those
 * are unset, `firebaseConfig` is empty and `isFirebaseConfigured`
 * returns false — the auth abstraction then falls back to the
 * legacy email/password flow so the app still works in dev without a
 * Firebase project.
 *
 * To run against the Firebase Auth Emulator locally instead of a real
 * Firebase project, set `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST` to
 * e.g. "http://localhost:9099".
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * True when all 6 required Firebase client config values are present
 * and non-empty. Used by the auth abstraction to decide whether to
 * expose the Google Sign-In button.
 */
export const isFirebaseConfigured: boolean = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.storageBucket &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId,
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;

if (isFirebaseConfigured) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  // Ask for a fresh Google account picker every time — better UX for
  // multi-account users (a student with both a personal and a vendor
  // Google account).
  googleProvider.setCustomParameters({ prompt: "select_account" });

  // If the Firebase Auth Emulator is configured, point the SDK at it.
  const emulatorHost = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;
  if (emulatorHost && typeof window !== "undefined") {
    // connectAuthEmulator must be called on the client only.
    import("firebase/auth").then(({ connectAuthEmulator }) => {
      if (auth) connectAuthEmulator(auth, emulatorHost, { disableWarnings: true });
    });
  }
}

export { app as firebaseApp, auth as firebaseAuth, googleProvider as firebaseGoogleProvider };
