import { NextRequest, NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/auth";
import { apiError, readJson, unexpectedError } from "@/lib/api";
import type { VehicleType } from "@/lib/domain";
import { hasBookingConflict, hasUpcomingReservation, vehicleCompatible, withAllocationLock } from "@/lib/parking";
import { ManualAssignSchema } from "@/lib/validations/parking";

export async function POST(request: NextRequest) {
  const auth = await requirePrincipal(request, ["OPERATOR", "SUPERADMIN"]);
  if ("response" in auth) return auth.response;
  const input = await readJson(request, ManualAssignSchema);
  if ("response" in input) return input.response;

  try {
    const result = await withAllocationLock(async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id: input.data.bookingId }, include: { slot: true, vehicle: true } });
      const target = await tx.slot.findUnique({ where: { code: input.data.slotCode }, include: { zone: true } });
      if (!booking || booking.status !== "ACTIVE") return { error: "Active booking not found", status: 404 as const };
      if (!target) return { error: "Target slot not found", status: 404 as const };
      if (target.id === booking.slotId) return { booking, slot: target, unchanged: true };
      if (target.status !== "AVAILABLE") return { error: "Target slot is not available", status: 409 as const };
      if (target.slotType === "VIP" && target.dedicatedUserId !== booking.userId) {
        return { error: "VIP slot is dedicated to another account", status: 409 as const };
      }
      if (target.slotType === "HANDICAPPED") {
        return { error: "Accessible bays require an accessibility-aware assignment", status: 409 as const };
      }
      if (!vehicleCompatible(target.allowedVehicleType, booking.vehicle.type as VehicleType)) {
        return { error: "Target slot is not compatible with the vehicle", status: 422 as const };
      }
      if (booking.vehicle.type === "SUV" && target.zone.clearanceHeight !== null && target.zone.clearanceHeight < 2.0) {
        return { error: "Target zone clearance is too low for this vehicle", status: 422 as const };
      }
      const start = booking.actualEntry ?? booking.expectedEntry;
      if (await hasUpcomingReservation(tx, target.id, new Date())) return { error: "Target slot has an upcoming reservation", status: 409 as const };
      if (await hasBookingConflict(tx, target.id, start, booking.expectedExit, booking.id)) {
        return { error: "Target slot conflicts with another booking", status: 409 as const };
      }
      const slotUpdate = await tx.slot.updateMany({ where: { id: target.id, status: "AVAILABLE" }, data: { status: "OCCUPIED" } });
      if (slotUpdate.count !== 1) return { error: "Target slot allocation changed; retry the override", status: 409 as const };
      const updatedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: { slotId: target.id },
        include: { slot: { include: { zone: true } } },
      });
      const otherActive = await tx.booking.findFirst({ where: { slotId: booking.slotId, status: "ACTIVE", id: { not: booking.id } }, select: { id: true } });
      if (!otherActive) await tx.slot.update({ where: { id: booking.slotId }, data: { status: "AVAILABLE" } });
      await tx.auditLog.create({
        data: {
          actorUserId: auth.principal.id,
          event: "BOOKING_MANUALLY_ASSIGNED",
          entityType: "Booking",
          entityId: booking.id,
          details: JSON.stringify({ from: booking.slot.code, to: target.code, reason: input.data.reason }) ?? "{}",
        },
      });
      return { booking: updatedBooking, slot: target, unchanged: false };
    });
    if ("error" in result) return apiError(String(result.error), Number(result.status) || 409);
    return NextResponse.json({ booking: result.booking, slot: result.slot, unchanged: result.unchanged });
  } catch (error) {
    return unexpectedError(error);
  }
}
