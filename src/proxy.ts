import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/config";
import { isStoreManager } from "@/lib/auth";

// Pages reachable without being logged in.
// "/o" — one-click order-status links sent to the store's WhatsApp; the
// random token in the URL is the authorization, not a login session.
const PUBLIC_PATHS = ["/login", "/reset-password", "/o"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * Runs before every page request (API routes are excluded — see `matcher`
 * below; they verify the session themselves via getSessionProfile()).
 * Refreshes the Supabase session cookies and gates access to the app:
 * no session -> /login, already logged in -> skip /login.
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

  // Admins/owners run the store, not shop in it: keep their account out of
  // the customer storefront entirely, so a single email can't both manage a
  // store and place orders as a "customer" through the same login.
  if (user && !pathname.startsWith("/admin")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    const isManager = !!profile && isStoreManager(profile.role);

    if (pathname === "/login") {
      return NextResponse.redirect(new URL(isManager ? "/admin" : "/", request.url));
    }
    if (isManager && !isPublicPath(pathname)) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|icon|apple-icon).*)",
  ],
};
