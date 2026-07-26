"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { Role, DocumentType, DocumentStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function addVehicleDocument(data: {
  vehicleId: string;
  type: DocumentType;
  documentNumber: string;
  issueDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  attachmentUrl: string;
}) {
  const { employeeId } = await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN, Role.STAFF] });
  const iDate = new Date(`${data.issueDate}T00:00:00.000Z`);
  const eDate = new Date(`${data.expiryDate}T00:00:00.000Z`);

  const result = await prisma.$transaction(async (tx) => {
    // Auto-archive previous active document of the exact same type
    await tx.vehicleDocument.updateMany({
      where: {
        vehicleId: data.vehicleId,
        type: data.type,
        status: DocumentStatus.ACTIVE
      },
      data: {
        status: DocumentStatus.ARCHIVED
      }
    });

    const newDoc = await tx.vehicleDocument.create({
      data: {
        vehicleId: data.vehicleId,
        type: data.type,
        documentNumber: data.documentNumber,
        issueDate: iDate,
        expiryDate: eDate,
        attachmentUrl: data.attachmentUrl,
        status: DocumentStatus.ACTIVE
      }
    });

    await tx.auditLog.create({
      data: {
        entity: "VEHICLE_DOCUMENT",
        entityId: newDoc.id,
        action: "CREATE_AND_ARCHIVE_OLD",
        delta: data as any,
        actorId: employeeId
      }
    });

    return newDoc;
  });

  revalidatePath("/admin/fleet");
  return { success: true, document: result };
}

export async function archiveVehicleDocument(documentId: string) {
  const { employeeId } = await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN] });

  const result = await prisma.$transaction(async (tx) => {
    const doc = await tx.vehicleDocument.update({
      where: { id: documentId },
      data: { status: DocumentStatus.ARCHIVED }
    });

    await tx.auditLog.create({
      data: {
        entity: "VEHICLE_DOCUMENT",
        entityId: doc.id,
        action: "ARCHIVE",
        delta: { status: "ARCHIVED" } as any,
        actorId: employeeId
      }
    });

    return doc;
  });

  revalidatePath("/admin/fleet");
  return { success: true, document: result };
}

export async function updateVehicleDocument(documentId: string, data: {
  documentNumber?: string;
  issueDate?: string;
  expiryDate?: string;
}) {
  const { employeeId } = await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN] });

  const updateData: any = {};
  if (data.documentNumber) updateData.documentNumber = data.documentNumber;
  if (data.issueDate) updateData.issueDate = new Date(`${data.issueDate}T00:00:00.000Z`);
  if (data.expiryDate) updateData.expiryDate = new Date(`${data.expiryDate}T00:00:00.000Z`);

  const result = await prisma.$transaction(async (tx) => {
    const doc = await tx.vehicleDocument.update({
      where: { id: documentId },
      data: updateData
    });

    await tx.auditLog.create({
      data: {
        entity: "VEHICLE_DOCUMENT",
        entityId: doc.id,
        action: "UPDATE_METADATA",
        delta: data as any,
        actorId: employeeId
      }
    });

    return doc;
  });

  revalidatePath("/admin/fleet");
  return { success: true, document: result };
}

// ==========================================
// EMPLOYEE DOCUMENTS
// ==========================================

export async function addEmployeeDocument(data: {
  employeeId: string;
  type: DocumentType;
  documentNumber: string;
  issueDate: string; 
  expiryDate: string;
  attachmentUrl: string;
}) {
  const { employeeId: actorId } = await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN, Role.STAFF] });
  const iDate = new Date(`${data.issueDate}T00:00:00.000Z`);
  const eDate = new Date(`${data.expiryDate}T00:00:00.000Z`);

  const result = await prisma.$transaction(async (tx) => {
    await tx.employeeDocument.updateMany({
      where: {
        employeeId: data.employeeId,
        type: data.type,
        status: DocumentStatus.ACTIVE
      },
      data: {
        status: DocumentStatus.ARCHIVED
      }
    });

    const newDoc = await tx.employeeDocument.create({
      data: {
        employeeId: data.employeeId,
        type: data.type,
        documentNumber: data.documentNumber,
        issueDate: iDate,
        expiryDate: eDate,
        attachmentUrl: data.attachmentUrl,
        status: DocumentStatus.ACTIVE
      }
    });

    await tx.auditLog.create({
      data: {
        entity: "EMPLOYEE_DOCUMENT",
        entityId: newDoc.id,
        action: "CREATE_AND_ARCHIVE_OLD",
        delta: data as any,
        actorId
      }
    });

    return newDoc;
  });

  revalidatePath("/admin/staff");
  return { success: true, document: result };
}

export async function archiveEmployeeDocument(documentId: string) {
  const { employeeId } = await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN] });

  const result = await prisma.$transaction(async (tx) => {
    const doc = await tx.employeeDocument.update({
      where: { id: documentId },
      data: { status: DocumentStatus.ARCHIVED }
    });

    await tx.auditLog.create({
      data: {
        entity: "EMPLOYEE_DOCUMENT",
        entityId: doc.id,
        action: "ARCHIVE",
        delta: { status: "ARCHIVED" } as any,
        actorId: employeeId
      }
    });

    return doc;
  });

  revalidatePath("/admin/staff");
  return { success: true, document: result };
}

export async function updateEmployeeDocument(documentId: string, data: {
  documentNumber?: string;
  issueDate?: string;
  expiryDate?: string;
}) {
  const { employeeId } = await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN] });

  const updateData: any = {};
  if (data.documentNumber) updateData.documentNumber = data.documentNumber;
  if (data.issueDate) updateData.issueDate = new Date(`${data.issueDate}T00:00:00.000Z`);
  if (data.expiryDate) updateData.expiryDate = new Date(`${data.expiryDate}T00:00:00.000Z`);

  const result = await prisma.$transaction(async (tx) => {
    const doc = await tx.employeeDocument.update({
      where: { id: documentId },
      data: updateData
    });

    await tx.auditLog.create({
      data: {
        entity: "EMPLOYEE_DOCUMENT",
        entityId: doc.id,
        action: "UPDATE_METADATA",
        delta: data as any,
        actorId: employeeId
      }
    });

    return doc;
  });

  revalidatePath("/admin/staff");
  return { success: true, document: result };
}
