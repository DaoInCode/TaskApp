import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/signup", "/auth/callback"];

export async function updateSession(request: NextRequest) {
  // ── Bypass 1: RSC prefetches and RSC navigations ─────────────────────
  // Next's router fires these aggressively in dev. Each one used to call
  // supabase.auth.getUser() — a network round-trip — and the thrashing
  // froze the dev server under Turbopack (87 ensure-page hits on /proxy
  // in a single session, per diagnosis.txt).
  //
  // The user's HTML request already went through the proxy, so auth was
  // verified there. The session cookie the RSC request carries is the
  // same one we just validated; nothing to re-check per RSC chunk. The
  // next full navigation will refresh the session if it's stale.
  //
  // Do NOT remove this without re-reading diagnosis.txt — bringing back
  // per-RSC Supabase calls is what caused the freeze.
  if (
    request.headers.get("RSC") === "1" ||
    request.headers.get("Next-Router-Prefetch") === "1"
  ) {
    return NextResponse.next({ request });
  }

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  // ── Bypass 2: public path ────────────────────────────────────────────
  // There's nothing for the proxy to gate on /login, /signup, or
  // /auth/callback even for a logged-in user — those pages handle their
  // own "already authenticated" redirects. Skipping getUser() here avoids
  // a wasted network call on every hover-prefetch of the logout button.
  if (isPublic) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          if (headers) {
            Object.entries(headers).forEach(([key, value]) =>
              response.headers.set(key, value),
            );
          }
        },
      },
    },
  );

  // IMPORTANT: refresh the session by calling getUser() before any branching.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}
