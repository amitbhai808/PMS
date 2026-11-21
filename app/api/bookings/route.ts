import { NextRequest, NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requirePrincipal(request);
  if ("response" in auth) return auth.response;
  const search = new URL(request.url).searchParams;
  const requestedTake = Number(search.get("take") ?? 30);
  const requestedOffset = Number(search.get("offset") ?? 0);
  const take = Number.isFinite(requestedTake) ? Math.min(100, Math.max(1, Math.floor(requestedTake))) : 30;
  const offset = Number.isFinite(requestedOffset) ? Math.min(10_000, Math.max(0, Math.floor(requestedOffset))) : 0;
  const status = search.get("status") ?? undefined;
  const where = {
    ...(auth.principal.role === "MEMBER" ? { userId: auth.principal.id } : {}),
    ...(status ? { status } : {}),
  };
  // Request one extra record so clients can tell whether another page exists.
  const page = await prisma.booking.findMany({
    where,
    skip: offset,
    take: take + 1,
    orderBy: { createdAt: "desc" },
    include: { slot: { include: { zone: true } }, vehicle: true },
  });
  const hasMore = page.length > take;
  const bookings = hasMore ? page.slice(0, take) : page;
  return NextResponse.json({ bookings, hasMore }, { headers: { "Cache-Control": "no-store" } });
}
