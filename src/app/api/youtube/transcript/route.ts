import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { YoutubeTranscript } from "youtube-transcript";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createRateLimiter } from "@/lib/security";

const GEMINI_MODEL = "gemini-2.5-flash";
const transcriptRateLimiter = createRateLimiter(10, 60_000);

function getApiKey(): string | null {
  return process.env.GEMINI_API_KEY || null;
}

function extractVideoId(inputUrl: string): string | null {
  if (!inputUrl) return null;
  const trimmed = inputUrl.trim();
  
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
}

function isAllowedYoutubeUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    return (
      host === "youtube.com" ||
      host === "www.youtube.com" ||
      host === "m.youtube.com" ||
      host === "youtu.be"
    );
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase server is not configured." }, { status: 500 });
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  let userId = "demo-user-id";
  if (authError || !user) {
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
  } else {
    userId = user.id;
  }

  const rate = transcriptRateLimiter.consume(userId);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please retry later." },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil(rate.retryAfterMs / 1000).toString(),
        },
      }
    );
  }

  const url = request.nextUrl.searchParams.get("url");
  if (!url || url.length > 2048) {
    return NextResponse.json({ error: "Missing or invalid url." }, { status: 400 });
  }

  if (!isAllowedYoutubeUrl(url)) {
    return NextResponse.json({ error: "Only YouTube URLs are allowed." }, { status: 400 });
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    return NextResponse.json({ error: "Invalid YouTube URL format." }, { status: 400 });
  }

  // Try to fetch real subtitles first using youtube-transcript
  try {
    const segments = await YoutubeTranscript.fetchTranscript(videoId);
    if (segments && segments.length > 0) {
      const transcriptLines = segments.map(seg => {
        const startSecs = seg.offset / 1000;
        const mins = Math.floor(startSecs / 60);
        const secs = Math.floor(startSecs % 60);
        const timestamp = `[${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}]`;
        
        // Clean up HTML entities and whitespace
        const cleanText = seg.text
          .replace(/\r?\n/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim();
          
        return `${timestamp} ${cleanText}`;
      });
      
      const finalTranscript = transcriptLines.join("\n");
      
      // Try to fetch the real video title using OEmbed API
      let title = `YouTube Podcast #${videoId}`;
      try {
        const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
        if (oembedRes.ok) {
          const oembedData = await oembedRes.json();
          if (oembedData.title) {
            title = oembedData.title;
          }
        }
      } catch (e) {
        console.warn("Failed to fetch real title from oembed:", e);
      }
      
      return NextResponse.json({
        title,
        transcript: finalTranscript,
        sourceUrl: url,
        sourceType: "youtube",
      });
    }
  } catch (err) {
    console.warn("Real transcript fetch failed, falling back to Gemini AI generation:", err);
  }

  // Fallback to Gemini AI transcript generation if subtitles are unavailable
  const apiKey = getApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "Missing GEMINI_API_KEY server configuration." }, { status: 500 });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const prompt = `
      Act as a professional English caption transcriber.
      For the YouTube video ID "${videoId}" (learning English, productivity, technology, or business),
      generate a natural and educational English listening transcript of around 200 words.
      Output the transcript where each sentence is on a new line and prefixed with its start timestamp in the format [mm:ss], starting at [00:00] and spacing them 3-5 seconds apart.
      Example:
      [00:00] Welcome to LingoPod.
      [00:04] Today we are talking about habits.
      [00:08] Habits are the invisible architecture of daily life.
      Do not include any headings or extra text.
    `;

    const result = await model.generateContent(prompt);
    const transcript = result.response.text().trim();

    return NextResponse.json({
      title: `YouTube Podcast #${videoId}`,
      transcript,
      sourceUrl: url,
      sourceType: "youtube",
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to generate transcript: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
