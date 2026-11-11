"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { revalidatePath } from "next/cache";

// Mock Cloud Upload (e.g. Vercel Blob / Cloudinary)
async function mockCloudUpload(file: File): Promise<{ url: string; type: "IMAGE" | "VIDEO" }> {
  await new Promise((resolve) => setTimeout(resolve, 30)); // Low latency mock upload
  const isVideo = file.type.startsWith("video/");
  const url = isVideo 
    ? "https://www.w3schools.com/html/mov_bbb.mp4" 
    : "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=600&q=80";
  
  return { url, type: isVideo ? "VIDEO" : "IMAGE" };
}

// In-memory memoization to avoid redundant DB queries during chat polling
const verifiedSenderCache = new Map<string, string>();

export async function resolveValidSenderId(employeeId: string, userId: string, role: string) {
  if (employeeId && verifiedSenderCache.has(employeeId)) {
    return verifiedSenderCache.get(employeeId)!;
  }

  const existingEmp = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true },
  });

  if (existingEmp) {
    verifiedSenderCache.set(employeeId, existingEmp.id);
    return existingEmp.id;
  }

  let userEmp = await prisma.employee.findFirst({
    where: { userId },
    select: { id: true },
  });

  if (!userEmp) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      userEmp = await prisma.employee.create({
        data: {
          userId: user.id,
          name: user.email.split("@")[0].toUpperCase(),
          role: user.role,
          phone: "0000000000",
          operatorType: "INTERNAL",
        },
        select: { id: true },
      });
    }
  }

  const resolved = userEmp ? userEmp.id : employeeId;
  verifiedSenderCache.set(employeeId, resolved);
  return resolved;
}

export async function sendChatMessage(formData: FormData) {
  const { employeeId, userId, role } = await requireAuth({ allowedRoles: ["OWNER", "ADMIN", "STAFF", "OPERATOR", "DRIVER"] });

  const text = formData.get("text")?.toString().trim();
  const file = formData.get("file") as File | null;
  const rawReceiverId = formData.get("receiverId")?.toString().trim();
  const receiverId = (rawReceiverId && rawReceiverId !== "GROUP" && rawReceiverId !== "ALL") ? rawReceiverId : null;

  if (!text && (!file || file.size === 0)) {
    throw new Error("Message cannot be empty.");
  }

  let mediaUrl = null;
  let mediaType = null;

  if (file && file.size > 0) {
    if (file.size > 4 * 1024 * 1024) {
      throw new Error("File too large. Max 4MB allowed.");
    }
    const uploaded = await mockCloudUpload(file);
    mediaUrl = uploaded.url;
    mediaType = uploaded.type;
  }

  const validSenderId = await resolveValidSenderId(employeeId, userId, role);

  await prisma.chatMessage.create({
    data: {
      text: text || null,
      mediaUrl,
      mediaType,
      senderId: validSenderId,
      receiverId: receiverId || null,
    },
  });

  revalidatePath("/admin/chat");
  revalidatePath("/staff/directory");
  revalidatePath("/driver/chat");
  revalidatePath("/operator/chat");
  
  return { success: true };
}

export async function getChatMessages(receiverId?: string | null) {
  const { employeeId, userId, role } = await requireAuth({ allowedRoles: ["OWNER", "ADMIN", "STAFF", "OPERATOR", "DRIVER"] });
  const validSenderId = await resolveValidSenderId(employeeId, userId, role);

  const isPersonal = Boolean(receiverId && receiverId !== "GROUP" && receiverId !== "ALL");

  const whereClause = isPersonal
    ? {
        isPendingDelete: false,
        OR: [
          { senderId: validSenderId, receiverId: receiverId! },
          { senderId: receiverId!, receiverId: validSenderId },
        ],
      }
    : {
        isPendingDelete: false,
        receiverId: null,
      };

  const messages = await prisma.chatMessage.findMany({
    where: whereClause,
    take: 50, // High-concurrency optimized payload
    orderBy: { createdAt: "desc" },
    include: {
      sender: {
        select: {
          id: true,
          userId: true,
          role: true,
          name: true,
          profilePhotoUrl: true,
        },
      },
      receiver: {
        select: {
          id: true,
          userId: true,
          role: true,
          name: true,
          profilePhotoUrl: true,
        },
      },
    },
  });

  return messages.reverse().map((msg: any) => ({
    id: msg.id,
    text: msg.text,
    mediaUrl: msg.mediaUrl,
    mediaType: msg.mediaType,
    senderId: msg.senderId,
    receiverId: msg.receiverId ?? null,
    senderName: msg.sender?.name || "Operations",
    senderRole: msg.sender?.role || "STAFF",
    senderPhoto: msg.sender?.profilePhotoUrl ?? null,
    receiverName: msg.receiver?.name ?? null,
    receiverRole: msg.receiver?.role ?? null,
    isPersonal: Boolean(msg.receiverId),
    createdAt: msg.createdAt.toISOString(),
  }));
}
