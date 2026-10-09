import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthForApi } from "@/lib/serverAuth";
import { logAudit } from "@/lib/auditLogger";
import { z } from "zod";

const schema = z.object({
    dispatchId: z.string().min(1),
    fieldDiaryLogId: z.string().optional(),
    photoUrl: z.string().url(),
    caption: z.string().optional(),
});

export async function POST(req: Request) {
    try {
        const { ctx, response: authResponse } = await requireAuthForApi({ allowedRoles: ["DRIVER", "OPERATOR", "STAFF", "ADMIN", "OWNER"] });
        if (authResponse) return authResponse;
        const actorId = ctx!.employeeId;
        const role = ctx!.role;

        const body = await req.json();
        const parsed = schema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
        }

        const { dispatchId, fieldDiaryLogId, photoUrl, caption } = parsed.data;

        const dispatch = await prisma.dailyDispatch.findUnique({ where: { id: dispatchId } });
        if (!dispatch) {
            return NextResponse.json({ error: "Dispatch not found" }, { status: 404 });
        }

        const photo = await prisma.dispatchPhoto.create({
            data: {
                dispatchId,
                fieldDiaryLogId: fieldDiaryLogId || null,
                uploadedById: actorId,
                photoUrl,
                caption
            }
        });

        await logAudit({
            actorId,
            actorRole: role,
            actionType: "UPLOAD_DISPATCH_PHOTO",
            modelName: "DispatchPhoto",
            newPayload: photo,
        });

        return NextResponse.json({ success: true, data: photo });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
