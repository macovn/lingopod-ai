"use client";

import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useMounted } from "@/hooks/use-mounted";
import { LocalDB } from "@/lib/storage";
import { FlashcardItem, VocabularyItem } from "@/types";
import { 
  BrainCircuit, 
  HelpCircle, 
  Check, 
  RefreshCw, 
  Flame, 
  ArrowRight, 
  Sparkles,
  Layers,
  ChevronRight,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FlashcardsPage() {
  const mounted = useMounted();
  const [cards, setCards] = useState<FlashcardItem[]>([]);
  const [vocabs, setVocabs] = useState<VocabularyItem[]>([]);
  
  // Review Session States
  const [sessionCards, setSessionCards] = useState<(FlashcardItem & { vocab?: VocabularyItem })[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [isRandomMode, setIsRandomMode] = useState(false);

  const loadSession = (random = false) => {
    const allCards = LocalDB.getFlashcards();
    const allVocabs = LocalDB.getVocabularies();
    
    setCards(allCards);
    setVocabs(allVocabs);

    const now = new Date();
    // Filter due cards (nextReview <= now)
    let due = allCards.map(card => {
      const v = allVocabs.find(item => item.id === card.vocabularyId);
      return { ...card, vocab: v };
    }).filter(c => c.vocab && new Date(c.nextReview) <= now);

    // If no due cards, fallback to reviewing all cards in notebook
    if (due.length === 0) {
      due = allCards.map(card => {
        const v = allVocabs.find(item => item.id === card.vocabularyId);
        return { ...card, vocab: v };
      }).filter(c => c.vocab);
    }

    if (random) {
      due = [...due].sort(() => Math.random() - 0.5);
    }

    setSessionCards(due);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsSessionActive(due.length > 0);
    setSessionCompleted(false);
  };

  useEffect(() => {
    if (mounted) {
      loadSession(false);
    }
  }, [mounted]);

  if (!mounted) return null;

  const currentItem = sessionCards[currentIndex];

  const handleReviewScore = (rating: "hard" | "medium" | "easy") => {
    if (!currentItem) return;

    // Apply Spaced Repetition SuperMemo 2 algorithm updates to local storage DB
    LocalDB.reviewFlashcard(currentItem.id, rating);

    // Fade card flip back first
    setIsFlipped(false);

    setTimeout(() => {
      if (currentIndex + 1 < sessionCards.length) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setSessionCompleted(true);
        setIsSessionActive(false);
      }
    }, 250);
  };

  return (
    <DashboardLayout>
      {/* 3D Flip Card style rules */}
      <style dangerouslySetInnerHTML={{__html: `
        .flip-card {
          perspective: 1000px;
        }
        .flip-card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.6s;
          transform-style: preserve-3d;
        }
        .flip-card.flipped .flip-card-inner {
          transform: rotateY(180deg);
        }
        .flip-card-front, .flip-card-back {
          position: absolute;
          width: 100%;
          height: 100%;
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .flip-card-back {
          transform: rotateY(180deg);
        }
      `}} />

      <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">
        
        {/* Header Title */}
        <div className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary mb-3">
            <BrainCircuit className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-black tracking-tight">Flashcard Ôn Tập</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">Ghi nhớ từ vựng hiệu quả tối đa bằng thuật toán Spaced Repetition (SM-2).</p>
        </div>

        {/* Start Panel / Session Setup */}
        {!isSessionActive && !sessionCompleted && (
          <div className="bg-[#0d1321] border border-border p-8 rounded-xl shadow-xl text-center flex flex-col gap-6 items-center">
            <Layers className="h-12 w-12 text-primary" />
            <div>
              <h3 className="text-xl font-bold text-foreground">Sẵn sàng ôn tập hôm nay?</h3>
              <p className="text-xs text-muted-foreground mt-2 max-w-sm mx-auto leading-5">
                Thuật toán của chúng tôi tự động tính toán các từ đã đến hạn ôn tập dựa trên lịch sử đánh giá của bạn (Ngày 1, 3, 7, 14, 30).
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full max-w-md">
              <Button 
                onClick={() => {
                  setIsRandomMode(false);
                  loadSession(false);
                }} 
                className="font-bold flex items-center justify-center gap-2 h-11"
              >
                <span>Học theo thứ tự</span>
              </Button>
              <Button 
                onClick={() => {
                  setIsRandomMode(true);
                  loadSession(true);
                }} 
                variant="secondary"
                className="font-semibold flex items-center justify-center gap-2 h-11 border border-border"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Học ngẫu nhiên</span>
              </Button>
            </div>
          </div>
        )}

        {/* Active Study Card Panel */}
        {isSessionActive && currentItem && (
          <div className="flex flex-col gap-6">
            
            {/* Review Progress header */}
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span>Đang học: {currentIndex + 1} / {sessionCards.length} từ</span>
              <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">
                <Flame className="h-3 w-3 fill-amber-500" />
                <span>Streak x{currentItem.streak}</span>
              </div>
            </div>

            {/* 3D Flip Card Container */}
            <div 
              onClick={() => setIsFlipped(!isFlipped)}
              className={`flip-card h-80 cursor-pointer w-full ${isFlipped ? "flipped" : ""}`}
            >
              <div className="flip-card-inner">
                
                {/* Front Side: Term and IPA */}
                <div className="flip-card-front bg-[#0d1321] border border-border p-8 rounded-xl shadow-2xl">
                  <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Thẻ từ vựng</div>
                  
                  <div className="flex flex-col items-center justify-center flex-1">
                    <h2 className="text-4xl font-black text-foreground tracking-tight text-center">{currentItem.vocab?.term}</h2>
                    {currentItem.vocab?.ipa && (
                      <p className="text-sm font-mono text-muted-foreground/80 mt-2">{currentItem.vocab.ipa}</p>
                    )}
                    <span className="uppercase text-[9px] bg-accent/20 text-accent font-bold px-2 py-0.5 rounded mt-3.5">
                      {currentItem.vocab?.partOfSpeech}
                    </span>
                  </div>

                  <div className="text-center text-[10px] text-muted-foreground/75 font-semibold">
                    💡 Click vào thẻ để lật mặt sau và xem nghĩa
                  </div>
                </div>

                {/* Back Side: Translation, Examples & Context */}
                <div className="flip-card-back bg-[#0d1321] border border-primary/20 p-8 rounded-xl shadow-2xl relative">
                  {/* Neon border glow if mastered */}
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />
                  
                  <div className="text-[10px] uppercase font-bold tracking-widest text-primary">Định nghĩa & Nghĩa</div>

                  <div className="flex flex-col justify-center flex-1 gap-4 select-text">
                    <div className="text-center">
                      <h4 className="text-2xl font-black text-foreground">{currentItem.vocab?.meaningVi}</h4>
                    </div>

                    {currentItem.vocab?.example && (
                      <div className="bg-secondary/30 p-3 rounded-lg border border-border/40 text-xs">
                        <p className="text-muted-foreground italic font-medium">“{currentItem.vocab.example}”</p>
                        {currentItem.vocab.exampleVi && (
                          <p className="text-muted-foreground/80 mt-1 pl-1">{currentItem.vocab.exampleVi}</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="text-center text-[10px] text-muted-foreground/75 font-semibold">
                    💡 Nhấp chuột để lật lại mặt trước
                  </div>
                </div>

              </div>
            </div>

            {/* Review Scoring Buttons Row */}
            {isFlipped ? (
              <div className="flex flex-col gap-2 animate-fade-in">
                <span className="text-center text-xs font-semibold text-muted-foreground mb-1">Mức độ ghi nhớ của bạn?</span>
                <div className="grid grid-cols-3 gap-3">
                  <Button 
                    onClick={() => handleReviewScore("hard")} 
                    variant="ghost"
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold border border-red-500/20 h-11"
                  >
                    Khó (Day 1)
                  </Button>
                  <Button 
                    onClick={() => handleReviewScore("medium")} 
                    variant="secondary"
                    className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold border border-amber-500/20 h-11"
                  >
                    Nhớ (Day 3-7)
                  </Button>
                  <Button 
                    onClick={() => handleReviewScore("easy")} 
                    className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold border border-emerald-500/20 h-11"
                  >
                    Dễ (Day 14-30)
                  </Button>
                </div>
              </div>
            ) : (
              <Button 
                onClick={() => setIsFlipped(true)}
                className="w-full font-bold h-11 gap-1.5 shadow-lg shadow-primary/10"
              >
                <span>Lật xem nghĩa</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}

          </div>
        )}

        {/* Session Finished Completed Screen */}
        {sessionCompleted && (
          <div className="bg-[#0d1321] border border-border p-8 rounded-xl shadow-xl text-center flex flex-col gap-6 items-center">
            <div className="h-16 w-16 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center text-primary">
              <Check className="h-8 w-8" />
            </div>

            <div>
              <h3 className="text-2xl font-black text-foreground">Xuất sắc! Đã hoàn thành ôn tập</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto leading-relaxed">
                Bạn đã ôn tập xong tất cả các từ đến hạn. Điều này giúp củng cố liên kết thần kinh lưu trữ thông tin lâu dài trong não bộ.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full pt-4 border-t border-border/50 text-xs">
              <div className="p-3 bg-muted/20 border border-border/30 rounded-lg">
                <p className="text-muted-foreground">Đã ôn tập</p>
                <p className="text-lg font-black text-foreground mt-1">+{sessionCards.length} từ</p>
              </div>
              <div className="p-3 bg-muted/20 border border-border/30 rounded-lg">
                <p className="text-muted-foreground">Streak tăng</p>
                <p className="text-lg font-black text-amber-400 mt-1">+1 ngày 🔥</p>
              </div>
            </div>

            <Button 
              onClick={() => {
                setSessionCompleted(false);
                loadSession(isRandomMode);
              }}
              className="w-full mt-2 font-bold h-11"
            >
              Học lại phiên khác
            </Button>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
