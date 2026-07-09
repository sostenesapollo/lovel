import { NextResponse } from "next/server";
import { adminUnauthorized, isAdminAuthorized } from "@/lib/admin-auth";
import { getHeroCarouselConfig, saveHeroCarouselConfig } from "@/lib/hero";

export async function GET(request: Request) {
  if (!isAdminAuthorized(request)) return adminUnauthorized();
  return NextResponse.json(await getHeroCarouselConfig());
}

export async function PUT(request: Request) {
  if (!isAdminAuthorized(request)) return adminUnauthorized();
  const body = await request.json();
  const productIds = Array.isArray(body?.productIds) ? body.productIds : [];
  const saved = await saveHeroCarouselConfig(productIds);
  return NextResponse.json({ success: true, ...saved });
}
