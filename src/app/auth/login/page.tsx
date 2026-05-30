"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, Mail, Lock, LogIn, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LocalDB } from "@/lib/storage";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("demo-user@lingopod.ai");
  const [password, setPassword] = useState("123456");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Simulate login response
    setTimeout(() => {
      if (email.trim() && password.length >= 6) {
        // Update local DB user email
        LocalDB.updateUser({ email, name: email.split("@")[0].toUpperCase() });
        router.push("/dashboard");
      } else {
        setError("Vui lòng nhập Email hợp lệ và mật khẩu tối thiểu 6 ký tự.");
        setLoading(false);
      }
    }, 1000);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Không thể khởi tạo kết nối Supabase Cloud. Vui lòng kiểm tra lại cấu hình.");
      setLoading(false);
      return;
    }
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`
        }
      });
      
      if (error) {
        throw error;
      }
    } catch (err) {
      console.error(err);
      setError(`Lỗi đăng nhập Google: ${(err as Error).message}`);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#070b13] via-[#09101f] to-[#0c1322] px-4">
      <div className="w-full max-w-md bg-[#0d1321]/80 border border-border backdrop-blur-md rounded-xl p-8 shadow-2xl shadow-black/40">
        {/* Branding header */}
        <div className="flex flex-col items-center gap-2 mb-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary animate-pulse">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold uppercase tracking-[0.2em] text-primary">
              LingoPod
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Đăng nhập để luyện podcast và học từ vựng</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Địa chỉ Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Mật khẩu
              </label>
              <Link 
                href="/auth/forgot-password" 
                className="text-xs text-accent hover:underline"
              >
                Quên mật khẩu?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9"
                required
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full mt-2 font-semibold">
            {loading ? "Đang xử lý..." : "Đăng Nhập"}
            {!loading && <LogIn className="ml-2 h-4 w-4" />}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#0d1321] px-2 text-muted-foreground">Hoặc sử dụng</span>
          </div>
        </div>

        {/* Social logins */}
        <Button 
          variant="secondary" 
          onClick={handleGoogleLogin} 
          disabled={loading}
          className="w-full font-semibold flex items-center justify-center gap-2 border border-border/80"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
          </svg>
          Đăng nhập với Google
        </Button>

        {/* Footer link */}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Chưa có tài khoản?{" "}
          <Link href="/auth/signup" className="text-primary font-semibold hover:underline flex items-center justify-center gap-0.5 mt-1">
            Đăng ký tài khoản mới <ChevronRight className="h-3 w-3" />
          </Link>
        </p>
      </div>
    </main>
  );
}
