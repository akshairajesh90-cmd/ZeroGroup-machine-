import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { revalidatePath } from "next/cache";
import { Users, Plus, IndianRupee, Phone, Calendar, Trash2 } from "lucide-react";

export const dynamic = "force-dynamic";

async function deleteSubLeader(formData: FormData) {
  "use server";
  await requireAuth({ allowedRoles: ["STAFF", "OWNER", "ADMIN"] });
  const id = formData.get("id") as string;
  if (id) {
    const count = await prisma.siteLaborDisbursement.count({ where: { subLeaderId: id } });
    if (count > 0) {
      throw new Error("Cannot delete sub-leader with existing financial disbursements.");
    }
    await prisma.externalSubLeader.delete({ where: { id } });
    revalidatePath("/staff/sub-leaders");
  }
}

async function createSubLeader(formData: FormData) {
  "use server";
  const { role } = await requireAuth({ allowedRoles: ["STAFF", "OWNER"] });
  
  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string;
  const rate = formData.get("defaultWorkerRate") as string;

  if (name && phone) {
    await prisma.externalSubLeader.create({
      data: { 
        name, 
        phone,
        defaultWorkerRate: rate ? Number(rate) : null
      }
    });
    revalidatePath("/staff/sub-leaders");
  }
}

export default async function SubLeadersDirectoryPage() {
  await requireAuth({ allowedRoles: ["STAFF", "OWNER"] });

  const subLeaders = await prisma.externalSubLeader.findMany({
    include: {
      disbursements: true
    },
    orderBy: { name: 'asc' }
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-orange-400" />
            External Sub-Leaders Directory
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Manage external contractors and view their cash disbursements.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-sm font-black text-white uppercase tracking-widest mb-4">Add Sub-Leader</h2>
            <form action={createSubLeader} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5">Name</label>
                <input 
                  type="text" 
                  name="name" 
                  required
                  placeholder="e.g. Kaka"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold text-white placeholder-zinc-700 focus:outline-none focus:border-amber-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5">Phone Number</label>
                <input 
                  type="text" 
                  name="phone" 
                  required
                  placeholder="e.g. 9876543210"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold text-white placeholder-zinc-700 focus:outline-none focus:border-amber-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5">Default Worker Wage (₹/day)</label>
                <input 
                  type="number" 
                  name="defaultWorkerRate" 
                  placeholder="e.g. 600"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold text-white placeholder-zinc-700 focus:outline-none focus:border-amber-500 transition-all"
                />
              </div>
              <button 
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-500 px-5 py-3 text-sm font-black text-white transition-all mt-2"
              >
                <Plus className="w-4 h-4" /> Add to Directory
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-zinc-950/50">
                  <th className="p-4 text-xs font-black uppercase tracking-widest text-zinc-500 border-b border-zinc-800">Name</th>
                  <th className="p-4 text-xs font-black uppercase tracking-widest text-zinc-500 border-b border-zinc-800">Contact</th>
                  <th className="p-4 text-xs font-black uppercase tracking-widest text-zinc-500 border-b border-zinc-800">Default Rate</th>
                  <th className="p-4 text-xs font-black uppercase tracking-widest text-zinc-500 border-b border-zinc-800">Disbursements</th>
                  <th className="p-4 text-xs font-black uppercase tracking-widest text-zinc-500 border-b border-zinc-800 text-right">Total Cash Paid</th>
                  <th className="p-4 text-xs font-black uppercase tracking-widest text-zinc-500 border-b border-zinc-800 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {subLeaders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-zinc-500 font-bold">No Sub-Leaders found.</td>
                  </tr>
                ) : (
                  subLeaders.map(sl => {
                    const totalPaid = sl.disbursements.reduce((sum, d) => sum + Number(d.totalCashHandedOut), 0);
                    return (
                      <tr key={sl.id} className="hover:bg-zinc-800/50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-white">{sl.name}</div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-sm text-zinc-400">
                            <Phone className="w-3 h-3" /> {sl.phone}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm font-medium text-emerald-400">
                            {sl.defaultWorkerRate ? `₹${sl.defaultWorkerRate}` : "—"}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="bg-zinc-800 text-zinc-300 text-xs font-bold px-2 py-1 rounded">
                            {sl.disbursements.length} records
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1 font-black text-amber-500">
                            <IndianRupee className="w-4 h-4" />
                            {totalPaid.toLocaleString("en-IN")}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <form action={deleteSubLeader}>
                            <input type="hidden" name="id" value={sl.id} />
                            <button
                              type="submit"
                              disabled={sl.disbursements.length > 0}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              title={sl.disbursements.length > 0 ? "Cannot delete: Has disbursements" : "Delete Sub-Leader"}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </form>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
