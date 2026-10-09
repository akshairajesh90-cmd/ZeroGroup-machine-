import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import FieldDiaryClient from "@/components/field/FieldDiaryClient";

export default async function FieldDiaryPage({ params }: { params: { dispatchId: string } }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/signin");
  }

  const dispatch = await prisma.dailyDispatch.findUnique({
    where: { id: params.dispatchId },
    include: {
      crewAssignments: { include: { employee: true } },
      dispatchTools: { include: { tool: true } },
    }
  });

  if (!dispatch) {
    return <div>Dispatch not found</div>;
  }

  const crew = dispatch.crewAssignments.map((ca: any) => ({
    id: ca.employee.id,
    name: ca.employee.name,
    role: ca.employee.role,
  }));

  const tools = dispatch.dispatchTools.map((dt: any) => ({
    id: dt.toolId,
    name: dt.tool.name,
    quantity: dt.quantity,
  }));

  return <FieldDiaryClient dispatchId={dispatch.id} date={dispatch.dateOfService.toISOString()} crew={crew} tools={tools} />;
}
