import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
} from "@/lib/constants";
import { adminUnauthorized, isAdminAuthorized } from "@/lib/admin-auth";

function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export async function GET(request: Request) {
  if (!isAdminAuthorized(request)) return adminUnauthorized();
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET não configurado." },
      { status: 500 },
    );
  }

  let token = "";
  try {
    const body = (await request.json()) as { token?: string };
    token = String(body.token ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  if (!token || token !== cronSecret) {
    return NextResponse.json({ error: "Chave de admin inválida." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    ADMIN_SESSION_COOKIE,
    cronSecret,
    sessionCookieOptions(ADMIN_SESSION_MAX_AGE),
  );
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", sessionCookieOptions(0));
  return response;
}
