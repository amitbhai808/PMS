import { NextRequest, NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/auth";
import { apiError, readJson, unexpectedError } from "@/lib/api";
import { findCompatibleSlots, hasBookingConflict, hourlyRatePaise, withAllocationLock } from "@/lib/parking";
import { ReserveRequestSchema } from "@/lib/validations/parking";
import type { VehicleType } from "@/lib/domain";

export async function POST(request: NextRequest) {
  const auth = await requirePrincipal(request, ["MEMBER"]);
  if ("response" in auth) return auth.response;
  const input = await readJson(request, ReserveRequestSchema);
  if ("response" in input) return input.response;
  const { licensePlate, vehicleType, expectedEntry, expectedExit } = input.data;
  if (expectedEntry <= new Date()) return apiError("Reservation entry must be in the future", 422);

  try {
    const result = await withAllocationLock(async (tx) => {
      const vehicle = await tx.vehicle.findUnique({ where: { licensePlate } });
      if (!vehicle || vehicle.ownerId !== auth.principal.id) {
        return { error: "Register this vehicle to your account before reserving", status: 403 as const };
      }
      if (vehicle.type !== vehicleType) return { error: "Vehicle type does not match the registered vehicle", status: 422 as const };

      const slots = await findCompatibleSlots(tx, vehicleType as VehicleType, {
        includeOccupied: true,
        dedicatedUserId: auth.principal.id,
      });
      for (const slot of slots) {
        if (await hasBookingConflict(tx, slot.id, expectedEntry, expectedExit)) continue;
        const booking = await tx.booking.create({
          data: {
            status: "PENDING",
            userId: auth.principal.id,
            licensePlate,
            slotId: slot.id,
            expectedEntry,
            expectedExit,
            hourlyRatePaise: hourlyRatePaise(0, false),
          },
          include: { slot: { include: { zone: true } } },
        });
        await tx.auditLog.create({
          data: {
            actorUserId: auth.principal.id,
            event: "BOOKING_RESERVED",
            entityType: "Booking",
            entityId: booking.id,
            details: JSON.stringify({ slotCode: slot.code }) ?? "{}",
          },
        });
        return { booking };
      }
      return { error: "No compatible slot is available for that time window", status: 409 as const };
    });
    if ("error" in result) return apiError(String(result.error), Number(result.status) || 409);
    return NextResponse.json({ booking: result.booking }, { status: 201 });
  } catch (error) {
    return unexpectedError(error);
  }
}
