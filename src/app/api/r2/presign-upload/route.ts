import { NextResponse } from "next/server";
import { z } from "zod";
import { adminUnauthorized, isAdminAuthorized } from "@/lib/admin-auth";
import { isR2Configured, presignProductUpload } from "@/lib/r2";

const schema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
});

export async function POST(request: Request) {
  if (!isAdminAuthorized(request)) return adminUnauthorized();

  if (!isR2Configured()) {
    return NextResponse.json({ message: "R2 não configurado." }, { status: 503 });
  }

  const body = schema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });
  }

  const result = await presignProductUpload(body.data);
  return NextResponse.json(result);
}

export async function GET(request: Request) {
  if (!isAdminAuthorized(request)) return adminUnauthorized();
  return NextResponse.json({ configured: isR2Configured() });
}
