"use client";

import { useState } from "react";
import { CollectPaymentModal } from "./CollectPaymentModal";
import { Banknote } from "lucide-react";

export function CollectPaymentButton({ dispatchId }: { dispatchId: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-center gap-2 mt-3 py-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold transition-colors"
      >
        <Banknote className="w-5 h-5" /> 💵 Collect Payment
      </button>
      <CollectPaymentModal 
        dispatchId={dispatchId} 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
      />
    </>
  );
}
