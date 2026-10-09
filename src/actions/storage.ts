"use server";

import { requireAuth } from "@/lib/serverAuth";

/**
 * Mock Cloud Storage Upload (Supabase / AWS S3)
 * Prevents Base64 strings from crashing the PostgreSQL DB.
 */
export async function uploadMediaToCloud(formData: FormData) {
  const session = await requireAuth();
  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  const file = formData.get("file") as File;
  if (!file) {
    return { success: false, error: "No file provided" };
  }

  try {
    // 1. Client-Side Size Validation is expected (Max 4MB), but we double-check here.
    if (file.size > 4 * 1024 * 1024) {
      return { success: false, error: "File too large. Max 4MB allowed." };
    }

    // 2. Simulated Cloud Storage Upload Delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    // 3. Return mock CDN URL
    const mockCloudUrl = `https://cdn.zerogroup.internal/storage/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    
    console.log(`[Cloud Storage] Uploaded ${file.name} to ${mockCloudUrl}`);

    return { success: true, url: mockCloudUrl };
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error: any) {
    console.error("[Cloud Storage] Upload failed:", error);
    return { success: false, error: "Failed to upload media to cloud bucket." };
  }
}
