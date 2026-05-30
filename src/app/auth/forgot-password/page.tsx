"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sparkles, Mail, KeyRound, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      setSuccess(true);
      setLoading(false);
    }, 1000);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#070b13] via-[#09101f] to-[#0c1322] px-4">
      <div className="w-full max-w-md bg-[#0d1321]/80 border border-border backdrop-blur-md rounded-xl p-8 shadow-2xl shadow-black/40">
        {/* Branding header */}
        <div className="flex flex-col items-center gap-2 mb-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold uppercase tracking-[0.2em] text-primary">
              LingoPod
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Khôi phục mật khẩu tài khoản</p>
          </div>
        </div>

        {success ? (
          <div className="text-center">
            <div className="mb-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-semibold">
              Yêu cầu đặt lại mật khẩu đã được gửi! Vui lòng kiểm tra hộp thư đến của bạn để tiếp tục.
            </div>
            <Link href="/auth/login" className="text-primary font-semibold hover:underline flex items-center justify-center gap-1 mt-6 text-sm">
              <ChevronLeft className="h-4 w-4" /> Quay lại Đăng nhập
            </Link>
          </div>
        ) : (
          <form onSubmit={handleReset} className="flex flex-col gap-4">
            <p className="text-xs text-muted-foreground leading-5 mb-2">
              Nhập địa chỉ email đã đăng ký của bạn. Chúng tôi sẽ gửi một liên kết khôi phục mật khẩu để bạn tạo mật khẩu mới.
            </p>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Địa chỉ Email của bạn
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

            <Button type="submit" disabled={loading} className="w-full mt-2 font-semibold">
              {loading ? "Đang gửi..." : "Gửi liên kết khôi phục"}
              {!loading && <KeyRound className="ml-2 h-4 w-4" />}
            </Button>

            <Link href="/auth/login" className="text-muted-foreground hover:text-foreground font-semibold hover:underline flex items-center justify-center gap-1 mt-6 text-sm">
              <ChevronLeft className="h-4 w-4" /> Quay lại Đăng nhập
            </Link>
          </form>
        )}
      </div>
    </main>
  );
}
