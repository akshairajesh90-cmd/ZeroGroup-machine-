"use client";

import { XCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function ImpersonateExitButton() {
  const { update } = useSession();
  const router = useRouter();

  const handleExit = async () => {
    try {
      await update({ stopImpersonating: true });
      // Instantly bounce back to Owner dashboard
      router.push("/admin/dashboard");
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <button
      onClick={handleExit}
      className="flex items-center gap-1.5 bg-rose-950/40 hover:bg-rose-950/60 text-rose-100 px-3 py-1 rounded-full border border-rose-500/50 transition-colors text-xs font-bold"
    >
      <XCircle className="h-4 w-4" /> Exit
    </button>
  );
}
