import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function logAudit(params: {
  actorId: string;
  actorRole: Role;
  actionType: string;
  modelName?: string;
  oldPayload?: any;
  newPayload?: any;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        actorRole: params.actorRole,
        actionType: params.actionType,
        modelName: params.modelName,
        oldPayload: params.oldPayload ? JSON.parse(JSON.stringify(params.oldPayload)) : undefined,
        newPayload: params.newPayload ? JSON.parse(JSON.stringify(params.newPayload)) : undefined,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
    // Don't throw - we don't want audit logging failures to break business logic
  }
}
