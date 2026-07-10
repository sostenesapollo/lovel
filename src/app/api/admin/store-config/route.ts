import { NextResponse } from "next/server";
import { adminUnauthorized, isAdminAuthorized } from "@/lib/admin-auth";
import { getStoreConfig, saveStoreConfig } from "@/lib/store-config";

export async function GET(request: Request) {
  if (!isAdminAuthorized(request)) return adminUnauthorized();
  return NextResponse.json(await getStoreConfig());
}

export async function PUT(request: Request) {
  if (!isAdminAuthorized(request)) return adminUnauthorized();
  const body = await request.json();
  const config = await saveStoreConfig({
    maxPriceOnly: Boolean(body?.maxPriceOnly),
  });
  return NextResponse.json({ success: true, config });
}
