import { GoogleGenerativeAI } from "@google/generative-ai";
import { VocabularyItem, QuizQuestion } from "@/types";

export const isGeminiConfigured = (): boolean => {
  if (typeof window !== "undefined") {
    return true; // Phía client luôn dùng proxy thông qua server
  }
  return !!process.env.GEMINI_API_KEY;
};

async function callProxyOnClient(action: string, args: Record<string, any>) {
  const response = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, args })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Lỗi kết nối Gemini AI: ${action}`);
  }
  return data;
}

function getApiKey(): string | null {
  return process.env.GEMINI_API_KEY || null;
}

export function createGeminiClient() {
  const apiKey = getApiKey();
  if (!apiKey) {
    return null;
  }
  try {
    return new GoogleGenerativeAI(apiKey);
  } catch (error) {
    console.error("Lỗi khởi tạo Gemini client:", error);
    return null;
  }
}

export const GEMINI_MODEL = "gemini-2.5-flash";

// 1. AI Vocabulary Definition Generator
export async function generateVocabularyDefinition(term: string): Promise<{
  term: string;
  ipa: string;
  partOfSpeech: string;
  meaningVi: string;
  example: string;
  exampleVi: string;
  synonyms: string[];
  collocations: string[];
  practicalUsage: string;
}> {
  if (typeof window !== "undefined") {
    return callProxyOnClient("generateVocabularyDefinition", { term });
  }

  const cleanTerm = term.trim().toLowerCase();
  const client = createGeminiClient();
  
  if (!client) {
    throw new Error("Không thể khởi tạo trợ lý dịch thuật: Thiếu cấu hình GEMINI_API_KEY trong hệ thống.");
  }

  try {
    const model = client.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
      You are an expert English lexicographer and Vietnamese translator.
      For the English word "${cleanTerm}", generate a detailed dictionary definition in JSON format.
      The JSON object must contain exactly the following keys:
      {
        "term": "${cleanTerm}",
        "ipa": "the International Phonetic Alphabet pronunciation, e.g. /ˌserənˈdipədē/",
        "partOfSpeech": "noun, verb, adjective, adverb, conjunction, etc.",
        "meaningVi": "clear, beautiful Vietnamese explanation",
        "example": "a natural, practical English example sentence containing this word",
        "exampleVi": "the Vietnamese translation of the example sentence",
        "synonyms": ["array of 3-4 English synonyms"],
        "collocations": ["array of 2-3 common collocations or phrase templates using this word"],
        "practicalUsage": "a short paragraph in Vietnamese explaining exactly how to use this word in real life, common contexts, nuances, or common mistakes to avoid"
      }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text);
  } catch (error) {
    console.error("Lỗi khi gọi Gemini API để dịch từ:", error);
    throw new Error(`Lỗi dịch thuật từ Gemini AI: ${(error as Error).message}`);
  }
}

// 2. AI Quiz Generator
export async function generateQuiz(vocabList: VocabularyItem[]): Promise<QuizQuestion[]> {
  if (typeof window !== "undefined") {
    return callProxyOnClient("generateQuiz", { vocabList });
  }

  const client = createGeminiClient();
  
  if (vocabList.length === 0) {
    return [];
  }

  if (!client) {
    throw new Error("Không thể khởi tạo bài kiểm tra AI: Thiếu cấu hình GEMINI_API_KEY.");
  }

  try {
    const model = client.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: { responseMimeType: "application/json" }
    });

    const vocabData = vocabList.map(v => ({
      term: v.term,
      partOfSpeech: v.partOfSpeech,
      meaningVi: v.meaningVi,
      example: v.example,
      synonyms: v.synonyms
    }));

    const prompt = `
      You are an elite ESL Quiz Builder.
      Based on the following vocabulary list, generate 5 interesting quiz questions in Vietnamese.
      Vocabulary list: ${JSON.stringify(vocabData)}

      The JSON output must be an array of questions:
      [
        {
          "id": "unique-id-1",
          "type": "multiple-choice", 
          "questionText": "Question testing word definition or context",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": "The exact correct option string",
          "explanation": "Brief explanation in Vietnamese of why this is correct"
        },
        {
          "id": "unique-id-2",
          "type": "fill-in-blank",
          "questionText": "Fill in the blank sentence e.g. 'I was so ________ to meet my old friend.' (Hint: tình cờ may mắn)",
          "correctAnswer": "the exact word",
          "explanation": "Brief explanation in Vietnamese"
        }
      ]
      Mix types: "multiple-choice", "fill-in-blank", "matching". Make explanations helpful.
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text);
  } catch (error) {
    console.error("Lỗi khi gọi Gemini API để tạo quiz:", error);
    throw new Error(`Không thể sinh đề trắc nghiệm AI: ${(error as Error).message}`);
  }
}

// 3. AI Speaking Coach Session & Feedback
export async function chatSpeakingCoach(
  persona: "teacher" | "partner" | "interviewer",
  history: { role: "user" | "model"; content: string }[],
  message: string
): Promise<{
  reply: string;
  score: number;
  grammar: string;
  vocabulary: string;
  fluency: string;
}> {
  if (typeof window !== "undefined") {
    return callProxyOnClient("chatSpeakingCoach", { persona, history, message });
  }

  const client = createGeminiClient();

  const prompts = {
    teacher: "You are Ms. Sarah, a warm, extremely supportive ESL teacher. Help correct mistakes gently, keep sentences easy to intermediate, and encourage the student.",
    partner: "You are Alex, an energetic, friendly peer language exchange partner. Keep the tone casual, friendly, use modern idioms, and talk about hobbies, goals, and daily life.",
    interviewer: "You are Mr. Thompson, a professional senior HR manager conducting a job interview in English. Ask realistic career questions, maintain a polite, formal yet encouraging tone, and evaluate career background."
  };

  if (!client) {
    throw new Error("Không thể khởi tạo giáo viên AI: Thiếu cấu hình GEMINI_API_KEY.");
  }

  try {
    const model = client.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: { responseMimeType: "application/json" }
    });

    const formattedHistory = history.map(h => `${h.role === "user" ? "Student" : "Coach"}: ${h.content}`).join("\n");

    const systemPrompt = `
      ${prompts[persona]}
      Your task is to:
      1. Roleplay and respond to the student's latest message: "${message}".
      2. Provide detailed linguistic feedback in Vietnamese on their writing/speaking style.
      
      You must respond in a valid JSON object format containing the exact keys:
      {
        "reply": "Your next conversational speaking response in ENGLISH (2-3 sentences max, keep it interactive and natural)",
        "score": number between 40 and 100 (rating the student's latest message),
        "grammar": "Short advice in Vietnamese analyzing grammatical correctness, highlighting and correcting errors if any",
        "vocabulary": "Short advice in Vietnamese evaluating vocabulary usage and suggesting better lexical choices",
        "fluency": "Short advice in Vietnamese analyzing how natural and fluent the student's phrasing sounds"
      }

      Context conversation history:
      ${formattedHistory}
    `;

    const result = await model.generateContent(systemPrompt);
    const text = result.response.text();
    return JSON.parse(text);
  } catch (error) {
    console.error("Lỗi khi gọi Gemini API Speaking Coach:", error);
    throw new Error(`Lỗi giao tiếp AI Coach: ${(error as Error).message}`);
  }
}

// 4. AI Shadowing Speech Evaluator
export async function evaluateShadowingSpeech(
  originalText: string,
  audioBase64: string // WebM audio file encoded in base64
): Promise<{
  pronunciationScore: number;
  intonationScore: number;
  fluencyScore: number;
  detailedFeedback: string;
}> {
  if (typeof window !== "undefined") {
    return callProxyOnClient("evaluateShadowingSpeech", { originalText, audioBase64 });
  }

  const client = createGeminiClient();

  if (!client) {
    throw new Error("Không thể khởi tạo đánh giá âm thanh AI: Thiếu cấu hình GEMINI_API_KEY.");
  }

  try {
    const model = client.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
      You are an elite English Pronunciation Coach.
      Compare the learner's voice audio recording with the target English text: "${originalText}".
      Analyze their pronunciation, word stress, intonation, and speaking fluency.
      Provide supportive, constructive feedback in Vietnamese.

      You must return a valid JSON object containing exactly the following keys:
      {
        "pronunciationScore": number between 40 and 100,
        "intonationScore": number between 40 and 100,
        "fluencyScore": number between 40 and 100,
        "detailedFeedback": "Comprehensive analysis in Vietnamese giving specific phonics advice and linking tips."
      }
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: audioBase64,
          mimeType: "audio/webm"
        }
      }
    ]);
    const text = result.response.text();
    return JSON.parse(text);
  } catch (error) {
    console.error("Lỗi gọi Gemini AI đánh giá Shadowing:", error);
    throw new Error(`Lỗi chấm điểm giọng nói từ Gemini AI: ${(error as Error).message}`);
  }
}

