import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { calculateWorkerLedgerBalances } from "@/actions/settlement";
import LedgerClient from "./LedgerClient";
import { prisma } from "@/lib/prisma";

export default async function OperatorLedgerPage() {
  const session = await auth();
  if (!session?.user?.employeeId) {
    redirect("/auth/signin");
  }

  // Fetch the last 30 days of data by default
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);

  const res = await calculateWorkerLedgerBalances({
    startDate: start.toISOString(),
    endDate: end.toISOString()
  });

  if (!res.success) {
    return <div className="p-4 text-red-500">Error loading ledger data.</div>;
  }

  // Scope the data strictly to the authenticated user
  const workerSummary = res.data?.players?.find((s: any) => s.playerId === session.user.employeeId);
  const rawShifts = res.data?.bookingHistory?.filter((s: any) => s.playerId === session.user.employeeId) || [];
  
  // Find advances specific to the user
  const advances = await prisma.salaryAdvance.findMany({
    where: {
      employeeId: session.user.employeeId,
      date: { gte: start, lte: end }
    }
  });

  // Find settlements specific to the user
  const settlements = await prisma.settlement.findMany({
    where: {
      employeeId: session.user.employeeId,
      weekEnding: { gte: start, lte: end }
    }
  });

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-950 p-4 md:p-6 pb-24">
      <h1 className="text-2xl font-black text-white mb-6">Personal Ledger</h1>
      <LedgerClient 
        workerSummary={workerSummary} 
        rawShifts={rawShifts} 
        advances={advances} 
        settlements={settlements} 
      />
    </div>
  );
}
