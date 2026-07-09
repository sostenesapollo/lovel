import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Runtime tracking config for the client.
 *
 * NEXT_PUBLIC_* is inlined at CI build time (secrets.PRODUCTION_ENV).
 * When missing from the build, the client falls back here and reads Coolify
 * runtime env — so GA4/Ads IDs can be fixed with env + restart, no rebuild.
 */
export async function GET() {
  const googleAdsId =
    process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim() ||
    process.env.GOOGLE_ADS_ID?.trim() ||
    null;
  const googleAdsPurchaseConversionLabel =
    process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_CONVERSION_LABEL?.trim() ||
    process.env.GOOGLE_ADS_PURCHASE_CONVERSION_LABEL?.trim() ||
    null;
  const ga4Id =
    process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID?.trim() ||
    process.env.GA4_MEASUREMENT_ID?.trim() ||
    null;

  return NextResponse.json({
    googleAdsId,
    googleAdsPurchaseConversionLabel,
    ga4Id,
  });
}
