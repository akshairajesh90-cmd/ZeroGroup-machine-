import { prisma } from "@/lib/prisma";
import { FileSpreadsheet } from "lucide-react";

export default async function AllocationPage() {
  // A basic view showing recent dispatches grouped by siteBundleId for internal cost allocation
  const dispatches = await prisma.dailyDispatch.findMany({
    take: 50,
    orderBy: { dateOfService: "desc" },
    include: {
      customer: true,
      machine: true
    }
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <FileSpreadsheet className="h-8 w-8 text-indigo-600" />
            Cost Allocation Ledger
          </h1>
          <p className="text-gray-500 mt-1">Internal equipment and labor cost allocation against specific Jobsites.</p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jobsite / Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset Used</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Allocated Cost (₹)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bundle ID</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {dispatches.map(dispatch => (
              <tr key={dispatch.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(dispatch.dateOfService).toLocaleDateString("en-IN")}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {dispatch.customer.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {dispatch.machine?.machineId || "Labor Only"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {dispatch.customerCharge ? `₹${dispatch.customerCharge.toString()}` : "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {dispatch.siteBundleId || "Unbundled"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
