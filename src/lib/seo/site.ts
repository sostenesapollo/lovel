export const SITE_NAME = "LOVEL";
export const SITE_TAGLINE = "Boutique · Essence · Soin";
export const DEFAULT_SITE_URL = "https://lovelessence.com";

export function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    DEFAULT_SITE_URL
  ).replace(/\/$/, "");
}

export function absoluteUrl(path: string) {
  const base = getSiteUrl();
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
