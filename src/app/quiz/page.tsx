"use client";

import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useMounted } from "@/hooks/use-mounted";
import { LocalDB } from "@/lib/storage";
import { generateQuiz } from "@/services/gemini";
import { QuizQuestion } from "@/types";
import { 
  GraduationCap, 
  Sparkles, 
  HelpCircle, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  PlayCircle, 
  AlertCircle,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function QuizPage() {
  const mounted = useMounted();
  const [vocabList, setVocabList] = useState<any[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizActive, setQuizActive] = useState(false);
  
  // Answering States
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [answeredSubmitted, setAnsweredSubmitted] = useState<Record<string, boolean>>({});
  const [textAnswer, setTextAnswer] = useState("");
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);

  // Result States
  const [quizFinished, setQuizFinished] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (mounted) {
      const list = LocalDB.getVocabularies();
      setVocabList(list);
    }
  }, [mounted]);

  if (!mounted) return null;

  // Initialize and generate quiz
  const handleStartQuiz = async () => {
    if (vocabList.length < 2) return;
    setQuizLoading(true);
    setQuestions([]);
    
    try {
      const quizQuestions = await generateQuiz(vocabList);
      setQuestions(quizQuestions);
      setQuizActive(true);
      setCurrentIdx(0);
      setSelectedAnswers({});
      setAnsweredSubmitted({});
      setTextAnswer("");
      setIsAnswerCorrect(null);
      setQuizFinished(false);
      
      // Log AI Usage
      LocalDB.logAiUsage("AI Quiz Generator", 100, 250);
    } catch (e) {
      console.error(e);
    } finally {
      setQuizLoading(false);
    }
  };

  const currentQuestion = questions[currentIdx];

  // Choice selected handler (Multiple Choice)
  const handleSelectChoice = (option: string) => {
    if (answeredSubmitted[currentQuestion.id]) return;
    setSelectedAnswers({
      ...selectedAnswers,
      [currentQuestion.id]: option
    });
  };

  // Submit Answer
  const handleSubmitAnswer = () => {
    if (!currentQuestion) return;

    let ans = "";
    if (currentQuestion.type === "multiple-choice" || currentQuestion.type === "matching") {
      ans = selectedAnswers[currentQuestion.id] || "";
    } else {
      ans = textAnswer.trim().toLowerCase();
    }

    if (!ans) return;

    const isCorrect = currentQuestion.type === "fill-in-blank" 
      ? ans.toLowerCase() === currentQuestion.correctAnswer.toLowerCase()
      : ans === currentQuestion.correctAnswer;

    setIsAnswerCorrect(isCorrect);
    setAnsweredSubmitted({
      ...answeredSubmitted,
      [currentQuestion.id]: true
    });

    if (isCorrect) {
      setScore(prev => prev + 1);
    }
  };

  // Move to next question or finish quiz
  const handleNextQuestion = () => {
    setIsAnswerCorrect(null);
    setTextAnswer("");

    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(prev => prev + 1);
    } else {
      setQuizFinished(true);
      setQuizActive(false);
      
      // Save quiz session log in user profile stats
      LocalDB.incrementStreak();
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">
        
        {/* Title branding */}
        <div className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary mb-3">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-black tracking-tight">AI Quiz Engine</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">Kiểm tra kiến thức từ vựng bằng các câu hỏi trắc nghiệm tự động sinh bởi Gemini AI.</p>
        </div>

        {/* Start State / Welcome Panel */}
        {!quizActive && !quizFinished && (
          <div className="bg-[#0d1321] border border-border p-8 rounded-xl shadow-xl flex flex-col items-center gap-6 text-center">
            <Sparkles className="h-10 w-10 text-primary animate-bounce" />
            
            <div>
              <h3 className="text-xl font-bold text-foreground">Sinh đề thi trắc nghiệm AI</h3>
              <p className="text-xs text-muted-foreground mt-2 max-w-sm mx-auto leading-5">
                Gemini AI sẽ tự động phân tích tất cả các từ trong Sổ tay từ vựng của bạn để tạo ra một đề kiểm tra tùy biến (Trắc nghiệm, Điền từ, Ghép cặp).
              </p>
            </div>

            {vocabList.length < 2 ? (
              <div className="flex items-center gap-2 bg-red-500/10 text-red-400 p-4 rounded-lg text-xs font-semibold max-w-sm border border-red-500/20">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>Bạn cần lưu tối thiểu 2 từ vựng vào sổ tay từ vựng mới có thể sinh bài thi AI Quiz.</span>
              </div>
            ) : (
              <Button 
                onClick={handleStartQuiz} 
                disabled={quizLoading}
                className="font-bold gap-2 px-6 h-11 w-full max-w-xs shadow-lg shadow-primary/10"
              >
                {quizLoading ? "Đang sinh đề thi..." : "Bắt đầu làm bài"}
                {!quizLoading && <PlayCircle className="h-5 w-5" />}
              </Button>
            )}
          </div>
        )}

        {/* Answering Questions Area */}
        {quizActive && currentQuestion && (
          <div className="flex flex-col gap-6">
            
            {/* Answering Progress */}
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
              <span>Tiến trình làm bài: Câu {currentIdx + 1} / {questions.length}</span>
              <span className="uppercase text-[9px] font-bold px-2 py-0.5 bg-accent/20 text-accent rounded-full border border-accent/20">
                {currentQuestion.type}
              </span>
            </div>

            {/* Core Question Card */}
            <div className="bg-[#0d1321] border border-border p-6 rounded-xl shadow-2xl flex flex-col gap-5">
              <div className="text-base font-bold text-foreground whitespace-pre-line leading-relaxed">
                {currentQuestion.questionText}
              </div>

              {/* Multiple Choice Options / Matching */}
              {(currentQuestion.type === "multiple-choice" || currentQuestion.type === "matching") && currentQuestion.options && (
                <div className="flex flex-col gap-2.5 mt-2">
                  {currentQuestion.options.map((option, idx) => {
                    const isSelected = selectedAnswers[currentQuestion.id] === option;
                    const isSubmitted = answeredSubmitted[currentQuestion.id];
                    const isCorrect = option === currentQuestion.correctAnswer;
                    
                    let btnClass = "bg-muted/10 border-border/80 text-muted-foreground hover:bg-muted/20 hover:text-foreground";
                    if (isSelected) {
                      btnClass = "bg-primary/10 border-primary text-primary font-semibold";
                    }
                    if (isSubmitted) {
                      if (isCorrect) {
                        btnClass = "bg-green-500/10 border-green-500 text-green-400 font-semibold";
                      } else if (isSelected) {
                        btnClass = "bg-red-500/10 border-red-500 text-red-400 font-semibold";
                      } else {
                        btnClass = "opacity-40 bg-muted/5 border-transparent text-muted-foreground";
                      }
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelectChoice(option)}
                        disabled={isSubmitted}
                        className={`w-full text-left p-4 rounded-lg text-xs border transition-all duration-150 flex items-center justify-between gap-3 ${btnClass}`}
                      >
                        <span>{option}</span>
                        {isSubmitted && isCorrect && <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />}
                        {isSubmitted && isSelected && !isCorrect && <XCircle className="h-4 w-4 text-red-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Fill in the blank text box */}
              {currentQuestion.type === "fill-in-blank" && (
                <div className="flex flex-col gap-3 mt-2">
                  <Input
                    type="text"
                    placeholder="Nhập từ tiếng Anh chính xác..."
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                    disabled={answeredSubmitted[currentQuestion.id]}
                    className="h-11"
                  />
                  
                  {answeredSubmitted[currentQuestion.id] && (
                    <div className="text-xs p-3 rounded-lg border flex flex-col gap-1 bg-[#070b13]">
                      <div className="flex items-center gap-1.5 font-bold">
                        {isAnswerCorrect ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-green-400" />
                            <span className="text-green-400">Đáp án chính xác!</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-red-400" />
                            <span className="text-red-400">Sai rồi!</span>
                          </>
                        )}
                      </div>
                      <p className="text-muted-foreground mt-1">Đáp án đúng là: <b className="text-primary">{currentQuestion.correctAnswer}</b></p>
                    </div>
                  )}
                </div>
              )}

              {/* Instant Explanation block */}
              {answeredSubmitted[currentQuestion.id] && (
                <div className="mt-4 p-4 rounded-lg bg-secondary/30 border border-border/80 text-xs text-muted-foreground leading-5">
                  <span className="font-bold text-foreground block mb-1">💡 Giải thích từ AI Coach:</span>
                  {currentQuestion.explanation}
                </div>
              )}
            </div>

            {/* Action buttons */}
            {!answeredSubmitted[currentQuestion.id] ? (
              <Button 
                onClick={handleSubmitAnswer}
                disabled={
                  (currentQuestion.type === "fill-in-blank" && !textAnswer.trim()) ||
                  ((currentQuestion.type === "multiple-choice" || currentQuestion.type === "matching") && !selectedAnswers[currentQuestion.id])
                }
                className="w-full font-bold h-11"
              >
                Kiểm tra đáp án
              </Button>
            ) : (
              <Button 
                onClick={handleNextQuestion}
                className="w-full font-bold h-11 gap-1.5"
              >
                <span>{currentIdx + 1 === questions.length ? "Xem kết quả" : "Câu tiếp theo"}</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}

          </div>
        )}

        {/* Finished Score Card Panel */}
        {quizFinished && (
          <div className="bg-[#0d1321] border border-border p-8 rounded-xl shadow-xl flex flex-col items-center gap-6 text-center">
            <div className="h-16 w-16 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center text-primary">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div>
              <h3 className="text-2xl font-black text-foreground">Hoàn thành bài kiểm tra!</h3>
              <p className="text-sm text-muted-foreground mt-1.5">Bạn đã kết thúc thành công bài thi từ vựng AI.</p>
            </div>

            <div className="bg-secondary/40 border border-border/50 p-5 rounded-xl w-full max-w-sm flex items-center justify-around py-6">
              <div className="text-center">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Điểm số</span>
                <span className="text-3xl font-extrabold text-primary block mt-1">
                  {Math.round((score / questions.length) * 100)}
                </span>
              </div>
              <div className="h-10 w-[1px] bg-border/50" />
              <div className="text-center">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Đáp án đúng</span>
                <span className="text-3xl font-extrabold text-foreground block mt-1">
                  {score} / {questions.length}
                </span>
              </div>
            </div>

            <div className="flex gap-3 w-full max-w-md">
              <Button 
                onClick={handleStartQuiz}
                className="flex-1 font-bold h-11"
              >
                Làm đề thi mới
              </Button>
              <Button 
                onClick={() => setQuizFinished(false)}
                variant="secondary"
                className="flex-1 font-semibold h-11 border border-border"
              >
                Về phòng học
              </Button>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
