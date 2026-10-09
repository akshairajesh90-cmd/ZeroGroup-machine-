import { prisma } from "@/lib/prisma";
import { Wrench } from "lucide-react";

export default async function MaintenancePage() {
  const tickets = await prisma.maintenanceTicket.findMany({
    take: 50,
    orderBy: { updatedAt: "desc" },
    include: {
      vehicle: true,
      machine: true
    }
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Wrench className="h-8 w-8 text-indigo-600" />
            Global Maintenance Log
          </h1>
          <p className="text-gray-500 mt-1">Track all repairs and maintenance tickets across the fleet.</p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issue</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mechanic</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost (₹)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tickets.map(ticket => {
              const assetName = ticket.vehicle?.licensePlate || ticket.machine?.machineId || "Unknown";
              const totalCost = Number(ticket.partsCost) + Number(ticket.laborCost);
              return (
                <tr key={ticket.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {assetName}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {ticket.issueDescription}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {ticket.mechanicName || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {totalCost > 0 ? `₹${totalCost.toFixed(2)}` : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      ticket.status === 'OPEN' ? 'bg-yellow-100 text-yellow-800' :
                      ticket.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {ticket.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {tickets.length === 0 && (
          <div className="p-6 text-center text-gray-500">
            No maintenance tickets found.
          </div>
        )}
      </div>
    </div>
  );
}
