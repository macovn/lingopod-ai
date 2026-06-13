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
    return {
      term: cleanTerm,
      ipa: "/ˌdeməʊˈfaɪl/",
      partOfSpeech: "noun",
      meaningVi: `[Demo Mode] Định nghĩa mẫu cho từ "${cleanTerm}" (Chưa cấu hình GEMINI_API_KEY)`,
      example: `This is a sample learning sentence using the word "${cleanTerm}".`,
      exampleVi: `Đây là câu ví dụ mẫu sử dụng từ "${cleanTerm}" trong chế độ thử nghiệm.`,
      synonyms: ["mock", "sample", "test-word"],
      collocations: [`learn ${cleanTerm}`, `master ${cleanTerm}`],
      practicalUsage: "Bạn đang chạy ứng dụng ở chế độ Local Demo không có GEMINI_API_KEY. Khi điền khoá API Key hợp lệ vào file .env.local, Gemini AI sẽ tự động tra cứu, phiên âm IPA, dịch nghĩa tiếng Việt và phân tích ngữ cảnh thực tế cho bất kỳ từ vựng nào bạn yêu cầu."
    };
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
    const mockQuestions: QuizQuestion[] = vocabList.slice(0, 3).map((v, index) => {
      const type = index === 0 ? "multiple-choice" : index === 1 ? "fill-in-blank" : "matching";
      return {
        id: `mock-quiz-${index}-${Math.random().toString(36).substring(2, 5)}`,
        type,
        questionText: type === "multiple-choice" 
          ? `Từ nào sau đây có nghĩa là: "${v.meaningVi}"?`
          : type === "fill-in-blank"
            ? `Điền vào ô trống: "She gave a very ________ presentation to the client." (Gợi ý: ${v.term} - ${v.meaningVi})`
            : `Ghép từ "${v.term}" với nghĩa tiếng Việt phù hợp nhất:`,
        options: type === "multiple-choice"
          ? [v.term, "ephemeral", "eloquent", "resilient"].filter((value, idx, self) => self.indexOf(value) === idx).slice(0, 4)
          : type === "matching"
            ? [v.meaningVi, "sự tình cờ", "chóng tàn, phù du", "kiên cường"]
            : undefined,
        correctAnswer: type === "multiple-choice" 
          ? v.term 
          : type === "fill-in-blank" 
            ? v.term 
            : v.meaningVi,
        explanation: `[Demo Mode] Đây là lời giải mẫu cho từ "${v.term}". Trong chế độ chạy thật, Gemini AI sẽ phân tích từ vựng bạn đã lưu để tự động sinh các câu hỏi đa dạng kèm giải thích ngữ pháp chi tiết.`
      };
    });
    
    if (mockQuestions.length === 0) {
      mockQuestions.push({
        id: "mock-quiz-default",
        type: "multiple-choice",
        questionText: "Từ nào sau đây mang nghĩa là 'tình cờ tìm thấy điều may mắn' (serendipity)?",
        options: ["serendipity", "ephemeral", "eloquent", "resilient"],
        correctAnswer: "serendipity",
        explanation: "Serendipity nghĩa là sự tình cờ tìm thấy những điều may mắn, thú vị. Đây là câu hỏi mẫu ở chế độ Local Demo."
      });
    }
    return mockQuestions;
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
    const personaNames = {
      teacher: "Ms. Sarah (Teacher)",
      partner: "Alex (Language Partner)",
      interviewer: "Mr. Thompson (Interviewer)"
    };
    
    return {
      reply: `Hello! I received your message: "${message}". Since you are in Demo Mode (without GEMINI_API_KEY), I am simulated to keep the conversation flowing. How are you doing today?`,
      score: 85,
      grammar: `[Demo Mode] Bạn đã viết: "${message}". Câu của bạn ngữ pháp khá tốt. Khi cấu hình GEMINI_API_KEY, tôi sẽ phân tích chi tiết lỗi chia động từ, giới từ, mạo từ của bạn tại đây.`,
      vocabulary: "[Demo Mode] Từ vựng của bạn rõ ràng, dễ hiểu. Bạn có thể sử dụng thêm các từ nối để câu nói tự nhiên hơn.",
      fluency: `[Demo Mode] Nhận xét độ trôi chảy giả lập cho vai trò ${personaNames[persona]}.`
    };
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
    return {
      pronunciationScore: 88,
      intonationScore: 85,
      fluencyScore: 90,
      detailedFeedback: `[Demo Mode] Bạn đã luyện đọc câu: "${originalText}". Phát âm của bạn được đánh giá đạt 88%. Lưu ý các âm cuối (ending sounds) và nối âm giữa các từ. Khi cấu hình GEMINI_API_KEY, tôi sẽ nghe file ghi âm của bạn và chỉ ra chi tiết từ nào đọc sai, cần cải thiện âm nào.`
    };
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

