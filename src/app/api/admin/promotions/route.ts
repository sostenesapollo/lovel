import { NextResponse } from "next/server";
import { z } from "zod";
import { adminUnauthorized, isAdminAuthorized } from "@/lib/admin-auth";
import { savePromotions, getPromotions } from "@/lib/products";

export async function GET(request: Request) {
  if (!isAdminAuthorized(request)) return adminUnauthorized();
  return NextResponse.json(await getPromotions());
}

export async function PUT(request: Request) {
  if (!isAdminAuthorized(request)) return adminUnauthorized();
  const body = await request.json();
  await savePromotions(body);
  return NextResponse.json({ success: true, promotions: body });
}
