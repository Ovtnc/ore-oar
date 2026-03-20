import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "oar-ore-session";

function isAdminPageRoute(pathname: string) {
  return pathname.startsWith("/admin");
}

function isAdminApiRoute(pathname: string) {
  return pathname.startsWith("/api/admin");
}

function isCheckoutRoute(pathname: string) {
  return pathname === "/checkout" || pathname.startsWith("/checkout/");
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (isAdminApiRoute(pathname) && !hasSession) {
    return NextResponse.json({ error: "Admin erişimi için giriş yapmalısınız." }, { status: 401 });
  }

  if (isAdminPageRoute(pathname) && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isCheckoutRoute(pathname) && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/admin" && hasSession) {
    const next = request.nextUrl.searchParams.get("next");
    if (next && next.startsWith("/")) {
      const url = new URL(next, request.url);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/checkout", "/checkout/:path*"],
};
