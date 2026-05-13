import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/middleware";

export async function middleware(request) {
  const { supabase, getResponse } = createClient(request);

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthPage = path === "/login" || path === "/signup";
  const isProtectedPage = path === "/dashboard" || path === "/onboarding";

  if (!user && isProtectedPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const { data: profile } = await supabase
      .from("users")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    const url = request.nextUrl.clone();
    url.pathname = profile ? "/dashboard" : "/onboarding";
    return NextResponse.redirect(url);
  }

  return getResponse();
}

export const config = {
  matcher: ["/login", "/signup", "/dashboard", "/onboarding"]
};
