import { NextResponse, type NextRequest } from "next/server";
import { isUserRole, roleForPath, roleHome } from "@/lib/auth";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = request.cookies.get("event_wallet_role")?.value;
  const signedInRole = isUserRole(role) ? role : null;

  if (pathname === "/login" && signedInRole) {
    const requestedNext = request.nextUrl.searchParams.get("next");
    const requestedRole = requestedNext?.startsWith("/") ? roleForPath(requestedNext) : null;
    if (requestedRole && requestedRole !== signedInRole) {
      return NextResponse.next();
    }
    if (requestedNext && requestedRole && requestedRole === signedInRole) {
      return NextResponse.redirect(new URL(requestedNext, request.url));
    }
    return NextResponse.redirect(new URL(roleHome[signedInRole], request.url));
  }

  const requiredRole = roleForPath(pathname);
  if (!requiredRole) {
    return NextResponse.next();
  }

  if (!signedInRole) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(pathname)}`, request.url));
  }

  if (signedInRole !== requiredRole) {
    return NextResponse.redirect(new URL(roleHome[signedInRole], request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/attendee/:path*", "/bartender/:path*", "/check-in/:path*", "/organizer/:path*"],
};
