"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, Mail, Lock, LogIn, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase";
import { sanitizeNextPath } from "@/lib/security";
import { LocalDB } from "@/lib/storage";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      // Cho phép đăng nhập chế độ Local Demo
      const nextPath = sanitizeNextPath(
        new URLSearchParams(window.location.search).get("next"),
        "/dashboard"
      );
      
      const demoEmail = email.trim();
      const demoName = demoEmail.split("@")[0].toUpperCase();
      const cleanEmail = demoEmail.toLowerCase().replace(/[^a-z0-9]/g, "");
      const demoUserId = `demo-${cleanEmail}`;
      
      // Lưu profile người dùng vào Local Storage
      LocalDB.updateUser({
        id: demoUserId,
        email: demoEmail,
        name: demoName,
        role: "user",
        streak: 5,
        lastActiveDate: new Date().toISOString().split("T")[0]
      });
      
      // Lưu cookie phiên làm việc demo cho Middleware
      const demoUser = { id: demoUserId, email: demoEmail, name: demoName };
      document.cookie = `lingopod_demo_user=${encodeURIComponent(JSON.stringify(demoUser))}; path=/; max-age=${7 * 24 * 60 * 60}`;
      
      router.push(nextPath);
      return;
    }

    try {
      const nextPath = sanitizeNextPath(
        new URLSearchParams(window.location.search).get("next"),
        "/dashboard"
      );

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        throw signInError;
      }

      router.push(nextPath);
    } catch (err) {
      setError(`Login failed: ${(err as Error).message}`);
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      // Cho phép đăng nhập Google giả lập trong chế độ Local Demo
      const nextPath = sanitizeNextPath(
        new URLSearchParams(window.location.search).get("next"),
        "/dashboard"
      );
      
      const demoEmail = "google-demo-user@caihealth.gov.vn";
      const demoName = "Google User (Demo)";
      const demoUserId = "demo-google-user-id";
      
      // Lưu profile vào Local Storage
      LocalDB.updateUser({
        id: demoUserId,
        email: demoEmail,
        name: demoName,
        role: "user",
        streak: 5,
        lastActiveDate: new Date().toISOString().split("T")[0]
      });
      
      // Lưu cookie phiên làm việc demo cho Middleware
      const demoUser = { id: demoUserId, email: demoEmail, name: demoName };
      document.cookie = `lingopod_demo_user=${encodeURIComponent(JSON.stringify(demoUser))}; path=/; max-age=${7 * 24 * 60 * 60}`;
      
      router.push(nextPath);
      return;
    }

    try {
      const nextPath = sanitizeNextPath(
        new URLSearchParams(window.location.search).get("next"),
        "/dashboard"
      );

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });

      if (error) {
        throw error;
      }
    } catch (err) {
      setError(`Google login failed: ${(err as Error).message}`);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#070b13] via-[#09101f] to-[#0c1322] px-4">
      <div className="w-full max-w-md bg-[#0d1321]/80 border border-border backdrop-blur-md rounded-xl p-8 shadow-2xl shadow-black/40">
        <div className="flex flex-col items-center gap-2 mb-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary animate-pulse">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold uppercase tracking-[0.2em] text-primary">
              LingoPod
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in to continue learning
            </p>
          </div>
        </div>

        {!isSupabaseConfigured() && (
          <div className="mb-4 p-3 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs leading-relaxed">
            <span className="font-bold block mb-1">⚠️ Chế độ Local Demo:</span>
            Supabase chưa được cấu hình. Bạn có thể nhập email và mật khẩu bất kỳ để đăng nhập kiểm tra toàn bộ ứng dụng.
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Password
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-xs text-accent hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9"
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full mt-2 font-semibold">
            {loading ? "Processing..." : "Sign In"}
            {!loading && <LogIn className="ml-2 h-4 w-4" />}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#0d1321] px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <Button
          variant="secondary"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full font-semibold flex items-center justify-center gap-2 border border-border/80"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </Button>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          No account yet?{" "}
          <Link
            href="/auth/signup"
            className="text-primary font-semibold hover:underline flex items-center justify-center gap-0.5 mt-1"
          >
            Create account <ChevronRight className="h-3 w-3" />
          </Link>
        </p>
      </div>
    </main>
  );
}
