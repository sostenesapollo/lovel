import { NextResponse } from "next/server";
import { z } from "zod";
import { adminUnauthorized, isAdminAuthorized } from "@/lib/admin-auth";
import { EMAIL_TEMPLATES } from "@/lib/constants";
import { sendInterpolatedEmail, isEmailConfigured } from "@/lib/email";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/utils";

const schema = z.object({
  userId: z.string().optional(),
  email: z.string().email(),
  templateId: z.string(),
  orderId: z.string().optional(),
});

export async function GET(request: Request) {
  if (!isAdminAuthorized(request)) return adminUnauthorized();
  return NextResponse.json({ templates: EMAIL_TEMPLATES, emailConfigured: isEmailConfigured() });
}

export async function POST(request: Request) {
  if (!isAdminAuthorized(request)) return adminUnauthorized();

  if (!isEmailConfigured()) {
    return NextResponse.json({ message: "RESEND_API_KEY não configurado." }, { status: 503 });
  }

  const body = schema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });
  }

  const template = EMAIL_TEMPLATES.find((t) => t.id === body.data.templateId);
  if (!template) {
    return NextResponse.json({ message: "Template não encontrado." }, { status: 404 });
  }

  const user = body.data.userId
    ? await prisma.user.findUnique({ where: { id: body.data.userId } })
    : await prisma.user.findUnique({ where: { email: body.data.email } });

  let orderTotal = "";
  if (body.data.orderId) {
    const order = await prisma.order.findUnique({ where: { id: body.data.orderId } });
    if (order) orderTotal = formatPrice(order.total);
  }

  const vars = {
    name: user?.name ?? "Cliente",
    orderId: body.data.orderId ?? "",
    total: orderTotal,
    email: body.data.email,
  };

  const result = await sendInterpolatedEmail({
    to: body.data.email,
    template: template.id,
    subject: template.subject,
    bodyTemplate: template.body,
    vars,
    userId: user?.id,
  });

  return NextResponse.json({ success: true, result });
}

export async function PUT(request: Request) {
  if (!isAdminAuthorized(request)) return adminUnauthorized();
  const logs = await prisma.emailLog.findMany({
    orderBy: { sentAt: "desc" },
    take: 100,
  });
  return NextResponse.json(logs);
}
