import { NextRequest, NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/auth";
import { moneyInr } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requirePrincipal(request);
  if ("response" in auth) return auth.response;
  const wallet = await prisma.wallet.findUnique({
    where: { userId: auth.principal.id },
    include: { transactions: { orderBy: { createdAt: "desc" }, take: 50 } },
  });
  if (!wallet) return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
  return NextResponse.json({
    wallet: { ...wallet, balance: moneyInr(wallet.balancePaise) },
    transactions: wallet.transactions.map((item) => ({ ...item, amount: moneyInr(item.amountPaise) })),
  });
}
