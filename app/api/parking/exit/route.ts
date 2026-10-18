import { NextRequest, NextResponse } from "next/server";
import { getPrincipal } from "@/lib/auth";
import { apiError, readJson, unexpectedError } from "@/lib/api";
import { moneyInr } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { feeForVisit } from "@/lib/parking";
import { ExitRequestSchema } from "@/lib/validations/parking";
import { serverEnv } from "@/lib/env";

export async function POST(request: NextRequest) {
  const input = await readJson(request, ExitRequestSchema);
  if ("response" in input) return input.response;
  const principal = await getPrincipal(request);
  const now = new Date();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const booking = input.data.bookingId
        ? await tx.booking.findUnique({ where: { id: input.data.bookingId }, include: { slot: true } })
        : await tx.booking.findFirst({
          where: { licensePlate: input.data.licensePlate, status: "ACTIVE" },
          include: { slot: true },
          orderBy: { actualEntry: "desc" },
        });
      if (!booking) return { error: "Active booking not found", status: 404 as const };
      if (booking.status === "COMPLETED") return { booking, alreadyExited: true, fees: null, paymentMethod: booking.paymentStatus };
      if (booking.status !== "ACTIVE") return { error: "Booking is not currently active", status: 409 as const };
      if (booking.userId && principal?.id !== booking.userId && principal?.role !== "OPERATOR" && principal?.role !== "SUPERADMIN") {
        return { error: "Only the booking owner or an operator can complete this exit", status: 403 as const };
      }

      const isStaff = principal?.role === "OPERATOR" || principal?.role === "SUPERADMIN";
      const fees = feeForVisit(booking.actualEntry ?? booking.expectedEntry, now, booking.expectedExit, booking.hourlyRatePaise);
      const paymentMethod = input.data.paymentMethod
        ?? (booking.userId && (principal?.id === booking.userId || isStaff) ? "WALLET" : "UPI");
      if (paymentMethod === "WALLET" && (!booking.userId || (principal?.id !== booking.userId && !isStaff))) {
        return { error: "Wallet payment is available to the signed-in booking owner or gate operator", status: 403 as const };
      }

      if (paymentMethod === "WALLET") {
        const debit = await tx.wallet.updateMany({
          where: { userId: booking.userId!, balancePaise: { gte: fees.totalDuePaise } },
          data: { balancePaise: { decrement: fees.totalDuePaise } },
        });
        if (debit.count !== 1) return { error: "Wallet balance is too low; recharge or choose UPI", status: 402 as const };
        const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId: booking.userId! } });
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            amountPaise: -fees.totalDuePaise,
            type: "PARKING_EXIT",
            reference: `exit:${booking.id}`,
            description: `Parking fee for booking ${booking.id}`,
          },
        });
      }

      const updated = await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: "COMPLETED",
          actualExit: now,
          baseFeePaise: fees.baseFeePaise,
          penaltyFeePaise: fees.penaltyFeePaise,
          totalPaidPaise: paymentMethod === "WALLET" ? fees.totalDuePaise : 0,
          paymentStatus: paymentMethod === "WALLET" ? "PAID" : "UNPAID",
        },
        include: { slot: true },
      });
      const otherActive = await tx.booking.findFirst({
        where: { slotId: booking.slotId, status: "ACTIVE", id: { not: booking.id } },
        select: { id: true },
      });
      if (!otherActive) await tx.slot.updateMany({ where: { id: booking.slotId, status: "OCCUPIED" }, data: { status: "AVAILABLE" } });
      await tx.auditLog.create({
        data: {
          actorUserId: principal?.id,
          event: "VEHICLE_CHECKED_OUT",
          entityType: "Booking",
          entityId: booking.id,
          details: JSON.stringify({ paymentMethod, totalDuePaise: fees.totalDuePaise, overstayMinutes: fees.overstayMinutes }) ?? "{}",
        },
      });
      return { booking: updated, alreadyExited: false, fees, paymentMethod };
    });

    if ("error" in result) return apiError(String(result.error), Number(result.status) || 409);
    const totalDuePaise = result.fees?.totalDuePaise ?? result.booking.baseFeePaise + result.booking.penaltyFeePaise;
    const env = serverEnv();
    const upiString = result.paymentMethod === "UPI"
      ? `upi://pay?pa=${encodeURIComponent(env.UPI_PAYEE_ADDRESS)}&pn=${encodeURIComponent(env.UPI_PAYEE_NAME)}&am=${moneyInr(totalDuePaise).toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Booking ${result.booking.id}`)}`
      : null;
    return NextResponse.json({
      message: result.alreadyExited ? "Exit was already recorded" : "Exit recorded",
      booking: result.booking,
      billing: result.fees ? {
        ...result.fees,
        baseFee: moneyInr(result.fees.baseFeePaise),
        penaltyFee: moneyInr(result.fees.penaltyFeePaise),
        totalDue: moneyInr(result.fees.totalDuePaise),
        currency: "INR",
      } : { totalDue: moneyInr(totalDuePaise), totalDuePaise, currency: "INR" },
      paymentMethod: result.paymentMethod,
      upiString,
    });
  } catch (error) {
    return unexpectedError(error);
  }
}
