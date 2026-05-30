"use client";

import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useMounted } from "@/hooks/use-mounted";
import { LocalDB } from "@/lib/storage";
import { generateVocabularyDefinition, isGeminiConfigured } from "@/services/gemini";
import { VocabularyItem, VocabularyStatus } from "@/types";
import { 
  Search, 
  Plus, 
  Sparkles, 
  Trash2, 
  Edit3, 
  Eye, 
  X, 
  BookOpen, 
  CheckCircle,
  HelpCircle,
  PlayCircle,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function VocabularyPage() {
  const mounted = useMounted();
  
  // States
  const [vocabList, setVocabList] = useState<VocabularyItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [posFilter, setPosFilter] = useState<string>("all");
  
  // Modal / Form States
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Form Fields
  const [term, setTerm] = useState("");
  const [ipa, setIpa] = useState("");
  const [partOfSpeech, setPartOfSpeech] = useState("noun");
  const [meaningVi, setMeaningVi] = useState("");
  const [example, setExample] = useState("");
  const [exampleVi, setExampleVi] = useState("");
  const [synonymsText, setSynonymsText] = useState("");
  const [collocationsText, setCollocationsText] = useState("");
  const [practicalUsage, setPracticalUsage] = useState("");
  const [status, setStatus] = useState<VocabularyStatus>("new");

  // Load vocabulary from DB
  const loadVocab = () => {
    const list = LocalDB.getVocabularies();
    setVocabList(list);
  };

  useEffect(() => {
    if (mounted) {
      loadVocab();
    }
  }, [mounted]);

  if (!mounted) return null;

  // Open modal for Create
  const handleOpenCreate = () => {
    setIsEditing(false);
    setEditId(null);
    setTerm("");
    setIpa("");
    setPartOfSpeech("noun");
    setMeaningVi("");
    setExample("");
    setExampleVi("");
    setSynonymsText("");
    setCollocationsText("");
    setPracticalUsage("");
    setStatus("new");
    setModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (item: VocabularyItem) => {
    setIsEditing(true);
    setEditId(item.id);
    setTerm(item.term);
    setIpa(item.ipa);
    setPartOfSpeech(item.partOfSpeech);
    setMeaningVi(item.meaningVi);
    setExample(item.example);
    setExampleVi(item.exampleVi || "");
    setSynonymsText(item.synonyms.join(", "));
    setCollocationsText(item.collocations.join(", "));
    setPracticalUsage(item.practicalUsage || "");
    setStatus(item.status);
    setModalOpen(true);
  };

  // Auto-fill using Gemini AI
  const handleAiAutoFill = async () => {
    if (!term.trim()) return;
    setAiLoading(true);
    try {
      const data = await generateVocabularyDefinition(term);
      setIpa(data.ipa);
      setPartOfSpeech(data.partOfSpeech || "noun");
      setMeaningVi(data.meaningVi);
      setExample(data.example);
      setExampleVi(data.exampleVi);
      setSynonymsText(data.synonyms.join(", "));
      setCollocationsText(data.collocations.join(", "));
      setPracticalUsage(data.practicalUsage || "");
      
      // Log AI Usage
      LocalDB.logAiUsage("Dictionary AI Auto-Fill", 50, 120);
    } catch (e) {
      console.error(e);
      alert(`Lỗi khi dịch từ bằng Gemini AI: ${(e as Error).message}`);
    } finally {
      setAiLoading(false);
    }
  };

  // Form submit handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!term.trim() || !meaningVi.trim()) return;

    const synonyms = synonymsText.split(",").map(s => s.trim()).filter(Boolean);
    const collocations = collocationsText.split(",").map(c => c.trim()).filter(Boolean);

    LocalDB.saveVocabulary({
      id: editId || undefined,
      term: term.trim().toLowerCase(),
      ipa: ipa.trim(),
      partOfSpeech,
      meaningVi: meaningVi.trim(),
      example: example.trim(),
      exampleVi: exampleVi.trim(),
      synonyms,
      collocations,
      practicalUsage: practicalUsage.trim(),
      status
    });

    setModalOpen(false);
    loadVocab();
  };

  // Delete handler
  const handleDelete = (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa từ vựng này khỏi sổ tay?")) {
      LocalDB.deleteVocabulary(id);
      loadVocab();
    }
  };

  // Filter & search calculations
  const filteredList = vocabList.filter(item => {
    const matchesSearch = item.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.meaningVi.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    const matchesPos = posFilter === "all" || item.partOfSpeech === posFilter;

    return matchesSearch && matchesStatus && matchesPos;
  });

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Sổ tay từ vựng</h1>
            <p className="text-muted-foreground mt-1">Lưu trữ từ mới, tra cứu IPA và collocations tiện lợi.</p>
          </div>
          <Button onClick={handleOpenCreate} className="gap-2 font-semibold">
            <Plus className="h-4 w-4" />
            Thêm từ vựng mới
          </Button>
        </div>

        {/* Filters and search row */}
        <div className="grid gap-3 sm:grid-cols-4 bg-[#0d1321]/50 border border-border p-4 rounded-xl shadow-xl">
          {/* Search bar */}
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              type="text" 
              placeholder="Tìm kiếm từ hoặc nghĩa tiếng Việt..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Status filter */}
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex h-10 w-full rounded-md border border-border bg-[#070b13] px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="new">Chưa học (New)</option>
            <option value="learning">Đang học (Learning)</option>
            <option value="mastered">Đã thuộc (Mastered)</option>
          </select>

          {/* Part of Speech filter */}
          <select 
            value={posFilter}
            onChange={(e) => setPosFilter(e.target.value)}
            className="flex h-10 w-full rounded-md border border-border bg-[#070b13] px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">Tất cả loại từ</option>
            <option value="noun">Noun (Danh từ)</option>
            <option value="verb">Verb (Động từ)</option>
            <option value="adjective">Adjective (Tính từ)</option>
            <option value="adverb">Adverb (Trạng từ)</option>
            <option value="phrase">Phrase (Cụm từ)</option>
          </select>
        </div>

        {/* Vocabulary Grid List */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredList.length === 0 ? (
            <div className="sm:col-span-2 lg:col-span-3 text-center py-12 text-muted-foreground bg-[#0d1321]/30 border border-border/50 rounded-xl">
              Không tìm thấy từ vựng nào khớp với bộ lọc của bạn.
            </div>
          ) : (
            filteredList.map((item) => (
              <article 
                key={item.id} 
                className="bg-[#0d1321] border border-border p-5 rounded-xl flex flex-col justify-between hover:border-border/120 hover:bg-[#0d1321]/90 shadow-xl transition-all duration-200"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-foreground">{item.term}</h3>
                      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-[#182235] text-accent uppercase">{item.partOfSpeech}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      item.status === "mastered" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                      item.status === "learning" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                      "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    }`}>
                      {item.status === "mastered" ? "Đã thuộc" : item.status === "learning" ? "Đang học" : "Chưa học"}
                    </span>
                  </div>
                  
                  {item.ipa && <p className="text-xs text-muted-foreground/80 font-mono mt-1">{item.ipa}</p>}
                  
                  <p className="text-sm text-foreground mt-3 font-semibold border-l-2 border-primary pl-2">{item.meaningVi}</p>
                  
                  {item.example && (
                    <div className="mt-3.5 bg-secondary/30 p-2.5 rounded-lg border border-border/40 text-xs">
                      <p className="text-muted-foreground italic">“{item.example}”</p>
                      {item.exampleVi && <p className="text-muted-foreground/75 mt-1">{item.exampleVi}</p>}
                    </div>
                  )}

                  {/* Collocations & Synonyms Preview */}
                  {(item.collocations.length > 0 || item.synonyms.length > 0) && (
                    <div className="mt-3.5 flex flex-wrap gap-2">
                      {item.collocations.slice(0, 2).map((col, cIdx) => (
                        <span key={cIdx} className="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded font-medium border border-border/40">
                          {col}
                        </span>
                      ))}
                      {item.synonyms.slice(0, 2).map((syn, sIdx) => (
                        <span key={sIdx} className="text-[10px] bg-primary/5 text-primary px-2 py-0.5 rounded font-medium border border-primary/10">
                          = {syn}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* V2 AI Practical Usage Display */}
                  {item.practicalUsage && (
                    <div className="mt-3.5 bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/15 text-xs text-muted-foreground leading-relaxed">
                      <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wide block mb-1">💡 Cách dùng thực tế:</span>
                      {item.practicalUsage}
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-border/50 flex items-center justify-end gap-2 text-xs">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="p-1 h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-secondary/50 border-none"
                    onClick={() => handleOpenEdit(item)}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="p-1 h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10 border-none"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </article>
            ))
          )}
        </div>

        {/* Create / Edit inline Modal */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0d1321] border border-border rounded-xl w-full max-w-lg overflow-y-auto max-h-[90vh] shadow-2xl p-6 relative flex flex-col gap-5">
              
              <div className="flex items-center justify-between border-b border-border/80 pb-4">
                <h3 className="text-xl font-bold text-foreground">
                  {isEditing ? "Chỉnh sửa từ vựng" : "Thêm từ vựng mới"}
                </h3>
                <button 
                  onClick={() => setModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* Term and AI Auto Fill */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Từ vựng (Tiếng Anh)</label>
                  <div className="flex gap-2">
                    <Input 
                      type="text" 
                      placeholder="Nhập từ, ví dụ: serendipity" 
                      value={term}
                      onChange={(e) => setTerm(e.target.value)}
                      required
                    />
                    <Button 
                      type="button" 
                      onClick={handleAiAutoFill} 
                      disabled={aiLoading || !term.trim()}
                      className="gap-1.5 shrink-0 bg-primary/20 text-primary border border-primary/20 hover:bg-primary/30"
                    >
                      <Sparkles className="h-4 w-4" />
                      {aiLoading ? "Đang dịch..." : "Dịch AI"}
                    </Button>
                  </div>
                </div>

                {/* IPA and POS row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Phiên âm (IPA)</label>
                    <Input 
                      type="text" 
                      placeholder="/ˌserənˈdipədē/" 
                      value={ipa}
                      onChange={(e) => setIpa(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Từ loại</label>
                    <select 
                      value={partOfSpeech}
                      onChange={(e) => setPartOfSpeech(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-border bg-[#070b13] px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="noun">Noun (Danh từ)</option>
                      <option value="verb">Verb (Động từ)</option>
                      <option value="adjective">Adjective (Tính từ)</option>
                      <option value="adverb">Adverb (Trạng từ)</option>
                      <option value="phrase">Phrase (Cụm từ)</option>
                    </select>
                  </div>
                </div>

                {/* Meaning */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Nghĩa tiếng Việt</label>
                  <Input 
                    type="text" 
                    placeholder="Giải thích nghĩa từ vựng bằng Tiếng Việt" 
                    value={meaningVi}
                    onChange={(e) => setMeaningVi(e.target.value)}
                    required
                  />
                </div>

                {/* Example sentence English & Vietnamese */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Ví dụ tiếng Anh</label>
                  <Input 
                    type="text" 
                    placeholder="We found the little cafe by serendipity." 
                    value={example}
                    onChange={(e) => setExample(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Dịch nghĩa ví dụ</label>
                  <Input 
                    type="text" 
                    placeholder="Chúng tôi đã tìm thấy quán cà phê nhỏ do tình cờ." 
                    value={exampleVi}
                    onChange={(e) => setExampleVi(e.target.value)}
                  />
                </div>

                {/* Synonyms & Collocations */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Từ đồng nghĩa (Cách nhau bởi dấu phẩy)</label>
                  <Input 
                    type="text" 
                    placeholder="fluke, coincidence, luck" 
                    value={synonymsText}
                    onChange={(e) => setSynonymsText(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Cụm từ đi kèm (Cách nhau bởi dấu phẩy)</label>
                  <Input 
                    type="text" 
                    placeholder="pure serendipity, by serendipity" 
                    value={collocationsText}
                    onChange={(e) => setCollocationsText(e.target.value)}
                  />
                </div>

                {/* V2 Practical Usage Textarea */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Cách dùng thực tế (AI phân tích)</label>
                  <textarea
                    rows={3}
                    placeholder="Sắc thái nghĩa, lỗi sai thường gặp khi dùng..."
                    value={practicalUsage}
                    onChange={(e) => setPracticalUsage(e.target.value)}
                    className="w-full bg-[#070b13] border border-border rounded-lg p-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Status */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Trạng thái ghi nhớ</label>
                  <select 
                    value={status}
                    onChange={(e) => setStatus(e.target.value as VocabularyStatus)}
                    className="flex h-10 w-full rounded-md border border-border bg-[#070b13] px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="new">Chưa học (New)</option>
                    <option value="learning">Đang học (Learning)</option>
                    <option value="mastered">Đã thuộc (Mastered)</option>
                  </select>
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-border/80">
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => setModalOpen(false)}
                    className="font-semibold"
                  >
                    Hủy bỏ
                  </Button>
                  <Button type="submit" className="font-semibold">
                    {isEditing ? "Cập nhật từ" : "Thêm vào sổ tay"}
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
