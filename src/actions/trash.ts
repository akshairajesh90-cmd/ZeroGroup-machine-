"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";

export type TrashItem = {
  id: string;
  type: string;
  title: string;
  deletedAt: Date | string | null;
  deletedBy: string | null;
  details: string;
};

export async function getTrashItems() {
  await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN] });

  try {
    const trashItems: TrashItem[] = [];

    // Customers
    const customers = await prisma.customer.findMany({
      where: { isPendingDelete: true }
    });
    customers.forEach(c => trashItems.push({
      id: c.id,
      type: "Customer",
      title: c.name,
      deletedAt: c.updatedAt,
      deletedBy: c.markedForDeleteBy,
      details: c.phone || "No phone"
    }));

    // Employees
    const employees = await prisma.employee.findMany({
      where: { isPendingDelete: true }
    });
    employees.forEach(e => trashItems.push({
      id: e.id,
      type: "Employee",
      title: e.name,
      deletedAt: e.updatedAt,
      deletedBy: e.markedForDeleteBy,
      details: `Role: ${e.role}`
    }));

    // DailyDispatch
    const dispatches = await prisma.dailyDispatch.findMany({
      where: { isPendingDelete: true },
      include: { customer: true }
    });
    dispatches.forEach(d => trashItems.push({
      id: d.id,
      type: "DailyDispatch",
      title: `${d.customer?.name} - ${d.dateOfService.toISOString().split('T')[0]}`,
      deletedAt: d.updatedAt,
      deletedBy: d.markedForDeleteBy,
      details: d.location
    }));

    // Expense
    const expenses = await prisma.expense.findMany({
      where: { isPendingDelete: true }
    });
    expenses.forEach(e => trashItems.push({
      id: e.id,
      type: "Expense",
      title: `${e.category} - ₹${e.amount.toString()}`,
      deletedAt: e.updatedAt,
      deletedBy: e.markedForDeleteBy,
      details: e.description || "No description"
    }));

    // Invoices
    const invoices = await prisma.invoice.findMany({
      where: { isPendingDelete: true },
      include: { customer: true }
    });
    invoices.forEach(i => trashItems.push({
      id: i.id,
      type: "Invoice",
      title: `${i.invoiceNumber} - ${i.customer?.name}`,
      deletedAt: i.updatedAt,
      deletedBy: i.markedForDeleteBy,
      details: `Amount: ₹${i.totalAmount.toString()}`
    }));

    // Tools
    const tools = await prisma.tool.findMany({
      where: { isPendingDelete: true }
    });
    tools.forEach(t => trashItems.push({
      id: t.id,
      type: "Tool",
      title: t.name,
      deletedAt: t.updatedAt,
      deletedBy: t.markedForDeleteBy,
      details: `Total Inventory: ${t.totalInventory}`
    }));

    // Vehicles
    const vehicles = await prisma.vehicle.findMany({
      where: { isPendingDelete: true }
    });
    vehicles.forEach(v => trashItems.push({
      id: v.id,
      type: "Vehicle",
      title: v.licensePlate,
      deletedAt: v.updatedAt,
      deletedBy: v.markedForDeleteBy,
      details: `Type: ${v.type}`
    }));

    // Machines
    const machines = await prisma.machine.findMany({
      where: { isPendingDelete: true }
    });
    machines.forEach(m => trashItems.push({
      id: m.id,
      type: "Machine",
      title: m.machineId,
      deletedAt: m.updatedAt,
      deletedBy: m.markedForDeleteBy,
      details: `Type: ${m.type}`
    }));

    // Sort by deleted at
    trashItems.sort((a, b) => new Date(b.deletedAt || 0).getTime() - new Date(a.deletedAt || 0).getTime());

    return { success: true, items: trashItems };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function restoreItem(id: string, type: string) {
  await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN] });

  try {
    switch (type) {
      case "Customer":
        await prisma.customer.update({ where: { id }, data: { isPendingDelete: false, markedForDeleteBy: null } });
        break;
      case "Employee":
        await prisma.employee.update({ where: { id }, data: { isPendingDelete: false, markedForDeleteBy: null } });
        break;
      case "DailyDispatch":
        await prisma.dailyDispatch.update({ where: { id }, data: { isPendingDelete: false, markedForDeleteBy: null } });
        break;
      case "Expense":
        await prisma.expense.update({ where: { id }, data: { isPendingDelete: false, markedForDeleteBy: null } });
        break;
      case "Invoice":
        await prisma.invoice.update({ where: { id }, data: { isPendingDelete: false, markedForDeleteBy: null } });
        break;
      case "Tool":
        await prisma.tool.update({ where: { id }, data: { isPendingDelete: false, markedForDeleteBy: null } });
        break;
      case "Vehicle":
        await prisma.vehicle.update({ where: { id }, data: { isPendingDelete: false, markedForDeleteBy: null } });
        break;
      case "Machine":
        await prisma.machine.update({ where: { id }, data: { isPendingDelete: false, markedForDeleteBy: null } });
        break;
      default:
        throw new Error("Invalid item type");
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteItemPermanently(id: string, type: string) {
  const user = await requireAuth({ allowedRoles: [Role.OWNER] });
  if (user.role !== Role.OWNER) {
    return { success: false, error: "Only owners can permanently delete items" };
  }

  try {
    switch (type) {
      case "Customer":
        await prisma.customer.delete({ where: { id } });
        break;
      case "Employee":
        await prisma.employee.delete({ where: { id } });
        break;
      case "DailyDispatch":
        await prisma.dailyDispatch.delete({ where: { id } });
        break;
      case "Expense":
        await prisma.expense.delete({ where: { id } });
        break;
      case "Invoice":
        await prisma.invoice.delete({ where: { id } });
        break;
      case "Tool":
        await prisma.tool.delete({ where: { id } });
        break;
      case "Vehicle":
        await prisma.vehicle.delete({ where: { id } });
        break;
      case "Machine":
        await prisma.machine.delete({ where: { id } });
        break;
      default:
        throw new Error("Invalid item type");
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
