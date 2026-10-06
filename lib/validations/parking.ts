import { z } from "zod";
import { LicensePlate, SlotStatus, VehicleType } from "@/lib/domain";

const futureDate = z.string().datetime({ offset: true }).transform((value) => new Date(value));

export const EntryRequestSchema = z.object({
  licensePlate: LicensePlate,
  vehicleType: VehicleType.optional(),
  reservationId: z.string().min(1).optional(),
  expectedExit: futureDate.optional(),
  durationMinutes: z.number().int().min(15).max(7 * 24 * 60).optional(),
  idempotencyKey: z.string().min(8).max(100).optional(),
}).refine((value) => !(value.expectedExit && value.durationMinutes), {
  message: "Choose expectedExit or durationMinutes, not both",
});

export const ExitRequestSchema = z.object({
  bookingId: z.string().min(1).optional(),
  licensePlate: LicensePlate.optional(),
  paymentMethod: z.enum(["WALLET", "UPI"]).optional(),
}).refine((value) => value.bookingId || value.licensePlate, {
  message: "Provide bookingId or licensePlate",
});

export const ReserveRequestSchema = z.object({
  licensePlate: LicensePlate,
  vehicleType: VehicleType,
  expectedEntry: futureDate,
  expectedExit: futureDate,
}).refine((value) => value.expectedExit > value.expectedEntry, {
  message: "expectedExit must be later than expectedEntry",
});

export const SlotOverrideSchema = z.object({
  slotCode: z.string().trim().min(3).max(24),
  status: SlotStatus,
  reason: z.string().trim().min(4).max(500),
});

export const ManualAssignSchema = z.object({
  bookingId: z.string().min(1),
  slotCode: z.string().trim().min(3).max(24),
  reason: z.string().trim().min(4).max(500),
});

export const RegisterVehicleSchema = z.object({
  licensePlate: LicensePlate,
  type: VehicleType,
});

export const WalletRechargeSchema = z.object({
  amountPaise: z.number().int().positive().max(10_000_000),
  idempotencyKey: z.string().min(8).max(100),
});
