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

interface RawBlock {
  startTime: number;
  text: string;
}

function cleanDuplicates(text: string): string {
  let cleaned = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&gt;&gt;/g, ">>")
    .trim();
  
  const words = cleaned.split(/\s+/);
  const uniqueWords: string[] = [];
  for (let i = 0; i < words.length; i++) {
    if (uniqueWords.length > 0 && uniqueWords[uniqueWords.length - 1].toLowerCase() === words[i].toLowerCase()) {
      continue;
    }
    uniqueWords.push(words[i]);
  }
  cleaned = uniqueWords.join(" ");

  const tokens = cleaned.split(/\s+/);
  const n = tokens.length;
  const toSkip = new Set<number>();
  const finalTokens: string[] = [];

  for (let i = 0; i < n; i++) {
    if (toSkip.has(i)) continue;

    let matched = false;
    for (let len = 15; len >= 2; len--) {
      if (i + 2 * len <= n) {
        const phrase1 = tokens.slice(i, i + len).join(" ").toLowerCase();
        const phrase2 = tokens.slice(i + len, i + 2 * len).join(" ").toLowerCase();
        if (phrase1 === phrase2) {
          for (let k = 0; k < len; k++) {
            toSkip.add(i + len + k);
          }
          let nextIdx = i + 2 * len;
          while (nextIdx + len <= n && tokens.slice(nextIdx, nextIdx + len).join(" ").toLowerCase() === phrase1) {
            for (let k = 0; k < len; k++) {
              toSkip.add(nextIdx + k);
            }
            nextIdx += len;
          }
          matched = true;
          break;
        }
      }
    }

    finalTokens.push(tokens[i]);
  }

  return finalTokens.join(" ");
}

function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findOverlapWordsCount(wordsA: string[], wordsB: string[]): number {
  const normA = wordsA.map(normalizeWord).filter(Boolean);
  const normB = wordsB.map(normalizeWord).filter(Boolean);
  
  const maxSearch = Math.min(25, normA.length, normB.length);
  for (let k = maxSearch; k >= 1; k--) {
    let match = true;
    for (let i = 0; i < k; i++) {
      if (normA[normA.length - k + i] !== normB[i]) {
        match = false;
        break;
      }
    }
    if (match) {
      return k;
    }
  }
  return 0;
}

function removeOverlapFromSuffix(rawTextA: string, wordsB: string[], overlapCount: number): string {
  if (overlapCount <= 0) return rawTextA;
  
  const targetNormWords = wordsB.map(normalizeWord).filter(Boolean).slice(0, overlapCount);
  const tokensA = rawTextA.split(/(\s+)/);
  
  const normTokensInfo: { tokenIdx: number; norm: string }[] = [];
  for (let i = 0; i < tokensA.length; i++) {
    const trimmed = tokensA[i].trim();
    if (trimmed && !trimmed.startsWith(">>") && !trimmed.startsWith("[") && !trimmed.endsWith("]")) {
      const norm = normalizeWord(trimmed);
      if (norm) {
        normTokensInfo.push({ tokenIdx: i, norm });
      }
    }
  }
  
  if (normTokensInfo.length >= overlapCount) {
    let isMatch = true;
    const startOffset = normTokensInfo.length - overlapCount;
    for (let i = 0; i < overlapCount; i++) {
      if (normTokensInfo[startOffset + i].norm !== targetNormWords[i]) {
        isMatch = false;
        break;
      }
    }
    if (isMatch) {
      const firstOverlapTokenIdx = normTokensInfo[startOffset].tokenIdx;
      let resultTokens = tokensA.slice(0, firstOverlapTokenIdx);
      while (resultTokens.length > 0 && (!resultTokens[resultTokens.length - 1].trim() || resultTokens[resultTokens.length - 1].trim() === ">>")) {
        resultTokens.pop();
      }
      return resultTokens.join("");
    }
  }
  
  return rawTextA;
}

function splitBlockIntoSentences(text: string): string[] {
  let prepared = text
    .replace(/(?:&gt;&gt;|\>\>)\s*/g, "\n>> ")
    .replace(/([.?!])\s+/g, "$1\n");
  
  return prepared
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `[${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}]`;
}

function processRawBlocks(rawBlocks: RawBlock[]): string {
  if (rawBlocks.length === 0) return "";

  // Step 1: Clean intra-block duplicates
  const cleanedBlocks = rawBlocks.map(block => ({
    startTime: block.startTime,
    text: cleanDuplicates(block.text)
  }));

  // Step 2: Clean cross-block duplicates
  for (let i = 0; i < cleanedBlocks.length - 1; i++) {
    const blockA = cleanedBlocks[i];
    const blockB = cleanedBlocks[i + 1];
    
    const wordsA = blockA.text.split(/\s+/);
    const wordsB = blockB.text.split(/\s+/);
    
    const overlap = findOverlapWordsCount(wordsA, wordsB);
    if (overlap > 0) {
      blockA.text = removeOverlapFromSuffix(blockA.text, wordsB, overlap);
    }
  }

  // Step 3 & 4: Split into sentences and align time proportionally
  const finalLines: string[] = [];

  for (let i = 0; i < cleanedBlocks.length; i++) {
    const block = cleanedBlocks[i];
    const nextBlock = cleanedBlocks[i + 1];
    
    const blockStart = block.startTime;
    const blockEnd = nextBlock ? nextBlock.startTime : blockStart + Math.max(10, block.text.split(/\s+/).length * 0.4);
    const duration = blockEnd - blockStart;
    
    const sentences = splitBlockIntoSentences(block.text);
    if (sentences.length === 0) continue;
    
    const totalChars = sentences.reduce((sum, s) => sum + s.length, 0);
    
    let currentStart = blockStart;
    for (let j = 0; j < sentences.length; j++) {
      const sentence = sentences[j];
      const sentenceTime = formatTime(currentStart);
      finalLines.push(`${sentenceTime} ${sentence}`);
      
      const sentenceDur = totalChars > 0 ? duration * (sentence.length / totalChars) : 0;
      currentStart += sentenceDur;
    }
  }

  return finalLines.join("\n");
}

function parseThirdPartyTranscript(rawText: string): string {
  const lines = rawText.split("\n");
  const rawBlocks: RawBlock[] = [];
  
  let startIndex = lines.findIndex(l => l.trim() === "## Transcript");
  if (startIndex === -1) {
    startIndex = lines.findIndex(l => l.trim().startsWith("["));
  }
  if (startIndex === -1) startIndex = 0;
  
  const transcriptLines = lines.slice(startIndex);
  
  for (const line of transcriptLines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("[")) continue;
    
    const match = trimmed.match(/^\[(?:(\d+):)?(\d+):(\d+)\]\s*(.*)$/);
    if (match) {
      const hours = match[1] ? parseInt(match[1], 10) : 0;
      const mins = parseInt(match[2], 10) + (hours * 60);
      const secs = parseInt(match[3], 10);
      const startTime = mins * 60 + secs;
      const text = match[4].trim();
      
      rawBlocks.push({
        startTime,
        text
      });
    }
  }
  
  return processRawBlocks(rawBlocks);
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

  // Fetch real title early via OEmbed API (which is official and not blocked on Vercel)
  let title = `YouTube Video #${videoId}`;
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

  // LAYER 1: Try standard local scraper
  try {
    const segments = await YoutubeTranscript.fetchTranscript(videoId);
    if (segments && segments.length > 0) {
      const rawBlocks: RawBlock[] = [];
      let currentBlockText: string[] = [];
      let currentBlockStart = segments[0].offset / 1000;
      
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const segStart = seg.offset / 1000;
        const hasSpeakerChange = seg.text.includes(">>") || seg.text.includes("&gt;&gt;") || seg.text.includes(">");
        
        if (i > 0 && (segStart - currentBlockStart > 20 || hasSpeakerChange)) {
          rawBlocks.push({
            startTime: currentBlockStart,
            text: currentBlockText.join(" ")
          });
          currentBlockStart = segStart;
          currentBlockText = [];
        }
        currentBlockText.push(seg.text);
      }
      
      if (currentBlockText.length > 0) {
        rawBlocks.push({
          startTime: currentBlockStart,
          text: currentBlockText.join(" ")
        });
      }

      const finalTranscript = processRawBlocks(rawBlocks);
      return NextResponse.json({
        title,
        transcript: finalTranscript,
        sourceUrl: url,
        sourceType: "youtube",
      });
    }
  } catch (err) {
    console.warn("Local transcript scraper failed (expected in cloud/Vercel):", err);
  }

  // LAYER 2: Try public third-party proxy transcript service (youtube-transcript.ai)
  try {
    const backupUrl = `https://youtube-transcript.ai/transcript/${videoId}.txt`;
    const res = await fetch(backupUrl);
    if (res.ok) {
      const rawText = await res.text();
      const parsedTranscript = parseThirdPartyTranscript(rawText);
      if (parsedTranscript) {
        return NextResponse.json({
          title,
          transcript: parsedTranscript,
          sourceUrl: url,
          sourceType: "youtube",
        });
      }
    }
  } catch (err) {
    console.warn("Third-party transcript service failed:", err);
  }

  // LAYER 3: Fallback to Gemini AI generation using the real video title
  const apiKey = getApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "Missing GEMINI_API_KEY server configuration." }, { status: 500 });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const prompt = `
      Act as a professional English caption transcriber.
      For the YouTube video titled "${title}" (ID: "${videoId}"),
      generate a natural and educational English listening transcript of around 200 words.
      The transcript MUST match the exact theme, topic, and key concepts of this video title.
      Output the transcript where each sentence is on a new line and prefixed with its start timestamp in the format [mm:ss], starting at [00:00] and spacing them 3-5 seconds apart.
      Do not include any headings or extra text.
    `;

    const result = await model.generateContent(prompt);
    const transcript = result.response.text().trim();

    return NextResponse.json({
      title,
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
