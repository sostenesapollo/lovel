import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PEDEGAS_ORIGIN =
  process.env.PEDEGAS_INTERNAL_URL?.replace(/\/$/, "") ||
  "http://pedegas-app:3000";

function pedegasTargetPath(pathname: string): string | null {
  if (pathname === "/catalogo" || pathname.startsWith("/catalogo/")) {
    const suffix = pathname.replace(/^\/catalogo/, "") || "";
    return `/catalog/lovelessence${suffix}`;
  }
  if (pathname.startsWith("/assets/")) return pathname;
  if (pathname.startsWith("/api/v1/")) return pathname;
  if (pathname.startsWith("/catalog/lovelessence/")) return pathname;
  return null;
}

async function proxyToPedegas(request: NextRequest, targetPath: string) {
  const url = request.nextUrl;
  const target = `${PEDEGAS_ORIGIN}${targetPath}${url.search}`;
  const headers = new Headers(request.headers);
  const host = request.headers.get("host");
  if (host) {
    headers.set("x-forwarded-host", host);
    headers.set("x-forwarded-proto", url.protocol.replace(":", ""));
  }
  headers.delete("host");

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  const upstream = await fetch(target, init);
  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/list-table")) {
    const response = NextResponse.next();
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }

  const pedegasPath = pedegasTargetPath(pathname);
  if (pedegasPath) {
    try {
      return await proxyToPedegas(request, pedegasPath);
    } catch (error) {
      console.error("[middleware] pedegas proxy failed:", error);
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/list-table/:path*",
    "/catalogo",
    "/catalogo/:path*",
    "/assets/:path*",
    "/api/v1/:path*",
    "/catalog/lovelessence/:path*",
  ],
};
