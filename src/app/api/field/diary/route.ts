import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthForApi } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { ctx: _sessionCtx, response } = await requireAuthForApi();
    if (response) return response;
    const session = _sessionCtx!;
    const payload = await request.json();

    const { diary, attendance, externalLabor, equipment } = payload;
    
    if (!diary) {
      return NextResponse.json({ success: false, error: "Missing diary log in payload" }, { status: 400 });
    }

    // We'll wrap all DB updates in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Upsert Diary Log
      const existingDiary = diary.serverId 
        ? await tx.fieldDiaryLog.findUnique({ where: { id: diary.serverId } })
        : await tx.fieldDiaryLog.findFirst({
            where: { dispatchId: diary.dispatchId, date: new Date(diary.date) }
          });

      let diaryId = existingDiary?.id;

      if (!diaryId) {
        const newDiary = await tx.fieldDiaryLog.create({
          data: {
            dispatchId: diary.dispatchId,
            loggedByLeaderId: session.userId,
            date: new Date(diary.date),
            siteStatus: diary.siteStatus || "IN_PROGRESS",
            arrivalTime: diary.arrivalTime ? new Date(diary.arrivalTime) : null,
            departureTime: diary.departureTime ? new Date(diary.departureTime) : null,
            internalHelperCount: diary.internalHelperCount || 0,
            notes: diary.notes,
            isSubmitted: diary.siteStatus === "COMPLETED",
            submittedAt: diary.siteStatus === "COMPLETED" ? new Date() : null,
          }
        });
        diaryId = newDiary.id;
      } else {
        await tx.fieldDiaryLog.update({
          where: { id: diaryId },
          data: {
            siteStatus: diary.siteStatus,
            arrivalTime: diary.arrivalTime ? new Date(diary.arrivalTime) : null,
            departureTime: diary.departureTime ? new Date(diary.departureTime) : null,
            internalHelperCount: diary.internalHelperCount || 0,
            notes: diary.notes,
            isSubmitted: diary.siteStatus === "COMPLETED",
            submittedAt: diary.siteStatus === "COMPLETED" && !existingDiary?.isSubmitted ? new Date() : undefined,
          }
        });
      }

      // 2. Upsert Attendance
      if (attendance && Array.isArray(attendance)) {
        for (const att of attendance) {
          const existingAtt = await tx.attendanceLog.findFirst({
            where: { fieldDiaryLogId: diaryId, employeeId: att.employeeId }
          });

          if (existingAtt) {
            await tx.attendanceLog.update({
              where: { id: existingAtt.id },
              data: { isPresent: att.isPresent }
            });
          } else {
            await tx.attendanceLog.create({
              data: {
                fieldDiaryLogId: diaryId,
                employeeId: att.employeeId,
                isPresent: att.isPresent
              }
            });
          }
        }
      }

      // 3. Upsert External Labor
      if (externalLabor && Array.isArray(externalLabor)) {
        // Since offline external labor IDs aren't known by the server easily, 
        // we'll clear and recreate or match carefully. Simplest for offline sync is to recreate if new.
        // For simplicity, we just clear the old ones for this diary and insert new ones
        await tx.externalLaborLog.deleteMany({ where: { fieldDiaryLogId: diaryId } });
        
        for (const ext of externalLabor) {
          await tx.externalLaborLog.create({
            data: {
              fieldDiaryLogId: diaryId,
              subLeaderName: ext.subLeaderName,
              workerCount: ext.workerCount,
              cashPaid: ext.cashPaid,
              notes: ext.notes
            }
          });
        }
      }

      // 4. Upsert Equipment Verifications
      if (equipment && Array.isArray(equipment)) {
        for (const eq of equipment) {
          const existingEq = await tx.equipmentVerificationLog.findFirst({
            where: { fieldDiaryLogId: diaryId, dispatchToolId: eq.dispatchToolId }
          });

          if (existingEq) {
            await tx.equipmentVerificationLog.update({
              where: { id: existingEq.id },
              data: { isReturned: eq.isVerified }
            });
          } else {
            await tx.equipmentVerificationLog.create({
              data: {
                fieldDiaryLogId: diaryId,
                dispatchToolId: eq.dispatchToolId,
                isReturned: eq.isVerified
              }
            });
          }
        }
      }

      return { serverId: diaryId };
    });

    return NextResponse.json({ success: true, serverId: result.serverId });
  } catch (error: any) {
    console.error("Diary Sync API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
