"use client";

import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useMounted } from "@/hooks/use-mounted";
import { LocalDB } from "@/lib/storage";
import { UserProfile } from "@/types";
import { 
  User, 
  Sparkles, 
  Briefcase, 
  Plane, 
  MessageSquare, 
  GraduationCap, 
  Compass, 
  Save, 
  CheckCircle,
  Brain,
  Hash,
  Heart
} from "lucide-react";
import { Button } from "@/components/ui/button";

const PREDEFINED_INTERESTS = [
  { id: "technology", label: "Công nghệ (Tech)" },
  { id: "business", label: "Kinh doanh (Business)" },
  { id: "science", label: "Khoa học (Science)" },
  { id: "travel", label: "Du lịch (Travel)" },
  { id: "art", label: "Nghệ thuật & Thiết kế" },
  { id: "sports", label: "Thể thao (Sports)" },
  { id: "music", label: "Âm nhạc & Phim ảnh" },
  { id: "lifestyle", label: "Lối sống (Lifestyle)" },
  { id: "history", label: "Lịch sử & Văn hóa" },
  { id: "health", label: "Sức khỏe (Health)" },
  { id: "education", label: "Giáo dục (Education)" }
];

export default function ProfilePage() {
  const mounted = useMounted();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  // Form States
  const [name, setName] = useState("");
  const [englishLevel, setEnglishLevel] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  const [learningGoal, setLearningGoal] = useState<"conversation" | "business" | "travel" | "exams" | "other">("business");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [hobbies, setHobbies] = useState("");
  const [selfIntroduction, setSelfIntroduction] = useState("");
  
  // Notification / Feedback states
  const [showToast, setShowToast] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (mounted) {
      const user = LocalDB.getUser();
      setProfile(user);
      setName(user.name || "");
      setEnglishLevel(user.englishLevel || "intermediate");
      setLearningGoal(user.learningGoal || "business");
      setSelectedInterests(user.interests || []);
      setHobbies(user.hobbies || "");
      setSelfIntroduction(user.selfIntroduction || "");
    }
  }, [mounted]);

  if (!mounted) return null;

  const handleInterestToggle = (interestId: string) => {
    setSelectedInterests(prev => 
      prev.includes(interestId) 
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Save to LocalDB
    const updated = LocalDB.updateUser({
      name,
      englishLevel,
      learningGoal,
      interests: selectedInterests,
      hobbies,
      selfIntroduction
    });
    
    setProfile(updated);
    setIsSaving(false);
    setShowToast(true);
    
    // Auto hide toast after 3 seconds
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8 relative pb-12">
        {/* Toast Notification */}
        {showToast && (
          <div className="fixed top-6 right-6 z-50 bg-[#0d1321]/95 border border-primary/40 text-primary px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 backdrop-blur-md animate-in slide-in-from-top-4 duration-300">
            <CheckCircle className="h-5 w-5 text-primary" />
            <div>
              <p className="font-bold text-sm text-foreground">Cập nhật thành công!</p>
              <p className="text-xs text-muted-foreground">AI Profile đã sẵn sàng đồng bộ vào các bài học.</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-primary/80 bg-clip-text text-transparent">AI Learning Profile</h1>
            <p className="text-muted-foreground mt-1.5">
              Thiết lập hồ sơ cá nhân để Gemini AI cá nhân hóa từ vựng, trắc nghiệm và cuộc hội thoại speaking.
            </p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main profile form */}
          <form onSubmit={handleSave} className="lg:col-span-2 flex flex-col gap-6">
            {/* General Info Card */}
            <div className="bg-[#0d1321]/80 border border-border/85 p-6 rounded-2xl shadow-xl backdrop-blur-sm flex flex-col gap-5">
              <div className="flex items-center gap-2.5 border-b border-border/40 pb-3">
                <User className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold">Thông tin tài khoản</h2>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tên hiển thị</label>
                  <input 
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Nguyễn Văn A"
                    className="flex h-10 w-full rounded-md border border-border bg-[#070b13] px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email (Đọc duy nhất)</label>
                  <input 
                    type="text"
                    value={profile?.email || ""}
                    disabled
                    className="flex h-10 w-full rounded-md border border-border/60 bg-[#070b13]/55 px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* English Level Select */}
            <div className="bg-[#0d1321]/80 border border-border/85 p-6 rounded-2xl shadow-xl backdrop-blur-sm flex flex-col gap-5">
              <div className="flex items-center gap-2.5 border-b border-border/40 pb-3">
                <Brain className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold">Trình độ Tiếng Anh hiện tại</h2>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { id: "beginner", title: "Sơ cấp (Beginner)", desc: "Từ vựng cơ bản, hội thoại chậm rãi, câu từ đơn giản dễ học." },
                  { id: "intermediate", title: "Trung cấp (Intermediate)", desc: "Giao tiếp thông dụng, từ vựng tự nhiên và đa dạng ngữ cảnh." },
                  { id: "advanced", title: "Cao cấp (Advanced)", desc: "Thành ngữ phức tạp, cấu trúc chuyên sâu, tốc độ nói bản xứ." }
                ].map(level => {
                  const isSelected = englishLevel === level.id;
                  return (
                    <button
                      key={level.id}
                      type="button"
                      onClick={() => setEnglishLevel(level.id as any)}
                      className={`text-left p-4 rounded-xl border transition-all duration-200 flex flex-col gap-2 relative ${
                        isSelected 
                          ? "bg-primary/5 border-primary shadow-lg shadow-primary/5 text-foreground" 
                          : "bg-[#070b13]/55 border-border/70 text-muted-foreground hover:bg-[#070b13] hover:border-border"
                      }`}
                    >
                      <span className={`text-sm font-bold ${isSelected ? "text-primary" : "text-foreground"}`}>
                        {level.title}
                      </span>
                      <span className="text-xs leading-relaxed text-muted-foreground">
                        {level.desc}
                      </span>
                      {isSelected && (
                        <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Learning Goals Select */}
            <div className="bg-[#0d1321]/80 border border-border/85 p-6 rounded-2xl shadow-xl backdrop-blur-sm flex flex-col gap-5">
              <div className="flex items-center gap-2.5 border-b border-border/40 pb-3">
                <GraduationCap className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold">Mục tiêu học tập chính</h2>
              </div>

              <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-5">
                {[
                  { id: "conversation", label: "Giao tiếp", icon: MessageSquare, desc: "Đàm thoại hàng ngày" },
                  { id: "business", label: "Công việc", icon: Briefcase, desc: "Thương mại, Tech, Văn phòng" },
                  { id: "travel", label: "Du lịch", icon: Plane, desc: "Đi lại, ăn uống, bản địa" },
                  { id: "exams", label: "Thi cử", icon: GraduationCap, desc: "IELTS, TOEIC, TOEFL" },
                  { id: "other", label: "Mục tiêu khác", icon: Compass, desc: "Sở thích cá nhân" }
                ].map(goal => {
                  const isSelected = learningGoal === goal.id;
                  const Icon = goal.icon;
                  return (
                    <button
                      key={goal.id}
                      type="button"
                      onClick={() => setLearningGoal(goal.id as any)}
                      className={`p-3.5 rounded-xl border transition-all duration-200 flex flex-col items-center justify-center text-center gap-2 ${
                        isSelected 
                          ? "bg-primary/5 border-primary shadow-lg shadow-primary/5 text-foreground" 
                          : "bg-[#070b13]/55 border-border/70 text-muted-foreground hover:bg-[#070b13] hover:border-border"
                      }`}
                    >
                      <div className={`p-2 rounded-full ${isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <span className="text-xs font-bold block">{goal.label}</span>
                      <span className="text-[10px] text-muted-foreground hidden sm:block leading-tight">{goal.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Interest Area Multi-select */}
            <div className="bg-[#0d1321]/80 border border-border/85 p-6 rounded-2xl shadow-xl backdrop-blur-sm flex flex-col gap-5">
              <div className="flex items-center gap-2.5 border-b border-border/40 pb-3">
                <Heart className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold">Chủ đề quan tâm (Interests)</h2>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                Hãy chọn các chủ đề bạn quan tâm để AI lấy ý tưởng ví dụ và tạo các bài trắc nghiệm thực tế xoay quanh chủ đề này.
              </p>

              <div className="flex flex-wrap gap-2.5">
                {PREDEFINED_INTERESTS.map(interest => {
                  const isSelected = selectedInterests.includes(interest.id);
                  return (
                    <button
                      key={interest.id}
                      type="button"
                      onClick={() => handleInterestToggle(interest.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition-all duration-200 ${
                        isSelected 
                          ? "bg-primary/10 border-primary text-primary shadow-sm" 
                          : "bg-[#070b13]/60 border-border/60 text-muted-foreground hover:border-muted-foreground/60 hover:text-foreground"
                      }`}
                    >
                      <Hash className={`h-3 w-3 ${isSelected ? "text-primary" : "text-muted-foreground/60"}`} />
                      {interest.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Hobbies & Self-Intro Textareas */}
            <div className="bg-[#0d1321]/80 border border-border/85 p-6 rounded-2xl shadow-xl backdrop-blur-sm flex flex-col gap-5">
              <div className="flex items-center gap-2.5 border-b border-border/40 pb-3">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold">Cá nhân hóa chuyên sâu</h2>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sở thích cá nhân</label>
                  <input 
                    type="text"
                    value={hobbies}
                    onChange={(e) => setHobbies(e.target.value)}
                    placeholder="Ví dụ: Đọc sách phát triển bản thân, viết code, nghe nhạc pop, chơi bóng rổ..."
                    className="flex h-10 w-full rounded-md border border-border bg-[#070b13] px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="text-[10px] text-muted-foreground">AI có thể dùng sở thích để gợi ý chủ đề nói chuyện hoặc các ví dụ sinh động.</p>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tự giới thiệu bản thân</label>
                  <textarea 
                    rows={4}
                    value={selfIntroduction}
                    onChange={(e) => setSelfIntroduction(e.target.value)}
                    placeholder="Ví dụ: Tôi tên là Tuấn, đang làm lập trình viên front-end. Tôi cần tiếng Anh để đọc tài liệu, họp với đối tác nước ngoài và phỏng vấn vào các công ty đa quốc gia sắp tới."
                    className="w-full bg-[#070b13] border border-border rounded-lg p-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                  />
                  <p className="text-[10px] text-muted-foreground">Rất hữu ích cho vai trò Mr. Thompson (Phỏng vấn thử việc) hiểu rõ lý lịch và hỏi đúng trọng tâm nghề nghiệp của bạn.</p>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 mt-2">
              <Button 
                type="submit" 
                disabled={isSaving}
                className="gap-2 font-bold px-6 py-5 rounded-xl text-base shadow-lg shadow-primary/10"
              >
                <Save className="h-4.5 w-4.5" />
                {isSaving ? "Đang lưu..." : "Lưu Profile Cá Nhân"}
              </Button>
            </div>
          </form>

          {/* AI personalization preview panel */}
          <div className="flex flex-col gap-6">
            <div className="bg-gradient-to-br from-[#0d1321]/90 to-[#101b33]/90 border border-primary/20 p-6 rounded-2xl shadow-xl backdrop-blur-sm relative overflow-hidden flex flex-col gap-5">
              {/* Decorative glow */}
              <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-primary/10 blur-3xl" />
              
              <div className="flex items-center gap-2 text-primary font-bold text-sm tracking-widest uppercase">
                <Sparkles className="h-4 w-4" />
                <span>Trải nghiệm cá nhân hóa</span>
              </div>
              
              <h3 className="text-xl font-bold">Hồ sơ này giúp gì cho AI?</h3>
              
              <div className="flex flex-col gap-4 text-xs text-muted-foreground leading-relaxed">
                <div className="flex gap-3">
                  <div className="mt-1 h-5 w-5 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground mb-0.5">Ví dụ từ vựng thông minh</h4>
                    <p>Mỗi khi bạn tra từ mới, Gemini AI sẽ tạo ví dụ liên quan mật thiết tới sở thích: <span className="text-primary italic font-medium">"{selectedInterests.length > 0 ? PREDEFINED_INTERESTS.find(i => i.id === selectedInterests[0])?.label : "Công nghệ"}"</span> của bạn.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="mt-1 h-5 w-5 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    2
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground mb-0.5">Trắc nghiệm phân loại độ khó</h4>
                    <p>Các câu hỏi điền từ hoặc dịch câu trong mục AI Quiz sẽ có độ khó từ vựng và cấu trúc ngữ pháp điều chỉnh theo trình độ <span className="text-primary font-bold uppercase">{englishLevel}</span>.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="mt-1 h-5 w-5 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    3
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground mb-0.5">Đàm thoại Speaking đúng vai</h4>
                    <p>AI Speaking Coach Sarah (Giáo viên) hay Alex (Bạn học) sẽ biết tên bạn là <span className="text-primary font-bold">{name || "học viên"}</span>, hỏi thăm về sở thích <span className="text-primary italic">"{hobbies || "chưa điền"}"</span> của bạn để mở rộng câu chuyện tự nhiên nhất.</p>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-border/40 pt-4 mt-2 flex items-center justify-center gap-2">
                <Brain className="h-6 w-6 text-primary animate-pulse" />
                <span className="text-xs font-bold text-foreground">Được tối ưu bởi Gemini Pro</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
