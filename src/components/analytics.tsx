"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import { Suspense, useEffect, useState } from "react";
import { getTrackingConfig, type TrackingConfig } from "@/lib/analytics";

/**
 * Carrega gtag.js com GA4 e/ou Google Ads.
 * Resolve IDs via build-time env ou /api/tracking-config (Coolify runtime).
 */
function AnalyticsInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [cfg, setCfg] = useState<TrackingConfig | null>(null);

  useEffect(() => {
    let cancelled = false;
    getTrackingConfig().then((c) => {
      if (!cancelled) setCfg(c);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!cfg?.ga4Id && !cfg?.adsId) return;
    if (typeof window === "undefined" || typeof window.gtag !== "function") return;
    const pagePath =
      pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
    window.gtag("event", "page_view", {
      page_path: pagePath,
      page_location: window.location.href,
      page_title: document.title,
      send_to: cfg.ga4Id || undefined,
    });
  }, [pathname, searchParams, cfg]);

  if (!cfg || (!cfg.ga4Id && !cfg.adsId)) return null;

  const primaryId = cfg.ga4Id || cfg.adsId;

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
          window.gtag = gtag;
          gtag('js', new Date());
          ${cfg.ga4Id ? `gtag('config', '${cfg.ga4Id}', { send_page_view: false });` : ""}
          ${cfg.adsId ? `gtag('config', '${cfg.adsId}');` : ""}
          window.__lovelTracking = ${JSON.stringify(cfg)};
        `}
      </Script>
    </>
  );
}

export function Analytics() {
  return (
    <Suspense fallback={null}>
      <AnalyticsInner />
    </Suspense>
  );
}
