/**
 * imageCompression.ts
 * Client-side image compression utility.
 * Uses browser-image-compression to ensure ALL camera photos
 * (meters, dockets, damage reports) are capped before storage or upload.
 *
 * Limits: max 1200px width, max 500KB file size.
 * This prevents localStorage/IndexedDB overflow AND 3G upload timeouts.
 */
import imageCompression from "browser-image-compression";

const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.5,          // 500 KB hard ceiling
  maxWidthOrHeight: 1200,   // Resize to fit within 1200×1200
  useWebWorker: true,       // Non-blocking compression
  fileType: "image/jpeg",   // Always output JPEG for consistency
  initialQuality: 0.8,      // 80% quality — good balance for field photos
};

/**
 * Compress a File (from a camera <input>) and return a new compressed Blob.
 * The Blob is safe to store in IndexedDB and upload to Supabase.
 */
export async function compressCameraPhoto(file: File): Promise<Blob> {
  try {
    const compressed = await imageCompression(file, COMPRESSION_OPTIONS);
    return compressed;
  } catch (err) {
    console.warn("Image compression failed, using original:", err);
    // Fall back to original — better than crashing
    return file;
  }
}

/**
 * Compress and convert a Blob to a data URL for immediate preview.
 * Used in the UI to show a thumbnail of the captured photo.
 */
export async function compressAndPreview(file: File): Promise<{ blob: Blob; previewUrl: string }> {
  const blob = await compressCameraPhoto(file);
  const previewUrl = URL.createObjectURL(blob);
  return { blob, previewUrl };
}
