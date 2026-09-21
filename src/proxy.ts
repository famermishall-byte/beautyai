import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/config";
import { isStaff } from "@/lib/auth";

// Pages reachable without being logged in.
// "/o" — one-click order-status links sent to the store's WhatsApp; the
// random token in the URL is the authorization, not a login session.
const PUBLIC_PATHS = ["/login", "/reset-password", "/o"];

// A branch manager only gets these admin screens (everything else is for the owner / admin).
const BRANCH_MANAGER_PATHS = ["/admin", "/admin/stock", "/admin/orders", "/admin/settings"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * Runs before every page request (API routes are excluded — see `matcher`
 * below; they verify the session themselves via getSessionProfile()).
 * Refreshes the Supabase session cookies and gates access to the app:
 * no session -> /login, already logged in -> skip /login.
 *
 * Staff (owner / admin / branch manager) land in the admin area. With ONE login they can switch to the
 * storefront (cookie set by src/lib/view-mode.ts) and shop as a customer, then switch back. The cookie
 * only steers navigation — what a person may actually read or change is enforced by the API routes and RLS.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublicPath(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && (pathname === "/login" || !isPublicPath(pathname))) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const role = (profile?.role as string | undefined) ?? "user";
    const staff = isStaff(role);

    if (pathname === "/login") {
      return NextResponse.redirect(new URL(staff ? "/admin" : "/", request.url));
    }

    if (pathname === "/admin" || pathname.startsWith("/admin/")) {
      // Branch managers: only their own screens. Admins: everything except the staff list (owner only).
      if (role === "branch_manager" && !BRANCH_MANAGER_PATHS.includes(pathname)) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      if (role === "admin" && (pathname === "/admin/staff" || pathname.startsWith("/admin/staff/"))) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
    } else if (staff && request.cookies.get("beautyai-mode")?.value !== "shop") {
      // Staff open the storefront only after choosing "В магазин".
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    // "demo" — demo product photos (public/demo). Without this exclusion an admin session is
    // redirected from /demo/... to /admin (managers stay out of the storefront), so photos break in the admin.
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|icon|apple-icon|brand|demo).*)",
  ],
};
