import { NextResponse } from "next/server";
import { adminUnauthorized, isAdminAuthorized } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  if (!isAdminAuthorized(request)) return adminUnauthorized();
  return NextResponse.json(await prisma.coupon.findMany());
}

export async function POST(request: Request) {
  if (!isAdminAuthorized(request)) return adminUnauthorized();
  const body = await request.json();
  if (!body.code || !body.type) {
    return NextResponse.json({ message: "Código e tipo são obrigatórios." }, { status: 400 });
  }
  const code = String(body.code).toUpperCase();
  const coupon = await prisma.coupon.create({
    data: {
      code,
      type: body.type,
      value: Number(body.value ?? 0),
      minOrder: Number(body.minOrder ?? 0),
      firstPurchaseOnly: Boolean(body.firstPurchaseOnly),
      description: body.description,
      active: body.active !== false,
    },
  });
  return NextResponse.json({ success: true, coupon });
}
