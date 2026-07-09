import { NextResponse } from "next/server";
import { destroySession, getCurrentUser, toSafeUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({ user: toSafeUser(user) });
}

export async function DELETE() {
  await destroySession();
  return NextResponse.json({ success: true });
}
