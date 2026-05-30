import Link from "next/link";
import { BookOpen, Headphones, Mic2, Sparkles, GraduationCap, ArrowRight, BrainCircuit, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

const modules = [
  {
    title: "Sổ tay từ vựng",
    description: "Quản lý từ vựng thông minh, tra cứu nhanh, tự động phân tích IPA, collocation và ví dụ bằng Gemini AI.",
    icon: BookOpen,
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
  },
  {
    title: "Podcast Learning",
    description: "Nghe podcast, xem transcript thông minh, highlight từ mới và lưu nhanh trực tiếp vào Notebook.",
    icon: Headphones,
    color: "text-blue-400 bg-blue-500/10 border-blue-500/20"
  },
  {
    title: "Flashcards Studio",
    description: "Học từ vựng theo thuật toán Spaced Repetition (Lặp lại ngắt quãng) với hiệu ứng lật thẻ 3D.",
    icon: BrainCircuit,
    color: "text-purple-400 bg-purple-500/10 border-purple-500/20"
  },
  {
    title: "AI Quiz Engine",
    description: "Tự động sinh đề thi trắc nghiệm, điền ô trống, ghép từ bằng Gemini AI dựa trên kho từ vựng cá nhân.",
    icon: GraduationCap,
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20"
  },
  {
    title: "Shadowing Studio",
    description: "Ghi âm giọng đọc ngay trên trình duyệt, nghe lại, so sánh trực quan để chuẩn hóa phát âm bản xứ.",
    icon: Mic2,
    color: "text-rose-400 bg-rose-500/10 border-rose-500/20"
  },
  {
    title: "AI Speaking Coach",
    description: "Giao tiếp 1-1 với Gemini trong vai Teacher, Partner, Interviewer. Nhận phản hồi & điểm số Grammar/Fluency.",
    icon: Sparkles,
    color: "text-primary bg-primary/10 border-primary/20"
  }
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#070b13] text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* Decorative gradients */}
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-primary/10 to-transparent blur-3xl -z-10 pointer-events-none" />

      <section className="mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:px-10 min-h-screen flex flex-col justify-between">
        {/* Navigation header */}
        <nav className="flex items-center justify-between border-b border-border/70 pb-5">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold uppercase tracking-[0.2em] text-primary">
              LingoPod
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent font-semibold">SaaS</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth/login">
              <Button variant="ghost" className="font-semibold text-muted-foreground hover:text-foreground">Đăng nhập</Button>
            </Link>
            <Link href="/auth/signup">
              <Button className="font-semibold shadow-lg shadow-primary/20">Bắt đầu học</Button>
            </Link>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="max-w-3xl flex flex-col items-start gap-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" />
              Gemini 2.5 Flash Engine
            </div>
            <h1 className="text-4xl font-extrabold text-foreground sm:text-5xl lg:text-6xl tracking-tight leading-[1.15]">
              Làm chủ tiếng Anh với <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Podcast & AI</span>
            </h1>
            <p className="text-lg leading-8 text-muted-foreground">
              Hệ sinh thái học ngoại ngữ khép kín: Nghe podcast → Thu thập từ vựng → Ghi nhớ ngắt quãng → Shadowing → Luyện nói phản xạ với trợ lý AI thông minh.
            </p>
            <div className="mt-4 flex flex-wrap gap-4">
              <Link href="/auth/login">
                <Button className="gap-2 font-bold text-base h-12 px-6 shadow-xl shadow-primary/15 hover:shadow-primary/25 transition-all">
                  Truy cập Dashboard
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/admin">
                <Button variant="secondary" className="gap-2 font-semibold h-12 px-5 border border-border">
                  <ShieldAlert className="h-4 w-4" />
                  Admin Panel
                </Button>
              </Link>
            </div>
          </div>

          {/* Module Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {modules.map((module) => {
              const Icon = module.icon;

              return (
                <article
                  key={module.title}
                  className="rounded-xl border border-border/80 bg-[#0d1321]/60 p-5 shadow-2xl transition-all duration-300 hover:border-border hover:translate-y-[-2px] hover:bg-[#0d1321]/90"
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${module.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-foreground">
                    {module.title}
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {module.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-border/50 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-4">
          <p>LingoPod AI SaaS — Nền tảng học tiếng Anh đột phá thế hệ mới.</p>
          <div className="flex gap-6">
            <span className="hover:text-foreground cursor-pointer">Điều khoản</span>
            <span className="hover:text-foreground cursor-pointer">Bảo mật</span>
            <span className="hover:text-foreground cursor-pointer">Liên hệ</span>
          </div>
        </footer>
      </section>
    </main>
  );
}
