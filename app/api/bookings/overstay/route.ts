import { NextRequest, NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requirePrincipal(request, ["OPERATOR", "SUPERADMIN"]);
  if ("response" in auth) return auth.response;

  const now = new Date();

  const bookings = await prisma.booking.findMany({
    where: {
      status: "ACTIVE",
      actualExit: null,
      expectedExit: { lt: now },
    },
    include: {
      slot: { include: { zone: true } },
      vehicle: true,
    },
    orderBy: {
      expectedExit: "asc", // Most overdue first
    },
  });

  return NextResponse.json({ bookings }, { headers: { "Cache-Control": "no-store" } });
}
