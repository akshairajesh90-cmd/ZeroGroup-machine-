import { z } from "zod";

// Zod schemas for strict payload validation

export const docketSchema = z.object({
  dispatchId: z.string().min(1, "Dispatch ID is required"),
  startMeter: z.coerce.number().min(0, "Start meter must be positive").optional().or(z.literal("")),
  endMeter: z.coerce.number().min(0, "End meter must be positive").optional().or(z.literal("")),
  waterAdded: z.coerce.number().min(0, "Water added must be positive").optional().or(z.literal("")),
  washoutMinutes: z.coerce.number().min(0, "Washout minutes must be positive").optional().or(z.literal("")),
  standbyMinutes: z.coerce.number().min(0, "Standby minutes must be positive").optional().or(z.literal("")),
  clientName: z.string().optional(),
  signatureUrl: z.string().url("Must be a valid signature URL").optional().or(z.literal("")),
  signatureDataUrl: z.string().optional(), // For passing the raw canvas data before upload
});

export const fluidLogSchema = z.object({
  machineId: z.string().min(1, "Machine ID is required"),
  fluidType: z.enum(["DIESEL", "HYDRAULIC_OIL", "GREASE", "OTHER"]),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  notes: z.string().optional(),
});

export const breakdownSchema = z.object({
  machineId: z.string().min(1, "Machine ID is required"),
  description: z.string().min(5, "Please provide a detailed description of the breakdown"),
  isCritical: z.boolean().default(false),
  photoUrl: z.string().url("Must be a valid photo URL").optional().or(z.literal("")),
  photoDataUrl: z.string().optional(), // For passing raw base64 before upload
});
