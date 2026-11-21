import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { VehicleType } from "@/lib/domain";
import { serverEnv } from "@/lib/env";

export const RESERVATION_BUFFER_MS = 30 * 60 * 1000;
export const ALLOCATION_LOCK_ID = "parking-allocation";

export async function withAllocationLock<T>(
  action: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        await tx.allocationLock.upsert({
          where: { id: ALLOCATION_LOCK_ID },
          create: { id: ALLOCATION_LOCK_ID },
          update: { version: { increment: 1 } },
        });
        return action(tx);
      }, { timeout: 15_000 });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const retryable = /SQLITE_BUSY|database is locked|P2034/i.test(message);
      if (!retryable || attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 40 * (attempt + 1)));
    }
  }
  throw new Error("Allocation transaction exhausted retries");
}

export function vehicleCompatible(allowedVehicleType: string, actual: VehicleType) {
  if (allowedVehicleType === "ANY" || allowedVehicleType === actual) return true;
  return (actual === "EV" || actual === "SUV") && allowedVehicleType === "FOUR_WHEELER";
}

export async function findCompatibleSlots(
  tx: Prisma.TransactionClient,
  vehicleType: VehicleType,
  options: { includeShadowPool?: boolean; includeOccupied?: boolean; dedicatedUserId?: string },
) {
  const candidates = await tx.slot.findMany({
    where: {
      status: options.includeOccupied ? { in: ["AVAILABLE", "OCCUPIED"] } : "AVAILABLE",
      isShadowPool: options.includeShadowPool ? undefined : false,
      OR: [
        { dedicatedUserId: null },
        ...(options.dedicatedUserId ? [{ dedicatedUserId: options.dedicatedUserId }] : []),
      ],
    },
    include: { zone: true },
    orderBy: [{ dedicatedUserId: "desc" }, { distanceToGate: "asc" }, { code: "asc" }],
  });
  return candidates.filter((slot) =>
    vehicleCompatible(slot.allowedVehicleType, vehicleType)
      && slot.slotType !== "HANDICAPPED"
      && !(vehicleType === "SUV" && slot.zone.clearanceHeight !== null && slot.zone.clearanceHeight < 2.0)
      && (slot.slotType !== "VIP" || slot.dedicatedUserId === options.dedicatedUserId),
  );
}

export async function hasBookingConflict(
  tx: Prisma.TransactionClient,
  slotId: string,
  expectedEntry: Date,
  expectedExit: Date,
  excludeBookingId?: string,
) {
  const buffer = RESERVATION_BUFFER_MS;
  const now = new Date();
  const [start, end] = [new Date(expectedEntry.getTime() - buffer), new Date(expectedExit.getTime() + buffer)];
  const conflict = await tx.booking.findFirst({
    where: {
      slotId,
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      status: { in: ["PENDING", "ACTIVE"] },
      OR: [
        { expectedEntry: { lt: end }, expectedExit: { gt: start } },
        { status: "ACTIVE", actualExit: null, expectedExit: { lte: now }, expectedEntry: { lt: end } },
      ],
    },
    select: { id: true },
  });
  return Boolean(conflict);
}

export async function hasUpcomingReservation(tx: Prisma.TransactionClient, slotId: string, now: Date) {
  return Boolean(await tx.booking.findFirst({
    where: {
      slotId,
      status: "PENDING",
      expectedEntry: { gte: now, lte: new Date(now.getTime() + 2 * 60 * 60 * 1000) },
      expectedExit: { gt: now },
    },
    select: { id: true },
  }));
}

export async function occupancySnapshot() {
  const [total, occupied] = await Promise.all([
    prisma.slot.count({ where: { isShadowPool: false, status: { not: "MAINTENANCE" } } }),
    prisma.slot.count({ where: { isShadowPool: false, status: "OCCUPIED" } }),
  ]);
  return { total, occupied, ratio: total === 0 ? 0 : occupied / total };
}

export function hourlyRatePaise(occupancyRatio: number, allowSurge: boolean) {
  const { BASE_HOURLY_RATE_PAISE: baseRate, SURGE_OCCUPANCY_THRESHOLD: threshold, SURGE_MULTIPLIER: multiplier } = serverEnv();
  return Math.round(allowSurge && occupancyRatio > threshold ? baseRate * multiplier : baseRate);
}

export function feeForVisit(
  actualEntry: Date,
  actualExit: Date,
  expectedExit: Date,
  hourlyRate: number,
) {
  const actualMinutes = Math.max(1, Math.ceil((actualExit.getTime() - actualEntry.getTime()) / 60_000));
  const overstayMinutes = Math.max(0, Math.ceil((actualExit.getTime() - expectedExit.getTime()) / 60_000));
  const normalMinutes = Math.max(0, actualMinutes - overstayMinutes);
  const graceMinutes = overstayMinutes === 0 ? Math.min(1, normalMinutes) : 0;
  const perMinute = hourlyRate / 60;
  const baseFeePaise = Math.ceil(Math.max(0, normalMinutes - graceMinutes) * perMinute + overstayMinutes * perMinute);
  const penaltyMultiplier = serverEnv().OVERSTAY_PENALTY_MULTIPLIER;
  // Overstay starts at expectedExit; there is no grace period on penalty minutes.
  const penaltyFeePaise = Math.ceil(overstayMinutes * perMinute * (penaltyMultiplier - 1));
  return { actualMinutes, overstayMinutes, graceMinutes, baseFeePaise, penaltyFeePaise, totalDuePaise: baseFeePaise + penaltyFeePaise };
}
