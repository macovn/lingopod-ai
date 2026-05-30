import { NextRequest, NextResponse } from "next/server";
import { 
  generateVocabularyDefinition, 
  generateQuiz, 
  chatSpeakingCoach, 
  evaluateShadowingSpeech 
} from "@/services/gemini";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user request using server session
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        return NextResponse.json(
          { error: "Yêu cầu không hợp lệ: Người dùng chưa đăng nhập hệ thống." },
          { status: 401 }
        );
      }
    }

    const { action, args } = await request.json();
    
    if (action === "generateVocabularyDefinition") {
      const res = await generateVocabularyDefinition(args.term);
      return NextResponse.json(res);
    }
    
    if (action === "generateQuiz") {
      const res = await generateQuiz(args.vocabList);
      return NextResponse.json(res);
    }
    
    if (action === "chatSpeakingCoach") {
      const res = await chatSpeakingCoach(args.persona, args.history, args.message);
      return NextResponse.json(res);
    }
    
    if (action === "evaluateShadowingSpeech") {
      const res = await evaluateShadowingSpeech(args.originalText, args.audioBase64);
      return NextResponse.json(res);
    }
    
    return NextResponse.json({ error: "Hành động không hợp lệ" }, { status: 400 });
  } catch (error) {
    console.error("Lỗi API Gemini Proxy:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Đã xảy ra lỗi trên máy chủ" },
      { status: 500 }
    );
  }
}
