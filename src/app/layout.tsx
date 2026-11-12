import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "./providers";
import { auth } from "@/lib/auth";
import ImpersonateExitButton from "@/components/driver/ImpersonateExitButton";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://zero-group-machine.vercel.app"),
  title: {
    default: "ZERO GROUP — Heavy Machinery & Construction Plant Rentals | Kerala",
    template: "%s | ZERO GROUP Machinery",
  },
  description:
    "Commercial hydraulic concrete mixers, high-rise material hoists, needle vibrator rigs, and industrial de-watering pumps on hire across Kerala. Supplied directly from Central Yard with certified operators.",
  keywords: [
    "ZERO GROUP",
    "Zero Group machine",
    "Concrete mixer rental Kerala",
    "Heavy machinery hire Kottayam",
    "Material hoist rental Kerala",
    "Builder hoist hire Kerala",
    "Construction equipment rentals Ernakulam",
    "Needle vibrator rental Kerala",
    "Diesel de-watering pump rental",
    "Pala heavy equipment hire",
  ],
  authors: [{ name: "ZERO GROUP Heavy Machinery & Equipment Rentals" }],
  creator: "ZERO GROUP",
  publisher: "ZERO GROUP",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/icon.png",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "ZERO GROUP — Heavy Machinery & Construction Plant Rentals",
    description:
      "Commercial concrete mixers, vertical material hoists, vibrators, and de-watering pumps on hire across Kerala. Supplied with certified operators.",
    url: "https://zero-group-machine.vercel.app",
    siteName: "ZERO GROUP Machinery Rentals",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ZERO GROUP — Heavy Machinery & Plant Rentals",
    description: "Commercial concrete mixers, high-rise material hoists, and de-watering plant across Kerala.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ZERO GROUP",
  },
  verification: {
    google: "JAiXImG8borPKdvJ5e8YmrEFrL8Afu6_T7M3-wHByz4",
  },
};

export const viewport: Viewport = {
  themeColor: "#090d16",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const isImpersonating = (session?.user as any)?.isImpersonating === true;

  return (
    <html lang="en" className={cn("font-sans dark")}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-slate-100 flex flex-col min-h-screen`}
      >
        <Providers session={session}>
          {isImpersonating && (
            <div className="flex-none bg-red-600 text-white px-4 py-2 flex items-center justify-between shadow-xl z-[9999] border-b-2 border-red-800">
              <div className="flex items-center gap-2 font-bold text-sm tracking-wide">
                <span className="animate-pulse">⚠️</span>
                ADMIN OVERRIDE ACTIVE: Viewing as {session?.user?.name || session?.user?.email}
              </div>
              <ImpersonateExitButton />
            </div>
          )}
          {children}
        </Providers>
      </body>
    </html>
  );
}
