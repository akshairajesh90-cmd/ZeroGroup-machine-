import React from "react";
import { getOrderFormData } from "@/actions/orders";
import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";
import OrderIntakeForm from "@/components/forms/OrderIntakeForm";
import { AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  // Enforce auth — OWNER and STAFF only
  await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN, Role.STAFF] });

  const data = await getOrderFormData();

  if (!data.success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl px-6 py-5 flex items-center gap-4 max-w-md">
          <AlertTriangle className="h-6 w-6 text-rose-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-rose-300">Failed to load order form</p>
            <p className="text-xs text-rose-400/70 mt-1">{data.error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <OrderIntakeForm
        customers={data.customers!}
        machines={data.machines!}
        employees={data.employees!}
        tools={data.tools!}
      />
    </div>
  );
}
