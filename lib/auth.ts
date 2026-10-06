import { randomUUID } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/lib/domain";
import { serverEnv } from "@/lib/env";

export const SESSION_COOKIE = "pms_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;
const issuer = "parking-management-system";
const audience = "parking-management-system-web";

function jwtSecret() {
  const secret = serverEnv().JWT_SECRET;
  return new TextEncoder().encode(secret);
}

export type Principal = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  sessionId: string;
};

export async function createSession(user: Pick<Principal, "id" | "role">) {
  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await prisma.session.create({ data: { id: sessionId, userId: user.id, expiresAt } });

  const token = await new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(user.id)
    .setJti(sessionId)
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(jwtSecret());

  return { token, expiresAt };
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function getPrincipal(request: NextRequest): Promise<Principal | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, jwtSecret(), { issuer, audience });
    if (!payload.sub || !payload.jti) return null;

    const session = await prisma.session.findFirst({
      where: {
        id: payload.jti,
        userId: payload.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: { select: { id: true, email: true, name: true, role: true } } },
    });
    if (!session) return null;

    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role as UserRole,
      sessionId: session.id,
    };
  } catch {
    return null;
  }
}

export async function requirePrincipal(
  request: NextRequest,
  roles?: readonly UserRole[],
): Promise<{ principal: Principal } | { response: NextResponse }> {
  const principal = await getPrincipal(request);
  if (!principal) {
    return { response: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  }
  if (roles && !roles.includes(principal.role)) {
    return { response: NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }) };
  }
  return { principal };
}

export async function revokeSession(sessionId: string) {
  await prisma.session.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
