import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "OWNER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type, id, action } = await req.json();

  if (!type || !id || !action) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";

  try {
    if (type === "FUEL") {
      await prisma.fuelLog.update({
        where: { id },
        data: { approvalStatus: newStatus },
      });
    } else if (type === "ADJUSTMENT") {
      await prisma.manualAdjustment.update({
        where: { id },
        data: { approvalStatus: newStatus },
      });
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Approval error:", err);
    return NextResponse.json({ error: "Failed to process approval" }, { status: 500 });
  }
}
