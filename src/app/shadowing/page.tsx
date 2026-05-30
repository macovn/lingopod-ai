"use client";

import React, { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useMounted } from "@/hooks/use-mounted";
import { LocalDB } from "@/lib/storage";
import { evaluateShadowingSpeech } from "@/services/gemini";
import { ShadowingRecording, PodcastItem } from "@/types";
import { 
  Mic2, 
  Square, 
  Play, 
  Trash2, 
  Calendar, 
  Volume2,
  Sparkles, 
  Info,
  Clock,
  Save,
  CheckCircle,
  Headphones,
  Award,
  BookOpen,
  Languages,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ShadowingPage() {
  const mounted = useMounted();
  
  // MediaRecorder states
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const durationInterval = useRef<NodeJS.Timeout | null>(null);

  // Database list states
  const [recordings, setRecordings] = useState<ShadowingRecording[]>([]);
  const [podcasts, setPodcasts] = useState<PodcastItem[]>([]);
  const [selectedPodcast, setSelectedPodcast] = useState<PodcastItem | null>(null);
  const [recTitle, setRecTitle] = useState("");
  const [isSaveSuccess, setIsSaveSuccess] = useState(false);

  // AI Evaluation states
  const [aiEvaluating, setAiEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<{
    pronunciationScore: number;
    intonationScore: number;
    fluencyScore: number;
    detailedFeedback: string;
  } | null>(null);

  // Playing audio elements
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioPlayers = useRef<Record<string, HTMLAudioElement | null>>({});

  const loadData = () => {
    const recs = LocalDB.getShadowingRecordings();
    const pods = LocalDB.getPodcasts();
    setRecordings(recs);
    setPodcasts(pods);
    if (pods.length > 0) {
      setSelectedPodcast(pods[0]);
    }
  };

  useEffect(() => {
    if (mounted) {
      loadData();
    }
  }, [mounted]);

  // Clean up duration interval on unmount
  useEffect(() => {
    return () => {
      if (durationInterval.current) clearInterval(durationInterval.current);
    };
  }, []);

  if (!mounted) return null;

  // Start browser audio recorder
  const startRecording = async () => {
    if (typeof window === "undefined" || !navigator.mediaDevices) {
      alert("Trình duyệt không hỗ trợ Media Devices.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        
        // Stop stream tracks
        stream.getTracks().forEach(track => track.stop());
      };

      setAudioBlob(null);
      setAudioUrl("");
      setEvaluationResult(null);
      setRecTitle("Shadowing " + (selectedPodcast ? selectedPodcast.title.substring(0, 15) + "..." : "") + " " + new Date().toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' }));
      
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingDuration(0);

      durationInterval.current = setInterval(() => {
        setRecordingDuration(d => d + 1);
      }, 1000);

    } catch (err) {
      console.error("Lỗi microphone access:", err);
      alert("Vui lòng cấp quyền truy cập Microphone cho trình duyệt để thực hiện Shadowing.");
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }
    }
  };

  // Save voice recording file
  const handleSaveRecording = () => {
    if (!audioUrl || !recTitle.trim()) return;

    LocalDB.saveShadowingRecording({
      title: recTitle.trim(),
      audioUrl: audioUrl,
      durationSeconds: recordingDuration,
      podcastId: selectedPodcast?.id
    });

    setIsSaveSuccess(true);
    setAudioUrl("");
    setAudioBlob(null);
    setRecTitle("");
    loadData();

    setTimeout(() => {
      setIsSaveSuccess(false);
    }, 2000);
  };

  // Delete recording file
  const handleDeleteRecording = (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa bản ghi âm này?")) {
      LocalDB.deleteShadowingRecording(id);
      loadData();
    }
  };

  // Play audio recorder
  const handlePlayRecording = (id: string, url: string) => {
    if (playingId === id) {
      audioPlayers.current[id]?.pause();
      setPlayingId(null);
    } else {
      if (playingId && audioPlayers.current[playingId]) {
        audioPlayers.current[playingId]?.pause();
      }

      if (!audioPlayers.current[id]) {
        const aud = new Audio(url || "/mock-audio.mp3");
        aud.onended = () => setPlayingId(null);
        audioPlayers.current[id] = aud;
      }

      audioPlayers.current[id]?.play().catch(() => {
        console.log("Mock playing audio file:", url);
      });
      setPlayingId(id);
    }
  };

  const handleAiEvaluate = async () => {
    if (!audioBlob || !selectedPodcast) return;
    setAiEvaluating(true);
    setEvaluationResult(null);

    try {
      // Convert audio blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        try {
          const base64data = (reader.result as string).split(",")[1];
          const res = await evaluateShadowingSpeech(selectedPodcast.transcript.substring(0, 300), base64data);
          setEvaluationResult(res);

          // Save AI log usage
          LocalDB.logAiUsage("AI Shadowing Evaluation", 150, 180);
          // Increment user streak
          LocalDB.incrementStreak();
        } catch (err) {
          console.error(err);
          alert(`Lỗi khi chấm điểm Shadowing: ${(err as Error).message}`);
        } finally {
          setAiEvaluating(false);
        }
      };
    } catch (e) {
      console.error(e);
      alert(`Lỗi đọc tệp ghi âm: ${(e as Error).message}`);
      setAiEvaluating(false);
    }
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shadowing Studio V2</h1>
          <p className="text-muted-foreground mt-1">Chuẩn hóa phát âm và luyện ngữ điệu nói. Nhận chấm điểm phản hồi tức thì bằng AI.</p>
        </div>

        {/* Podcast Selector row */}
        <div className="bg-[#0d1321]/50 border border-border p-4 rounded-xl shadow-xl flex flex-col sm:flex-row items-center gap-3 justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Headphones className="h-4 w-4 text-primary" />
            <span>Chọn bài học podcast để bắt đầu shadowing:</span>
          </div>

          <select 
            value={selectedPodcast?.id || ""}
            onChange={(e) => {
              const p = podcasts.find(item => item.id === e.target.value);
              if (p) setSelectedPodcast(p);
            }}
            className="flex h-10 w-full sm:w-80 rounded-md border border-border bg-[#070b13] px-3 py-2 text-sm text-foreground focus-visible:outline-none"
          >
            {podcasts.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          
          {/* Left Block: Transcript target to practice & Microphone recorder */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            
            {/* Podcast original target text block */}
            <div className="bg-[#0d1321] border border-border p-5 rounded-xl shadow-xl flex flex-col gap-3.5">
              <span className="text-[10px] uppercase font-bold tracking-widest text-primary flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                Văn bản luyện đọc gốc (Target Speech Text)
              </span>
              
              {selectedPodcast ? (
                <div className="p-4 rounded-lg bg-secondary/20 border border-border/40 text-sm leading-6 text-foreground italic">
                  “{selectedPodcast.transcript.substring(0, 350)}...”
                </div>
              ) : (
                <div className="text-xs text-muted-foreground text-center py-6">
                  Vui lòng thêm hoặc chọn bài học podcast để lấy văn bản luyện đọc.
                </div>
              )}
            </div>

            {/* Microphone audio recorder panel */}
            <div className="bg-[#0d1321] border border-border p-6 rounded-xl shadow-xl flex flex-col items-center justify-between text-center gap-6 min-h-[35vh]">
              <div className="flex flex-col items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Microphone Recorder</span>
                <h3 className="text-lg font-bold text-foreground">Ghi âm Shadowing của bạn</h3>
              </div>

              {/* Animated ring meter */}
              <div className="relative h-32 w-32 flex items-center justify-center">
                <div className={`absolute inset-0 rounded-full bg-primary/5 border border-border/80 ${isRecording ? "scale-110 border-primary/40 animate-ping opacity-60" : ""}`} />
                <div className={`absolute h-24 w-24 rounded-full bg-[#070b13] border-2 flex flex-col items-center justify-center shadow-inner ${isRecording ? "border-primary shadow-primary/10" : "border-border"}`}>
                  {isRecording ? (
                    <>
                      <Clock className="h-3.5 w-3.5 text-primary animate-pulse mb-0.5" />
                      <span className="text-lg font-black text-primary font-mono">{formatDuration(recordingDuration)}</span>
                    </>
                  ) : (
                    <>
                      <Mic2 className="h-6 w-6 text-muted-foreground mb-1" />
                      <span className="text-[8px] uppercase font-bold text-muted-foreground tracking-wider">Shadowing</span>
                    </>
                  )}
                </div>
              </div>

              {/* Control recorder buttons */}
              <div className="w-full flex justify-center gap-3">
                {isRecording ? (
                  <Button 
                    onClick={stopRecording} 
                    className="bg-red-500 hover:bg-red-600 text-white font-bold gap-2 px-6 h-10 border-none shadow-lg"
                  >
                    <Square className="h-4 w-4 fill-white" />
                    Dừng ghi âm
                  </Button>
                ) : (
                  <Button 
                    onClick={startRecording}
                    className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold gap-2 px-6 h-10 shadow-lg"
                  >
                    <Mic2 className="h-4 w-4" />
                    Bắt đầu nói
                  </Button>
                )}

                {audioUrl && !isRecording && (
                  <Button 
                    onClick={handleAiEvaluate}
                    disabled={aiEvaluating}
                    className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold gap-2 px-5 h-10"
                  >
                    <Sparkles className="h-4 w-4" />
                    {aiEvaluating ? "AI Đang chấm..." : "Đánh giá AI Speech"}
                  </Button>
                )}
              </div>

              {/* Save/Save feedback row */}
              {audioUrl && !isRecording && (
                <div className="w-full border-t border-border/50 pt-4 text-left flex flex-col gap-3">
                  <Input 
                    type="text" 
                    placeholder="Đặt tên bản ghi âm..." 
                    value={recTitle}
                    onChange={(e) => setRecTitle(e.target.value)}
                    className="h-9 text-xs"
                  />
                  <Button onClick={handleSaveRecording} className="w-full text-xs font-bold gap-1.5 py-1.5 h-8">
                    <Save className="h-3.5 w-3.5" />
                    Lưu bản ghi vào thư viện
                  </Button>
                </div>
              )}

              {isSaveSuccess && (
                <div className="w-full mt-2 p-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded text-xs font-semibold flex items-center justify-center gap-1.5">
                  <CheckCircle className="h-4 w-4" />
                  <span>Đã lưu thành công!</span>
                </div>
              )}
            </div>

          </div>

          {/* Right Block: AI Evaluation feedback & Recordings library split */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* AI Speech Score Evaluation display */}
            {evaluationResult && (
              <div className="bg-[#0d1321] border border-primary/20 p-5 rounded-xl shadow-2xl relative flex flex-col gap-4">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2 border-b border-border pb-3">
                  <Award className="h-4 w-4 text-primary animate-bounce" />
                  AI Speech Feedback V2
                </h3>

                {/* Grid scores */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 bg-muted/30 border border-border/80 rounded-lg">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground">Phát âm</span>
                    <span className="text-xl font-black text-foreground block mt-1">{evaluationResult.pronunciationScore}</span>
                  </div>
                  <div className="p-2.5 bg-muted/30 border border-border/80 rounded-lg">
                    <span className="text-[9px] uppercase font-bold text-amber-400">Ngữ điệu</span>
                    <span className="text-xl font-black text-amber-400 block mt-1">{evaluationResult.intonationScore}</span>
                  </div>
                  <div className="p-2.5 bg-muted/30 border border-border/80 rounded-lg">
                    <span className="text-[9px] uppercase font-bold text-accent">Độ trôi chảy</span>
                    <span className="text-xl font-black text-accent block mt-1">{evaluationResult.fluencyScore}</span>
                  </div>
                </div>

                {/* Phonics Feedback text */}
                <div className="flex flex-col gap-1 text-xs">
                  <span className="font-bold text-foreground">💡 Phân tích từ AI Coach:</span>
                  <p className="text-muted-foreground leading-relaxed mt-1 bg-[#070b13] p-3.5 rounded border border-border/40 whitespace-pre-line">
                    {evaluationResult.detailedFeedback}
                  </p>
                </div>
              </div>
            )}

            {/* Recordings playlist library */}
            <div className="bg-[#0d1321] border border-border p-5 rounded-xl shadow-xl flex flex-col justify-between min-h-[30vh]">
              <div className="flex flex-col gap-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 border-b border-border pb-3">
                  <Volume2 className="h-4 w-4 text-primary" />
                  Thư viện ghi âm của bạn
                </h3>

                <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[35vh] pr-1">
                  {recordings.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-12 text-center leading-5">
                      Chưa có bản ghi âm shadowing nào.
                    </p>
                  ) : (
                    recordings.map((rec) => {
                      const isPlaying = playingId === rec.id;
                      return (
                        <div 
                          key={rec.id} 
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30 hover:border-border/60 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <button
                              onClick={() => handlePlayRecording(rec.id, rec.audioUrl)}
                              className={`h-8 w-8 rounded-full flex items-center justify-center border transition-colors ${isPlaying ? "bg-primary/20 border-primary text-primary" : "bg-[#070b13] border-border text-muted-foreground hover:text-foreground"}`}
                            >
                              {isPlaying ? <Volume2 className="h-3.5 w-3.5 animate-pulse" /> : <Play className="h-3.5 w-3.5 fill-current ml-0.5" />}
                            </button>
                            
                            <div>
                              <h4 className="text-[11px] font-bold text-foreground truncate max-w-[120px]">{rec.title}</h4>
                              <div className="flex items-center gap-2 text-[9px] text-muted-foreground mt-0.5">
                                <span className="flex items-center gap-0.5">
                                  <Clock className="h-2.5 w-2.5" />
                                  {formatDuration(rec.durationSeconds)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRecording(rec.id)}
                            className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10 border-none"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
