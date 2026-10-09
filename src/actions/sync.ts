"use server";

import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";

/**
 * Mock RabbitMQ Event Broker Sync
 * This aggregates completed Dockets and Cost Allocations and "publishes" them.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function publishToRabbitMQ(payload: any) {
  const session = await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN, Role.STAFF] });
  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Simulated AMQP publish delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    console.log("[RabbitMQ] Publishing payload to Corporate ERP queue...", JSON.stringify(payload, null, 2));

    return { success: true, message: "Payload successfully dispatched to RabbitMQ broker." };
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error: any) {
    console.error("[RabbitMQ] Publish failed:", error);
    return { success: false, error: "Failed to sync to legacy ERP" };
  }
}
