import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

import { createSupabaseServerClient } from "@/lib/supabase-server";

const GEMINI_MODEL = "gemini-2.5-flash";

function getApiKey(): string | null {
  return process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || null;
}

// Extract YouTube Video ID from URL
function extractVideoId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

export async function GET(request: NextRequest) {
  // Authenticate request using server session
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

  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Thiếu tham số url" }, { status: 400 });
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    return NextResponse.json({ error: "Định dạng URL YouTube không hợp lệ" }, { status: 400 });
  }

  const apiKey = getApiKey();

  if (!apiKey) {
    return NextResponse.json(
      { error: "Không thể tự động sinh phụ đề: Thiếu cấu hình GEMINI_API_KEY trong hệ thống." },
      { status: 500 }
    );
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    
    const prompt = `
        Act as a professional English caption transcriber.
        For the YouTube video ID "${videoId}" (which is about learning English, productivity, technology, or business),
        generate a high-quality, natural, and highly educational English listening transcript (approximately 200 words).
        Ensure the text contains beautiful vocabulary like 'serendipity', 'resilient', 'eloquent', or 'ephemeral' to make it excellent for English learners.
        
        Output ONLY the plain English transcript text, split into 3-4 readable paragraphs. Do not add any headings, intros, or timestamps.
      `;

    const result = await model.generateContent(prompt);
    const transcript = result.response.text().trim();
    
    return NextResponse.json({
      title: `YouTube Podcast #${videoId}`,
      transcript,
      sourceUrl: url,
      sourceType: "youtube"
    });
  } catch (err) {
    console.error("Lỗi khi sinh transcript bằng Gemini API:", err);
    return NextResponse.json(
      { error: `Lỗi kết nối Gemini AI khi tạo phụ đề: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
