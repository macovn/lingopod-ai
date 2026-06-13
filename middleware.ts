import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

import { isAdminEmail, parseAdminEmails } from "@/lib/security";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const ADMIN_EMAILS = parseAdminEmails(process.env.ADMIN_EMAILS);

function buildLoginRedirect(request: NextRequest): NextResponse {
  const loginUrl = new URL("/auth/login", request.url);
  loginUrl.searchParams.set(
    "next",
    `${request.nextUrl.pathname}${request.nextUrl.search}`
  );
  return NextResponse.redirect(loginUrl);
}

function isApiRequest(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const apiRequest = isApiRequest(pathname);

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    // Nếu chưa cấu hình Supabase, kiểm tra cookie demo của người dùng
    const demoUser = request.cookies.get("lingopod_demo_user")?.value;
    if (demoUser) {
      return NextResponse.next();
    }
    
    if (apiRequest) {
      return NextResponse.json(
        { error: "Server auth is not configured (Demo Mode)." },
        { status: 401 }
      );
    }
    return buildLoginRedirect(request);
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: Array<{
          name: string;
          value: string;
          options?: Record<string, unknown>;
        }>
      ) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(
            name,
            value,
            (options ?? {}) as Parameters<typeof response.cookies.set>[2]
          )
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (apiRequest) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    return buildLoginRedirect(request);
  }

  if (pathname.startsWith("/admin") && !isAdminEmail(user.email, ADMIN_EMAILS)) {
    if (apiRequest) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/vocabulary/:path*",
    "/podcasts/:path*",
    "/flashcards/:path*",
    "/quiz/:path*",
    "/shadowing/:path*",
    "/ai-coach/:path*",
    "/admin/:path*",
    "/api/gemini",
    "/api/youtube/transcript",
  ],
};
