"use client";

import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useMounted } from "@/hooks/use-mounted";
import { LocalDB } from "@/lib/storage";
import { generateVocabularyDefinition } from "@/services/gemini";
import { PodcastItem } from "@/types";
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
  Volume2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function PodcastsPage() {
  const mounted = useMounted();
  const [podcasts, setPodcasts] = useState<PodcastItem[]>([]);
  const [selectedPodcast, setSelectedPodcast] = useState<PodcastItem | null>(null);
  
  // Create Modal States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newTranscript, setNewTranscript] = useState("");
  const [newType, setNewType] = useState<"youtube" | "spotify" | "apple" | "other">("youtube");

  // Transcript Edit State
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [editableTranscript, setEditableTranscript] = useState("");

  // Smart Dictionary State
  const [dictWord, setDictWord] = useState("");
  const [dictData, setDictData] = useState<any>(null);
  const [dictLoading, setDictLoading] = useState(false);
  const [dictSaveSuccess, setDictSaveSuccess] = useState(false);

  // YouTube Intelligence V2 States
  const [ytUrl, setYtUrl] = useState("");
  const [ytLoading, setYtLoading] = useState(false);

  // Load podcasts
  const loadPodcasts = () => {
    const list = LocalDB.getPodcasts();
    setPodcasts(list);
    if (list.length > 0 && !selectedPodcast) {
      setSelectedPodcast(list[0]);
      setEditableTranscript(list[0].transcript);
    }
  };

  useEffect(() => {
    if (mounted) {
      loadPodcasts();
    }
  }, [mounted]);

  if (!mounted) return null;

  // Handle adding new podcast
  const handleCreatePodcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newTranscript.trim()) return;

    const newItem = LocalDB.savePodcast({
      title: newTitle.trim(),
      sourceUrl: newUrl.trim() || "https://youtube.com",
      sourceType: newType,
      transcript: newTranscript.trim()
    });

    setCreateModalOpen(false);
    setNewTitle("");
    setNewUrl("");
    setNewTranscript("");
    
    loadPodcasts();
    setSelectedPodcast(newItem);
    setEditableTranscript(newItem.transcript);
  };

  // Switch podcast selection
  const handleSelectPodcast = (pod: PodcastItem) => {
    setSelectedPodcast(pod);
    setEditableTranscript(pod.transcript);
    setIsEditingTranscript(false);
    setDictWord("");
    setDictData(null);
  };

  // Save edited transcript
  const handleSaveTranscript = () => {
    if (!selectedPodcast) return;
    
    // In local db we just update the specific podcast object
    const list = LocalDB.getPodcasts();
    const updatedList = list.map(p => {
      if (p.id === selectedPodcast.id) {
        return { ...p, transcript: editableTranscript };
      }
      return p;
    });
    localStorage.setItem("lingopod_podcasts", JSON.stringify(updatedList));
    
    setSelectedPodcast({ ...selectedPodcast, transcript: editableTranscript });
    setIsEditingTranscript(false);
    loadPodcasts();
  };

  // Double Click / Selection lookup handler
  const handleTextDoubleClick = async (e: React.MouseEvent) => {
    const selection = window.getSelection()?.toString();
    if (!selection) return;

    // Clean word from punctuations
    const cleanWord = selection.trim().replace(/[^a-zA-Z]/g, "");
    if (!cleanWord || cleanWord.length < 2) return;

    setDictWord(cleanWord);
    setDictLoading(true);
    setDictData(null);
    setDictSaveSuccess(false);

    try {
      const data = await generateVocabularyDefinition(cleanWord);
      setDictData(data);
      // Log AI Usage
      LocalDB.logAiUsage("Smart Dictionary Lookup", 30, 80);
    } catch (err) {
      console.error(err);
      alert(`Lỗi tra cứu từ bằng Gemini AI: ${(err as Error).message}`);
    } finally {
      setDictLoading(false);
    }
  };

  // Save quick-dict word to notebook
  const handleQuickSaveWord = () => {
    if (!dictData) return;

    LocalDB.saveVocabulary({
      term: dictData.term.toLowerCase(),
      ipa: dictData.ipa,
      partOfSpeech: dictData.partOfSpeech,
      meaningVi: dictData.meaningVi,
      example: dictData.example,
      exampleVi: dictData.exampleVi,
      synonyms: dictData.synonyms,
      collocations: dictData.collocations,
      practicalUsage: dictData.practicalUsage,
      status: "new"
    });

    setDictSaveSuccess(true);
    
    // Reset streak active date to encourage streak retention
    LocalDB.incrementStreak();
  };

  // YouTube Auto-Transcript handler V2
  const handleImportYoutubeTranscript = async () => {
    if (!ytUrl.trim()) return;
    setYtLoading(true);
    try {
      const res = await fetch(`/api/youtube/transcript?url=${encodeURIComponent(ytUrl)}`);
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }
      
      // Save podcast
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
      
      // Log AI Usage
      LocalDB.logAiUsage("YouTube Podcast Transcript Fetch", 150, 200);
    } catch (e) {
      console.error(e);
      alert("Không thể trích xuất transcript từ link này.");
    } finally {
      setYtLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Podcast Learning</h1>
            <p className="text-muted-foreground mt-1">Dán transcript, xem video và tra từ thông minh.</p>
          </div>
          <Button onClick={() => setCreateModalOpen(true)} className="gap-2 font-semibold">
            <Plus className="h-4 w-4" />
            Thêm bài Podcast mới
          </Button>
        </div>

        {/* YouTube Import URL Bar */}
        <div className="bg-[#0d1321] border border-border p-4 rounded-xl shadow-xl flex flex-col sm:flex-row gap-3 items-center">
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
            className="flex-1 h-9 text-xs"
          />
          <Button 
            onClick={handleImportYoutubeTranscript}
            disabled={ytLoading || !ytUrl.trim()}
            className="font-bold py-1.5 h-9 shrink-0 gap-1.5 text-xs bg-primary/20 text-primary border border-primary/20 hover:bg-primary/30"
          >
            {ytLoading ? "Đang trích xuất..." : "Trích xuất phụ đề AI"}
          </Button>
        </div>

        {/* Core Layout Split */}
        <div className="grid gap-6 lg:grid-cols-4">
          
          {/* Left Column: Playlist List */}
          <div className="lg:col-span-1 flex flex-col gap-4 bg-[#0d1321]/50 border border-border p-4 rounded-xl shadow-xl h-fit">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Headphones className="h-4 w-4" />
              Danh sách bài học
            </h3>
            
            <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1">
              {podcasts.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">Chưa có bài podcast nào.</p>
              ) : (
                podcasts.map((pod) => (
                  <button
                    key={pod.id}
                    onClick={() => handleSelectPodcast(pod)}
                    className={`
                      w-full text-left p-3 rounded-lg text-xs font-semibold border transition-all duration-200 flex items-start gap-3
                      ${selectedPodcast?.id === pod.id 
                        ? "bg-primary/10 border-primary/20 text-primary shadow" 
                        : "bg-muted/10 border-transparent hover:border-border/60 hover:bg-muted/20 text-muted-foreground hover:text-foreground"
                      }
                    `}
                  >
                    <div className="mt-0.5">
                      {pod.sourceType === "youtube" ? <PlayCircle className="h-4 w-4" /> : <Headphones className="h-4 w-4" />}
                    </div>
                    <span className="truncate flex-1">{pod.title}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right Columns: Transcript & Smart Dictionary */}
          <div className="lg:col-span-3 grid gap-6 md:grid-cols-3">
            
            {/* Transcript Block */}
            <div className="md:col-span-2 bg-[#0d1321] border border-border p-6 rounded-xl shadow-xl flex flex-col justify-between min-h-[60vh]">
              {selectedPodcast ? (
                <div className="flex flex-col gap-5 flex-1 justify-between">
                  <div>
                    {/* Transcript Title header */}
                    <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
                      <div>
                        <h2 className="text-lg font-black text-foreground">{selectedPodcast.title}</h2>
                        <a 
                          href={selectedPodcast.sourceUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-xs text-accent hover:underline mt-1 inline-block truncate max-w-[280px]"
                        >
                          {selectedPodcast.sourceUrl}
                        </a>
                      </div>
                      
                      <div className="flex gap-2">
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
                            }} 
                            variant="secondary"
                            size="sm" 
                            className="gap-1.5 py-1 text-xs border border-border"
                          >
                            <Edit className="h-3.5 w-3.5" />
                            Sửa
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Interactive Text Display */}
                    <div className="mt-5 text-sm leading-7 text-muted-foreground select-text min-h-[40vh]">
                      {isEditingTranscript ? (
                        <textarea
                          value={editableTranscript}
                          onChange={(e) => setEditableTranscript(e.target.value)}
                          className="w-full min-h-[40vh] bg-[#070b13] border border-border rounded-lg p-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      ) : (
                        <div 
                          onDoubleClick={handleTextDoubleClick}
                          className="cursor-pointer bg-muted/10 border border-border/40 p-4 rounded-lg leading-relaxed text-justify hover:border-border/60 transition-colors"
                        >
                          {selectedPodcast.transcript.split("\n").map((para, pIdx) => (
                            <p key={pIdx} className="mb-4 last:mb-0">
                              {para}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {!isEditingTranscript && (
                    <div className="flex items-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
                      <Info className="h-4 w-4 text-accent shrink-0" />
                      <span>💡 <b>Mẹo thông minh:</b> Double-click (nhấp đúp chuột) vào bất kỳ từ nào để tra từ vựng ngay bằng Gemini AI!</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-12">
                  Hãy thêm hoặc chọn một podcast học tập bên cột trái!
                </div>
              )}
            </div>

            {/* Smart Dictionary Popup sidebar */}
            <div className="md:col-span-1 bg-[#0d1321] border border-border p-5 rounded-xl shadow-xl md:sticky md:top-5 md:max-h-[calc(100vh-40px)] md:overflow-y-auto self-start">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 border-b border-border pb-3">
                <BookOpen className="h-4 w-4 text-primary" />
                Từ điển thông minh
              </h3>

              <div className="mt-4">
                {dictLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-xs text-muted-foreground gap-3">
                    <Sparkles className="h-6 w-6 text-primary animate-spin" />
                    <span>Gemini AI đang phân tích...</span>
                  </div>
                ) : dictWord ? (
                  <div className="flex flex-col gap-4">
                    {/* Header word */}
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Từ đang chọn</span>
                      <h4 className="text-xl font-black text-foreground">{dictWord}</h4>
                    </div>

                    {dictData ? (
                      <div className="flex flex-col gap-4 border-t border-border pt-4 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-muted-foreground font-semibold">{dictData.ipa}</span>
                          <span className="uppercase text-[9px] bg-accent/20 text-accent font-bold px-1.5 py-0.5 rounded">{dictData.partOfSpeech}</span>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">Nghĩa tiếng Việt</span>
                          <p className="text-sm text-foreground font-bold mt-1 pl-2 border-l-2 border-primary bg-primary/5 py-1.5 rounded-r">
                            {dictData.meaningVi}
                          </p>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">Ví dụ</span>
                          <p className="text-muted-foreground italic mt-1 bg-muted/20 p-2 rounded">
                            “{dictData.example}”
                          </p>
                          <p className="text-muted-foreground/70 mt-1 pl-1">
                            {dictData.exampleVi}
                          </p>
                        </div>

                        {dictData.collocations?.length > 0 && (
                          <div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Cụm từ hay gặp</span>
                            <div className="flex flex-wrap gap-1.5">
                              {dictData.collocations.map((col: string, cIdx: number) => (
                                <span key={cIdx} className="bg-secondary px-2 py-0.5 rounded text-[10px] text-secondary-foreground border border-border/40">
                                  {col}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* V2 AI Practical Usage Display */}
                        {dictData.practicalUsage && (
                          <div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Cách dùng thực tế</span>
                            <p className="text-[11px] text-muted-foreground leading-relaxed bg-[#070b13] p-2.5 rounded border border-border/40">
                              {dictData.practicalUsage}
                            </p>
                          </div>
                        )}

                        {dictSaveSuccess ? (
                          <div className="mt-2 bg-green-500/10 border border-green-500/20 text-green-400 p-2.5 rounded-lg flex items-center justify-center gap-2 font-semibold">
                            <Check className="h-4 w-4" />
                            Đã lưu vào Notebook!
                          </div>
                        ) : (
                          <Button 
                            onClick={handleQuickSaveWord} 
                            className="mt-2 w-full font-semibold gap-1.5 text-xs py-2 h-9"
                          >
                            <Save className="h-4 w-4" />
                            Lưu nhanh vào sổ tay
                          </Button>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-red-400 mt-2">Không thể tải được thông tin phân tích.</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground/80 py-12 text-center leading-5">
                    Chưa bôi đen từ nào. Hãy <b>double-click</b> vào bất kỳ từ vựng nào trong transcript bên trái để xem giải nghĩa tức thì.
                  </p>
                )}
              </div>
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
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Nội dung Transcript (Dán vào đây)</label>
                  <textarea
                    rows={6}
                    placeholder="Dán toàn bộ văn bản hoặc transcript của podcast vào đây để phục vụ tính năng dịch từ vựng thông minh..."
                    value={newTranscript}
                    onChange={(e) => setNewTranscript(e.target.value)}
                    className="w-full bg-[#070b13] border border-border rounded-lg p-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-border/80">
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => setCreateModalOpen(false)}
                    className="font-semibold"
                  >
                    Hủy bỏ
                  </Button>
                  <Button type="submit" className="font-semibold">
                    Thêm bài học
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
