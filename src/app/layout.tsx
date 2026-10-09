import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "./providers";

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
  title: "ZERO GROUP — Enterprise Equipment & Logistics",
  description: "Enterprise equipment rental ERP and field PWA for ZERO GROUP",
  manifest: "/manifest.json",
  robots: {
    index: false,
    follow: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ZG Driver",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

import { auth } from "@/lib/auth";
import ImpersonateExitButton from "@/components/driver/ImpersonateExitButton";

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
