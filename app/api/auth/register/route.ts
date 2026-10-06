import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { createSession, setSessionCookie } from "@/lib/auth";
import { apiError, readJson, unexpectedError } from "@/lib/api";
import { RegisterSchema } from "@/lib/validations/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const input = await readJson(request, RegisterSchema);
  if ("response" in input) return input.response;

  try {
    const passwordHash = await bcrypt.hash(input.data.password, 12);
    const user = await prisma.user.create({
      data: {
        name: input.data.name,
        email: input.data.email,
        phone: input.data.phone,
        passwordHash,
        role: "MEMBER",
        wallet: { create: { currency: "INR" } },
      },
      select: { id: true, name: true, email: true, role: true },
    });
    const session = await createSession({ id: user.id, role: "MEMBER" });
    const response = NextResponse.json({ user }, { status: 201 });
    return setSessionCookie(response, session.token);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return apiError("An account already exists for that email or phone", 409);
    }
    return unexpectedError(error);
  }
}
