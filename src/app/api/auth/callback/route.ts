import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { sanitizeNextPath } from "@/lib/security";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeNextPath(searchParams.get("next"), "/dashboard");

  if (code) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      } else {
        console.error("Lỗi trao đổi mã code lấy session:", error.message);
        return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent("Xác thực thất bại: " + error.message)}`);
      }
    }
  }

  // Redirect to login page on authentication failure
  return NextResponse.redirect(`${origin}/auth/login?error=Xác thực tài khoản Google thất bại: Thiếu mã code.`);
}
