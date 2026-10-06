import { NextRequest, NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requirePrincipal(request);
  if ("response" in auth) return auth.response;
  const search = new URL(request.url).searchParams;
  const take = Math.min(100, Math.max(1, Number(search.get("take") ?? 30)));
  const status = search.get("status") ?? undefined;
  const where = {
    ...(auth.principal.role === "MEMBER" ? { userId: auth.principal.id } : {}),
    ...(status ? { status } : {}),
  };
  const bookings = await prisma.booking.findMany({
    where,
    take,
    orderBy: { createdAt: "desc" },
    include: { slot: { include: { zone: true } }, vehicle: true },
  });
  return NextResponse.json({ bookings }, { headers: { "Cache-Control": "no-store" } });
}
