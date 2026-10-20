import React from "react";
import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";
import { getCredentialsDirectory } from "@/actions/credentials";
import CredentialsHubClient from "@/components/credentials/CredentialsHubClient";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function StaffCredentialsPage() {
  const session = await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN, Role.STAFF] });
  const res = await getCredentialsDirectory();

  if (!res.success || !res.data) {
    redirect("/staff/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-6 lg:p-8">
      <CredentialsHubClient
        initialEmployees={res.data as any}
        currentUserRole={session.role}
        backUrl="/staff/dashboard"
        hubTitle="Crew Verification & Credentials Hub"
      />
    </div>
  );
}
