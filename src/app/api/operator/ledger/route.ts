import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { startOfWeek, endOfWeek, subWeeks, format } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.employeeId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const employeeId = session.user.employeeId;
    
    // Parse query params (optional week offset)
    const { searchParams } = new URL(request.url);
    const weeksAgo = parseInt(searchParams.get("weeksAgo") || "0");
    
    const targetDate = subWeeks(new Date(), weeksAgo);
    const startDate = startOfWeek(targetDate, { weekStartsOn: 0 }); // Sunday
    const endDate = endOfWeek(targetDate, { weekStartsOn: 0 }); // Saturday

    // Get all assignments for this worker in this week
    const assignments = await prisma.dispatchAssignment.findMany({
      where: {
        employeeId,
        dispatch: {
          dateOfService: {
            gte: startDate,
            lte: endDate
          }
        }
      },
      include: {
        dispatch: {
          include: {
            customer: { select: { name: true } }
          }
        }
      },
      orderBy: {
        dispatch: {
          dateOfService: 'asc'
        }
      }
    });

    // Get the settlement for this week if it exists
    const settlement = await prisma.settlement.findFirst({
      where: {
        employeeId: employeeId,
        weekEnding: endDate
      }
    });

    return NextResponse.json({ 
      success: true, 
      assignments,
      settlement,
      week: {
        start: startDate,
        end: endDate,
        label: `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`
      }
    });
  } catch (error: any) {
    console.error("Error fetching worker ledger:", error);
    return NextResponse.json(
      { error: "Failed to fetch worker ledger" },
      { status: 500 }
    );
  }
}
