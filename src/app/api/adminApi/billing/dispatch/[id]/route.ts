import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthForApi } from "@/lib/serverAuth";
import { logAudit } from "@/lib/auditLogger";
import { z } from "zod";

export async function GET(req: Request, { params }: { params: { id: string } }) {
    try {
        const { ctx, response: authResponse } = await requireAuthForApi({ allowedRoles: ["ADMIN", "OWNER", "STAFF"] });
        if (authResponse) return authResponse;

        const dispatch = await prisma.dailyDispatch.findUnique({
            where: { id: params.id },
            select: {
                id: true,
                invoiceId: true,
                isScopeFinalized: true,
                invoice: {
                    select: {
                        id: true,
                        status: true,
                        totalAmount: true,
                        paidCash: true,
                        paidUpi: true,
                        paidBank: true,
                        paidCheque: true,
                        discountAmount: true,
                    }
                },
                cashCollections: {
                    select: { id: true, amountCollected: true, status: true, date: true }
                }
            }
        });

        if (!dispatch) {
            return NextResponse.json({ error: "Dispatch not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: dispatch });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

const patchSchema = z.object({
    isScopeFinalized: z.boolean().optional(),
    paymentStatus: z.enum(["DRAFT", "SENT", "PARTIAL", "PAID", "CANCELLED", "UNPAID"]).optional()
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    try {
        const { ctx, response: authResponse } = await requireAuthForApi({ allowedRoles: ["ADMIN", "OWNER"] });
        if (authResponse) return authResponse;
        const actorId = ctx!.employeeId;
        const role = ctx!.role;

        const body = await req.json();
        const parsed = patchSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
        }

        const { isScopeFinalized, paymentStatus } = parsed.data;

        const dispatch = await prisma.dailyDispatch.findUnique({
            where: { id: params.id },
            include: { invoice: true }
        });

        if (!dispatch) {
            return NextResponse.json({ error: "Dispatch not found" }, { status: 404 });
        }

        const result = await prisma.$transaction(async (tx) => {
            let updatedDispatch = dispatch;

            if (isScopeFinalized !== undefined) {
                updatedDispatch = await tx.dailyDispatch.update({
                    where: { id: params.id },
                    data: { isScopeFinalized }
                }) as any;
            }

            if (paymentStatus !== undefined && dispatch.invoiceId) {
                await tx.invoice.update({
                    where: { id: dispatch.invoiceId },
                    data: { status: paymentStatus }
                });
            }
            return updatedDispatch;
        });

        await logAudit({
            actorId,
            actorRole: role,
            actionType: "UPDATE_BILLING_METADATA",
            modelName: "DailyDispatch",
            oldPayload: { isScopeFinalized: dispatch.isScopeFinalized, paymentStatus: dispatch.invoice?.status },
            newPayload: { isScopeFinalized, paymentStatus },
        });

        return NextResponse.json({ success: true, data: result });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
