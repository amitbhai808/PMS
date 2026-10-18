import { NextRequest, NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requirePrincipal(request, ["SUPERADMIN"]);
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const take = Math.min(100, Math.max(1, Number(searchParams.get("take") ?? 50)));
  const entityType = searchParams.get("entityType") ?? undefined;

  const logs = await prisma.auditLog.findMany({
    where: entityType ? { entityType } : undefined,
    take,
    orderBy: { createdAt: "desc" },
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  return NextResponse.json({ logs }, { headers: { "Cache-Control": "no-store" } });
}
