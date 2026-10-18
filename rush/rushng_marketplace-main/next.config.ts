import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  workboxOptions: {
    disableDevLogs: true,
    // Prevents the service worker from attempting navigation fallbacks on /api/* routes
    navigateFallbackDenylist: [/^\/api\/.*/],
    // Only static build assets belong in exclude
    exclude: [
      /\.map$/,
      /^manifest.*\.js$/,
      /^server\/.*$/,
    ],
    // Runtime routing: Force all API and external auth endpoints to bypass the cache completely
    runtimeCaching: [
      {
        urlPattern: /^\/api\/.*/i,
        handler: "NetworkOnly",
        options: {
          backgroundSync: undefined,
        },
      },
      {
        urlPattern: /^https:\/\/(apis\.google\.com|accounts\.google\.com|.*\.firebaseio\.com|.*\.firebaseapp\.com|api\.paystack\.co)\/.*/i,
        handler: "NetworkOnly",
      },
    ],
  },
});

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1", "localhost", "*.space-z.ai"],
  serverExternalPackages: ["firebase-admin", "jwks-rsa", "jose"],
  turbopack: {},
  async headers() {
    const securityHeaders = [
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://apis.google.com https://www.google.com",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com",
          "img-src 'self' data: https: blob:",
          "connect-src 'self' https://*.googleapis.com https://apis.google.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://accounts.google.com https://www.google.com https://lh3.googleusercontent.com https://ui-avatars.com https://images.unsplash.com wss://*.firebaseio.com https://api.paystack.co",
          "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com https://js.paystack.co https://checkout.paystack.com",
          "frame-ancestors 'self'",
          "form-action 'self'",
          "base-uri 'self'",
          "object-src 'none'",
        ].join("; "),
      },
      { key: "Cross-Origin-Opener-Policy", value: "unsafe-none" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(self), payment=(self)",
      },
    ];

    return [
      ...securityHeaders.map((h) => ({ source: "/(.*)", headers: [h] })),
      {
        source: "/manifest.json",
        headers: [
          { key: "Content-Type", value: "application/manifest+json" },
          { key: "Cache-Control", value: "public, max-age=3600" },
        ],
      },
      {
        source: "/icons/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/uploads/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'none'" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

const pwaConfig = withPWA(nextConfig);
delete (pwaConfig as any).__esModule;

export default pwaConfig;
