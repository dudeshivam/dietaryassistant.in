import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import { createClient } from "@/utils/supabase/middleware";

function withSecurityHeaders(response) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://checkout.razorpay.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://api.razorpay.com https://generativelanguage.googleapis.com; frame-src https://api.razorpay.com https://checkout.razorpay.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
  );
  return response;
}

export async function middleware(request) {
  const { supabase, getResponse } = createClient(request);

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthPage = path === "/login" || path === "/signup";
  const isAdminPage = path === "/admin";
  const isProtectedPage = path === "/dashboard" || path === "/onboarding" || path === "/coin-history" || isAdminPage;

  if (!user && isProtectedPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return withSecurityHeaders(NextResponse.redirect(url));
  }

  if (user && isAdminPage && !isAdminEmail(user.email)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return withSecurityHeaders(NextResponse.redirect(url));
  }

  if (user && isAuthPage) {
    const { data: profile } = await supabase
      .from("users")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    const url = request.nextUrl.clone();
    url.pathname = profile ? "/dashboard" : "/onboarding";
    return withSecurityHeaders(NextResponse.redirect(url));
  }

  return withSecurityHeaders(getResponse());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
