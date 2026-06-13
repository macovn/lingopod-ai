import { GoogleGenerativeAI } from "@google/generative-ai";
import { VocabularyItem, QuizQuestion, UserProfile } from "@/types";

export const isGeminiConfigured = (): boolean => {
  if (typeof window !== "undefined") {
    return true; // Phía client luôn dùng proxy thông qua server
  }
  return !!process.env.GEMINI_API_KEY;
};

async function callProxyOnClient(action: string, args: Record<string, any>) {
  let userProfile = null;
  if (typeof window !== "undefined") {
    try {
      const { LocalDB } = await import("@/lib/storage");
      userProfile = LocalDB.getUser();
    } catch (e) {
      console.error("Lỗi lấy thông tin profile cho client proxy:", e);
    }
  }

  const response = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, args: { ...args, userProfile } })
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
export async function generateVocabularyDefinition(
  term: string,
  userProfile?: UserProfile
): Promise<{
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
    const name = userProfile?.name || "bạn";
    const level = userProfile?.englishLevel || "intermediate";
    const goal = userProfile?.learningGoal || "business";
    return {
      term: cleanTerm,
      ipa: "/ˌdeməʊˈfaɪl/",
      partOfSpeech: "noun",
      meaningVi: `[Demo Mode] Định nghĩa mẫu cho từ "${cleanTerm}" (Chưa cấu hình GEMINI_API_KEY)`,
      example: `This is a sample learning sentence using the word "${cleanTerm}" customized for ${name} at ${level} level.`,
      exampleVi: `Đây là câu ví dụ mẫu sử dụng từ "${cleanTerm}" được cá nhân hóa cho học viên ${name} ở trình độ ${level}.`,
      synonyms: ["mock", "sample", "test-word"],
      collocations: [`learn ${cleanTerm}`, `master ${cleanTerm}`],
      practicalUsage: `Chào ${name}, bạn đang chạy ứng dụng ở chế độ Local Demo không có GEMINI_API_KEY. AI Profile của bạn đã được nhận diện với trình độ ${level} và mục tiêu ${goal}. Khi có API Key, Gemini AI sẽ tạo định nghĩa và ví dụ chính xác theo đúng hồ sơ này.`
    };
  }

  try {
    const model = client.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: { responseMimeType: "application/json" }
    });

    let personalizationInstructions = "";
    if (userProfile) {
      const levelNames = {
        beginner: "Sơ cấp (Beginner - simple vocabulary, slow/clear explanations, very basic example sentences)",
        intermediate: "Trung cấp (Intermediate - standard vocabulary, natural yet accessible explanations and examples)",
        advanced: "Cao cấp (Advanced - complex/native vocabulary, advanced phrasing, idiomatic expressions)"
      };
      const goalNames = {
        conversation: "Giao tiếp hàng ngày (Everyday Conversation)",
        business: "Công việc/Thương mại (Business/Work)",
        travel: "Du lịch (Travel)",
        exams: "Thi cử (Exams like IELTS/TOEFL/TOEIC)",
        other: "Mục tiêu khác"
      };

      personalizationInstructions = `
      CÁ NHÂN HÓA CHO NGƯỜI DÙNG:
      - Tên người dùng: ${userProfile.name || ""}
      - Trình độ tiếng Anh: ${userProfile.englishLevel ? levelNames[userProfile.englishLevel] : "Trung cấp"}
      - Mục tiêu học tập: ${userProfile.learningGoal ? goalNames[userProfile.learningGoal] : "Tiếng Anh giao tiếp chung"}
      - Sở thích & Quan tâm: ${userProfile.interests?.join(", ") || ""} ${userProfile.hobbies || ""}
      - Tự giới thiệu: ${userProfile.selfIntroduction || ""}

      Yêu cầu cá nhân hóa:
      1. Phần giải thích tiếng Việt "meaningVi" và "practicalUsage" phải viết dễ hiểu, phù hợp với trình độ người học.
      2. QUAN TRỌNG: Câu ví dụ "example" (tiếng Anh) và dịch nghĩa "exampleVi" (tiếng Việt) PHẢI được đặt trong ngữ cảnh liên quan tới sở thích, học tập hoặc công việc của người dùng (ví dụ: nếu họ thích công nghệ/kinh doanh, hãy đặt câu ví dụ trong ngữ cảnh công nghệ/kinh doanh; nếu thích du lịch, hãy đặt trong ngữ cảnh du lịch).
      `;
    }

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

      ${personalizationInstructions}
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
export async function generateQuiz(
  vocabList: VocabularyItem[],
  userProfile?: UserProfile
): Promise<QuizQuestion[]> {
  if (typeof window !== "undefined") {
    return callProxyOnClient("generateQuiz", { vocabList });
  }

  const client = createGeminiClient();
  
  if (vocabList.length === 0) {
    return [];
  }

  if (!client) {
    const level = userProfile?.englishLevel || "intermediate";
    const name = userProfile?.name || "bạn";
    
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
        explanation: `[Demo Mode] Chào ${name}, đây là câu hỏi ôn tập được mô phỏng phù hợp với trình độ ${level} cho từ "${v.term}". Trong chế độ chạy thật, Gemini AI sẽ tạo trắc nghiệm đầy đủ ngữ cảnh cho bạn.`
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

    let personalizationInstructions = "";
    if (userProfile) {
      const levelNames = {
        beginner: "Beginner (Sơ cấp - câu ngắn gọn, cấu trúc ngữ pháp rất đơn giản, từ ngữ dễ hiểu)",
        intermediate: "Intermediate (Trung cấp - câu có cấu trúc thông thường, tự nhiên)",
        advanced: "Advanced (Cao cấp - câu phức tạp, nhiều từ nối, thành ngữ, thử thách hơn)"
      };
      const goalNames = {
        conversation: "Everyday Conversation",
        business: "Business & Professional environment",
        travel: "Travel scenarios",
        exams: "Exam style (IELTS/TOEIC academic contexts)",
        other: "General English"
      };

      personalizationInstructions = `
      CÁ NHÂN HÓA CHO NGƯỜI DÙNG:
      - Trình độ tiếng Anh mục tiêu của câu hỏi: ${userProfile.englishLevel ? levelNames[userProfile.englishLevel] : "Trung cấp"}
      - Ngữ cảnh trọng tâm: ${userProfile.learningGoal ? goalNames[userProfile.learningGoal] : "Tổng quát"}
      - Sở thích & Mối quan tâm: ${userProfile.interests?.join(", ") || ""} ${userProfile.hobbies || ""}

      Yêu cầu cá nhân hóa:
      1. Điều chỉnh độ khó của câu hỏi, đặc biệt là các câu điền vào chỗ trống hoặc câu hỏi tình huống, sao cho phù hợp với trình độ tiếng Anh của người học.
      2. Đặt bối cảnh hoặc nội dung của các câu hỏi (nhất là ví dụ điền từ) xoay quanh sở thích hoặc mục tiêu của họ (ví dụ: bối cảnh công sở nếu học Business, bối cảnh sân bay/khách sạn nếu học Travel).
      `;
    }

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

      ${personalizationInstructions}
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
  message: string,
  userProfile?: UserProfile
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

    const name = userProfile?.name || "there";
    const hobbyText = userProfile?.hobbies ? ` I remember you like "${userProfile.hobbies}".` : "";
    const goalText = userProfile?.learningGoal ? ` Since your goal is "${userProfile.learningGoal}", let's practice corresponding scenarios.` : "";
    
    return {
      reply: `Hi ${name}! I received your message: "${message}". Since you are in Demo Mode (without GEMINI_API_KEY), I am simulating our conversation. ${hobbyText}${goalText} Let's keep practicing!`,
      score: 85,
      grammar: `[Demo Mode] Chào ${userProfile?.name || "bạn"}, câu của bạn: "${message}" có ngữ pháp tốt. Khi bật Gemini AI, tôi sẽ sửa lỗi giới từ, mạo từ và chia thì của bạn.`,
      vocabulary: `[Demo Mode] Từ vựng phù hợp với người học trình độ ${userProfile?.englishLevel || "intermediate"}. Có thể mở rộng thêm các từ đồng nghĩa nâng cao hơn.`,
      fluency: `[Demo Mode] Phản hồi giả lập cho vai trò ${personaNames[persona]} đánh giá độ trôi chảy.`
    };
  }

  try {
    const model = client.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: { responseMimeType: "application/json" }
    });

    const formattedHistory = history.map(h => `${h.role === "user" ? "Student" : "Coach"}: ${h.content}`).join("\n");

    let personalizationInstructions = "";
    if (userProfile) {
      const levelNames = {
        beginner: "Beginner level (use simple sentence structures, common words, speak clearly and avoid overly complex idioms)",
        intermediate: "Intermediate level (use normal natural language, standard vocabulary)",
        advanced: "Advanced level (use rich vocabulary, native idioms, natural pace and complex structures)"
      };

      personalizationInstructions = `
      USER PROFILE INFORMATION:
      - Student Name: ${userProfile.name || "Student"}
      - English Proficiency Level: ${userProfile.englishLevel ? levelNames[userProfile.englishLevel] : "Intermediate level"}
      - Primary Learning Goal: ${userProfile.learningGoal || "General English Improvement"}
      - Hobbies & Interests: ${userProfile.interests?.join(", ") || ""} ${userProfile.hobbies || ""}
      - About the Student: ${userProfile.selfIntroduction || ""}

      Roleplay Adaptations:
      1. Address the student by their name ("${userProfile.name || "Student"}") naturally.
      2. Match the language complexity and sentence length of your response ("reply") to their proficiency level.
      3. Proactively steer the conversation towards topics matching their hobbies, interests, or self-introduction details when appropriate. For Mr. Thompson (Interviewer), tailor questions to their background described in self-introduction.
      `;
    }

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

      ${personalizationInstructions}
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

