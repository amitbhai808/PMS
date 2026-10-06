import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/auth";
import { apiError, readJson, unexpectedError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { AdminUserSchema } from "@/lib/validations/management";

export async function GET(request: NextRequest) {
  const auth = await requirePrincipal(request, ["SUPERADMIN"]);
  if ("response" in auth) return auth.response;
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  const auth = await requirePrincipal(request, ["SUPERADMIN"]);
  if ("response" in auth) return auth.response;
  const input = await readJson(request, AdminUserSchema);
  if ("response" in input) return input.response;

  try {
    const passwordHash = await bcrypt.hash(input.data.password, 12);
    const { password, ...profile } = input.data;
    void password;
    const user = await prisma.user.create({
      data: {
        ...profile,
        passwordHash,
        wallet: { create: { currency: "INR" } },
      },
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return apiError("An account already exists for that email or phone", 409);
    }
    return unexpectedError(error);
  }
}
