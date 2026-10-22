// src/app/api/upload/profile-photo/route.ts
// Handles profile photo and KYC document uploads directly via database storage.
// Zero filesystem dependency — 100% compatible with Vercel serverless (immutable /var/task).
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_SIZE_MB = 5;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user.role as string) || "";
    const isAdminOrStaff = ["ADMIN", "STAFF", "OWNER"].includes(role);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const targetEmployeeId = formData.get("employeeId") as string | null;
    const isDocument = formData.get("isDocument") === "true";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Only JPG, PNG, or WebP images are allowed." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: `File too large. Maximum ${MAX_SIZE_MB}MB allowed.` },
        { status: 400 }
      );
    }

    // Convert uploaded image to Base64 data URL
    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "image/jpeg";
    const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;

    // If this is an avatar upload, persist it directly to the employee's profile
    if (!isDocument) {
      let employeeId: string;
      if (targetEmployeeId && isAdminOrStaff) {
        employeeId = targetEmployeeId;
      } else {
        const employee = await prisma.employee.findUnique({
          where: { userId: session.user.id as string },
          select: { id: true },
        });
        if (!employee) {
          return NextResponse.json({ error: "Employee record not found" }, { status: 404 });
        }
        employeeId = employee.id;
      }

      await prisma.employee.update({
        where: { id: employeeId },
        data: { profilePhotoUrl: dataUrl },
      });
    }

    return NextResponse.json({ success: true, url: dataUrl });
  } catch (err: any) {
    console.error("[Profile Upload] Upload failed:", err);
    return NextResponse.json({ error: err.message || "Upload failed." }, { status: 500 });
  }
}
