import React from "react";
import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";
import { getOwnProfile } from "@/actions/profile";
import UserProfileClient from "@/components/profile/UserProfileClient";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DriverProfilePage() {
  await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN, Role.DRIVER, Role.STAFF] });
  const res = await getOwnProfile();

  if (!res.success || !res.data) {
    redirect("/driver/home");
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-6 lg:p-8">
      <UserProfileClient
        initialProfile={res.data}
        backUrl="/driver/home"
        portalTitle="Driver App"
      />
    </div>
  );
}
