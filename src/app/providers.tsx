"use client";

import React, { Suspense } from "react";
import { SessionProvider } from "next-auth/react";
import RouteProgressBar from "@/components/RouteProgressBar";

export function Providers({ children, session }: { children: React.ReactNode; session?: any }) {
  return (
    <SessionProvider session={session}>
      <Suspense fallback={null}>
        <RouteProgressBar />
      </Suspense>
      {children}
    </SessionProvider>
  );
}
