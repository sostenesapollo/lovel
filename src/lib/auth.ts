import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/constants";
import type { SafeUser } from "@/lib/types";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "dev-secret-change-me",
);

type SessionPayload = {
  sub: string;
  email: string;
  role: string;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function toSafeUser(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
}): SafeUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as SafeUser["role"],
    status: user.status as SafeUser["status"],
  };
}

export async function createSession(user: {
  id: string;
  email: string;
  role: string;
}) {
  const token = await new SignJWT({ email: user.email, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub || typeof payload.email !== "string") return null;
    return {
      sub: payload.sub,
      email: payload.email,
      role: String(payload.role ?? "CUSTOMER"),
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user || user.status === "REVOKED") {
    await destroySession();
    return null;
  }

  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new Error("FORBIDDEN");
  return user;
}
