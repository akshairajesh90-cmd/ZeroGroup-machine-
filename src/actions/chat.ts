"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { revalidatePath } from "next/cache";

// Mock Cloud Upload (e.g. Vercel Blob / Cloudinary)
async function mockCloudUpload(file: File): Promise<{ url: string; type: "IMAGE" | "VIDEO" }> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 800));
  
  // Fake URL based on file type
  const isVideo = file.type.startsWith("video/");
  const url = isVideo 
    ? "https://www.w3schools.com/html/mov_bbb.mp4" 
    : "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=600&q=80";
  
  return { url, type: isVideo ? "VIDEO" : "IMAGE" };
}

export async function sendChatMessage(formData: FormData) {
  const { employeeId } = await requireAuth({ allowedRoles: ["OWNER", "ADMIN", "STAFF", "OPERATOR", "DRIVER"] });

  const text = formData.get("text")?.toString().trim();
  const file = formData.get("file") as File | null;

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

  await prisma.chatMessage.create({
    data: {
      text: text || null,
      mediaUrl,
      mediaType,
      senderId: employeeId,
    },
  });

  // Revalidate to instantly update server components if any are used, though SWR handles client fetching.
  revalidatePath("/admin/chat");
  revalidatePath("/driver/chat");
  
  return { success: true };
}

export async function getChatMessages() {
  await requireAuth({ allowedRoles: ["OWNER", "ADMIN", "STAFF", "OPERATOR", "DRIVER"] });

  const messages = await prisma.chatMessage.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
    include: {
      sender: {
        select: {
          id: true,
          userId: true,
          role: true,
          name: true,
        }
      }
    }
  });

  return messages.reverse().map((msg: any) => ({
    id: msg.id,
    text: msg.text,
    mediaUrl: msg.mediaUrl,
    mediaType: msg.mediaType,
    senderId: msg.senderId,
    senderName: msg.sender.name || "Unknown",
    senderRole: msg.sender.role,
    createdAt: msg.createdAt.toISOString(),
  }));
}
