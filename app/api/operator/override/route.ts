import { NextRequest, NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/auth";
import { apiError, readJson, unexpectedError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { SlotOverrideSchema } from "@/lib/validations/parking";

export async function POST(request: NextRequest) {
  const auth = await requirePrincipal(request, ["OPERATOR", "SUPERADMIN"]);
  if ("response" in auth) return auth.response;
  const input = await readJson(request, SlotOverrideSchema);
  if ("response" in input) return input.response;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const slot = await tx.slot.findUnique({ where: { code: input.data.slotCode } });
      if (!slot) return { error: "Slot not found", status: 404 as const };
      const activeBooking = await tx.booking.findFirst({ where: { slotId: slot.id, status: "ACTIVE" }, select: { id: true } });
      if (input.data.status === "AVAILABLE" && activeBooking) {
        return { error: "An active booking still uses this slot", status: 409 as const };
      }
      const updated = await tx.slot.update({ where: { id: slot.id }, data: { status: input.data.status } });
      await tx.auditLog.create({
        data: {
          actorUserId: auth.principal.id,
          event: "SLOT_STATUS_OVERRIDDEN",
          entityType: "Slot",
          entityId: slot.id,
          details: JSON.stringify({ from: slot.status, to: input.data.status, reason: input.data.reason }) ?? "{}",
        },
      });
      return { slot: updated };
    });
    if ("error" in result) return apiError(String(result.error), Number(result.status) || 409);
    return NextResponse.json({ slot: result.slot });
  } catch (error) {
    return unexpectedError(error);
  }
}
