import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthForApi } from "@/lib/serverAuth";
import { logAudit } from "@/lib/auditLogger";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    try {
        const { ctx, response } = await requireAuthForApi({
            allowedRoles: [Role.STAFF, Role.ADMIN, Role.OWNER],
        });
        if (response) return response;

        const payload = await request.json();
        const {
            dispatchId,
            date,
            arrivalTime,
            departureTime,
            internalHelperCount,
            siteStatus,
            notes,
            attendance,
            externalLabor,
            equipment,
        } = payload;

        if (!dispatchId) {
            return NextResponse.json(
                { success: false, error: "Missing required parameter: dispatchId" },
                { status: 400 }
            );
        }

        const dispatch = await prisma.dailyDispatch.findUnique({
            where: { id: dispatchId },
        });

        if (!dispatch) {
            return NextResponse.json(
                { success: false, error: "Daily dispatch not found" },
                { status: 404 }
            );
        }

        const targetDate = date ? new Date(date) : dispatch.dateOfService;

        const result = await prisma.$transaction(async (tx) => {
            // 1. Find existing FieldDiaryLog (capture full snapshot for audit)
            const existingDiary = await tx.fieldDiaryLog.findFirst({
                where: { dispatchId, date: targetDate },
                include: { attendanceLogs: true, externalLabor: true, equipmentVerifications: true },
            });

            let diaryId = existingDiary?.id;

            const diaryData = {
                dispatchId,
                date: targetDate,
                siteStatus: siteStatus || existingDiary?.siteStatus || "IN_PROGRESS",
                arrivalTime: arrivalTime ? new Date(arrivalTime) : arrivalTime === null ? null : existingDiary?.arrivalTime,
                departureTime: departureTime ? new Date(departureTime) : departureTime === null ? null : existingDiary?.departureTime,
                internalHelperCount: typeof internalHelperCount === "number" ? internalHelperCount : existingDiary?.internalHelperCount || 0,
                notes: notes !== undefined ? notes : existingDiary?.notes,
                isSubmitted: siteStatus === "COMPLETED" || existingDiary?.isSubmitted || false,
                submittedAt:
                    siteStatus === "COMPLETED" && !existingDiary?.isSubmitted
                        ? new Date()
                        : existingDiary?.submittedAt,
                isStaffOverridden: true,
                overriddenById: ctx!.employeeId,
                overriddenAt: new Date(),
                loggedByLeaderId: existingDiary?.loggedByLeaderId || ctx!.employeeId,
            };

            if (!diaryId) {
                const newDiary = await tx.fieldDiaryLog.create({
                    data: diaryData,
                });
                diaryId = newDiary.id;
            } else {
                await tx.fieldDiaryLog.update({
                    where: { id: diaryId },
                    data: diaryData,
                });
            }

            // 2. Attendance Overrides
            if (attendance && Array.isArray(attendance)) {
                for (const att of attendance) {
                    const existingAtt = await tx.attendanceLog.findFirst({
                        where: { fieldDiaryLogId: diaryId, employeeId: att.employeeId },
                    });

                    if (existingAtt) {
                        await tx.attendanceLog.update({
                            where: { id: existingAtt.id },
                            data: { isPresent: att.isPresent },
                        });
                    } else {
                        await tx.attendanceLog.create({
                            data: {
                                fieldDiaryLogId: diaryId,
                                employeeId: att.employeeId,
                                isPresent: att.isPresent,
                            },
                        });
                    }
                }
            }

            // 3. External Labor Overrides
            if (externalLabor && Array.isArray(externalLabor)) {
                await tx.externalLaborLog.deleteMany({
                    where: { fieldDiaryLogId: diaryId },
                });

                for (const ext of externalLabor) {
                    await tx.externalLaborLog.create({
                        data: {
                            fieldDiaryLogId: diaryId,
                            subLeaderName: ext.subLeaderName,
                            workerCount: Number(ext.workerCount) || 0,
                            cashPaid: Number(ext.cashPaid) || 0,
                            notes: ext.notes || null,
                        },
                    });
                }
            }

            // 4. Relational Equipment Verification Logs
            if (equipment && Array.isArray(equipment)) {
                for (const eq of equipment) {
                    const existingEq = await tx.equipmentVerificationLog.findFirst({
                        where: { fieldDiaryLogId: diaryId, dispatchToolId: eq.dispatchToolId },
                    });

                    if (existingEq) {
                        await tx.equipmentVerificationLog.update({
                            where: { id: existingEq.id },
                            data: {
                                isReturned: typeof eq.isReturned === "boolean" ? eq.isReturned : true,
                                condition: eq.condition || "OK",
                                notes: eq.notes || null,
                            },
                        });
                    } else {
                        await tx.equipmentVerificationLog.create({
                            data: {
                                fieldDiaryLogId: diaryId,
                                dispatchToolId: eq.dispatchToolId,
                                isReturned: typeof eq.isReturned === "boolean" ? eq.isReturned : true,
                                condition: eq.condition || "OK",
                                notes: eq.notes || null,
                            },
                        });
                    }
                }
            }

            return { diaryId, oldDiarySnapshot: existingDiary };
        });

        // Write audit log outside transaction (non-blocking, best-effort)
        await logAudit({
            actorId: ctx!.employeeId,
            actorRole: ctx!.role as Role,
            actionType: result.oldDiarySnapshot ? "STAFF_DIARY_OVERRIDE_UPDATE" : "STAFF_DIARY_OVERRIDE_CREATE",
            modelName: "FieldDiaryLog",
            oldPayload: result.oldDiarySnapshot ?? null,
            newPayload: {
                dispatchId,
                date: targetDate,
                siteStatus,
                arrivalTime,
                departureTime,
                internalHelperCount,
                notes,
                isStaffOverridden: true,
            },
        });

        return NextResponse.json({
            success: true,
            diaryId: result.diaryId,
            message: "Staff Field Diary override saved successfully",
        });
    } catch (error: any) {
        console.error("Staff Field Diary Override API Error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
