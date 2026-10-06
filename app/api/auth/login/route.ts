import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { createSession, setSessionCookie } from "@/lib/auth";
import { apiError, readJson, unexpectedError } from "@/lib/api";
import { LoginSchema } from "@/lib/validations/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const input = await readJson(request, LoginSchema);
  if ("response" in input) return input.response;

  try {
    const user = await prisma.user.findUnique({ where: { email: input.data.email } });
    if (!user || !(await bcrypt.compare(input.data.password, user.passwordHash))) {
      return apiError("Invalid email or password", 401);
    }
    const session = await createSession({ id: user.id, role: user.role as "SUPERADMIN" | "OPERATOR" | "MEMBER" });
    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      expiresAt: session.expiresAt,
    });
    return setSessionCookie(response, session.token);
  } catch (error) {
    return unexpectedError(error);
  }
}
