export type VocabularyStatus = "new" | "learning" | "mastered";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  streak: number;
  lastActiveDate?: string;
  createdAt: string;
  
  // Các trường cá nhân hóa cho học tập & AI
  englishLevel?: "beginner" | "intermediate" | "advanced";
  learningGoal?: "conversation" | "business" | "travel" | "exams" | "other";
  interests?: string[];
  hobbies?: string;
  selfIntroduction?: string;
}

export interface VocabularyItem {
  id: string;
  userId: string;
  term: string;
  ipa: string;
  partOfSpeech: string;
  meaningVi: string;
  example: string;
  exampleVi?: string;
  synonyms: string[];
  collocations: string[];
  practicalUsage?: string;
  status: VocabularyStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PodcastItem {
  id: string;
  userId: string;
  title: string;
  sourceUrl: string;
  sourceType: "youtube" | "spotify" | "apple" | "other";
  transcript: string;
  createdAt: string;
}

export interface FlashcardItem {
  id: string;
  userId: string;
  vocabularyId: string;
  nextReview: string;
  intervalDays: number;
  easeFactor: number;
  streak: number;
  createdAt: string;
}

export interface ShadowingRecording {
  id: string;
  userId: string;
  podcastId?: string;
  title: string;
  audioUrl: string; // Could be local blob URL or supabase storage URL
  durationSeconds: number;
  createdAt: string;
}

export interface QuizQuestion {
  id: string;
  type: "multiple-choice" | "fill-in-blank" | "matching" | "vocab-review";
  questionText: string;
  options?: string[]; // for multiple choice
  correctAnswer: string;
  explanation: string;
}

export interface QuizSession {
  id: string;
  userId: string;
  score: number;
  totalQuestions: number;
  createdAt: string;
}

export interface SpeakingMessage {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: string;
  feedback?: {
    score: number;
    grammar: string;
    vocabulary: string;
    fluency: string;
  };
}

export interface SpeakingSession {
  id: string;
  userId: string;
  persona: "teacher" | "partner" | "interviewer";
  messages: SpeakingMessage[];
  createdAt: string;
}
