import { NextRequest, NextResponse } from "next/server";
export function middleware(req: NextRequest) {
  const nonce = btoa(
    String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24))),
  );
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://js.stripe.com${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://res.cloudinary.com https://skin-ecommerce.onrender.com",
    "font-src 'self' data:",
    "connect-src 'self' https://api.stripe.com",
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://checkout.stripe.com",
    "frame-ancestors 'none'",
    ...(process.env.NODE_ENV === "production"
      ? ["upgrade-insecure-requests"]
      : []),
  ].join("; ");
  const headers = new Headers(req.headers);
  // Next reads the request CSP to attach this nonce to framework scripts.
  headers.set("Content-Security-Policy", policy);
  headers.set("x-nonce", nonce);
  const protectedPage = ["/account", "/orders", "/admin"].some(
    (path) =>
      req.nextUrl.pathname === path ||
      req.nextUrl.pathname.startsWith(path + "/"),
  );
  const response =
    protectedPage &&
    !/^[a-f0-9]{64}$/.test(req.cookies.get("token")?.value || "")
      ? NextResponse.redirect(new URL("/login", req.url))
      : NextResponse.next({ request: { headers } });
  response.headers.set(
    process.env.CSP_ENFORCE === "true"
      ? "Content-Security-Policy"
      : "Content-Security-Policy-Report-Only",
    policy,
  );
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|images/).*)"],
};
