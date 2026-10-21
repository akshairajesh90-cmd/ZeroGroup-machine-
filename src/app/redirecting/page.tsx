"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2, ShieldCheck } from "lucide-react";

export default function RedirectingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user) {
      router.replace("/");
      return;
    }

    const role = (session.user as any).role;
    if (role === "ADMIN" || role === "OWNER") {
      router.replace("/admin/dashboard");
    } else if (role === "STAFF") {
      router.replace("/staff/dashboard");
    } else if (role === "OPERATOR") {
      router.replace("/operator/home");
    } else if (role === "DRIVER") {
      router.replace("/driver/home");
    } else {
      router.replace("/");
    }
  }, [session, status, router]);

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 font-sans text-white">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-xl shadow-cyan-500/20">
          <ShieldCheck className="h-7 w-7 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight">Securing Portal Access...</h2>
          <p className="text-xs text-slate-400 mt-1">Connecting to Zero Group Operations Portal</p>
        </div>
        <Loader2 className="h-6 w-6 animate-spin text-cyan-400 mt-2" />
      </div>
    </div>
  );
}
