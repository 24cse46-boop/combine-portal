import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session on every request and enforces basic
 * route protection:
 *  - /dashboard, /assessment/* require a logged-in candidate
 *  - /admin/* (except /admin/login) require a logged-in admin
 * Fine-grained authorization (candidate vs admin row checks) still happens
 * via RLS and server-side lookups — this is a first line of defense so
 * unauthenticated users never even reach a protected page shell.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isCandidateArea =
    pathname.startsWith("/dashboard") || pathname.startsWith("/assessment");
  const isAdminArea =
    pathname.startsWith("/admin") && pathname !== "/admin/login";

  if (!user && (isCandidateArea || isAdminArea)) {
    const redirectPath = isAdminArea ? "/admin/login" : "/login";
    const url = request.nextUrl.clone();
    url.pathname = redirectPath;
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
