"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, Mail, Lock, User, UserPlus, ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { sanitizeNextPath } from "@/lib/security";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase is not configured.");
      setLoading(false);
      return;
    }

    try {
      const nextPath = sanitizeNextPath(
        new URLSearchParams(window.location.search).get("next"),
        "/dashboard"
      );

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: name.trim(),
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      setSuccess(true);
      if (data.session) {
        router.push(nextPath);
      } else {
        setLoading(false);
      }
    } catch (err) {
      setError(`Sign up failed: ${(err as Error).message}`);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#070b13] via-[#09101f] to-[#0c1322] px-4">
      <div className="w-full max-w-md bg-[#0d1321]/80 border border-border backdrop-blur-md rounded-xl p-8 shadow-2xl shadow-black/40">
        <div className="flex flex-col items-center gap-2 mb-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold uppercase tracking-[0.2em] text-primary">
              LingoPod
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Create a secure account</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold">
            Account created. If email confirmation is enabled, please verify your inbox before logging in.
          </div>
        )}

        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-9"
                autoComplete="name"
                required
                disabled={loading || success}
              />
            </div>
          </div>

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
                disabled={loading || success}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9"
                autoComplete="new-password"
                required
                disabled={loading || success}
                minLength={6}
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading || success}
            className="w-full mt-2 font-semibold"
          >
            {loading ? "Processing..." : "Create Account"}
            {!loading && <UserPlus className="ml-2 h-4 w-4" />}
          </Button>
        </form>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="text-primary font-semibold hover:underline flex items-center justify-center gap-0.5 mt-1"
          >
            <ChevronLeft className="h-3 w-3" /> Back to login
          </Link>
        </p>
      </div>
    </main>
  );
}
