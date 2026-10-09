"use client";

import { useState, useRef } from "react";
import { Camera, Loader2, Check } from "lucide-react";
import Avatar from "@/components/shared/Avatar";

interface ProfilePhotoUploaderProps {
  employeeId?: string; // if provided and user is admin/staff, uploads for that employee
  currentPhotoUrl?: string | null;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export default function ProfilePhotoUploader({
  employeeId,
  currentPhotoUrl,
  name,
  size = "lg",
}: ProfilePhotoUploaderProps) {
  const [photoUrl, setPhotoUrl] = useState(currentPhotoUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setStatus("idle");
    setErrorMsg("");

    const formData = new FormData();
    formData.append("file", file);
    if (employeeId) formData.append("employeeId", employeeId);

    try {
      const res = await fetch("/api/upload/profile-photo", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setPhotoUrl(data.url + "?t=" + Date.now()); // cache-bust
        setStatus("success");
      } else {
        setErrorMsg(data.error ?? "Upload failed");
        setStatus("error");
      }
    } catch (err) {
      setErrorMsg("Network error");
      setStatus("error");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="relative group"
      >
        <Avatar name={name} photoUrl={photoUrl} size={size} />
        <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {uploading ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : status === "success" ? (
            <Check className="w-5 h-5 text-emerald-400" />
          ) : (
            <Camera className="w-5 h-5 text-white" />
          )}
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
      {status === "error" && (
        <p className="text-[10px] text-red-400 font-bold">{errorMsg}</p>
      )}
      <p className="text-[10px] text-zinc-500 font-medium">Tap photo to change</p>
    </div>
  );
}
