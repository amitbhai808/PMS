import { z } from "zod";

export const UserRole = z.enum(["SUPERADMIN", "OPERATOR", "MEMBER"]);
export type UserRole = z.infer<typeof UserRole>;

export const VehicleType = z.enum(["TWO_WHEELER", "FOUR_WHEELER", "EV", "SUV"]);
export type VehicleType = z.infer<typeof VehicleType>;

export const SlotType = z.enum(["REGULAR", "VIP", "EV", "HANDICAPPED"]);
export type SlotType = z.infer<typeof SlotType>;

export const SlotStatus = z.enum(["AVAILABLE", "OCCUPIED", "MAINTENANCE"]);
export type SlotStatus = z.infer<typeof SlotStatus>;

export const BookingStatus = z.enum(["PENDING", "ACTIVE", "COMPLETED", "CANCELLED"]);
export type BookingStatus = z.infer<typeof BookingStatus>;

export const normalizePlate = (plate: string) => plate.replace(/[\s-]/g, "").toUpperCase();

export const LicensePlate = z
  .string()
  .trim()
  .min(4)
  .max(16)
  .regex(/^[A-Za-z0-9 -]+$/, "Use letters and numbers only")
  .transform(normalizePlate);

export const PositivePaise = z.number().int().positive().max(100_000_000);

export const moneyInr = (paise: number) => Number((paise / 100).toFixed(2));
