import { NextRequest, NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/auth";
import { moneyInr } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requirePrincipal(request, ["SUPERADMIN"]);
  if ("response" in auth) return auth.response;

  const [totalSlots, availableSlots, occupiedSlots, shadowSlots, bookings, settled] = await Promise.all([
    prisma.slot.count({ where: { isShadowPool: false, status: { not: "MAINTENANCE" } } }),
    prisma.slot.count({ where: { isShadowPool: false, status: "AVAILABLE" } }),
    prisma.slot.count({ where: { isShadowPool: false, status: "OCCUPIED" } }),
    prisma.slot.count({ where: { isShadowPool: true } }),
    prisma.booking.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.booking.aggregate({
      where: { paymentStatus: "PAID" },
      _sum: { totalPaidPaise: true, baseFeePaise: true, penaltyFeePaise: true },
    }),
  ]);
  const counts = Object.fromEntries(bookings.map((item) => [item.status, item._count._all]));
  const revenuePaise = settled._sum.totalPaidPaise ?? 0;
  const occupancy = totalSlots === 0 ? 0 : occupiedSlots / totalSlots;
  return NextResponse.json({
    totalOccupancy: occupancy,
    occupancyPercent: Number((occupancy * 100).toFixed(1)),
    totalSlots,
    availableSlots,
    occupiedSlots,
    shadowSlots,
    bookings: counts,
    revenuePaise,
    liveRevenue: moneyInr(revenuePaise),
    currency: "INR",
    updatedAt: new Date().toISOString(),
  }, { headers: { "Cache-Control": "no-store" } });
}
