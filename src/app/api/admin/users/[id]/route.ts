import { NextResponse } from "next/server";
import { z } from "zod";
import { adminUnauthorized, isAdminAuthorized } from "@/lib/admin-auth";
import { createSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toSafeUser } from "@/lib/auth";

const revokeSchema = z.object({ status: z.enum(["ACTIVE", "REVOKED"]) });

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminAuthorized(request)) return adminUnauthorized();
  const { id } = await params;
  const body = revokeSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ message: "Status inválido." }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id },
    data: { status: body.data.status },
  });

  return NextResponse.json({ success: true, user: toSafeUser(user) });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminAuthorized(request)) return adminUnauthorized();
  const { id } = await params;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ message: "Usuário não encontrado." }, { status: 404 });
  }
  if (user.status === "REVOKED") {
    return NextResponse.json({ message: "Usuário com acesso revogado." }, { status: 403 });
  }

  await createSession(user);
  return NextResponse.json({ success: true, user: toSafeUser(user) });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminAuthorized(request)) return adminUnauthorized();
  const { id } = await params;

  const [user, orders, emails] = await Promise.all([
    prisma.user.findUnique({ where: { id } }),
    prisma.order.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" } }),
    prisma.emailLog.findMany({ where: { userId: id }, orderBy: { sentAt: "desc" } }),
  ]);

  if (!user) {
    return NextResponse.json({ message: "Usuário não encontrado." }, { status: 404 });
  }

  return NextResponse.json({
    user: toSafeUser(user),
    orders,
    emails,
  });
}
