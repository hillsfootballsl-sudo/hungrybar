import { NextResponse, type NextRequest } from "next/server";
import { AREA_ROLES, STAFF_COOKIE, type StaffSession, verifyToken } from "./lib/jwt";

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const area = Object.keys(AREA_ROLES).find((a) => path === a || path.startsWith(a + "/"));
  if (!area) return NextResponse.next();
  const session = await verifyToken<StaffSession>(req.cookies.get(STAFF_COOKIE)?.value);
  if (!session || !AREA_ROLES[area].includes(session.role)) {
    const url = req.nextUrl.clone();
    url.pathname = "/staff/login";
    url.search = `?next=${encodeURIComponent(path)}${session ? "&denied=1" : ""}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/pos/:path*", "/kitchen/:path*", "/rider/:path*", "/admin", "/pos", "/kitchen", "/rider"] };
