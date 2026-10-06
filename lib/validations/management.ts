import { z } from "zod";
import { SlotStatus, SlotType, VehicleType } from "@/lib/domain";

export const ZoneSchema = z.object({
  name: z.string().trim().min(2).max(80),
  level: z.number().int().min(-10).max(50),
  isCovered: z.boolean().default(true),
  clearanceHeight: z.number().positive().max(20).optional(),
});

export const SlotCreateSchema = z.object({
  code: z.string().trim().min(3).max(24),
  zoneId: z.string().min(1),
  slotType: SlotType.default("REGULAR"),
  allowedVehicleType: z.union([VehicleType, z.literal("ANY")]).default("ANY"),
  distanceToGate: z.number().int().nonnegative().max(50_000),
  isShadowPool: z.boolean().default(false),
  dedicatedUserId: z.string().min(1).optional(),
});

export const SlotUpdateSchema = z.object({
  code: z.string().trim().min(3).max(24).optional(),
  zoneId: z.string().min(1).optional(),
  slotType: SlotType.optional(),
  allowedVehicleType: z.union([VehicleType, z.literal("ANY")]).optional(),
  distanceToGate: z.number().int().nonnegative().max(50_000).optional(),
  isShadowPool: z.boolean().optional(),
  dedicatedUserId: z.string().min(1).nullable().optional(),
  status: SlotStatus.optional(),
}).refine((value) => Object.keys(value).length > 0, { message: "Provide at least one slot field to update" });

export const AdminUserSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().trim().toLowerCase(),
  phone: z.string().trim().min(8).max(20).optional(),
  password: z.string().min(12).max(128),
  role: z.enum(["SUPERADMIN", "OPERATOR"]),
});
