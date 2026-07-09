"use client";

import Script from "next/script";
import { getGa4Id, getGoogleAdsId, isAnalyticsConfigured } from "@/lib/analytics";

/**
 * Carrega gtag.js com GA4 e/ou Google Ads.
 * IDs via NEXT_PUBLIC_GA4_MEASUREMENT_ID e NEXT_PUBLIC_GOOGLE_ADS_ID.
 */
export function Analytics() {
  const ga4 = getGa4Id();
  const ads = getGoogleAdsId();
  if (!isAnalyticsConfigured()) return null;

  const primaryId = ga4 || ads;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${primaryId}`}
        strategy="afterInteractive"
      />
      <Script id="lovel-gtag" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          ${ga4 ? `gtag('config', '${ga4}', { send_page_view: true });` : ""}
          ${ads ? `gtag('config', '${ads}');` : ""}
        `}
      </Script>
    </>
  );
}
