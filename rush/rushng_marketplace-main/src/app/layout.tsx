import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { QueryProvider } from "@/components/QueryProvider";
import { AmbientBackground } from "@/components/AmbientBackground";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rush — Shop, Services & Rides",
  description:
    "Rush is a single app for shopping from local vendors, hiring service providers, and booking rides. One account, multiple capabilities.",
  keywords: ["Rush", "marketplace", "Nigeria", "vendors", "rides", "services", "delivery"],
  authors: [{ name: "Rush" }],
  applicationName: "Rush",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Rush",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/pwa-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/pwa-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/icons/pwa-192.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#FF6B1A",
  // `appleWebApp` is a `Metadata` field in Next 16, not a `Viewport`
  // field — previously this caused a TS build error. The metadata
  // export above already sets it correctly.
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <AmbientBackground />
        <AppErrorBoundary>
          <QueryProvider>{children}</QueryProvider>
        </AppErrorBoundary>
        <Toaster />
      </body>
    </html>
  );
}
