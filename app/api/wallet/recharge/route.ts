import { NextRequest, NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/auth";
import { apiError, readJson, unexpectedError } from "@/lib/api";
import { moneyInr } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { WalletRechargeSchema } from "@/lib/validations/parking";
import { serverEnv } from "@/lib/env";

export async function POST(request: NextRequest) {
  const auth = await requirePrincipal(request, ["MEMBER"]);
  if ("response" in auth) return auth.response;
  if (serverEnv().NODE_ENV === "production") {
    return apiError("Wallet recharge requires a verified payment provider integration", 501);
  }
  const input = await readJson(request, WalletRechargeSchema);
  if ("response" in input) return input.response;
  const reference = `dev-recharge:${auth.principal.id}:${input.data.idempotencyKey}`;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const duplicate = await tx.walletTransaction.findUnique({ where: { reference } });
      if (duplicate) {
        const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId: auth.principal.id } });
        return { duplicate: true, transaction: duplicate, balancePaise: wallet.balancePaise };
      }
      const wallet = await tx.wallet.upsert({
        where: { userId: auth.principal.id },
        create: { userId: auth.principal.id, currency: "INR" },
        update: {},
      });
      const updated = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balancePaise: { increment: input.data.amountPaise },
          transactions: {
            create: {
              amountPaise: input.data.amountPaise,
              type: "DEV_RECHARGE",
              reference,
              description: "Development-only simulated wallet recharge",
            },
          },
        },
        include: { transactions: { where: { reference }, take: 1 } },
      });
      return { duplicate: false, transaction: updated.transactions[0], balancePaise: updated.balancePaise };
    });
    return NextResponse.json({
      duplicate: result.duplicate,
      balance: moneyInr(result.balancePaise),
      transaction: { ...result.transaction, amount: moneyInr(result.transaction.amountPaise) },
      currency: "INR",
    }, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    return unexpectedError(error);
  }
}
