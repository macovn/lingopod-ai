"use client";

import React, { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useMounted } from "@/hooks/use-mounted";
import { LocalDB } from "@/lib/storage";
import { generateVocabularyDefinition } from "@/services/gemini";
import { PodcastItem, VocabularyItem, VocabularyStatus } from "@/types";
import { 
  Headphones, 
  Plus, 
  PlayCircle, 
  FolderPlus, 
  BookOpen, 
  Save, 
  Edit, 
  Check, 
  Sparkles, 
  Info,
  X,
  FileText,
  Volume2,
  Trash2,
  Lock,
  Unlock,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT: any;
  }
}

interface SentenceItem {
  index: number;
  startTime: number;
  endTime: number;
  text: string;
}

interface YoutubePlayerProps {
  videoId: string;
  onTimeUpdate: (time: number) => void;
  onStateChange: (isPlaying: boolean) => void;
  onPlayerReady: (player: any) => void;
}

const YoutubePlayer = React.memo(({ videoId, onTimeUpdate, onStateChange, onPlayerReady }: YoutubePlayerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    if (!videoId) return;

    let player: any = null;
    let isDestroyed = false;
    let pollInterval: any = null;

    const initPlayer = () => {
      if (isDestroyed) return;
      if (!window.YT || !window.YT.Player || !containerRef.current) return;

      containerRef.current.innerHTML = '<div id="youtube-player-iframe-node" class="w-full h-full"></div>';

      try {
        player = new window.YT.Player("youtube-player-iframe-node", {
          height: "100%",
          width: "100%",
          videoId: videoId.trim(),
          playerVars: {
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
            controls: 1,
          },
          events: {
            onReady: (event: any) => {
              if (isDestroyed) return;
              playerRef.current = event.target;
              onPlayerReady(event.target);
              setIsBlocked(false); // Reset blocking state if loaded successfully
            },
            onStateChange: (event: any) => {
              if (isDestroyed) return;
              const state = event.data;
              if (state === 1) { // 1 means Playing
                onStateChange(true);
              } else {
                onStateChange(false);
              }
            },
            onError: (event: any) => {
              console.error("YouTube Player Error:", event.data);
            }
          }
        });
      } catch (err) {
        console.error("Error creating YT.Player:", err);
      }
    };

    // Set a safety timeout of 5 seconds. If player is not ready by then, flag as blocked (VPN/Adblock issue)
    const timeout = setTimeout(() => {
      if (!playerRef.current && !isDestroyed) {
        setIsBlocked(true);
      }
    }, 5000);

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      pollInterval = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(pollInterval);
          initPlayer();
        }
      }, 100);
    }

    return () => {
      isDestroyed = true;
      clearTimeout(timeout);
      if (pollInterval) clearInterval(pollInterval);
      
      if (player && typeof player.destroy === "function") {
        try {
          player.destroy();
        } catch (e) {
          console.warn("Error destroying player:", e);
        }
      }
      playerRef.current = null;
    };
  }, [videoId, onPlayerReady, onStateChange]);

  useEffect(() => {
    let timeInterval: any = null;
    
    const startTracking = () => {
      if (timeInterval) clearInterval(timeInterval);
      timeInterval = setInterval(() => {
        if (playerRef.current && playerRef.current.getCurrentTime) {
          const time = playerRef.current.getCurrentTime();
          onTimeUpdate(time);
        }
      }, 100);
    };

    const stopTracking = () => {
      if (timeInterval) {
        clearInterval(timeInterval);
        timeInterval = null;
      }
    };

    const statusInterval = setInterval(() => {
      if (playerRef.current && playerRef.current.getPlayerState) {
        const state = playerRef.current.getPlayerState();
        if (state === 1) {
          if (!timeInterval) startTracking();
        } else {
          stopTracking();
        }
      }
    }, 200);

    return () => {
      clearInterval(statusInterval);
      stopTracking();
    };
  }, [onTimeUpdate]);

  return (
    <div className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full" />
      {isBlocked && (
        <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center p-4 text-center gap-3.5 z-10 rounded-xl border border-amber-500/20">
          <Info className="h-8 w-8 text-amber-400 animate-bounce" />
          <div>
            <h4 className="text-sm font-bold text-foreground mb-1">Không thể kết nối trình phát YouTube</h4>
            <p className="text-xs text-muted-foreground max-w-[280px] leading-relaxed">
              Trình duyệt không thể tải API của YouTube. Vui lòng kiểm tra kết nối mạng, tắt VPN hoặc tắt Trình chặn quảng cáo (Adblocker) và tải lại trang.
            </p>
          </div>
          <a
            href={`https://youtube.com/watch?v=${videoId}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs bg-primary/20 text-primary border border-primary/30 px-3.5 py-2 rounded-lg hover:bg-primary/30 transition-all font-bold"
          >
            Xem trực tiếp trên YouTube
          </a>
        </div>
      )}
    </div>
  );
});

YoutubePlayer.displayName = "YoutubePlayer";

export default function PodcastsPage() {
  const mounted = useMounted();
  const [podcasts, setPodcasts] = useState<PodcastItem[]>([]);
  const [selectedPodcast, setSelectedPodcast] = useState<PodcastItem | null>(null);
  
  // Vocabulary state for LingQ-style highlight
  const [vocabList, setVocabList] = useState<VocabularyItem[]>([]);

  // Create Modal States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newTranscript, setNewTranscript] = useState("");
  const [newType, setNewType] = useState<"youtube" | "spotify" | "apple" | "other">("youtube");
  const [createLoading, setCreateLoading] = useState(false);

  // Transcript Edit State
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [editableTranscript, setEditableTranscript] = useState("");
  const [editableTitle, setEditableTitle] = useState("");

  // Smart Dictionary State
  const [dictWord, setDictWord] = useState("");
  const [dictData, setDictData] = useState<any>(null);
  const [dictLoading, setDictLoading] = useState(false);
  const [dictSaveSuccess, setDictSaveSuccess] = useState(false);

  // YouTube Auto-Transcript States
  const [ytUrl, setYtUrl] = useState("");
  const [ytLoading, setYtLoading] = useState(false);

  // YouTube Player States
  const [player, setPlayer] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);

  const activeSentenceRef = useRef<HTMLDivElement | null>(null);

  // Load podcasts
  const loadPodcasts = () => {
    const list = LocalDB.getPodcasts();
    setPodcasts(list);
    if (list.length > 0 && !selectedPodcast) {
      setSelectedPodcast(list[0]);
      setEditableTranscript(list[0].transcript);
      setEditableTitle(list[0].title);
    }
  };

  // Load vocabulary
  const loadVocabList = () => {
    const list = LocalDB.getVocabularies();
    setVocabList(list);
  };

  useEffect(() => {
    if (mounted) {
      loadPodcasts();
      loadVocabList();
    }
  }, [mounted]);

  // Load YouTube Iframe API Script once
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.YT && window.YT.Player) return;

    if (!document.getElementById("youtube-iframe-api-script")) {
      const tag = document.createElement("script");
      tag.id = "youtube-iframe-api-script";
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Extract Video ID helper
  const getYTVideoId = (url: string): string | null => {
    if (!url) return null;
    const trimmed = url.trim();
    
    // First: Standard YouTube ID regex
    const pattern = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?\s]*).*/;
    const match = trimmed.match(pattern);
    if (match && match[2]) {
      const id = match[2].trim();
      if (id.length === 11) return id;
    }
    
    // Fallback: URL searchParams
    try {
      const parsed = new URL(trimmed);
      const v = parsed.searchParams.get("v");
      if (v && v.trim().length === 11) return v.trim();
      
      const paths = parsed.pathname.split("/");
      const last = paths[paths.length - 1];
      if (last && last.trim().length === 11) return last.trim();
    } catch (e) {}
    
    return null;
  };

  // Helper to check for duplicate links
  const isDuplicateLink = (url: string): boolean => {
    if (!url) return false;
    const targetUrl = url.trim().toLowerCase();
    
    // Check standard match first
    const exists = podcasts.some(pod => pod.sourceUrl.trim().toLowerCase() === targetUrl);
    if (exists) return true;
    
    // If it's a YouTube video, check by video ID
    const targetVideoId = getYTVideoId(url);
    if (targetVideoId) {
      const existsVideoId = podcasts.some(pod => {
        const id = getYTVideoId(pod.sourceUrl);
        return id === targetVideoId;
      });
      if (existsVideoId) return true;
    }
    
    return false;
  };

  // YouTube API integration is now fully managed by the memoized YoutubePlayer component to prevent rendering cycles

  // Format seconds to mm:ss helper
  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Parser for transcripts (with and without timestamps)
  const parseTranscript = (text: string): SentenceItem[] => {
    if (!text) return [];

    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    const parsed: SentenceItem[] = [];

    // Regex to detect standard format "[01:23] Hello" or "[00:12.34] Hello"
    const timestampRegex = /^\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]\s*(.*)$/;

    let hasTimestamps = false;
    lines.forEach((line) => {
      if (timestampRegex.test(line)) {
        hasTimestamps = true;
      }
    });

    if (hasTimestamps) {
      lines.forEach((line, idx) => {
        const match = line.match(timestampRegex);
        if (match) {
          const mins = parseInt(match[1], 10);
          const secs = parseInt(match[2], 10);
          const msStr = match[3] || "0";
          const ms = parseInt(msStr.padEnd(3, "0").substring(0, 3), 10) / 1000;
          const startTime = mins * 60 + secs + ms;
          const sentenceText = match[4].trim();
          parsed.push({
            index: idx,
            startTime,
            endTime: startTime + 4, // placeholder, will adjust below
            text: sentenceText
          });
        } else {
          parsed.push({
            index: idx,
            startTime: parsed.length > 0 ? parsed[parsed.length - 1].endTime : 0,
            endTime: (parsed.length > 0 ? parsed[parsed.length - 1].endTime : 0) + 4,
            text: line
          });
        }
      });

      // Set end time of each sentence to start time of the next sentence
      for (let i = 0; i < parsed.length - 1; i++) {
        parsed[i].endTime = parsed[i + 1].startTime;
      }
    } else {
      // Fallback: Split plain text paragraphs into sentences and space them 4s apart
      let sentenceIdx = 0;
      let currentOffset = 0;

      const paragraphs = text.split("\n\n").map(p => p.trim()).filter(Boolean);
      paragraphs.forEach((paragraph) => {
        const sentences = paragraph
          .split(/(?<=[.!?])\s+/)
          .map(s => s.trim())
          .filter(s => s.length > 0);

        sentences.forEach((sentence) => {
          const wordCount = sentence.split(/\s+/).length;
          const duration = Math.max(3, wordCount / 2.5); // at least 3s, otherwise based on word count
          parsed.push({
            index: sentenceIdx,
            startTime: currentOffset,
            endTime: currentOffset + duration,
            text: sentence
          });
          currentOffset += duration;
          sentenceIdx++;
        });
      });
    }

    return parsed;
  };

  const sentences = selectedPodcast ? parseTranscript(selectedPodcast.transcript) : [];

  // Determine active sentence index
  const activeSentenceIndex = sentences.findIndex(
    (s) => currentTime >= s.startTime && currentTime < s.endTime
  );

  // Auto-scroll effect
  useEffect(() => {
    if (autoScroll && activeSentenceIndex !== -1 && activeSentenceRef.current) {
      activeSentenceRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }
  }, [activeSentenceIndex, autoScroll]);

  if (!mounted) return null;

  // Seek Video
  const seekTo = (seconds: number) => {
    if (player && player.seekTo) {
      player.seekTo(seconds, true);
      setCurrentTime(seconds);
      if (player.playVideo) {
        player.playVideo();
      }
    }
  };

  // Handle adding new podcast
  const handleCreatePodcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    if (newUrl.trim() && isDuplicateLink(newUrl)) {
      alert("Podcast này đã được thêm vào, vui lòng thêm vào Podcast khác");
      return;
    }

    let transcriptToSave = newTranscript.trim();

    if (newType === "youtube" && !transcriptToSave) {
      if (!newUrl.trim()) {
        alert("Vui lòng nhập Đường dẫn nguồn URL để trích xuất phụ đề AI.");
        return;
      }
      setCreateLoading(true);
      try {
        const res = await fetch(`/api/youtube/transcript?url=${encodeURIComponent(newUrl.trim())}`);
        const data = await res.json();
        if (data.error) {
          alert(`Lỗi tự động trích xuất phụ đề AI: ${data.error}`);
          setCreateLoading(false);
          return;
        }
        transcriptToSave = data.transcript;
      } catch (err) {
        console.error(err);
        alert("Không thể tự động trích xuất phụ đề AI từ YouTube. Vui lòng dán thủ công.");
        setCreateLoading(false);
        return;
      }
    }

    if (!transcriptToSave) {
      alert("Vui lòng nhập nội dung Transcript.");
      return;
    }

    const newItem = LocalDB.savePodcast({
      title: newTitle.trim(),
      sourceUrl: newUrl.trim() || "https://youtube.com",
      sourceType: newType,
      transcript: transcriptToSave
    });

    setCreateModalOpen(false);
    setCreateLoading(false);
    setNewTitle("");
    setNewUrl("");
    setNewTranscript("");
    
    loadPodcasts();
    setSelectedPodcast(newItem);
    setEditableTranscript(newItem.transcript);
    setEditableTitle(newItem.title);
  };

  // Switch podcast selection
  const handleSelectPodcast = (pod: PodcastItem) => {
    setSelectedPodcast(pod);
    setEditableTranscript(pod.transcript);
    setEditableTitle(pod.title);
    setIsEditingTranscript(false);
    setDictWord("");
    setDictData(null);
    setCurrentTime(0);
    setIsPlaying(false);
  };

  // Save edited transcript and title
  const handleSaveTranscript = () => {
    if (!selectedPodcast) return;
    if (!editableTitle.trim()) {
      alert("Tiêu đề bài học không được để trống.");
      return;
    }
    
    const updated = LocalDB.savePodcast({
      id: selectedPodcast.id,
      title: editableTitle.trim(),
      sourceUrl: selectedPodcast.sourceUrl,
      sourceType: selectedPodcast.sourceType,
      transcript: editableTranscript
    });
    
    setSelectedPodcast(updated);
    setIsEditingTranscript(false);
    loadPodcasts();
  };

  // Delete current podcast
  const handleDeletePodcast = (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa bài học này?")) {
      LocalDB.deletePodcast(id);
      setSelectedPodcast(null);
      loadPodcasts();
    }
  };

  // Gemini Word Lookup
  const lookupWord = async (word: string) => {
    if (!word) return;

    setDictWord(word);
    setDictLoading(true);
    setDictData(null);
    setDictSaveSuccess(false);

    try {
      const data = await generateVocabularyDefinition(word);
      setDictData(data);
      LocalDB.logAiUsage("Smart Dictionary Lookup", 30, 80);
    } catch (err) {
      console.error(err);
      alert(`Lỗi tra cứu từ bằng Gemini AI: ${(err as Error).message}`);
    } finally {
      setDictLoading(false);
    }
  };

  // Double click event on sentence/word
  const handleWordDoubleClick = (e: React.MouseEvent, word: string) => {
    e.stopPropagation();
    lookupWord(word);
  };

  // Standard fallback selection lookup
  const handleTextDoubleClickFallback = async (e: React.MouseEvent) => {
    const selection = window.getSelection()?.toString();
    if (!selection) return;

    const cleanWord = selection.trim().replace(/[^a-zA-Z]/g, "");
    if (!cleanWord || cleanWord.length < 2) return;

    lookupWord(cleanWord);
  };

  // Quick set vocabulary status (Add / Modify in Sổ tay)
  const handleSetStatus = (status: VocabularyStatus) => {
    if (!dictWord) return;

    const existing = vocabList.find(v => v.term.toLowerCase() === dictWord.toLowerCase());
    
    const termToSave = dictData ? dictData.term : dictWord;
    const ipa = dictData ? dictData.ipa : "/.../";
    const partOfSpeech = dictData ? dictData.partOfSpeech : "noun";
    const meaningVi = dictData ? dictData.meaningVi : "Chưa bôi đen/chưa dịch nghĩa";
    const example = dictData ? dictData.example : "";
    const exampleVi = dictData ? dictData.exampleVi : "";
    const synonyms = dictData ? dictData.synonyms : [];
    const collocations = dictData ? dictData.collocations : [];
    const practicalUsage = dictData ? dictData.practicalUsage : "";

    LocalDB.saveVocabulary({
      id: existing?.id,
      term: termToSave.toLowerCase(),
      ipa,
      partOfSpeech,
      meaningVi,
      example,
      exampleVi,
      synonyms,
      collocations,
      practicalUsage,
      status
    });

    loadVocabList();
    setDictSaveSuccess(true);
    setTimeout(() => setDictSaveSuccess(false), 2000);
    LocalDB.incrementStreak();
  };

  // Delete word from vocabulary notebook
  const handleDeleteWord = () => {
    const existing = vocabList.find(v => v.term.toLowerCase() === dictWord.toLowerCase());
    if (existing) {
      LocalDB.deleteVocabulary(existing.id);
      loadVocabList();
      setDictSaveSuccess(false);
    }
  };

  // YouTube Auto-Transcript handler V2
  const handleImportYoutubeTranscript = async () => {
    if (!ytUrl.trim()) return;

    if (isDuplicateLink(ytUrl)) {
      alert("Podcast này đã được thêm vào, vui lòng thêm vào Podcast khác");
      return;
    }

    setYtLoading(true);
    try {
      const res = await fetch(`/api/youtube/transcript?url=${encodeURIComponent(ytUrl)}`);
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }
      
      const newItem = LocalDB.savePodcast({
        title: data.title,
        sourceUrl: data.sourceUrl,
        sourceType: "youtube",
        transcript: data.transcript
      });
      
      setYtUrl("");
      loadPodcasts();
      setSelectedPodcast(newItem);
      setEditableTranscript(newItem.transcript);
      
      LocalDB.logAiUsage("YouTube Podcast Transcript Fetch", 150, 200);
    } catch (e) {
      console.error(e);
      alert("Không thể trích xuất transcript từ link này.");
    } finally {
      setYtLoading(false);
    }
  };

  // Render sentence with word-level LingQ highlights
  const renderSentenceWords = (text: string) => {
    // Split by spaces but preserve whitespaces inside tokens
    const tokens = text.split(/(\s+)/);
    
    return tokens.map((token, idx) => {
      const isWord = /\w+/.test(token);
      if (!isWord) {
        return <span key={idx} className="text-foreground/90">{token}</span>;
      }

      // Clean punctuation
      const cleanWord = token.replace(/[^a-zA-Z]/g, "").toLowerCase();
      if (!cleanWord) {
        return <span key={idx} className="text-foreground/90">{token}</span>;
      }

      // Match status
      const matchedVocab = vocabList.find((v) => v.term.toLowerCase() === cleanWord);
      
      let styleClass = "hover:bg-primary/20 hover:text-primary transition-all rounded px-0.5";
      if (matchedVocab) {
        if (matchedVocab.status === "mastered") {
          styleClass = "border-b-2 border-dashed border-emerald-500 text-emerald-400 hover:bg-emerald-500/10 transition-all rounded px-0.5";
        } else if (matchedVocab.status === "learning") {
          styleClass = "bg-amber-500/10 text-amber-300 border-b border-amber-500/40 hover:bg-amber-500/20 transition-all rounded px-0.5";
        } else if (matchedVocab.status === "new") {
          styleClass = "bg-sky-500/10 text-sky-300 border-b border-sky-500/40 hover:bg-sky-500/20 transition-all rounded px-0.5";
        }
      }

      return (
        <span
          key={idx}
          onDoubleClick={(e) => handleWordDoubleClick(e, cleanWord)}
          className={`cursor-pointer ${styleClass}`}
          title={matchedVocab ? `Đã lưu: ${matchedVocab.meaningVi} (${matchedVocab.status})` : "Nhấp đúp chuột để tra từ thông minh"}
        >
          {token}
        </span>
      );
    });
  };

  const activeVocab = vocabList.find(v => v.term.toLowerCase() === dictWord.toLowerCase());

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 select-none">
        
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-primary via-accent to-violet-400 bg-clip-text text-transparent">
              Podcast English Player
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Đồng bộ Iframe YouTube, cuộn và bắt phụ đề thông minh, tích hợp sổ tay LingQ.
            </p>
          </div>
          <Button onClick={() => setCreateModalOpen(true)} className="gap-2 font-bold shadow-lg shadow-primary/10">
            <Plus className="h-4 w-4" />
            Thêm Podcast
          </Button>
        </div>

        {/* YouTube Import URL Bar */}
        <div className="bg-[#0d1321]/80 backdrop-blur-md border border-border p-4 rounded-xl shadow-xl flex flex-col sm:flex-row gap-3 items-center">
          <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider shrink-0">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            <span>YouTube Auto-Transcript:</span>
          </div>
          <Input 
            type="url" 
            placeholder="Dán link video tiếng Anh YouTube để tự lấy phụ đề transcript AI..." 
            value={ytUrl}
            onChange={(e) => setYtUrl(e.target.value)}
            disabled={ytLoading}
            className="flex-1 h-9 text-xs bg-[#070b13] border-border/80 focus:ring-1"
          />
          <Button 
            onClick={handleImportYoutubeTranscript}
            disabled={ytLoading || !ytUrl.trim()}
            className="font-bold py-1.5 h-9 shrink-0 gap-1.5 text-xs bg-primary/20 text-primary border border-primary/20 hover:bg-primary/30"
          >
            {ytLoading ? "Đang trích xuất..." : "Trích xuất phụ đề AI"}
          </Button>
        </div>

        {/* Core Layout Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Column 1: Playlist Selector (Order 3 on Mobile, Order 1 on Desktop) */}
          <div className="order-3 lg:order-1 lg:col-span-3 flex flex-col gap-4 bg-[#0d1321]/50 border border-border p-4 rounded-xl shadow-xl lg:sticky lg:top-6 max-h-[85vh] overflow-y-auto">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between pb-2 border-b border-border/60">
              <span className="flex items-center gap-2">
                <Headphones className="h-4 w-4 text-primary" />
                Danh sách bài học ({podcasts.length})
              </span>
            </h3>
            
            <div className="flex flex-col gap-2 pr-1">
              {podcasts.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">Chưa có bài podcast nào.</p>
              ) : (
                podcasts.map((pod) => (
                  <div
                    key={pod.id}
                    className={`
                      group w-full p-2.5 rounded-lg border transition-all duration-200 flex items-center justify-between gap-2
                      ${selectedPodcast?.id === pod.id 
                        ? "bg-primary/10 border-primary/20 text-primary shadow" 
                        : "bg-muted/15 border-transparent hover:border-border/60 hover:bg-muted/20 text-muted-foreground hover:text-foreground"
                      }
                    `}
                  >
                    <button
                      onClick={() => handleSelectPodcast(pod)}
                      className="flex-1 text-left text-xs font-semibold truncate flex items-start gap-2.5"
                    >
                      <div className="mt-0.5 shrink-0">
                        {pod.sourceType === "youtube" ? (
                          <PlayCircle className="h-4 w-4 text-primary" />
                        ) : (
                          <Headphones className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <span className="truncate flex-1" title={pod.title}>{pod.title}</span>
                    </button>
                    <button
                      onClick={() => handleDeletePodcast(pod.id)}
                      className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-1 transition-all rounded hover:bg-red-500/10 shrink-0"
                      title="Xóa bài học này"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Column 2: Video Player + Interactive Transcript (Order 1 on Mobile, Order 2 on Desktop) */}
          <div className="order-1 lg:order-2 lg:col-span-6 flex flex-col gap-6 min-h-0">
            
            {/* Sticky Player Frame */}
            {selectedPodcast && getYTVideoId(selectedPodcast.sourceUrl) && (
              <div className="sticky top-0 z-30 bg-[#070b13] pb-4 pt-2 border-b border-border/20 shadow-md">
                <div className="overflow-hidden rounded-xl border border-border shadow-2xl aspect-video bg-black/95 relative w-full">
                  <div className="w-full h-full">
                    <YoutubePlayer
                      videoId={getYTVideoId(selectedPodcast.sourceUrl) || ""}
                      onTimeUpdate={setCurrentTime}
                      onStateChange={setIsPlaying}
                      onPlayerReady={setPlayer}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Main Interactive Transcript Area */}
            <div className="bg-[#0d1321] border border-border p-5 rounded-xl shadow-xl flex flex-col min-h-[55vh]">
              {selectedPodcast ? (
                <div className="flex flex-col gap-5 flex-1">
                  
                  {/* Transcript Header bar */}
                  <div className="flex items-center justify-between gap-4 border-b border-border/80 pb-4">
                    <div className="min-w-0 flex-1">
                      {isEditingTranscript ? (
                        <div className="flex flex-col gap-1 pr-2">
                          <label className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider select-none">Tiêu đề bài học</label>
                          <Input
                            type="text"
                            value={editableTitle}
                            onChange={(e) => setEditableTitle(e.target.value)}
                            className="h-8 text-xs bg-[#070b13] border-border text-foreground font-bold"
                            placeholder="Nhập tiêu đề..."
                          />
                        </div>
                      ) : (
                        <>
                          <h2 className="text-base font-black text-foreground truncate" title={selectedPodcast.title}>{selectedPodcast.title}</h2>
                          <a 
                            href={selectedPodcast.sourceUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-xs text-accent hover:underline mt-1 inline-block truncate max-w-full"
                          >
                            {selectedPodcast.sourceUrl}
                          </a>
                        </>
                      )}
                    </div>
                    
                    <div className="flex gap-2 shrink-0">
                      {/* Auto-Scroll Toggle Button */}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setAutoScroll(!autoScroll)}
                        className={`gap-1.5 py-1 text-xs border border-border/60 ${autoScroll ? "bg-primary/20 text-primary border-primary/20" : ""}`}
                        title="Tự động cuộn trang theo video"
                      >
                        {autoScroll ? <Lock className="h-3.5 w-3.5 text-primary" /> : <Unlock className="h-3.5 w-3.5" />}
                        <span>Auto-Scroll: {autoScroll ? "Bật" : "Tắt"}</span>
                      </Button>

                      {isEditingTranscript ? (
                        <Button 
                          onClick={handleSaveTranscript} 
                          size="sm" 
                          className="gap-1.5 py-1 text-xs"
                        >
                          <Save className="h-3.5 w-3.5" />
                          Lưu
                        </Button>
                      ) : (
                        <Button 
                          onClick={() => {
                            setIsEditingTranscript(true);
                            setEditableTranscript(selectedPodcast.transcript);
                            setEditableTitle(selectedPodcast.title);
                          }} 
                          variant="secondary"
                          size="sm" 
                          className="gap-1.5 py-1 text-xs border border-border/60"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          Sửa
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Transcript Content display */}
                  <div className="mt-2 text-sm select-text flex-1">
                    {isEditingTranscript ? (
                      <textarea
                        value={editableTranscript}
                        onChange={(e) => setEditableTranscript(e.target.value)}
                        className="w-full min-h-[45vh] bg-[#070b13] border border-border rounded-lg p-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Định dạng timestamps: [mm:ss] Văn bản câu..."
                      />
                    ) : (
                      <div 
                        onDoubleClick={handleTextDoubleClickFallback}
                        className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1"
                      >
                        {sentences.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-10">Bài học này chưa có phụ đề.</p>
                        ) : (
                          sentences.map((sentence) => {
                            const isActive = sentence.index === activeSentenceIndex;
                            return (
                              <div
                                key={sentence.index}
                                ref={isActive ? activeSentenceRef : null}
                                onClick={() => seekTo(sentence.startTime)}
                                className={`
                                  p-2.5 rounded-lg transition-all duration-300 cursor-pointer border flex items-start gap-3
                                  ${isActive
                                    ? "bg-primary/10 border-primary/20 text-foreground font-semibold shadow-sm"
                                    : "bg-transparent border-transparent hover:bg-muted/10 text-muted-foreground hover:text-foreground/90"
                                  }
                                `}
                              >
                                <span className="text-[10px] font-mono text-muted-foreground/60 mt-1 shrink-0 select-none">
                                  [{formatTime(sentence.startTime)}]
                                </span>
                                <span className="leading-relaxed flex-1">
                                  {renderSentenceWords(sentence.text)}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>

                  {!isEditingTranscript && (
                    <div className="flex items-center gap-2 border-t border-border/80 pt-4 text-[11px] text-muted-foreground">
                      <Info className="h-3.5 w-3.5 text-accent shrink-0" />
                      <span>💡 <b>Mẹo:</b> Click một câu để tua video tới đó; <b>Double-click</b> một từ để tra từ điển AI và tô màu LingQ.</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-12">
                  Hãy thêm hoặc chọn một podcast học tập bên cột trái!
                </div>
              )}
            </div>
          </div>

          {/* Column 3: Smart Dictionary Sidebar (Order 2 on Mobile, Order 3 on Desktop) */}
          <div className="order-2 lg:order-3 lg:col-span-3 bg-[#0d1321] border border-border p-5 rounded-xl shadow-xl lg:sticky lg:top-6 max-h-[85vh] overflow-y-auto self-start">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 border-b border-border/60 pb-3">
              <BookOpen className="h-4 w-4 text-primary" />
              Từ điển thông minh (LingQ)
            </h3>

            <div className="mt-4">
              {dictLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-xs text-muted-foreground gap-3">
                  <Sparkles className="h-6 w-6 text-primary animate-spin" />
                  <span>Gemini AI đang dịch...</span>
                </div>
              ) : dictWord ? (
                <div className="flex flex-col gap-4">
                  
                  {/* Selected Word Header & Vocab notebook status */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">Từ đang tra</span>
                      <h4 className="text-xl font-black text-foreground tracking-tight select-text">{dictWord}</h4>
                    </div>
                    
                    {activeVocab && (
                      <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-black border tracking-wider
                        ${activeVocab.status === "mastered" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : ""}
                        ${activeVocab.status === "learning" ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : ""}
                        ${activeVocab.status === "new" ? "bg-sky-500/10 border-sky-500/20 text-sky-400" : ""}
                      `}>
                        {activeVocab.status === "mastered" ? "Đã thuộc" : activeVocab.status === "learning" ? "Đang học" : "Chưa học"}
                      </span>
                    )}
                  </div>

                  {/* Vocabulary Status Quick Toggle Buttons */}
                  <div className="border-t border-b border-border/40 py-3 my-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-2">Trạng thái từ vựng (LingQ)</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        onClick={() => handleSetStatus("new")}
                        className={`text-[10px] py-1 rounded font-bold border transition-all duration-150
                          ${activeVocab?.status === "new" 
                            ? "bg-sky-500/20 border-sky-500/30 text-sky-300" 
                            : "bg-muted/10 border-transparent hover:border-border/60 text-muted-foreground hover:text-foreground"
                          }
                        `}
                      >
                        Chưa học
                      </button>
                      <button
                        onClick={() => handleSetStatus("learning")}
                        className={`text-[10px] py-1 rounded font-bold border transition-all duration-150
                          ${activeVocab?.status === "learning" 
                            ? "bg-amber-500/20 border-amber-500/30 text-amber-300" 
                            : "bg-muted/10 border-transparent hover:border-border/60 text-muted-foreground hover:text-foreground"
                          }
                        `}
                      >
                        Đang học
                      </button>
                      <button
                        onClick={() => handleSetStatus("mastered")}
                        className={`text-[10px] py-1 rounded font-bold border transition-all duration-150
                          ${activeVocab?.status === "mastered" 
                            ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300" 
                            : "bg-muted/10 border-transparent hover:border-border/60 text-muted-foreground hover:text-foreground"
                          }
                        `}
                      >
                        Đã thuộc
                      </button>
                    </div>
                  </div>

                  {dictData ? (
                    <div className="flex flex-col gap-4 text-xs select-text">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-muted-foreground font-semibold">{dictData.ipa}</span>
                        <span className="uppercase text-[9px] bg-accent/20 text-accent font-bold px-1.5 py-0.5 rounded">{dictData.partOfSpeech}</span>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Nghĩa tiếng Việt</span>
                        <p className="text-sm text-foreground font-bold mt-1 pl-2.5 border-l-2 border-primary bg-primary/5 py-1.5 rounded-r">
                          {dictData.meaningVi}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Ví dụ thực tế</span>
                        <p className="text-muted-foreground italic mt-1 bg-muted/20 p-2.5 rounded border border-border/20 leading-relaxed">
                          “{dictData.example}”
                        </p>
                        {dictData.exampleVi && (
                          <p className="text-muted-foreground/75 mt-1 pl-1 text-[11px]">
                            {dictData.exampleVi}
                          </p>
                        )}
                      </div>

                      {dictData.collocations?.length > 0 && (
                        <div>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Cụm từ hay gặp</span>
                          <div className="flex flex-wrap gap-1.5">
                            {dictData.collocations.map((col: string, cIdx: number) => (
                              <span key={cIdx} className="bg-[#070b13] px-2 py-0.5 rounded text-[10px] text-muted-foreground border border-border/60">
                                {col}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {dictData.practicalUsage && (
                        <div>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Cách dùng thực tế</span>
                          <p className="text-[11px] text-muted-foreground leading-relaxed bg-[#070b13] p-2.5 rounded border border-border/40">
                            {dictData.practicalUsage}
                          </p>
                        </div>
                      )}

                      <div className="flex gap-2 border-t border-border/40 pt-3">
                        {activeVocab && (
                          <Button
                            onClick={handleDeleteWord}
                            variant="ghost"
                            size="sm"
                            className="flex-1 text-xs gap-1.5 h-8 font-semibold py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Xóa sổ tay
                          </Button>
                        )}

                        {dictSaveSuccess && (
                          <div className="flex-1 bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] h-8 rounded flex items-center justify-center gap-1 font-bold animate-pulse">
                            <Check className="h-3.5 w-3.5" />
                            Đồng bộ LingQ!
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-red-400 mt-2">Không thể tải thông tin giải nghĩa từ.</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground/80 py-12 text-center leading-5 select-none">
                  Chưa bôi đen từ nào. Hãy <b>double-click (nhấp đúp)</b> vào bất kỳ từ vựng nào trong transcript để xem giải nghĩa tức thì.
                </p>
              )}
            </div>
          </div>

        </div>

        {/* Create Podcast Dialog Inline */}
        {createModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0d1321] border border-border rounded-xl w-full max-w-lg overflow-y-auto max-h-[90vh] shadow-2xl p-6 relative flex flex-col gap-5">
              
              <div className="flex items-center justify-between border-b border-border/80 pb-4">
                <h3 className="text-xl font-bold text-foreground">
                  Thêm bài học Podcast mới
                </h3>
                <button 
                  onClick={() => setCreateModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreatePodcast} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Tiêu đề bài học</label>
                  <Input 
                    type="text" 
                    placeholder="Ví dụ: Daily English conversation about climate" 
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                    className="bg-[#070b13]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Nguồn Podcast</label>
                    <select 
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as any)}
                      className="flex h-10 w-full rounded-md border border-border bg-[#070b13] px-3 py-2 text-sm text-foreground focus-visible:outline-none"
                    >
                      <option value="youtube">YouTube Video</option>
                      <option value="spotify">Spotify Podcast</option>
                      <option value="apple">Apple Podcast</option>
                      <option value="other">Tải lên / File khác</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Đường dẫn nguồn URL</label>
                    <Input 
                      type="url" 
                      placeholder="https://youtube.com/watch?..." 
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      className="bg-[#070b13]"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                    Nội dung Transcript (Dán vào đây) {newType === "youtube" && <span className="text-[10px] text-primary/80 lowercase italic font-normal">(Không bắt buộc)</span>}
                  </label>
                  <textarea
                    rows={6}
                    placeholder={newType === "youtube" ? "💡 Đối với YouTube, để trống mục này hệ thống sẽ tự động dùng AI trích xuất phụ đề đồng bộ mốc thời gian..." : "Dán toàn bộ văn bản hoặc transcript có sẵn (Có thể chứa hoặc không chứa timestamp dạng [mm:ss])"}
                    value={newTranscript}
                    onChange={(e) => setNewTranscript(e.target.value)}
                    disabled={createLoading}
                    className="w-full bg-[#070b13] border border-border rounded-lg p-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {newType === "youtube" && (
                    <span className="text-[10px] text-primary/80">💡 <b>Mẹo:</b> Nhập tiêu đề + link YouTube, để trống mục này để hệ thống tự động làm hết mọi thứ cho bạn.</span>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-border/80">
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => setCreateModalOpen(false)}
                    disabled={createLoading}
                    className="font-semibold"
                  >
                    Hủy bỏ
                  </Button>
                  <Button type="submit" disabled={createLoading} className="font-semibold gap-2">
                    {createLoading ? "Đang trích xuất phụ đề..." : "Thêm bài học"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
