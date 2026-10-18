import { NextResponse, type NextRequest } from "next/server";

/**
 * One deployment, three apps, chosen by the host name:
 *   driver.<domain>  → src/app/driver/*
 *   panel.<domain>   → src/app/panel/*
 *   anything else    → src/app/site/*   (customer site and tracking pages)
 * Locally: driver.localhost:3000, panel.localhost:3000 and localhost:3000.
 * Because every path is prefixed here, one app's pages can never be reached from another host.
 */
export function appForHost(host: string): "site" | "driver" | "panel" {
  const name = host.split(":")[0].toLowerCase();
  if (name.startsWith("driver.")) return "driver";
  if (name.startsWith("panel.")) return "panel";
  return "site";
}

export function middleware(request: NextRequest) {
  const app = appForHost(request.headers.get("host") ?? "");
  const url = request.nextUrl.clone();
  url.pathname = `/${app}${url.pathname === "/" ? "" : url.pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Everything except Next.js internals and public files (they have a dot in the name).
  matcher: ["/((?!_next/|.*\\.[a-zA-Z0-9]+$).*)"],
};
