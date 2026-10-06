import { NextRequest, NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/auth";
import { apiError, readJson, unexpectedError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { SlotUpdateSchema } from "@/lib/validations/management";

type RouteContext = { params: Promise<{ slotId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { slotId } = await context.params;
  const slot = await prisma.slot.findUnique({ where: { id: slotId }, include: { zone: true } });
  if (!slot) return apiError("Slot not found", 404);
  if (slot.isShadowPool) {
    const auth = await requirePrincipal(_request, ["OPERATOR", "SUPERADMIN"]);
    if ("response" in auth) return auth.response;
  }
  return NextResponse.json({ slot });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requirePrincipal(request, ["SUPERADMIN"]);
  if ("response" in auth) return auth.response;
  const input = await readJson(request, SlotUpdateSchema);
  if ("response" in input) return input.response;
  const { slotId } = await context.params;
  try {
    const slot = await prisma.slot.update({ where: { id: slotId }, data: input.data });
    return NextResponse.json({ slot });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2025") {
      return apiError("Slot not found", 404);
    }
    return unexpectedError(error);
  }
}
