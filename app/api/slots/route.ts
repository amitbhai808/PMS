import { NextRequest, NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/auth";
import { apiError, readJson, unexpectedError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { SlotCreateSchema } from "@/lib/validations/management";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const zoneId = searchParams.get("zoneId") ?? undefined;
  const showShadowPool = searchParams.get("includeShadow") === "true";
  if (showShadowPool) {
    const auth = await requirePrincipal(request, ["OPERATOR", "SUPERADMIN"]);
    if ("response" in auth) return auth.response;
  }
  const slots = await prisma.slot.findMany({
    where: { ...(zoneId ? { zoneId } : {}), ...(showShadowPool ? {} : { isShadowPool: false }) },
    include: { zone: { select: { id: true, name: true, level: true } } },
    orderBy: [{ zone: { level: "asc" } }, { distanceToGate: "asc" }, { code: "asc" }],
  });
  return NextResponse.json({ slots });
}

export async function POST(request: NextRequest) {
  const auth = await requirePrincipal(request, ["SUPERADMIN"]);
  if ("response" in auth) return auth.response;
  const input = await readJson(request, SlotCreateSchema);
  if ("response" in input) return input.response;
  try {
    const slot = await prisma.slot.create({ data: input.data });
    return NextResponse.json({ slot }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return apiError("A slot already uses that code", 409);
    }
    return unexpectedError(error);
  }
}
