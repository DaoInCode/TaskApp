import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     *  - _next/static       build assets
     *  - _next/image        image optimization
     *  - _next/data         RSC data requests
     *  - auth/callback      Supabase code-exchange handles its own session
     *  - favicon.ico, sitemap.xml, robots.txt
     *  - any path ending in .ext (.png, .css, .js, fonts, etc.)
     *
     * The exclusions are aggressive on purpose. Under Turbopack the proxy
     * was running for every RSC prefetch + asset, each calling Supabase,
     * which froze the dev server. See diagnosis.txt for the trace evidence.
     */
    "/((?!_next/static|_next/image|_next/data|auth/callback|favicon.ico|sitemap.xml|robots.txt|.*\\.[\\w]+$).*)",
  ],
};
