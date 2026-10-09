import { createClient } from "@supabase/supabase-js";

// Note: These must be server-only env vars (no NEXT_PUBLIC_ prefix)
// to avoid exposing them to the client bundle.
const supabaseUrl = process.env.SUPABASE_URL || "https://dummy.supabase.co";
const supabaseAnonKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "dummy";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Uploads a base64 image data URL to a Supabase storage bucket.
 * @param bucketName The name of the storage bucket
 * @param path The path to save the file (e.g. 'signatures/docket-123.png')
 * @param dataUrl The base64 data URL (e.g. 'data:image/png;base64,...')
 * @returns The public URL of the uploaded file
 */
export async function uploadMedia(bucketName: string, path: string, dataUrl: string): Promise<string> {
  try {
    // Extract base64 payload and mime type
    const [header, base64Data] = dataUrl.split(",");
    const mimeMatch = header.match(/:(.*?);/);
    const contentType = mimeMatch ? mimeMatch[1] : "image/png";

    // Decode base64 to buffer
    const buffer = Buffer.from(base64Data, "base64");

// eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(path, buffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(path);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error("Error uploading media to Supabase:", error);
    throw new Error("Failed to upload media");
  }
}
