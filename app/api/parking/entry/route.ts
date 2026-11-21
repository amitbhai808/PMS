import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getPrincipal } from "@/lib/auth";
import { apiError, readJson, unexpectedError } from "@/lib/api";
import {
  findCompatibleSlots,
  hasBookingConflict,
  hasUpcomingReservation,
  hourlyRatePaise,
  withAllocationLock,
} from "@/lib/parking";
import { EntryRequestSchema } from "@/lib/validations/parking";
import type { VehicleType } from "@/lib/domain";
import { serverEnv } from "@/lib/env";

export async function POST(request: NextRequest) {
  const principal = await getPrincipal(request);
  const gateSecretValid = isValidGateKey(
    request.headers.get("x-anpr-gate-secret"),
  );
  if (serverEnv().NODE_ENV === "production" && !principal && !gateSecretValid) {
    return apiError(
      "A signed-in account or valid ANPR service key is required",
      401,
    );
  }
  return handleEntry(request, principal, gateSecretValid);
}

function isValidGateKey(value: string | null) {
  const expected = serverEnv().ANPR_GATE_SECRET;
  if (!value || !expected) return false;
  const left = Buffer.from(value);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function handleEntry(
  request: NextRequest,
  sessionPrincipal?: Awaited<ReturnType<typeof getPrincipal>>,
  trustedGate = false,
) {
  const input = await readJson(request, EntryRequestSchema);
  if ("response" in input) return input.response;
  const principal =
    sessionPrincipal === undefined
      ? await getPrincipal(request)
      : sessionPrincipal;
  const isStaff =
    principal?.role === "OPERATOR" || principal?.role === "SUPERADMIN";
  const now = new Date();
  const expectedExit =
    input.data.expectedExit ??
    new Date(now.getTime() + (input.data.durationMinutes ?? 60) * 60_000);
  if (expectedExit <= now)
    return apiError("expectedExit must be in the future", 422);

  try {
    const result = await withAllocationLock(async (tx) => {
      const existingVehicle = await tx.vehicle.findUnique({
        where: { licensePlate: input.data.licensePlate },
      });

      const reservation = input.data.reservationId
        ? await tx.booking.findFirst({
          where: { id: input.data.reservationId, status: "PENDING" },
          include: { slot: true },
        })
        : await tx.booking.findFirst({
          where: {
            licensePlate: input.data.licensePlate,
            status: "PENDING",
            expectedEntry: { lte: new Date(now.getTime() + 30 * 60_000) },
            expectedExit: { gt: now },
          },
          include: { slot: true },
          orderBy: { expectedEntry: "asc" },
        });

      if (input.data.reservationId && !reservation) {
        return { error: "Pending reservation not found", status: 404 as const };
      }
      if (reservation) {
        if (reservation.licensePlate !== input.data.licensePlate) {
          return {
            error: "Reservation does not belong to this vehicle",
            status: 403 as const,
          };
        }
        if (
          reservation.userId &&
          !isStaff &&
          !trustedGate &&
          reservation.userId !== principal?.id
        ) {
          return {
            error: "Reservation does not belong to this account",
            status: 403 as const,
          };
        }
      }

      // If registered to a member, operators and trusted gates can admit the car,
      // but non-staff users cannot check in another member's registered vehicle.
      if (
        existingVehicle?.ownerId &&
        !isStaff &&
        !trustedGate &&
        existingVehicle.ownerId !== principal?.id
      ) {
        return {
          error:
            "This registered vehicle can only enter from its owner's account or the trusted ANPR gate",
          status: 403 as const,
        };
      }

      const bookingUserId =
        reservation?.userId ??
        existingVehicle?.ownerId ??
        (!isStaff && !trustedGate ? principal?.id : undefined);

      if (input.data.idempotencyKey) {
        const previous = await tx.booking.findUnique({
          where: { idempotencyKey: input.data.idempotencyKey },
          include: { slot: { include: { zone: true } } },
        });
        if (previous) {
          if (
            previous.licensePlate !== input.data.licensePlate ||
            previous.userId !== (bookingUserId ?? null)
          ) {
            return {
              error: "Idempotency key has already been used",
              status: 409 as const,
            };
          }
          return { booking: previous, duplicate: true, reassigned: false };
        }
      }

      const vehicleType = (existingVehicle?.type ?? input.data.vehicleType) as
        | VehicleType
        | undefined;
      if (!vehicleType)
        return {
          error: "vehicleType is required for an unregistered vehicle",
          status: 422 as const,
        };
      if (
        existingVehicle &&
        input.data.vehicleType &&
        existingVehicle.type !== input.data.vehicleType
      ) {
        return {
          error: "Vehicle type does not match the registered vehicle",
          status: 422 as const,
        };
      }

      const vehicleOwnerId =
        existingVehicle?.ownerId ??
        reservation?.userId ??
        (!isStaff && !trustedGate ? principal?.id : undefined);

      await tx.vehicle.upsert({
        where: { licensePlate: input.data.licensePlate },
        create: {
          licensePlate: input.data.licensePlate,
          type: vehicleType,
          ownerId: vehicleOwnerId,
        },
        update:
          !existingVehicle?.ownerId && !isStaff && !trustedGate && principal
            ? { ownerId: principal.id }
            : {},
      });

      let selectedSlot = reservation?.slot ?? null;
      let reassigned = false;
      const bookedExit = reservation?.expectedExit ?? expectedExit;
      if (reservation) {
        const stillValid =
          selectedSlot?.status === "AVAILABLE" &&
          !(await hasBookingConflict(
            tx,
            selectedSlot.id,
            now,
            bookedExit,
            reservation.id,
          ));
        if (!stillValid) {
          selectedSlot = null;
          const ordinary = await findCompatibleSlots(tx, vehicleType, {
            dedicatedUserId: bookingUserId,
          });
          for (const candidate of ordinary) {
            if (await hasUpcomingReservation(tx, candidate.id, now)) continue;
            if (
              await hasBookingConflict(
                tx,
                candidate.id,
                now,
                bookedExit,
                reservation.id,
              )
            )
              continue;
            selectedSlot = candidate;
            break;
          }
          if (!selectedSlot) {
            const shadow = await findCompatibleSlots(tx, vehicleType, {
              dedicatedUserId: bookingUserId,
              includeShadowPool: true,
            });
            for (const candidate of shadow.filter(
              (slot) => slot.isShadowPool,
            )) {
              if (
                await hasBookingConflict(
                  tx,
                  candidate.id,
                  now,
                  bookedExit,
                  reservation.id,
                )
              )
                continue;
              selectedSlot = candidate;
              break;
            }
          }
          if (!selectedSlot)
            return {
              error: "Parking is full; no safe reassignment slot is available",
              status: 409 as const,
            };
          reassigned = true;
          await tx.reassignmentEvent.create({
            data: {
              bookingId: reservation.id,
              fromSlotCode: reservation.slot.code,
              toSlotCode: selectedSlot.code,
              reason: "Original reservation slot was not available at arrival",
            },
          });
        }
      } else {
        const ordinary = await findCompatibleSlots(tx, vehicleType, {
          dedicatedUserId: bookingUserId,
        });
        for (const candidate of ordinary) {
          if (await hasUpcomingReservation(tx, candidate.id, now)) continue;
          if (await hasBookingConflict(tx, candidate.id, now, expectedExit))
            continue;
          selectedSlot = candidate;
          break;
        }
        if (!selectedSlot) {
          const shadow = await findCompatibleSlots(tx, vehicleType, {
            dedicatedUserId: bookingUserId,
            includeShadowPool: true,
          });
          for (const candidate of shadow.filter((slot) => slot.isShadowPool)) {
            if (await hasBookingConflict(tx, candidate.id, now, expectedExit))
              continue;
            selectedSlot = candidate;
            break;
          }
        }
        if (!selectedSlot)
          return {
            error: "No compatible parking slot is currently available",
            status: 409 as const,
          };
      }

      if (!selectedSlot)
        return {
          error: "No compatible parking slot is currently available",
          status: 409 as const,
        };
      const allocatedSlot = selectedSlot;

      const slotLock = await tx.slot.updateMany({
        where: { id: allocatedSlot.id, status: "AVAILABLE" },
        data: { status: "OCCUPIED" },
      });
      if (slotLock.count !== 1)
        return {
          error: "Slot allocation changed; please retry entry",
          status: 409 as const,
        };

      const occupancy = await tx.slot.count({
        where: { isShadowPool: false, status: "OCCUPIED" },
      });
      const total = await tx.slot.count({
        where: { isShadowPool: false, status: { not: "MAINTENANCE" } },
      });
      const rate = hourlyRatePaise(
        total === 0 ? 0 : occupancy / total,
        !reservation,
      );
      const booking = reservation
        ? await tx.booking.update({
          where: { id: reservation.id },
          data: {
            slotId: allocatedSlot.id,
            status: "ACTIVE",
            actualEntry: now,
            hourlyRatePaise: rate,
            idempotencyKey: input.data.idempotencyKey,
          },
          include: { slot: { include: { zone: true } } },
        })
        : await tx.booking.create({
          data: {
            status: "ACTIVE",
            userId: bookingUserId,
            licensePlate: input.data.licensePlate,
            slotId: allocatedSlot.id,
            expectedEntry: now,
            expectedExit,
            actualEntry: now,
            hourlyRatePaise: rate,
            idempotencyKey: input.data.idempotencyKey,
          },
          include: { slot: { include: { zone: true } } },
        });
      await tx.auditLog.create({
        data: {
          actorUserId: principal?.id,
          event: reservation ? "RESERVATION_CHECKED_IN" : "VEHICLE_CHECKED_IN",
          entityType: "Booking",
          entityId: booking.id,
          details:
            JSON.stringify({ slotCode: allocatedSlot.code, reassigned }) ??
            "{}",
        },
      });
      return { booking, duplicate: false, reassigned };
    });
    if ("error" in result)
      return apiError(String(result.error), Number(result.status) || 409);
    return NextResponse.json(
      {
        booking: result.booking,
        reassigned: result.reassigned,
        message: result.duplicate ? "Entry already recorded" : "Entry recorded",
      },
      { status: result.duplicate ? 200 : 201 },
    );
  } catch (error) {
    return unexpectedError(error);
  }
}
