"use client";

import React, { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useMounted } from "@/hooks/use-mounted";
import { LocalDB } from "@/lib/storage";
import { chatSpeakingCoach } from "@/services/gemini";
import { SpeakingMessage, SpeakingSession } from "@/types";
import { 
  Sparkles, 
  Send, 
  User, 
  HelpCircle, 
  MessageSquare, 
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Volume2,
  BookOpen,
  Languages,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SpeakingCoachPage() {
  const mounted = useMounted();
  
  // Personas definition
  const personas = {
    teacher: {
      name: "Ms. Sarah",
      title: "Giáo viên hỗ trợ nhiệt tình",
      avatar: "👩‍🏫",
      desc: "Sarah giúp bạn sửa lỗi ngữ pháp nhẹ nhàng, diễn đạt chuẩn tự nhiên."
    },
    partner: {
      name: "Alex",
      title: "Bạn giao tiếp hàng ngày",
      avatar: "🧑‍💻",
      desc: "Alex trò chuyện thân mật, dùng nhiều tiếng lóng/collocations thú vị."
    },
    interviewer: {
      name: "Mr. Thompson",
      title: "Người phỏng vấn tuyển dụng",
      avatar: "👨‍💼",
      desc: "Thompson đặt câu hỏi công việc thực tế, duy trì phong thái lịch sự chuyên nghiệp."
    }
  };

  const [persona, setPersona] = useState<"teacher" | "partner" | "interviewer">("teacher");
  const [messages, setMessages] = useState<SpeakingMessage[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Active message details for feedback display
  const [activeFeedback, setActiveFeedback] = useState<any | null>(null);

  const initSession = (selectedPersona: typeof persona) => {
    const list = LocalDB.getSpeakingSessions();
    const existing = list.find(s => s.persona === selectedPersona);

    if (existing) {
      setMessages(existing.messages);
      setActiveFeedback(existing.messages.findLast(m => m.role === "model")?.feedback || null);
    } else {
      // First welcome message
      let welcomeText = "";
      if (selectedPersona === "teacher") {
        welcomeText = "Hello there! I am Ms. Sarah, your English Coach. I am so glad to help you improve your speaking. Let's chat! You can write about your day or any topic you like. How are you doing today?";
      } else if (selectedPersona === "interviewer") {
        welcomeText = "Good morning. I am Mr. Thompson, HR manager here. Thank you for attending this English speaking interview. Let's start. Could you please introduce yourself and outline your professional experience?";
      } else {
        welcomeText = "Hey! What's up? I'm Alex. So cool to connect with you! I love talking about music, technology, and learning languages. What are some of your favorite hobbies?";
      }

      const initialMessage: SpeakingMessage = {
        id: "msg-init",
        role: "model",
        content: welcomeText,
        timestamp: new Date().toISOString()
      };
      
      setMessages([initialMessage]);
      setActiveFeedback(null);
      
      // Save initial
      LocalDB.saveSpeakingSession({
        id: "session-" + Math.random().toString(36).substring(2, 9),
        userId: LocalDB.getUser().id,
        persona: selectedPersona,
        messages: [initialMessage],
        createdAt: new Date().toISOString()
      });
    }
  };

  useEffect(() => {
    if (mounted) {
      initSession(persona);
    }
  }, [mounted, persona]);

  // Scroll to bottom helper
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!mounted) return null;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || chatLoading) return;

    const userText = inputVal.trim();
    setInputVal("");
    setChatLoading(true);

    const userMsg: SpeakingMessage = {
      id: "msg-" + Math.random().toString(36).substring(2, 9),
      role: "user",
      content: userText,
      timestamp: new Date().toISOString()
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);

    try {
      // Format history for Gemini SDK
      const history = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      // Call Gemini Speak Coach
      const aiResponse = await chatSpeakingCoach(persona, history, userText);
      
      const modelMsg: SpeakingMessage = {
        id: "msg-" + Math.random().toString(36).substring(2, 9),
        role: "model",
        content: aiResponse.reply,
        timestamp: new Date().toISOString(),
        feedback: {
          score: aiResponse.score,
          grammar: aiResponse.grammar,
          vocabulary: aiResponse.vocabulary,
          fluency: aiResponse.fluency
        }
      };

      const updatedMessages = [...newMessages, modelMsg];
      setMessages(updatedMessages);
      setActiveFeedback(modelMsg.feedback);

      // Save speaking session history
      const list = LocalDB.getSpeakingSessions();
      const existingSession = list.find(s => s.persona === persona);
      if (existingSession) {
        LocalDB.saveSpeakingSession({
          ...existingSession,
          messages: updatedMessages
        });
      }

      // Log AI Usage
      LocalDB.logAiUsage("AI Speaking Coach Conversation", 120, 200);

    } catch (err) {
      console.error(err);
      alert(`Lỗi trò chuyện với AI Coach: ${(err as Error).message}`);
    } finally {
      setChatLoading(false);
    }
  };

  const handleResetChat = () => {
    if (confirm("Bạn có muốn đặt lại toàn bộ lịch sử cuộc trò chuyện này?")) {
      const list = LocalDB.getSpeakingSessions();
      const filtered = list.filter(s => s.persona !== persona);
      localStorage.setItem("lingopod_speaking", JSON.stringify(filtered));
      initSession(persona);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        
        {/* Title branding */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AI Speaking Coach</h1>
            <p className="text-muted-foreground mt-1">Luyện giao tiếp tiếng Anh 1-1, nhận phản hồi sửa lỗi tức thì.</p>
          </div>
          
          <Button 
            onClick={handleResetChat} 
            variant="secondary" 
            size="sm" 
            className="gap-1.5 h-9 text-xs border border-border"
          >
            <Plus className="h-4 w-4" />
            Làm mới hội thoại
          </Button>
        </div>

        {/* Persona Select row card grid */}
        <div className="grid gap-3 sm:grid-cols-3 bg-[#0d1321]/50 border border-border p-4 rounded-xl shadow-xl">
          {(Object.keys(personas) as Array<keyof typeof personas>).map((key) => {
            const p = personas[key];
            const isSelected = persona === key;
            return (
              <button
                key={key}
                onClick={() => setPersona(key)}
                className={`
                  p-4 rounded-lg border text-left flex flex-col gap-1 transition-all duration-200
                  ${isSelected 
                    ? "bg-primary/10 border-primary text-primary shadow" 
                    : "bg-[#070b13] border-border/80 text-muted-foreground hover:border-border/120 hover:text-foreground"
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{p.avatar}</span>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-foreground truncate">{p.name}</h4>
                    <p className="text-[10px] text-muted-foreground truncate">{p.title}</p>
                  </div>
                </div>
                <p className="text-[10px] leading-4 text-muted-foreground/80 mt-2 line-clamp-2">
                  {p.desc}
                </p>
              </button>
            );
          })}
        </div>

        {/* Main Conversation & Feedbacks Panel Grid split */}
        <div className="grid gap-6 md:grid-cols-3">
          
          {/* Left Block: Chatting Interface */}
          <div className="md:col-span-2 bg-[#0d1321] border border-border rounded-xl shadow-xl flex flex-col justify-between h-[65vh] overflow-hidden">
            
            {/* Chat header */}
            <div className="px-5 py-4 border-b border-border bg-[#0d1321]/90 flex items-center gap-3">
              <span className="text-2xl">{personas[persona].avatar}</span>
              <div>
                <h3 className="text-xs font-bold text-foreground">{personas[persona].name}</h3>
                <span className="text-[9px] uppercase tracking-wider text-primary font-bold">Online & Lắng nghe</span>
              </div>
            </div>

            {/* Message Stream */}
            <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4 bg-[#070b13]/40">
              {messages.map((msg) => {
                const isUser = msg.role === "user";
                return (
                  <div 
                    key={msg.id}
                    className={`flex gap-3 max-w-[85%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                  >
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center border font-bold text-xs shrink-0 ${isUser ? "bg-accent/10 border-accent/20 text-accent" : "bg-primary/10 border-primary/20 text-primary"}`}>
                      {isUser ? "U" : personas[persona].avatar}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <div className={`p-4 rounded-xl text-xs leading-relaxed ${isUser ? "bg-accent/15 border border-accent/10 text-foreground rounded-tr-none" : "bg-[#0d1321] border border-border text-foreground rounded-tl-none"}`}>
                        {msg.content}
                      </div>
                      
                      {!isUser && msg.feedback && (
                        <button 
                          onClick={() => setActiveFeedback(msg.feedback)}
                          className="text-[10px] text-primary font-bold hover:underline self-start flex items-center gap-1.5 mt-0.5"
                        >
                          <Sparkles className="h-3 w-3" />
                          Xem phản hồi sửa lỗi AI (Điểm: {msg.feedback.score})
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {chatLoading && (
                <div className="flex gap-3 max-w-[85%] mr-auto items-center text-xs text-muted-foreground p-3 rounded-lg bg-muted/10 border border-border/20">
                  <Sparkles className="h-4 w-4 text-primary animate-spin" />
                  <span>{personas[persona].name} đang phân tích câu nói và soạn câu trả lời...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Chat input form */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-border bg-[#0d1321] flex gap-3">
              <Input
                type="text"
                placeholder="Nhập câu tiếng Anh giao tiếp của bạn..."
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                disabled={chatLoading}
                className="h-10 text-xs flex-1"
              />
              <Button type="submit" disabled={chatLoading || !inputVal.trim()} className="h-10 px-4">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>

          {/* Right Block: Instant Speak Coach AI Feedback */}
          <div className="md:col-span-1 bg-[#0d1321] border border-border p-5 rounded-xl shadow-xl h-fit">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 border-b border-border pb-3">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              Đánh giá & Phản hồi AI
            </h3>

            <div className="mt-4">
              {activeFeedback ? (
                <div className="flex flex-col gap-4 text-xs">
                  
                  {/* Circular Score Badge */}
                  <div className="flex flex-col items-center justify-center p-4 bg-muted/30 border border-border/80 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Điểm số tổng quan</span>
                    <span className="text-4xl font-black text-primary mt-1.5">{activeFeedback.score}</span>
                    <span className="text-[9px] text-muted-foreground font-semibold mt-1">thang điểm 100</span>
                  </div>

                  {/* Grammar feedback */}
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-foreground flex items-center gap-1.5 text-[11px] text-amber-400">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Ngữ pháp (Grammar)
                    </span>
                    <p className="text-muted-foreground leading-5 mt-0.5 bg-[#070b13] p-3 rounded border border-border/40">
                      {activeFeedback.grammar}
                    </p>
                  </div>

                  {/* Vocabulary feedback */}
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-foreground flex items-center gap-1.5 text-[11px] text-primary">
                      <BookOpen className="h-3.5 w-3.5" />
                      Từ vựng (Vocabulary)
                    </span>
                    <p className="text-muted-foreground leading-5 mt-0.5 bg-[#070b13] p-3 rounded border border-border/40">
                      {activeFeedback.vocabulary}
                    </p>
                  </div>

                  {/* Fluency feedback */}
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-foreground flex items-center gap-1.5 text-[11px] text-accent">
                      <Languages className="h-3.5 w-3.5" />
                      Độ trôi chảy (Fluency)
                    </span>
                    <p className="text-muted-foreground leading-5 mt-0.5 bg-[#070b13] p-3 rounded border border-border/40">
                      {activeFeedback.fluency}
                    </p>
                  </div>

                </div>
              ) : (
                <p className="text-xs text-muted-foreground/80 py-16 text-center leading-5">
                  Chưa có đánh giá nào.<br />Hãy <b>gửi tin nhắn giao tiếp</b> cho trợ lý AI để nhận phản hồi chỉnh sửa lỗi ngữ pháp tức thì.
                </p>
              )}
            </div>

          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
