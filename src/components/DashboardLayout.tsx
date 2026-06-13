"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMounted } from "@/hooks/use-mounted";
import { LocalDB, pullCloudData } from "@/lib/storage";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { UserProfile } from "@/types";
import { 
  LayoutDashboard, 
  BookOpen, 
  Headphones, 
  BrainCircuit, 
  GraduationCap, 
  Mic2, 
  Sparkles, 
  ShieldAlert, 
  LogOut, 
  Flame, 
  Menu, 
  X,
  User
} from "lucide-react";
import { Button } from "./ui/button";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const mounted = useMounted();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (mounted) {
      // 1. Fetch current local user profile first
      const profile = LocalDB.getUser();
      setUser(profile);
      
      // 2. Initialize Supabase Auth Listener
      const supabase = createSupabaseBrowserClient();
      if (supabase) {
        supabase.auth.getSession().then(async ({ data: { session } }) => {
          if (session?.user) {
            const userEmail = session.user.email || "";
            const userName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || userEmail.split("@")[0].toUpperCase();
            
            const updatedProfile = LocalDB.updateUser({
              id: session.user.id,
              email: userEmail,
              name: userName
            });
            setUser(updatedProfile);
            
            // Auto pull user data from Cloud
            await pullCloudData();
          }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (session?.user) {
            const userEmail = session.user.email || "";
            const userName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || userEmail.split("@")[0].toUpperCase();
            
            const updatedProfile = LocalDB.updateUser({
              id: session.user.id,
              email: userEmail,
              name: userName
            });
            setUser(updatedProfile);
            
            await pullCloudData();
          } else if (event === "SIGNED_OUT") {
            if (typeof window !== "undefined") {
              localStorage.removeItem("lingopod_user");
              document.cookie = "lingopod_demo_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            }
            setUser(null);
            window.location.href = "/";
          }
        });
        
        return () => subscription.unsubscribe();
      }

      // Auto increment streak if active today
      const updated = LocalDB.incrementStreak();
      setUser(updated);
    }
  }, [mounted]);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070b13] text-muted-foreground">
        Đang tải LingoPod AI...
      </div>
    );
  }

  const handleLogout = async () => {
    const supabase = createSupabaseBrowserClient();
    if (supabase) {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.error("Lỗi đăng xuất khỏi Supabase:", error.message);
        }
      } catch (err) {
        console.error("Lỗi khi đăng xuất:", err);
      }
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem("lingopod_user");
      document.cookie = "lingopod_demo_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
    setUser(null);
    window.location.href = "/";
  };

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Sổ tay từ vựng", href: "/vocabulary", icon: BookOpen },
    { name: "Podcast Learning", href: "/podcasts", icon: Headphones },
    { name: "Flashcards", href: "/flashcards", icon: BrainCircuit },
    { name: "AI Quiz", href: "/quiz", icon: GraduationCap },
    { name: "Shadowing Studio", href: "/shadowing", icon: Mic2 },
    { name: "AI Speaking Coach", href: "/ai-coach", icon: Sparkles },
    { name: "SaaS Admin Panel", href: "/admin", icon: ShieldAlert }
  ];

  return (
    <div className="h-screen overflow-hidden bg-[#070b13] text-foreground flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-[#0d1321]/80 backdrop-blur-md md:hidden z-40">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold uppercase tracking-[0.2em] text-primary">
            LingoPod
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent font-semibold">AI</span>
        </div>
        <button 
          onClick={() => setMobileOpen(!mobileOpen)} 
          className="text-foreground focus:outline-none"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* Sidebar - Desktop & Mobile */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-[#0d1321] border-r border-border p-6 flex flex-col justify-between z-50 transition-transform duration-300 md:translate-x-0 md:static md:h-full
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="flex flex-col gap-8">
          {/* Logo & Mobile Close */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold uppercase tracking-[0.2em] text-primary">
                LingoPod
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent font-semibold">AI</span>
            </div>
            <button 
              onClick={() => setMobileOpen(false)} 
              className="md:hidden text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* User Streak Badge */}
          {user && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/70 backdrop-blur-sm">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold truncate max-w-[110px]">{user.name}</h4>
                  <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-1 rounded-md text-xs font-bold animate-pulse">
                <Flame className="h-4 w-4 fill-amber-500" />
                <span>{user.streak} ngày</span>
              </div>
            </div>
          )}

          {/* Nav Items */}
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-all duration-200 border
                    ${isActive 
                      ? "bg-primary/10 border-primary/20 text-primary font-semibold shadow-lg shadow-primary/5" 
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }
                  `}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer actions */}
        <div className="pt-4 border-t border-border flex flex-col gap-3">
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 border-none"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            <span>Đăng xuất</span>
          </Button>
          <div className="text-[10px] text-muted-foreground/60 text-center">
            LingoPod AI SaaS © 2026
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-h-0 overflow-y-auto flex flex-col bg-gradient-to-br from-[#070b13] via-[#09101f] to-[#0c1322]">
        <div className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
