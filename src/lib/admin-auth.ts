import { NextResponse } from "next/server";

export function isAdminAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${cronSecret}`) return true;

  const { searchParams } = new URL(request.url);
  return searchParams.get("key") === cronSecret;
}

export function adminUnauthorized() {
  return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
}

export function adminAuthHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}
