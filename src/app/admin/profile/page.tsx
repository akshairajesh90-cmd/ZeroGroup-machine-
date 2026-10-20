import React from "react";
import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";
import { getOwnProfile } from "@/actions/profile";
import UserProfileClient from "@/components/profile/UserProfileClient";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminProfilePage() {
  await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN] });
  const res = await getOwnProfile();

  if (!res.success || !res.data) {
    redirect("/admin/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-6 lg:p-8">
      <UserProfileClient
        initialProfile={res.data}
        backUrl="/admin/dashboard"
        portalTitle="Admin Command Dashboard"
      />
    </div>
  );
}
