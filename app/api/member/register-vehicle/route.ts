import { NextRequest, NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/auth";
import { apiError, readJson, unexpectedError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { RegisterVehicleSchema } from "@/lib/validations/parking";

export async function GET(request: NextRequest) {
  const auth = await requirePrincipal(request, ["MEMBER"]);
  if ("response" in auth) return auth.response;
  const vehicles = await prisma.vehicle.findMany({ where: { ownerId: auth.principal.id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ vehicles });
}

export async function POST(request: NextRequest) {
  const auth = await requirePrincipal(request, ["MEMBER"]);
  if ("response" in auth) return auth.response;
  const input = await readJson(request, RegisterVehicleSchema);
  if ("response" in input) return input.response;
  try {
    const existing = await prisma.vehicle.findUnique({ where: { licensePlate: input.data.licensePlate } });
    if (existing && existing.ownerId !== auth.principal.id) return apiError("That plate is already registered to another account", 409);
    const vehicle = await prisma.vehicle.upsert({
      where: { licensePlate: input.data.licensePlate },
      create: { ...input.data, ownerId: auth.principal.id },
      update: { type: input.data.type },
    });
    return NextResponse.json({ vehicle }, { status: existing ? 200 : 201 });
  } catch (error) {
    return unexpectedError(error);
  }
}
