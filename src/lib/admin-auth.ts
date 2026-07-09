import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/constants";

function cookieValue(request: Request, name: string) {
  const raw = request.headers.get("cookie");
  if (!raw) return null;
  for (const part of raw.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function isAdminAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${cronSecret}`) return true;

  const session = cookieValue(request, ADMIN_SESSION_COOKIE);
  if (session === cronSecret) return true;

  const { searchParams } = new URL(request.url);
  return searchParams.get("key") === cronSecret;
}

export function adminUnauthorized() {
  return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
}

export function adminAuthHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}
