import { NextRequest, NextResponse } from "next/server";
import { SlotOverrideSchema } from "@/lib/validations/parking";
import { requirePrincipal } from "@/lib/auth";
import { apiError, readJson } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const MaintenanceRequestSchema = SlotOverrideSchema.pick({ slotCode: true, reason: true });

export async function POST(request: NextRequest) {
  const auth = await requirePrincipal(request, ["OPERATOR", "SUPERADMIN"]);
  if ("response" in auth) return auth.response;
  const input = await readJson(request, MaintenanceRequestSchema);
  if ("response" in input) return input.response;
  const slot = await prisma.slot.findUnique({ where: { code: input.data.slotCode } });
  if (!slot) return apiError("Slot not found", 404);
  if (slot.status === "OCCUPIED") return apiError("An occupied slot cannot be marked for maintenance", 409);
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.slot.findUniqueOrThrow({ where: { id: slot.id } });
      if (current.status === "OCCUPIED") return null;
      const changed = await tx.slot.update({ where: { id: slot.id }, data: { status: "MAINTENANCE" } });
      await tx.auditLog.create({
        data: {
          actorUserId: auth.principal.id,
          event: "SLOT_MARKED_MAINTENANCE",
          entityType: "Slot",
          entityId: slot.id,
          details: JSON.stringify({ reason: input.data.reason }) ?? "{}",
        },
      });
      return changed;
    });
    if (!updated) return apiError("An occupied slot cannot be marked for maintenance", 409);
    return NextResponse.json({ slot: updated });
  } catch {
    return NextResponse.json({ error: "Could not update the slot" }, { status: 500 });
  }
}
