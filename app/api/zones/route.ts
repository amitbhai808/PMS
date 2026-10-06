import { NextRequest, NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/auth";
import { readJson, unexpectedError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { ZoneSchema } from "@/lib/validations/management";

export async function GET() {
  const zones = await prisma.zone.findMany({
    include: { _count: { select: { slots: true } } },
    orderBy: { level: "asc" },
  });
  return NextResponse.json({ zones });
}

export async function POST(request: NextRequest) {
  const auth = await requirePrincipal(request, ["SUPERADMIN"]);
  if ("response" in auth) return auth.response;
  const input = await readJson(request, ZoneSchema);
  if ("response" in input) return input.response;
  try {
    const zone = await prisma.zone.create({ data: input.data });
    return NextResponse.json({ zone }, { status: 201 });
  } catch (error) {
    return unexpectedError(error);
  }
}
