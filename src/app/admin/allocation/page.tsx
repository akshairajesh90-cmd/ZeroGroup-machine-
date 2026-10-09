import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";
import AllocationClient from "./AllocationClient";

export const dynamic = "force-dynamic";

export default async function AllocationDashboardPage() {
  // Only OWNER, ADMIN, and STAFF can view financial allocation
  const session = await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN, Role.STAFF] });

  // Render the client component where all date filtering and data fetching happens
  return <AllocationClient userRole={session.role} />;
}
