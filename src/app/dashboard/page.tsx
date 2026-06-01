"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useMounted } from "@/hooks/use-mounted";
import { LocalDB } from "@/lib/storage";
import { evaluateShadowingSpeech } from "@/services/gemini";
import { 
  BookOpen, 
  Headphones, 
  Mic2, 
  BrainCircuit, 
  Flame, 
  Sparkles, 
  Plus, 
  TrendingUp, 
  Calendar,
  ChevronRight,
  CheckCircle2,
  Play,
  Award,
  ArrowRight,
  Clock,
  X,
  Mic,
  Volume2,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function DashboardPage() {
  const mounted = useMounted();
  const [stats, setStats] = useState({
    totalWords: 0,
    masteredWords: 0,
    learningWords: 0,
    totalPodcasts: 0,
    shadowingSessions: 0,
    streak: 0
  });

  const [recentVocab, setRecentVocab] = useState<any[]>([]);

  // Daily Smart Review V2 States
  const [dueCardsCount, setDueCardsCount] = useState(0);
  const [difficultCount, setDifficultCount] = useState(0);
  const [dueShadowing, setDueShadowing] = useState(1);
  
  // Guided Review Flow States
  const [isReviewActive, setIsReviewActive] = useState(false);
  const [reviewStep, setReviewStep] = useState(1); // 1: Spaced Cards, 2: Difficult Word Quiz, 3: Shadowing practice, 4: Congratulations
  const [reviewCards, setReviewCards] = useState<any[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);

  // Quiz step states
  const [quizWord, setQuizWord] = useState<any | null>(null);
  const [quizOptions, setQuizOptions] = useState<string[]>([]);
  const [selectedQuizOpt, setSelectedQuizOpt] = useState("");
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Shadowing step states
  const [originalShadowText, setOriginalShadowText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedUrl, setRecordedUrl] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [shadowScore, setShadowScore] = useState<any | null>(null);
  const [shadowEvaluating, setShadowEvaluating] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const loadData = () => {
    const vocab = LocalDB.getVocabularies();
    const podcasts = LocalDB.getPodcasts();
    const shadowing = LocalDB.getShadowingRecordings();
    const user = LocalDB.getUser();
    const cards = LocalDB.getFlashcards();

    const mastered = vocab.filter(v => v.status === "mastered").length;
    const learning = vocab.filter(v => v.status === "learning").length;

    setStats({
      totalWords: vocab.length,
      masteredWords: mastered,
      learningWords: learning,
      totalPodcasts: podcasts.length,
      shadowingSessions: shadowing.length,
      streak: user.streak
    });

    setRecentVocab(vocab.slice(0, 3));

    // Calculate due cards count
    const now = new Date();
    const due = cards.filter(c => new Date(c.nextReview) <= now).length;
    setDueCardsCount(due);

    // Difficult words count (learning status)
    setDifficultCount(learning);
  };

  useEffect(() => {
    if (mounted) {
      loadData();
    }
  }, [mounted]);

  if (!mounted) return null;

  const masteredPercentage = stats.totalWords > 0 
    ? Math.round((stats.masteredWords / stats.totalWords) * 100) 
    : 0;

  // Initialize Daily Review Flow
  const startDailyReview = () => {
    const cards = LocalDB.getFlashcards();
    const vocab = LocalDB.getVocabularies();
    
    // Step 1: Flashcards due setup
    const dueList = cards.map(c => {
      const v = vocab.find(item => item.id === c.vocabularyId);
      return { ...c, vocab: v };
    }).filter(c => c.vocab).slice(0, 3); // Take first 3 for rapid daily review

    setReviewCards(dueList);
    setCardIndex(0);
    setCardFlipped(false);

    // Step 2: Difficult quiz setup
    const difficultList = vocab.filter(v => v.status === "learning");
    const testWord = difficultList[0] || vocab[0] || { term: "serendipity", meaningVi: "tình cờ may mắn" };
    setQuizWord(testWord);

    // Generate dynamic quiz options from real vocabularies
    const otherVocabs = vocab.filter(v => v.id !== testWord.id);
    const optionsList = [testWord.meaningVi];
    
    otherVocabs.forEach(v => {
      if (optionsList.length < 4 && !optionsList.includes(v.meaningVi)) {
        optionsList.push(v.meaningVi);
      }
    });

    const fillerOptions = [
      "kiên cường, có khả năng phục hồi nhanh chóng sau khó khăn",
      "hùng biện, có khả năng nói hoặc viết lưu loát và cuốn hút",
      "phù du, chóng tàn, tồn tại trong thời gian rất ngắn",
      "sự cản trở hoặc thất bại liên tục",
      "sự hài hòa trong giao tiếp và ứng xử"
    ];
    let fillerIdx = 0;
    while (optionsList.length < 4 && fillerIdx < fillerOptions.length) {
      if (!optionsList.includes(fillerOptions[fillerIdx])) {
        optionsList.push(fillerOptions[fillerIdx]);
      }
      fillerIdx++;
    }

    const options = optionsList.sort(() => Math.random() - 0.5);
    setQuizOptions(options);
    setSelectedQuizOpt("");
    setQuizSubmitted(false);

    // Step 3: Shadowing target setup
    const podcastsList = LocalDB.getPodcasts();
    const shadowTarget = podcastsList[0]?.transcript.substring(0, 110) || "Welcome to LingoPod. Today we are talking about habits. Habits are the architecture of daily life.";
    setOriginalShadowText(shadowTarget);
    setRecordedUrl("");
    setAudioBlob(null);
    setShadowScore(null);
    setRecordingSeconds(0);

    // Start flow
    setReviewStep(1);
    setIsReviewActive(true);
  };

  // Close review flow
  const closeReview = () => {
    setIsReviewActive(false);
    loadData();
  };

  // 1. Flashcards score review
  const handleCardReview = (rating: "hard" | "medium" | "easy") => {
    const currentCard = reviewCards[cardIndex];
    if (currentCard) {
      LocalDB.reviewFlashcard(currentCard.id, rating);
    }

    setCardFlipped(false);
    setTimeout(() => {
      if (cardIndex + 1 < reviewCards.length) {
        setCardIndex(cardIndex + 1);
      } else {
        // Move to step 2: Quiz
        setReviewStep(2);
      }
    }, 200);
  };

  // 2. Submit Quiz Answer
  const handleQuizSubmit = () => {
    if (!quizWord) return;
    setQuizSubmitted(true);
  };

  // 3. Shadowing Micro recorder V2
  const startReviewRecording = async () => {
    if (typeof window === "undefined" || !navigator.mediaDevices) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setRecordedUrl(URL.createObjectURL(blob));
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);
      setShadowScore(null);

      timerRef.current = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);
    } catch (e) {
      console.error(e);
      alert("Microphone permission denied.");
    }
  };

  const stopReviewRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const evaluateShadowingAI = async () => {
    if (!audioBlob) {
      alert("Bạn chưa ghi âm bài đọc.");
      return;
    }
    setShadowEvaluating(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        try {
          const base64data = (reader.result as string).split(",")[1];
          const res = await evaluateShadowingSpeech(originalShadowText, base64data);
          setShadowScore(res);
          LocalDB.logAiUsage("AI Shadowing Evaluation (Smart Review)", 100, 150);
        } catch (err) {
          console.error("Lỗi khi chấm điểm Shadowing:", err);
          alert(`Không thể chấm điểm giọng nói của bạn: ${(err as Error).message}`);
        } finally {
          setShadowEvaluating(false);
        }
      };
    } catch (e) {
      console.error(e);
      alert(`Đã xảy ra lỗi khi đọc tệp ghi âm: ${(e as Error).message}`);
      setShadowEvaluating(false);
    }
  };

  const handleFinishShadowingStep = () => {
    // Add completed shadowing record
    LocalDB.saveShadowingRecording({
      title: "Shadowing Smart Review",
      audioUrl: recordedUrl,
      durationSeconds: recordingSeconds
    });
    // Move to step 4: Congrats
    setReviewStep(4);
    
    // Award streak bonus
    LocalDB.incrementStreak();
  };

  return (
    <DashboardLayout>
      {/* 3D Flip Card style rules inline */}
      <style dangerouslySetInnerHTML={{__html: `
        .flip-card-mini {
          perspective: 1000px;
        }
        .flip-card-mini-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.5s;
          transform-style: preserve-3d;
        }
        .flip-card-mini.flipped .flip-card-mini-inner {
          transform: rotateY(180deg);
        }
        .flip-card-mini-front, .flip-card-mini-back {
          position: absolute;
          width: 100%;
          height: 100%;
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .flip-card-mini-back {
          transform: rotateY(180deg);
        }
      `}} />

      <div className="flex flex-col gap-8">
        
        {/* V2 Header with Greeting */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Chào mừng quay trở lại!</h1>
            <p className="text-muted-foreground mt-1 text-sm">Học tập đều đặn mỗi ngày là chìa khóa vàng chinh phục tiếng Anh.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/podcasts">
              <Button className="gap-2 font-semibold shadow-lg shadow-primary/10">
                <Plus className="h-4 w-4" />
                Học Podcast mới
              </Button>
            </Link>
          </div>
        </div>

        {/* Priority 4 V2: Unified Smart Review Widget Panel */}
        <div className="bg-gradient-to-r from-[#0d1321] via-[#101b33] to-[#0d1321] border border-primary/20 rounded-xl p-6 shadow-2xl relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="absolute inset-0 bg-primary/[0.02] pointer-events-none" />
          <div className="flex items-center gap-4.5">
            <div className="h-14 w-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 animate-pulse">
              <BrainCircuit className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary uppercase tracking-widest">Nhiệm vụ hàng ngày</span>
                <span className="text-[10px] bg-accent/25 text-accent font-bold px-2 py-0.5 rounded-full uppercase border border-accent/20">V2 Smart</span>
              </div>
              <h2 className="text-lg font-black text-foreground mt-1.5">Lộ trình Ôn tập Thông minh (Một nút bấm)</h2>
              <p className="text-xs text-muted-foreground mt-1 max-w-lg leading-5">
                Hôm nay bạn cần ôn: <b className="text-primary">{dueCardsCount} từ đến hạn</b> Spaced Repetition, ôn tập <b className="text-amber-400">{difficultCount} từ khó</b>, và thực hành <b className="text-rose-400">1 bài Shadowing</b> để duy trì chuỗi học tập.
              </p>
            </div>
          </div>

          <Button 
            onClick={startDailyReview}
            className="w-full sm:w-auto shrink-0 font-extrabold h-11 px-6 gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 text-sm"
          >
            <span>Bắt đầu học</span>
            <Play className="h-4 w-4 fill-current" />
          </Button>
        </div>

        {/* KPIs Row */}
        <div className="grid gap-5 grid-cols-2 lg:grid-cols-4">
          {/* Streak */}
          <div className="bg-[#0d1321] border border-border p-5 rounded-xl shadow-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Chuỗi liên tục</p>
              <h3 className="text-2xl font-extrabold text-amber-400 mt-2 flex items-baseline gap-1">
                {stats.streak} <span className="text-xs font-medium text-muted-foreground">ngày</span>
              </h3>
            </div>
            <div className="h-12 w-12 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
              <Flame className="h-6 w-6 fill-amber-500" />
            </div>
          </div>

          {/* Sổ tay từ vựng */}
          <div className="bg-[#0d1321] border border-border p-5 rounded-xl shadow-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tổng từ vựng</p>
              <h3 className="text-2xl font-extrabold text-emerald-400 mt-2">
                {stats.totalWords} <span className="text-xs font-medium text-muted-foreground">từ</span>
              </h3>
            </div>
            <div className="h-12 w-12 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
              <BookOpen className="h-6 w-6" />
            </div>
          </div>

          {/* Podcast đã học */}
          <div className="bg-[#0d1321] border border-border p-5 rounded-xl shadow-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Podcast đã lưu</p>
              <h3 className="text-2xl font-extrabold text-blue-400 mt-2">
                {stats.totalPodcasts} <span className="text-xs font-medium text-muted-foreground">bài</span>
              </h3>
            </div>
            <div className="h-12 w-12 rounded-lg bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400">
              <Headphones className="h-6 w-6" />
            </div>
          </div>

          {/* Phiên shadowing */}
          <div className="bg-[#0d1321] border border-border p-5 rounded-xl shadow-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phiên Shadowing</p>
              <h3 className="text-2xl font-extrabold text-rose-400 mt-2">
                {stats.shadowingSessions} <span className="text-xs font-medium text-muted-foreground">phiên</span>
              </h3>
            </div>
            <div className="h-12 w-12 rounded-lg bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400">
              <Mic2 className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Charts & Progress Section */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Progress Circular Chart */}
          <div className="bg-[#0d1321] border border-border rounded-xl p-6 flex flex-col justify-between shadow-xl">
            <h3 className="text-base font-bold text-muted-foreground uppercase tracking-wider mb-4">Tiến độ ghi nhớ</h3>
            <div className="flex flex-col items-center justify-center py-6">
              <div className="relative h-32 w-32">
                <svg className="h-full w-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle 
                    cx="50" cy="50" r="40" 
                    className="stroke-[#1f2a3d] fill-transparent" 
                    strokeWidth="8"
                  />
                  <circle 
                    cx="50" cy="50" r="40" 
                    className="stroke-primary fill-transparent transition-all duration-1000 ease-out" 
                    strokeWidth="8"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 - (251.2 * masteredPercentage) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-foreground">{masteredPercentage}%</span>
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase">Đã thuộc</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-4 border-t border-border/50 text-xs">
              <div>
                <p className="text-muted-foreground">Chưa học</p>
                <p className="font-extrabold text-sm text-foreground mt-1">{stats.totalWords - stats.masteredWords - stats.learningWords}</p>
              </div>
              <div className="border-x border-border/50">
                <p className="text-amber-400">Đang học</p>
                <p className="font-extrabold text-sm text-amber-400 mt-1">{stats.learningWords}</p>
              </div>
              <div>
                <p className="text-primary">Đã thuộc</p>
                <p className="font-extrabold text-sm text-primary mt-1">{stats.masteredWords}</p>
              </div>
            </div>
          </div>

          {/* Bar Chart Area */}
          <div className="bg-[#0d1321] border border-border rounded-xl p-6 shadow-xl lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-bold text-muted-foreground uppercase tracking-wider">Từ vựng mới theo ngày</h3>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>7 ngày qua</span>
              </div>
            </div>

            <div className="h-44 flex items-end justify-between gap-4 pt-6">
              {[
                { label: "T2", val: 2 },
                { label: "T3", val: 5 },
                { label: "T4", val: 3 },
                { label: "T5", val: 8 },
                { label: "T6", val: 4 },
                { label: "T7", val: 6 },
                { label: "CN", val: stats.totalWords }
              ].map((day, idx) => {
                const maxVal = 10;
                const percentage = Math.min(100, Math.round((day.val / maxVal) * 100));
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                    <span className="text-[10px] text-muted-foreground font-bold group-hover:text-primary transition-colors">{day.val}</span>
                    <div className="w-full bg-[#182235] rounded-t-md relative h-full flex items-end overflow-hidden border border-border/30">
                      <div 
                        className="w-full bg-gradient-to-t from-primary/60 to-primary rounded-t-sm transition-all duration-700 ease-out"
                        style={{ height: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground group-hover:text-foreground font-semibold transition-colors mt-1">{day.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Quick Review / Spaced Repetition Panel */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Quick Review flashcards */}
          <div className="bg-[#0d1321] border border-border rounded-xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-primary">
                <BrainCircuit className="h-5 w-5" />
                <h3 className="font-bold text-lg text-foreground">Ôn tập Spaced Repetition</h3>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Hệ thống phát hiện có các từ đã đến lịch ôn tập hôm nay dựa trên chu kỳ ngày 1, 3, 7, 14, 30. Ôn tập ngay để ghi nhớ tối đa!
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between bg-secondary/30 border border-border/50 p-4 rounded-lg">
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trạng thái thẻ hôm nay</span>
                <p className="text-lg font-bold text-foreground mt-1">Cần ôn tập: <span className="text-amber-400 font-extrabold">{dueCardsCount} từ</span></p>
              </div>
              <Link href="/flashcards">
                <Button className="font-semibold text-xs py-1.5 h-8">Luyện Ngay</Button>
              </Link>
            </div>
          </div>

          {/* Recent words in notebook */}
          <div className="bg-[#0d1321] border border-border rounded-xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-lg text-foreground mb-4">Từ vựng mới lưu gần đây</h3>
              <div className="flex flex-col gap-3">
                {recentVocab.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4">Chưa có từ vựng nào được lưu.</p>
                ) : (
                  recentVocab.map((v) => (
                    <div key={v.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">{v.term}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono uppercase">{v.partOfSpeech}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 truncate max-w-[240px]">{v.meaningVi}</p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                        v.status === "mastered" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        v.status === "learning" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                        "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      }`}>
                        {v.status === "mastered" ? "Đã thuộc" : v.status === "learning" ? "Đang học" : "Chưa học"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <Link href="/vocabulary" className="text-xs text-primary font-bold hover:underline flex items-center gap-0.5 mt-4 self-end">
              Xem toàn bộ sổ tay <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Guided Daily Smart Review Flow Fullscreen Overlay Modal */}
        {isReviewActive && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-[#0d1321] border border-border rounded-2xl w-full max-w-xl p-6 shadow-2xl relative overflow-hidden flex flex-col gap-6 max-h-[90vh]">
              
              {/* Decorative glows */}
              <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />

              {/* Header flow bar */}
              <div className="flex items-center justify-between border-b border-border pb-3 shrink-0 z-10">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-primary uppercase tracking-widest">Nhiệm vụ ôn tập</span>
                  <span className="text-[10px] font-bold text-muted-foreground">Bước {reviewStep} / 4</span>
                </div>
                
                <button 
                  onClick={closeReview}
                  className="text-muted-foreground hover:text-foreground focus:outline-none"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Flow Content */}
              <div className="flex-1 overflow-y-auto z-10">
                
                {/* STEP 1: Flashcards Review */}
                {reviewStep === 1 && (
                  <div className="flex flex-col gap-5 items-center">
                    <div className="text-center">
                      <h3 className="font-extrabold text-base text-foreground">Bước 1: Ôn tập Spaced Repetition</h3>
                      <p className="text-xs text-muted-foreground mt-1">Ôn tập các từ vựng đến hạn hôm nay để củng cố phản xạ.</p>
                    </div>

                    {reviewCards.length > 0 && reviewCards[cardIndex] ? (
                      <div className="w-full flex flex-col gap-5 items-center">
                        <span className="text-[10px] text-muted-foreground font-semibold">Từ: {cardIndex + 1} / {reviewCards.length}</span>
                        
                        {/* Interactive mini 3D flip card */}
                        <div 
                          onClick={() => setCardFlipped(!cardFlipped)}
                          className={`flip-card-mini h-56 cursor-pointer w-full max-w-sm ${cardFlipped ? "flipped" : ""}`}
                        >
                          <div className="flip-card-mini-inner">
                            {/* Front side */}
                            <div className="flip-card-mini-front bg-[#070b13] border border-border p-6 rounded-xl flex flex-col items-center justify-center gap-2">
                              <h2 className="text-3xl font-black text-foreground">{reviewCards[cardIndex].vocab?.term}</h2>
                              <span className="text-[10px] font-mono text-muted-foreground">{reviewCards[cardIndex].vocab?.ipa}</span>
                              <span className="text-[9px] uppercase bg-secondary text-secondary-foreground font-bold px-1.5 py-0.5 rounded mt-2">
                                {reviewCards[cardIndex].vocab?.partOfSpeech}
                              </span>
                              <span className="text-[9px] text-muted-foreground/60 font-semibold mt-4">💡 Nhấp để xem nghĩa</span>
                            </div>
                            
                            {/* Back side */}
                            <div className="flip-card-mini-back bg-[#070b13] border border-primary/20 p-6 rounded-xl flex flex-col items-center justify-center gap-3">
                              <h4 className="text-lg font-bold text-foreground">{reviewCards[cardIndex].vocab?.meaningVi}</h4>
                              {reviewCards[cardIndex].vocab?.example && (
                                <p className="text-xs text-muted-foreground italic text-center max-w-[280px]">
                                  “{reviewCards[cardIndex].vocab.example}”
                                </p>
                              )}
                              <span className="text-[9px] text-primary font-semibold mt-4">💡 Lật lại mặt trước</span>
                            </div>
                          </div>
                        </div>

                        {cardFlipped ? (
                          <div className="grid grid-cols-3 gap-2 w-full max-w-sm mt-2">
                            <Button 
                              onClick={() => handleCardReview("hard")}
                              size="sm"
                              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold border border-red-500/20 py-2 h-9 text-xs"
                            >
                              Khó
                            </Button>
                            <Button 
                              onClick={() => handleCardReview("medium")}
                              size="sm"
                              variant="secondary"
                              className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold border border-amber-500/20 py-2 h-9 text-xs"
                            >
                              Nhớ
                            </Button>
                            <Button 
                              onClick={() => handleCardReview("easy")}
                              size="sm"
                              className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold border border-emerald-500/20 py-2 h-9 text-xs"
                            >
                              Dễ
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            onClick={() => setCardFlipped(true)}
                            className="w-full max-w-sm font-bold text-xs h-9"
                          >
                            Lật xem nghĩa
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground py-12">Đang tải thẻ ôn tập...</div>
                    )}
                  </div>
                )}

                {/* STEP 2: Difficult Word Quiz */}
                {reviewStep === 2 && quizWord && (
                  <div className="flex flex-col gap-4 text-center">
                    <div>
                      <h3 className="font-extrabold text-base text-foreground">Bước 2: Vượt ải từ khó</h3>
                      <p className="text-xs text-muted-foreground mt-1">Trả lời trắc nghiệm ôn tập nhanh các từ bạn đang học.</p>
                    </div>

                    <div className="bg-[#070b13] border border-border p-5 rounded-xl text-left flex flex-col gap-4 mt-2">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Câu hỏi trắc nghiệm</span>
                      <h4 className="text-sm font-bold text-foreground">
                        Từ vựng <span className="text-primary font-black">"{quizWord.term}"</span> ({quizWord.partOfSpeech}) nghĩa là gì?
                      </h4>

                      <div className="flex flex-col gap-2 mt-2">
                        {quizOptions.map((opt, idx) => {
                          const isSelected = selectedQuizOpt === opt;
                          const isCorrect = opt === quizWord.meaningVi;
                          
                          let btnClass = "bg-muted/10 border-border/80 text-muted-foreground hover:bg-[#070b13]";
                          if (isSelected) btnClass = "bg-primary/10 border-primary text-primary font-semibold";
                          if (quizSubmitted) {
                            if (isCorrect) {
                              btnClass = "bg-green-500/10 border-green-500 text-green-400 font-bold";
                            } else if (isSelected) {
                              btnClass = "bg-red-500/10 border-red-500 text-red-400 font-bold";
                            } else {
                              btnClass = "opacity-40 border-transparent text-muted-foreground";
                            }
                          }

                          return (
                            <button
                              key={idx}
                              onClick={() => !quizSubmitted && setSelectedQuizOpt(opt)}
                              disabled={quizSubmitted}
                              className={`w-full text-left p-3 rounded-lg text-xs border transition-all duration-150 flex items-center justify-between ${btnClass}`}
                            >
                              <span>{opt}</span>
                              {quizSubmitted && isCorrect && <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>

                      {quizSubmitted && (
                        <div className="bg-secondary/30 p-3 rounded-lg border border-border/40 text-[11px] text-muted-foreground mt-1">
                          <b>Giải thích:</b> "{quizWord.term}" có nghĩa là "{quizWord.meaningVi}". Ví dụ: "{quizWord.example}"
                        </div>
                      )}
                    </div>

                    {!quizSubmitted ? (
                      <Button 
                        onClick={handleQuizSubmit} 
                        disabled={!selectedQuizOpt}
                        className="w-full font-bold text-xs h-10 mt-3"
                      >
                        Kiểm tra đáp án
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => setReviewStep(3)}
                        className="w-full font-bold text-xs h-10 mt-3 gap-1"
                      >
                        <span>Tiếp tục bước 3</span>
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}

                {/* STEP 3: Shadowing Audio Practice */}
                {reviewStep === 3 && (
                  <div className="flex flex-col gap-4 text-center">
                    <div>
                      <h3 className="font-extrabold text-base text-foreground">Bước 3: Thực hành Shadowing</h3>
                      <p className="text-xs text-muted-foreground mt-1">Luyện đọc to đoạn trích sau và nhận chấm điểm phát âm AI.</p>
                    </div>

                    <div className="bg-[#070b13] border border-border p-4 rounded-xl text-left italic text-xs leading-5 text-foreground font-medium mt-2">
                      “{originalShadowText}”
                    </div>

                    <div className="flex flex-col items-center gap-4 py-4">
                      {/* Recording status details */}
                      <div className="flex items-center justify-center h-20 w-20 rounded-full bg-[#070b13] border-2 border-border shadow-inner relative">
                        {isRecording ? (
                          <>
                            <div className="absolute inset-0 rounded-full border border-primary/40 animate-ping" />
                            <span className="text-sm font-black text-primary font-mono">{recordingSeconds}s</span>
                          </>
                        ) : (
                          <Mic className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>

                      <div className="flex gap-2">
                        {isRecording ? (
                          <Button 
                            onClick={stopReviewRecording} 
                            className="bg-red-500 hover:bg-red-600 text-white font-bold h-9 px-4 text-xs"
                          >
                            Dừng ghi âm
                          </Button>
                        ) : (
                          <Button 
                            onClick={startReviewRecording} 
                            className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold h-9 px-4 text-xs"
                          >
                            Bắt đầu nói
                          </Button>
                        )}

                        {recordedUrl && !isRecording && (
                          <Button 
                            onClick={evaluateShadowingAI}
                            disabled={shadowEvaluating}
                            className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold h-9 px-4 text-xs"
                          >
                            {shadowEvaluating ? "Đang chấm..." : "AI Chấm Điểm"}
                          </Button>
                        )}
                      </div>

                      {/* Display AI feedback on review dialog */}
                      {shadowScore && (
                        <div className="w-full bg-[#070b13] border border-border p-4 rounded-xl text-left flex flex-col gap-3 text-xs">
                          <span className="text-[10px] text-primary uppercase font-bold tracking-wider">Kết quả giọng đọc AI</span>
                          
                          <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-bold">
                            <div className="bg-secondary/40 p-2 rounded">
                              <span className="text-muted-foreground block text-[9px]">Phát âm</span>
                              <span className="text-foreground block mt-0.5">{shadowScore.pronunciationScore}</span>
                            </div>
                            <div className="bg-secondary/40 p-2 rounded">
                              <span className="text-amber-400 block text-[9px]">Ngữ điệu</span>
                              <span className="text-amber-400 block mt-0.5">{shadowScore.intonationScore}</span>
                            </div>
                            <div className="bg-secondary/40 p-2 rounded">
                              <span className="text-accent block text-[9px]">Trôi chảy</span>
                              <span className="text-accent block mt-0.5">{shadowScore.fluencyScore}</span>
                            </div>
                          </div>

                          <p className="text-muted-foreground leading-relaxed p-2.5 rounded bg-[#0d1321] text-[11px] border border-border/40">
                            {shadowScore.detailedFeedback}
                          </p>
                        </div>
                      )}
                    </div>

                    {shadowScore && (
                      <Button 
                        onClick={handleFinishShadowingStep}
                        className="w-full font-bold text-xs h-10 mt-2 gap-1.5"
                      >
                        <span>Hoàn thành lộ trình</span>
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}

                {/* STEP 4: Congratulations Recap screen */}
                {reviewStep === 4 && (
                  <div className="flex flex-col gap-6 items-center text-center py-6">
                    <div className="h-16 w-16 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center text-primary animate-bounce">
                      <Award className="h-9 w-9" />
                    </div>

                    <div>
                      <h3 className="text-2xl font-black text-foreground">Tuyệt vời, Nguyễn Anh Tuấn!</h3>
                      <p className="text-xs text-muted-foreground mt-2 max-w-sm leading-5">
                        Bạn đã hoàn thành xuất sắc toàn bộ Lộ trình Ôn tập hàng ngày. Hệ thống đã ghi nhận tiến trình học tập của bạn!
                      </p>
                    </div>

                    <div className="bg-secondary/40 border border-border/60 p-4 rounded-xl w-full max-w-xs grid grid-cols-2 text-center text-xs">
                      <div className="border-r border-border/50">
                        <p className="text-muted-foreground">Chuỗi học tập</p>
                        <p className="text-lg font-black text-amber-400 mt-1">🔥 {stats.streak + 1} ngày</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Mục tiêu ngày</p>
                        <p className="text-lg font-black text-primary mt-1">100% Đạt</p>
                      </div>
                    </div>

                    <Button 
                      onClick={closeReview}
                      className="w-full max-w-xs font-black h-11 text-xs"
                    >
                      Tuyệt vời! Quay lại Dashboard
                    </Button>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
