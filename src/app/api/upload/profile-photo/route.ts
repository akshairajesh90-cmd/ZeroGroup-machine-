// src/app/api/upload/profile-photo/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import path from "path";
import fs from "fs/promises";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "profiles");
const MAX_SIZE_MB = 5;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role as string;
    const isAdminOrStaff = ["ADMIN", "STAFF", "OWNER"].includes(role);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    // targetEmployeeId is optional – if omitted, update own profile
    const targetEmployeeId = formData.get("employeeId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Only JPG, PNG, or WebP allowed" }, { status: 400 });
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ error: `Max ${MAX_SIZE_MB}MB allowed` }, { status: 400 });
    }

    // Determine which employee record to update
    let employeeId: string;
    if (targetEmployeeId && isAdminOrStaff) {
      employeeId = targetEmployeeId;
    } else {
      // update own
      const employee = await prisma.employee.findUnique({
        where: { userId: session.user.id as string },
        select: { id: true },
      });
      if (!employee) {
        return NextResponse.json({ error: "Employee record not found" }, { status: 404 });
      }
      employeeId = employee.id;
    }

    // Ensure upload directory exists
    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    // Unique filename
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const filename = `${employeeId}-${Date.now()}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    const publicUrl = `/uploads/profiles/${filename}`;

    // Remove old photo file if exists
    const existing = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { profilePhotoUrl: true },
    });
    if (existing?.profilePhotoUrl?.startsWith("/uploads/")) {
      const oldPath = path.join(process.cwd(), "public", existing.profilePhotoUrl);
      fs.unlink(oldPath).catch(() => {}); // silently ignore if missing
    }

    // Update DB
    await prisma.employee.update({
      where: { id: employeeId },
      data: { profilePhotoUrl: publicUrl },
    });

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (err: any) {
    console.error("Photo upload failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
