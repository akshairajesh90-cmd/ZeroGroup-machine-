import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";
import { getTrashItems } from "@/actions/trash";
import TrashClient from "./TrashClient";

export const dynamic = "force-dynamic";

export default async function TrashPage() {
  const currentUser = await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN] });
  
  const response = await getTrashItems();
  const initialItems = response.success ? response.items || [] : [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Trash / Recycle Bin</h1>
        <p className="text-slate-400 mt-2">
          View all deleted records. You can restore them or permanently delete them here. Only Owners can permanently delete.
        </p>
      </div>

      <TrashClient initialItems={initialItems} currentUserRole={currentUser.role} />
    </div>
  );
}
