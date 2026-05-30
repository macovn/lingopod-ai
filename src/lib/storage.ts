import { VocabularyItem, PodcastItem, FlashcardItem, ShadowingRecording, UserProfile, SpeakingSession } from "@/types";
import { createSupabaseBrowserClient } from "@/lib/supabase";

// Key names for LocalStorage
const KEYS = {
  USER: "lingopod_user",
  VOCABULARY: "lingopod_vocabulary",
  PODCASTS: "lingopod_podcasts",
  FLASHCARDS: "lingopod_flashcards",
  SHADOWING: "lingopod_shadowing",
  SPEAKING: "lingopod_speaking",
  AI_USAGE: "lingopod_ai_usage"
};

// Generate user-isolated local storage keys dynamically
function getStorageKey(baseKey: string): string {
  if (typeof window === "undefined") return baseKey;
  if (baseKey === KEYS.USER) return baseKey; // User profile is stored in a global single key to detect logged in user
  
  const userStr = localStorage.getItem(KEYS.USER);
  const userId = userStr ? JSON.parse(userStr).id : "demo-user-id";
  return `${baseKey}_${userId}`;
}

// Background sync helpers
export async function syncToCloud(tableName: string, data: any) {
  if (typeof window === "undefined") return;
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return;
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    
    const syncedData = {
      ...data,
      userId: session.user.id
    };
    
    const { error } = await supabase
      .from(tableName)
      .upsert(syncedData);
      
    if (error) {
      console.error(`Lỗi đồng bộ lên ${tableName}:`, error.message);
    }
  } catch (err) {
    console.error("Lỗi đồng bộ đám mây:", err);
  }
}

export async function deleteFromCloud(tableName: string, id: string) {
  if (typeof window === "undefined") return;
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return;
  
  try {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq("id", id);
      
    if (error) {
      console.error(`Lỗi xóa dữ liệu trên ${tableName}:`, error.message);
    }
  } catch (err) {
    console.error("Lỗi xóa dữ liệu đám mây:", err);
  }
}

// Pull cloud data for fresh login session
export async function pullCloudData() {
  if (typeof window === "undefined") return;
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return;
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    
    const userId = session.user.id;
    
    // Pull Vocabularies
    const { data: vocabList, error: errV } = await supabase
      .from("vocabularies")
      .select("*")
      .eq("userId", userId);
    if (!errV && vocabList && vocabList.length > 0) {
      localStorage.setItem(`${KEYS.VOCABULARY}_${userId}`, JSON.stringify(vocabList));
    }
    
    // Pull Flashcards
    const { data: cardsList, error: errC } = await supabase
      .from("flashcards")
      .select("*")
      .eq("userId", userId);
    if (!errC && cardsList && cardsList.length > 0) {
      localStorage.setItem(`${KEYS.FLASHCARDS}_${userId}`, JSON.stringify(cardsList));
    }
    
    // Pull Podcasts
    const { data: podsList, error: errP } = await supabase
      .from("podcasts")
      .select("*")
      .eq("userId", userId);
    if (!errP && podsList && podsList.length > 0) {
      localStorage.setItem(`${KEYS.PODCASTS}_${userId}`, JSON.stringify(podsList));
    }
    
    // Pull Shadowings
    const { data: shadsList, error: errS } = await supabase
      .from("shadowing_recordings")
      .select("*")
      .eq("userId", userId);
    if (!errS && shadsList && shadsList.length > 0) {
      localStorage.setItem(`${KEYS.SHADOWING}_${userId}`, JSON.stringify(shadsList));
    }
  } catch (err) {
    console.error("Lỗi kéo dữ liệu đám mây:", err);
  }
}

// Initial gorgeous default values
const DEFAULT_USER: UserProfile = {
  id: "demo-user-id",
  name: "Nguyễn Anh Tuấn",
  email: "demo-user@lingopod.ai",
  role: "user",
  streak: 5,
  lastActiveDate: new Date().toISOString().split("T")[0],
  createdAt: new Date().toISOString()
};

const DEFAULT_VOCABULARY: VocabularyItem[] = [
  {
    id: "vocab-1",
    userId: "demo-user-id",
    term: "serendipity",
    ipa: "/ˌserənˈdipədē/",
    partOfSpeech: "noun",
    meaningVi: "sự tình cờ tìm thấy những điều may mắn, thú vị",
    example: "We found the charming little cafe by pure serendipity.",
    exampleVi: "Chúng tôi đã tìm thấy quán cà phê nhỏ xinh xắn đó hoàn toàn do tình cờ may mắn.",
    synonyms: ["fluke", "coincidence", "luck"],
    collocations: ["pure serendipity", "by serendipity"],
    status: "mastered",
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "vocab-2",
    userId: "demo-user-id",
    term: "eloquent",
    ipa: "/ˈeləkwənt/",
    partOfSpeech: "adjective",
    meaningVi: "hùng biện, có khả năng nói/viết lưu loát và cuốn hút",
    example: "She made an eloquent appeal for action on climate change.",
    exampleVi: "Cô ấy đã đưa ra một lời kêu gọi hùng biện cho hành động chống biến đổi khí hậu.",
    synonyms: ["fluent", "expressive", "persuasive"],
    collocations: ["eloquent speech", "eloquent voice"],
    status: "learning",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "vocab-3",
    userId: "demo-user-id",
    term: "ephemeral",
    ipa: "/əˈfemərəl/",
    partOfSpeech: "adjective",
    meaningVi: "phù du, chóng tàn, tồn tại trong thời gian rất ngắn",
    example: "Fame in the internet age is often ephemeral.",
    exampleVi: "Sự nổi tiếng trong thời đại internet thường rất phù du.",
    synonyms: ["transient", "fleeting", "short-lived"],
    collocations: ["ephemeral beauty", "ephemeral nature"],
    status: "new",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "vocab-4",
    userId: "demo-user-id",
    term: "resilient",
    ipa: "/rəˈzilyənt/",
    partOfSpeech: "adjective",
    meaningVi: "kiên cường, có khả năng phục hồi nhanh chóng",
    example: "The community was remarkably resilient after the disaster.",
    exampleVi: "Cộng đồng đã kiên cường một cách đáng kinh ngạc sau thảm họa.",
    synonyms: ["tough", "strong", "hardy"],
    collocations: ["resilient economy", "highly resilient"],
    status: "learning",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const DEFAULT_PODCASTS: PodcastItem[] = [
  {
    id: "pod-1",
    userId: "demo-user-id",
    title: "The Power of Habit & Mindset Change",
    sourceUrl: "https://www.youtube.com/watch?v=w7yG2F_L-sE",
    sourceType: "youtube",
    transcript: "Welcome to LingoPod. Today we are talking about habits. Habits are the invisible architecture of daily life. If you can change your habits, you can change your life. We often think that massive success requires massive action. In reality, it is the tiny, 1% improvements day after day that compound into life-changing results. Let's look at how we can cultivate good habits by understanding the habit loop: cue, craving, response, and reward.",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "pod-2",
    userId: "demo-user-id",
    title: "Exploring the Mysteries of Deep Ocean Life",
    sourceUrl: "https://open.spotify.com/episode/ocean-mysteries",
    sourceType: "spotify",
    transcript: "The deep sea remains one of the final frontiers of human exploration. Below 200 meters, sunlight fades completely, entering the twilight zone. Here, we encounter resilient creatures that have adapted to extreme pressure and near-freezing temperatures. Many ocean organisms use bioluminescence, generating their own beautiful light through serendipity of evolution. Understanding these species helps us appreciate the amazing adaptability of life.",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const DEFAULT_FLASHCARDS: FlashcardItem[] = [
  {
    id: "card-1",
    userId: "demo-user-id",
    vocabularyId: "vocab-1",
    nextReview: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    intervalDays: 7,
    easeFactor: 2.6,
    streak: 3,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "card-2",
    userId: "demo-user-id",
    vocabularyId: "vocab-2",
    nextReview: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // Overdue review
    intervalDays: 1,
    easeFactor: 2.4,
    streak: 1,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "card-3",
    userId: "demo-user-id",
    vocabularyId: "vocab-4",
    nextReview: new Date().toISOString(), // Due today
    intervalDays: 1,
    easeFactor: 2.5,
    streak: 0,
    createdAt: new Date().toISOString()
  }
];

const DEFAULT_SHADOWING: ShadowingRecording[] = [
  {
    id: "rec-1",
    userId: "demo-user-id",
    podcastId: "pod-1",
    title: "Ghi âm Habits - Phần 1",
    audioUrl: "", // Mock blob placeholder
    durationSeconds: 15,
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Helper to check and initialize local storage
export function initializeStorage() {
  if (typeof window === "undefined") return;

  if (!localStorage.getItem(KEYS.USER)) {
    localStorage.setItem(KEYS.USER, JSON.stringify(DEFAULT_USER));
  }

  const vocabKey = getStorageKey(KEYS.VOCABULARY);
  const podcastsKey = getStorageKey(KEYS.PODCASTS);
  const flashcardsKey = getStorageKey(KEYS.FLASHCARDS);
  const shadowingKey = getStorageKey(KEYS.SHADOWING);

  if (!localStorage.getItem(vocabKey)) {
    localStorage.setItem(vocabKey, JSON.stringify(DEFAULT_VOCABULARY));
  }
  if (!localStorage.getItem(podcastsKey)) {
    localStorage.setItem(podcastsKey, JSON.stringify(DEFAULT_PODCASTS));
  }
  if (!localStorage.getItem(flashcardsKey)) {
    localStorage.setItem(flashcardsKey, JSON.stringify(DEFAULT_FLASHCARDS));
  }
  if (!localStorage.getItem(shadowingKey)) {
    localStorage.setItem(shadowingKey, JSON.stringify(DEFAULT_SHADOWING));
  }
}

// Data Getter / Setter Utilities
export const LocalDB = {
  getUser: (): UserProfile => {
    initializeStorage();
    if (typeof window === "undefined") return DEFAULT_USER;
    const user = localStorage.getItem(KEYS.USER);
    return user ? JSON.parse(user) : DEFAULT_USER;
  },

  updateUser: (profile: Partial<UserProfile>): UserProfile => {
    const current = LocalDB.getUser();
    const updated = { ...current, ...profile };
    localStorage.setItem(KEYS.USER, JSON.stringify(updated));
    return updated;
  },

  incrementStreak: (): UserProfile => {
    const user = LocalDB.getUser();
    const todayStr = new Date().toISOString().split("T")[0];
    
    if (user.lastActiveDate !== todayStr) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      
      let newStreak = user.streak;
      if (user.lastActiveDate === yesterdayStr) {
        newStreak += 1;
      } else {
        newStreak = 1;
      }
      
      const updated = LocalDB.updateUser({
        streak: newStreak,
        lastActiveDate: todayStr
      });
      
      // Sync streak to Supabase if logged in
      syncToCloud("profiles", {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        streak: newStreak,
        last_active_date: todayStr
      });
      
      return updated;
    }
    return user;
  },

  getVocabularies: (): VocabularyItem[] => {
    initializeStorage();
    if (typeof window === "undefined") return DEFAULT_VOCABULARY;
    const list = localStorage.getItem(getStorageKey(KEYS.VOCABULARY));
    return list ? JSON.parse(list) : DEFAULT_VOCABULARY;
  },

  saveVocabulary: (item: Omit<VocabularyItem, "id" | "userId" | "createdAt" | "updatedAt"> & { id?: string }): VocabularyItem => {
    const list = LocalDB.getVocabularies();
    const now = new Date().toISOString();
    const activeUser = LocalDB.getUser();
    
    if (item.id) {
      // Edit mode
      const updatedList = list.map(v => {
        if (v.id === item.id) {
          const updatedItem = {
            ...v,
            ...item,
            updatedAt: now
          } as VocabularyItem;
          // Sync to Supabase
          syncToCloud("vocabularies", updatedItem);
          return updatedItem;
        }
        return v;
      });
      localStorage.setItem(getStorageKey(KEYS.VOCABULARY), JSON.stringify(updatedList));
      return updatedList.find(v => v.id === item.id)!;
    } else {
      // Create mode
      const newId = "vocab-" + Math.random().toString(36).substring(2, 9);
      const newItem: VocabularyItem = {
        ...item,
        id: newId,
        userId: activeUser.id,
        createdAt: now,
        updatedAt: now
      };
      const updatedList = [newItem, ...list];
      localStorage.setItem(getStorageKey(KEYS.VOCABULARY), JSON.stringify(updatedList));
      
      // Auto-schedule in Spaced Repetition Flashcards
      LocalDB.createFlashcard(newId);
      
      // Sync to Supabase
      syncToCloud("vocabularies", newItem);
      
      return newItem;
    }
  },

  deleteVocabulary: (id: string): void => {
    const list = LocalDB.getVocabularies();
    const updated = list.filter(v => v.id !== id);
    localStorage.setItem(getStorageKey(KEYS.VOCABULARY), JSON.stringify(updated));
    
    // Clean up corresponding flashcard
    const cards = LocalDB.getFlashcards();
    const updatedCards = cards.filter(c => c.vocabularyId !== id);
    localStorage.setItem(getStorageKey(KEYS.FLASHCARDS), JSON.stringify(updatedCards));
    
    // Sync delete from Supabase
    deleteFromCloud("vocabularies", id);
    const deletedCard = cards.find(c => c.vocabularyId === id);
    if (deletedCard) {
      deleteFromCloud("flashcards", deletedCard.id);
    }
  },

  getPodcasts: (): PodcastItem[] => {
    initializeStorage();
    if (typeof window === "undefined") return DEFAULT_PODCASTS;
    const list = localStorage.getItem(getStorageKey(KEYS.PODCASTS));
    return list ? JSON.parse(list) : DEFAULT_PODCASTS;
  },

  savePodcast: (item: Omit<PodcastItem, "id" | "userId" | "createdAt">): PodcastItem => {
    const list = LocalDB.getPodcasts();
    const newId = "pod-" + Math.random().toString(36).substring(2, 9);
    const activeUser = LocalDB.getUser();
    const newItem: PodcastItem = {
      ...item,
      id: newId,
      userId: activeUser.id,
      createdAt: new Date().toISOString()
    };
    const updated = [newItem, ...list];
    localStorage.setItem(getStorageKey(KEYS.PODCASTS), JSON.stringify(updated));
    
    // Sync to Supabase
    syncToCloud("podcasts", newItem);
    
    return newItem;
  },

  deletePodcast: (id: string): void => {
    const list = LocalDB.getPodcasts();
    const updated = list.filter(p => p.id !== id);
    localStorage.setItem(getStorageKey(KEYS.PODCASTS), JSON.stringify(updated));
    
    // Sync delete from Supabase
    deleteFromCloud("podcasts", id);
  },

  getFlashcards: (): FlashcardItem[] => {
    initializeStorage();
    if (typeof window === "undefined") return DEFAULT_FLASHCARDS;
    const list = localStorage.getItem(getStorageKey(KEYS.FLASHCARDS));
    return list ? JSON.parse(list) : DEFAULT_FLASHCARDS;
  },

  createFlashcard: (vocabId: string): FlashcardItem => {
    const list = LocalDB.getFlashcards();
    const existing = list.find(c => c.vocabularyId === vocabId);
    if (existing) return existing;

    const newId = "card-" + Math.random().toString(36).substring(2, 9);
    const activeUser = LocalDB.getUser();
    const newItem: FlashcardItem = {
      id: newId,
      userId: activeUser.id,
      vocabularyId: vocabId,
      nextReview: new Date().toISOString(),
      intervalDays: 1,
      easeFactor: 2.5,
      streak: 0,
      createdAt: new Date().toISOString()
    };
    
    const updated = [...list, newItem];
    localStorage.setItem(getStorageKey(KEYS.FLASHCARDS), JSON.stringify(updated));
    
    // Sync to Supabase
    syncToCloud("flashcards", newItem);
    
    return newItem;
  },

  reviewFlashcard: (cardId: string, rating: "hard" | "medium" | "easy"): FlashcardItem => {
    const cards = LocalDB.getFlashcards();
    let updatedCard: FlashcardItem | null = null;
    
    const updatedCards = cards.map(card => {
      if (card.id === cardId) {
        // SM-2 Spaced Repetition simplified logic
        let newStreak = card.streak;
        let newEF = card.easeFactor;
        let newInterval = card.intervalDays;

        if (rating === "hard") {
          newStreak = 0;
          newInterval = 1; // reset
          newEF = Math.max(1.3, card.easeFactor - 0.2);
        } else if (rating === "medium") {
          newStreak += 1;
          newInterval = Math.round(card.intervalDays * 1.5);
        } else { // easy
          newStreak += 1;
          newInterval = Math.round(card.intervalDays * 2.5);
          newEF = Math.min(3.0, card.easeFactor + 0.15);
        }

        if (newInterval < 1) newInterval = 1;
        if (newInterval > 365) newInterval = 365;

        const nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

        updatedCard = {
          ...card,
          streak: newStreak,
          easeFactor: Number(newEF.toFixed(2)),
          intervalDays: newInterval,
          nextReview: nextReviewDate.toISOString()
        };

        // Increment vocabulary learning streak
        LocalDB.incrementStreak();

        // Also change status in vocabulary notebook
        const vocabList = LocalDB.getVocabularies();
        const updatedVocabs = vocabList.map(v => {
          if (v.id === card.vocabularyId) {
            let newStatus = v.status;
            if (newStreak >= 3) {
              newStatus = "mastered";
            } else if (newStreak > 0) {
              newStatus = "learning";
            }
            const updatedVocab = { ...v, status: newStatus, updatedAt: new Date().toISOString() };
            // Sync updated vocab status
            syncToCloud("vocabularies", updatedVocab);
            return updatedVocab;
          }
          return v;
        });
        localStorage.setItem(getStorageKey(KEYS.VOCABULARY), JSON.stringify(updatedVocabs));

        // Sync reviewed flashcard to Supabase
        syncToCloud("flashcards", updatedCard);

        return updatedCard;
      }
      return card;
    });

    localStorage.setItem(getStorageKey(KEYS.FLASHCARDS), JSON.stringify(updatedCards));
    return updatedCard!;
  },

  getShadowingRecordings: (): ShadowingRecording[] => {
    initializeStorage();
    if (typeof window === "undefined") return DEFAULT_SHADOWING;
    const list = localStorage.getItem(getStorageKey(KEYS.SHADOWING));
    return list ? JSON.parse(list) : DEFAULT_SHADOWING;
  },

  saveShadowingRecording: (recording: Omit<ShadowingRecording, "id" | "userId" | "createdAt">): ShadowingRecording => {
    const list = LocalDB.getShadowingRecordings();
    const newId = "rec-" + Math.random().toString(36).substring(2, 9);
    const activeUser = LocalDB.getUser();
    const newItem: ShadowingRecording = {
      ...recording,
      id: newId,
      userId: activeUser.id,
      createdAt: new Date().toISOString()
    };
    const updated = [newItem, ...list];
    localStorage.setItem(getStorageKey(KEYS.SHADOWING), JSON.stringify(updated));
    
    // Sync to Supabase
    syncToCloud("shadowing_recordings", newItem);
    
    return newItem;
  },

  deleteShadowingRecording: (id: string): void => {
    const list = LocalDB.getShadowingRecordings();
    const updated = list.filter(r => r.id !== id);
    localStorage.setItem(getStorageKey(KEYS.SHADOWING), JSON.stringify(updated));
    
    // Sync delete from Supabase
    deleteFromCloud("shadowing_recordings", id);
  },

  getSpeakingSessions: (): SpeakingSession[] => {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(getStorageKey(KEYS.SPEAKING));
    return data ? JSON.parse(data) : [];
  },

  saveSpeakingSession: (session: SpeakingSession): void => {
    const list = LocalDB.getSpeakingSessions();
    const index = list.findIndex(s => s.id === session.id);
    
    let updated;
    if (index >= 0) {
      updated = list.map(s => s.id === session.id ? session : s);
    } else {
      updated = [session, ...list];
    }
    localStorage.setItem(getStorageKey(KEYS.SPEAKING), JSON.stringify(updated));
  },

  logAiUsage: (featureName: string, promptTokens: number, completionTokens: number): void => {
    if (typeof window === "undefined") return;
    const logs = localStorage.getItem(getStorageKey(KEYS.AI_USAGE));
    const list = logs ? JSON.parse(logs) : [];
    const activeUser = LocalDB.getUser();
    
    const newLog = {
      id: "ai-" + Math.random().toString(36).substring(2, 9),
      userId: activeUser.id,
      featureName,
      promptTokens,
      completionTokens,
      createdAt: new Date().toISOString()
    };
    
    localStorage.setItem(getStorageKey(KEYS.AI_USAGE), JSON.stringify([newLog, ...list]));
  },

  getAiUsage: (): any[] => {
    if (typeof window === "undefined") return [];
    const logs = localStorage.getItem(getStorageKey(KEYS.AI_USAGE));
    return logs ? JSON.parse(logs) : [];
  }
};
