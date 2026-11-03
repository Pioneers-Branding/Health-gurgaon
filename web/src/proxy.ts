import { NextResponse, type NextRequest } from "next/server";

/**
 * Language routing and the signed-out redirect (Next 16 "proxy", formerly middleware).
 *
 *   /                 -> 307 /gurgaon          (the city homepage)
 *   /hi               -> 307 /hi/gurgaon
 *   /en, /en/...      -> 308 the same URL without /en (English is unprefixed)
 *   /hi/...           -> served as is by app/[lang] with lang = "hi"
 *   anything else     -> rewritten internally to /en/... (lang = "en")
 *
 * Private pages (PRIVATE below, in English and Hindi) send a visitor without a session cookie to
 * the sign-in page with a 307: /account?next=<the full path and query> (/hi/account for Hindi).
 * That gives a real redirect without JavaScript. It is only an optimistic check that the cookie
 * is there: pages still call requireUser()/requireRole() and Server Actions check the session
 * themselves, so a stale or forged cookie gets no further than the page allows. Only GET and
 * HEAD are redirected (Server Actions post to the page URL and answer "please sign in" on their
 * own).
 *
 * Kept self-contained on purpose: proxy runs before rendering and should not import app modules
 * (the cookie name mirrors SESSION_COOKIE in src/lib/auth/session.ts).
 */
const HOME = "/gurgaon";

/** The session cookie (src/lib/auth/session.ts → SESSION_COOKIE). */
const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-hg_session" : "hg_session";

/** Paths (without the /hi prefix) that need a signed-in visitor. /account itself is the sign-in page. */
const PRIVATE: RegExp[] = [
  /^\/account\/(saved|activity|consent)\/?$/,
  /^\/admin(\/.*)?$/,
  /^\/gurgaon\/society\/[^/]+\/dashboard\/?$/,
  /^\/gurgaon\/community\/ask\/?$/,
  /^\/gurgaon\/events\/submit\/?$/,
];

/** The sign-in page keeps at most this much of `next` (safeNextPath in src/lib/auth/session.ts). */
const MAX_NEXT = 500;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/" || pathname === "/en" || pathname === "/en/") {
    return redirectTo(request, HOME, 307);
  }

  if (pathname === "/hi" || pathname === "/hi/") {
    return redirectTo(request, `/hi${HOME}`, 307);
  }

  if (pathname.startsWith("/en/")) {
    return redirectTo(request, pathname.slice(3), 308);
  }

  const signIn = signInRedirect(request);
  if (signIn) return signIn;

  if (pathname.startsWith("/hi/")) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = `/en${pathname}`;
  return NextResponse.rewrite(url);
}

/** A 307 to the sign-in page for a signed-out visitor to a private page, else null. */
function signInRedirect(request: NextRequest): NextResponse | null {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  if (request.cookies.get(SESSION_COOKIE)?.value) return null;
  const target = signInTarget(request.nextUrl.pathname, request.nextUrl.search);
  if (!target) return null;
  const url = request.nextUrl.clone();
  url.pathname = target.pathname;
  url.search = target.search;
  return NextResponse.redirect(url, 307);
}

/**
 * Pure: for a private page (pathname as requested, /hi prefix included), where a signed-out
 * visitor is sent: the sign-in page in the same language, with `next` = the page as requested,
 * query included (minus Next's internal _rsc cache-buster on client navigations). Null for
 * every other page. Unit-tested in tests/unit/proxy.test.ts.
 */
export function signInTarget(pathname: string, search: string): { pathname: string; search: string } | null {
  const hindi = pathname.startsWith("/hi/");
  const path = hindi ? pathname.slice(3) : pathname;
  if (!PRIVATE.some((re) => re.test(path))) return null;
  const params = new URLSearchParams(search);
  params.delete("_rsc");
  const query = params.toString();
  let next = `${pathname}${query ? `?${query}` : ""}`;
  if (next.length > MAX_NEXT) next = pathname.slice(0, MAX_NEXT);
  return { pathname: hindi ? "/hi/account" : "/account", search: `?next=${encodeURIComponent(next)}` };
}

function redirectTo(request: NextRequest, pathname: string, status: 307 | 308) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.redirect(url, status);
}

export const config = {
  matcher: [
    // Everything except Next internals, API routes and files with an extension
    // (icon.svg, robots.txt, images in /public, ...).
    "/((?!api|_next|.*\\..*).*)",
  ],
};
