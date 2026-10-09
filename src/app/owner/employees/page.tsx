import { prisma } from "@/lib/prisma";
import { Users } from "lucide-react";

export default async function EmployeesPage() {
  const employees = await prisma.employee.findMany({
    orderBy: { role: "asc" },
    include: { user: true }
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-8 w-8 text-indigo-600" />
            Employees & Rates
          </h1>
          <p className="text-gray-500 mt-1">Manage personnel, secret pay rates, and assignment status.</p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pay Rates</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Sync</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {employees.map(employee => {
              const rates = employee.role === "DRIVER" || employee.role === "OPERATOR"
                ? `Base: ₹${employee.baseDailyWage || 0} | Bata: ₹${employee.dailyBataRate || 0}`
                : employee.hourlyRate ? `Hourly: ₹${employee.hourlyRate}` : `Fixed: ₹${employee.fixedSalary || 0}`;

              return (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {employee.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      employee.role === 'OWNER' ? 'bg-purple-100 text-purple-800' :
                      employee.role === 'STAFF' ? 'bg-green-100 text-green-800' :
                      employee.role === 'DRIVER' ? 'bg-blue-100 text-blue-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {employee.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {rates}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {employee.lastSyncStatus || "ONLINE"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {employee.lastSeenAt ? new Date(employee.lastSeenAt).toLocaleString() : "Never"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
