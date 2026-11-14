# Zero Group Server Action Template

Below is the standard, production-hardened template for authoring Next.js Server Actions in Zero Group.

```typescript
"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";
import { ActionResult, successResult, errorResult } from "@/lib/action-result";
import { recordAuditLog } from "@/lib/auditLogger";

// 1. Define Input Validation Schema
const UpdateDispatchSchema = z.object({
  id: z.string().cuid(),
  version: z.number().int().min(0),
  liftFloors: z.number().int().min(0).max(50),
  notes: z.string().max(500).optional(),
});

export type UpdateDispatchInput = z.infer<typeof UpdateDispatchSchema>;

/**
 * Updates dispatch specifications with OCC (Optimistic Concurrency Control)
 */
export async function updateDispatchSpecifications(
  rawInput: UpdateDispatchInput
): Promise<ActionResult<{ id: string; version: number }>> {
  try {
    // 2. Enforce Server Action RBAC Guard
    const auth = await requireAuth({
      allowedRoles: [Role.OWNER, Role.ADMIN, Role.STAFF],
      redirectOnFail: false,
    });

    // 3. Validate Input Payload
    const parsed = UpdateDispatchSchema.safeParse(rawInput);
    if (!parsed.success) {
      return errorResult(parsed.error.issues[0]?.message || "Invalid input payload", "VALIDATION_ERROR");
    }

    const { id, version, liftFloors, notes } = parsed.data;

    // 4. Execute Atomic OCC Transaction
    const updated = await prisma.$transaction(async (tx) => {
      // OCC: only update if current version matches
      const result = await tx.dailyDispatch.updateMany({
        where: {
          id,
          version,
        },
        data: {
          liftFloors,
          notes,
          version: { increment: 1 },
        },
      });

      if (result.count === 0) {
        throw new Error("OCC_CONFLICT");
      }

      // Record Tamper-Evident Audit Ledger
      await recordAuditLog(tx, {
        userId: auth.userId,
        action: "UPDATE_DISPATCH_SPECS",
        entityId: id,
        details: { liftFloors, notes, previousVersion: version },
      });

      return { id, version: version + 1 };
    });

    return successResult(updated);
  } catch (error: any) {
    if (error?.message === "OCC_CONFLICT") {
      return errorResult(
        "The dispatch record was modified concurrently by another user. Please reload the latest data.",
        "OCC_CONFLICT"
      );
    }
    console.error("[updateDispatchSpecifications error]:", error);
    return errorResult(error?.message || "Failed to update dispatch record.");
  }
}
```
