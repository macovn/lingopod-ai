"use client";

import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useMounted } from "@/hooks/use-mounted";
import { LocalDB } from "@/lib/storage";
import { 
  ShieldAlert, 
  Users, 
  BookOpen, 
  HardDrive, 
  Cpu, 
  Flame, 
  Calendar, 
  TrendingUp,
  Activity,
  CheckCircle,
  FileText,
  Clock
} from "lucide-react";

export default function AdminPage() {
  const mounted = useMounted();
  const [stats, setStats] = useState({
    totalUsers: 1,
    dau: 1,
    mau: 1,
    vocabCount: 0,
    podcastCount: 0,
    storageUsedMb: 4.8,
    totalAiTokens: 0
  });

  const [aiLogs, setAiLogs] = useState<any[]>([]);

  useEffect(() => {
    if (mounted) {
      const vocabList = LocalDB.getVocabularies();
      const podcastList = LocalDB.getPodcasts();
      const logs = LocalDB.getAiUsage();

      // Sum tokens
      const sumTokens = logs.reduce((acc, log) => acc + (log.promptTokens || 0) + (log.completionTokens || 0), 0);
      
      // Calculate realistic metrics
      setStats({
        totalUsers: 24, // Simulated total SaaS signups
        dau: 12,        // Daily active
        mau: 18,        // Monthly active
        vocabCount: vocabList.length,
        podcastCount: podcastList.length,
        storageUsedMb: 4.8 + Number((vocabList.length * 0.05).toFixed(2)),
        totalAiTokens: sumTokens || 4580 // default initial if no logs yet
      });

      setAiLogs(logs.slice(0, 5));
    }
  }, [mounted]);

  if (!mounted) return null;

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        
        {/* Top Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SaaS Admin Panel</h1>
          <p className="text-muted-foreground mt-1">Hệ thống quản trị nền tảng: DAU, MAU, Cơ sở dữ liệu và Thống kê AI Usage.</p>
        </div>

        {/* Analytics row grids */}
        <div className="grid gap-5 grid-cols-2 lg:grid-cols-4">
          {/* DAU / MAU */}
          <div className="bg-[#0d1321] border border-border p-5 rounded-xl shadow-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hoạt động (DAU/MAU)</p>
              <h3 className="text-2xl font-extrabold text-primary mt-2">
                {stats.dau} <span className="text-xs font-semibold text-muted-foreground">/ {stats.mau} users</span>
              </h3>
            </div>
            <div className="h-12 w-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Activity className="h-6 w-6" />
            </div>
          </div>

          {/* SaaS Users database */}
          <div className="bg-[#0d1321] border border-border p-5 rounded-xl shadow-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tổng Đăng Ký</p>
              <h3 className="text-2xl font-extrabold text-foreground mt-2">
                {stats.totalUsers} <span className="text-xs font-semibold text-muted-foreground">người dùng</span>
              </h3>
            </div>
            <div className="h-12 w-12 rounded-lg bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400">
              <Users className="h-6 w-6" />
            </div>
          </div>

          {/* Supabase storage */}
          <div className="bg-[#0d1321] border border-border p-5 rounded-xl shadow-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Audio Storage</p>
              <h3 className="text-2xl font-extrabold text-rose-400 mt-2">
                {stats.storageUsedMb} <span className="text-xs font-semibold text-muted-foreground">MB</span>
              </h3>
            </div>
            <div className="h-12 w-12 rounded-lg bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400">
              <HardDrive className="h-6 w-6" />
            </div>
          </div>

          {/* Gemini AI Usage tokens */}
          <div className="bg-[#0d1321] border border-border p-5 rounded-xl shadow-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">AI Usage (Tokens)</p>
              <h3 className="text-2xl font-extrabold text-accent mt-2">
                {stats.totalAiTokens.toLocaleString("vi-VN")} <span className="text-xs font-semibold text-muted-foreground">tokens</span>
              </h3>
            </div>
            <div className="h-12 w-12 rounded-lg bg-accent/10 border border-accent/25 flex items-center justify-center text-accent">
              <Cpu className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Charts and logs layout splits */}
        <div className="grid gap-6 lg:grid-cols-3">
          
          {/* User engagement activity chart */}
          <div className="bg-[#0d1321] border border-border rounded-xl p-6 shadow-xl lg:col-span-2">
            <div className="flex items-center justify-between mb-4 border-b border-border/80 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Biểu đồ phát triển người dùng (Lần truy cập hàng tháng)
              </h3>
            </div>

            {/* Custom SVG line chart simulation */}
            <div className="h-56 relative flex items-end pt-8">
              <svg className="w-full h-40 overflow-visible" viewBox="0 0 600 150">
                {/* Horizontal guide lines */}
                <line x1="0" y1="0" x2="600" y2="0" className="stroke-border/30" strokeWidth="1" strokeDasharray="4,4" />
                <line x1="0" y1="50" x2="600" y2="50" className="stroke-border/30" strokeWidth="1" strokeDasharray="4,4" />
                <line x1="0" y1="100" x2="600" y2="100" className="stroke-border/30" strokeWidth="1" strokeDasharray="4,4" />
                <line x1="0" y1="150" x2="600" y2="150" className="stroke-border/60" strokeWidth="1" />

                {/* Line Path */}
                <path 
                  d="M 50,130 Q 150,110 250,90 T 450,50 T 550,15" 
                  fill="none" 
                  className="stroke-primary" 
                  strokeWidth="3.5" 
                  strokeLinecap="round" 
                />

                {/* Shimmer glow path under line */}
                <path 
                  d="M 50,130 Q 150,110 250,90 T 450,50 T 550,15 L 550,150 L 50,150 Z" 
                  fill="url(#primary-glow)" 
                  className="opacity-15"
                />

                <defs>
                  <linearGradient id="primary-glow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#32d6a2" />
                    <stop offset="100%" stopColor="#32d6a2" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Scatter points */}
                <circle cx="50" cy="130" r="4.5" className="fill-[#070b13] stroke-primary" strokeWidth="2.5" />
                <circle cx="150" cy="118" r="4.5" className="fill-[#070b13] stroke-primary" strokeWidth="2.5" />
                <circle cx="250" cy="90" r="4.5" className="fill-[#070b13] stroke-primary" strokeWidth="2.5" />
                <circle cx="350" cy="70" r="4.5" className="fill-[#070b13] stroke-primary" strokeWidth="2.5" />
                <circle cx="450" cy="50" r="4.5" className="fill-[#070b13] stroke-primary" strokeWidth="2.5" />
                <circle cx="550" cy="15" r="5" className="fill-primary stroke-[#0d1321]" strokeWidth="2" />
              </svg>

              <div className="absolute bottom-0 inset-x-0 flex items-center justify-between text-[10px] text-muted-foreground font-semibold px-4 pt-1">
                <span>Tháng 12</span>
                <span>Tháng 1</span>
                <span>Tháng 2</span>
                <span>Tháng 3</span>
                <span>Tháng 4</span>
                <span>Tháng 5 (Hiện tại)</span>
              </div>
            </div>
          </div>

          {/* AI Usage Logs sidebar */}
          <div className="bg-[#0d1321] border border-border p-5 rounded-xl shadow-xl flex flex-col justify-between h-fit">
            
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 border-b border-border pb-3">
                <Cpu className="h-4 w-4 text-primary" />
                Lịch sử yêu cầu Gemini AI
              </h3>

              <div className="flex flex-col gap-3.5 max-h-[40vh] overflow-y-auto pr-1">
                {aiLogs.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-12 text-center">Chưa có lịch sử cuộc gọi AI nào.</p>
                ) : (
                  aiLogs.map((log) => (
                    <div key={log.id} className="p-3 rounded bg-muted/20 border border-border/30 flex flex-col gap-1 text-[11px]">
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-foreground truncate max-w-[120px]">{log.featureName}</span>
                        <span className="text-primary font-mono">+{log.promptTokens + log.completionTokens} tk</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1.5">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(log.createdAt).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span>Prompt: {log.promptTokens} | Completion: {log.completionTokens}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-border/50 text-[10px] text-muted-foreground text-center">
              Quản trị viên có toàn quyền kiểm soát quota và chi phí API Gemini.
            </div>

          </div>

        </div>

        {/* Database records tables */}
        <div className="bg-[#0d1321] border border-border rounded-xl p-6 shadow-xl">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Cơ sở dữ liệu người dùng (SaaS Users Database)
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/80 text-muted-foreground font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Tên người dùng</th>
                  <th className="py-3 px-4">Địa chỉ Email</th>
                  <th className="py-3 px-4">Vai trò</th>
                  <th className="py-3 px-4">Chuỗi học tập</th>
                  <th className="py-3 px-4">Trạng thái tài khoản</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-muted-foreground">
                {[
                  { name: "Nguyễn Anh Tuấn", email: "demo-user@lingopod.ai", role: "User", streak: stats.vocabCount > 0 ? "5 ngày" : "0 ngày", status: "Active" },
                  { name: "Trần Thị Lan", email: "lan.tran@gmail.com", role: "User", streak: "12 ngày", status: "Active" },
                  { name: "Phạm Minh Hoàng", email: "hoang.pm@gmail.com", role: "User", streak: "8 ngày", status: "Active" },
                  { name: "Lê Văn Đức (Admin)", email: "admin@lingopod.ai", role: "Administrator", streak: "35 ngày", status: "Active" }
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-muted/10 transition-colors">
                    <td className="py-3 px-4 font-bold text-foreground">{row.name}</td>
                    <td className="py-3 px-4 font-mono">{row.email}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${row.role === "Administrator" ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-secondary text-secondary-foreground"}`}>
                        {row.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-amber-400">🔥 {row.streak}</td>
                    <td className="py-3 px-4">
                      <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
