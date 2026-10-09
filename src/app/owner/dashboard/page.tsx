import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

export default async function OwnerDashboardRedirect() {
  await requireAuth({ allowedRoles: [Role.OWNER, Role.STAFF] });
  // The owner dashboard features are split into Settlements, Adjustments, Billing, etc.
  // If they hit this legacy route, gracefully send them to their primary dashboard
  redirect("/owner/settlements");
}
