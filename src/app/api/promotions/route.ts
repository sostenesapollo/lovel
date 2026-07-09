import { NextResponse } from "next/server";
import { getPromotions } from "@/lib/products";

export async function GET() {
  const promotions = await getPromotions();
  return NextResponse.json(promotions);
}
