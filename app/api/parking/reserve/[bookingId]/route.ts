import { NextRequest, NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ bookingId: string }> };

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await requirePrincipal(request);
  if ("response" in auth) return auth.response;
  const { bookingId } = await context.params;
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.status !== "PENDING") return apiError("Pending reservation not found", 404);
  const operator = auth.principal.role === "SUPERADMIN" || auth.principal.role === "OPERATOR";
  if (!operator && booking.userId !== auth.principal.id) return apiError("Reservation belongs to another account", 403);
  const updated = await prisma.$transaction(async (tx) => {
    const cancelled = await tx.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED" } });
    await tx.auditLog.create({
      data: {
        actorUserId: auth.principal.id,
        event: "RESERVATION_CANCELLED",
        entityType: "Booking",
        entityId: booking.id,
      },
    });
    return cancelled;
  });
  return NextResponse.json({ booking: updated });
}
