import { NextResponse } from "next/server";
import { getStoreConfig } from "@/lib/store-config";

export async function GET() {
  return NextResponse.json(await getStoreConfig());
}
