import { z } from 'zod';

export const calculateSettlementSchema = z.object({
  operatorId: z.string().min(1, "Operator is required"),
  startDate: z.string().min(1, "Start Date is required"),
  endDate: z.string().min(1, "End Date is required"),
});

export const createAdjustmentSchema = z.object({
  employeeId: z.string().min(1, "Employee ID required"),
  amount: z.number().positive("Amount must be positive"),
  type: z.enum(["BONUS", "PENALTY"]),
  reason: z.string().min(3, "Mandatory audit reason required (min 3 characters)"),
  date: z.string().min(1, "Date required"),
});

export const approveAdjustmentSchema = z.object({
  adjustmentId: z.string().min(1, "Adjustment ID required"),
});

export const generateSettlementSchema = z.object({
  operatorId: z.string().min(1, "Operator required"),
  weekEnding: z.string().min(1, "Week Ending date required"),
  notes: z.string().optional(),
  customEarned: z.number().optional(),
  customAdvances: z.number().optional(),
  customBonuses: z.number().optional(),
});

export const updateSettlementSchema = z.object({
  settlementId: z.string().min(1, "Settlement ID required"),
  currentVersion: z.number().int(),
  customEarned: z.number().optional(),
  customAdvances: z.number().optional(),
  customBonuses: z.number().optional(),
});

export const finalizeSettlementSchema = z.object({
  settlementId: z.string().min(1, "Settlement ID required"),
  currentVersion: z.number().int(),
});

export const finalizeWeeklySettlementSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  weekEnding: z.string().min(1, "Week Ending date is required"),
  notes: z.string().optional(),
});

export const multiPlayerBreakdownSchema = z.object({
  startDate: z.string().min(1, "Start Date is required"),
  endDate: z.string().min(1, "End Date is required"),
});
