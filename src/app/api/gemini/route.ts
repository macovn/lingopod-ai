import { NextRequest, NextResponse } from "next/server";

import {
  chatSpeakingCoach,
  evaluateShadowingSpeech,
  generateQuiz,
  generateVocabularyDefinition,
} from "@/services/gemini";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createRateLimiter } from "@/lib/security";

type GeminiAction =
  | "generateVocabularyDefinition"
  | "generateQuiz"
  | "chatSpeakingCoach"
  | "evaluateShadowingSpeech";

type GeminiRequestPayload = {
  action: GeminiAction;
  args: unknown;
};

const geminiRateLimiter = createRateLimiter(20, 60_000);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function validateString(
  value: unknown,
  fieldName: string,
  minLen: number,
  maxLen: number
): string {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string.`);
  }

  const normalized = value.trim();
  if (normalized.length < minLen || normalized.length > maxLen) {
    throw new Error(`${fieldName} must be between ${minLen} and ${maxLen} chars.`);
  }

  return normalized;
}

function parsePayload(raw: unknown): GeminiRequestPayload {
  if (!isRecord(raw)) {
    throw new Error("Invalid request payload.");
  }

  const action = raw.action;
  const args = raw.args;

  if (
    action !== "generateVocabularyDefinition" &&
    action !== "generateQuiz" &&
    action !== "chatSpeakingCoach" &&
    action !== "evaluateShadowingSpeech"
  ) {
    throw new Error("Unsupported action.");
  }

  return { action, args };
}

export async function POST(request: NextRequest) {
  try {
    let userId = "demo-user-id";
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      // Nếu chưa cấu hình Supabase, kiểm tra cookie demo
      const demoUserCookie = request.cookies.get("lingopod_demo_user")?.value;
      if (!demoUserCookie) {
        return NextResponse.json({ error: "Unauthorized (Demo Mode)." }, { status: 401 });
      }
      try {
        userId = JSON.parse(decodeURIComponent(demoUserCookie)).id || "demo-user-id";
      } catch {
        userId = "demo-user-id";
      }
    } else {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }
      userId = user.id;
    }

    const rate = geminiRateLimiter.consume(userId);
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

    const payload = parsePayload(await request.json());

    if (payload.action === "generateVocabularyDefinition") {
      if (!isRecord(payload.args)) {
        return NextResponse.json({ error: "Invalid arguments." }, { status: 400 });
      }
      const term = validateString(payload.args.term, "term", 1, 80);
      const userProfile = payload.args.userProfile as any;
      const result = await generateVocabularyDefinition(term, userProfile);
      return NextResponse.json(result);
    }

    if (payload.action === "generateQuiz") {
      if (!isRecord(payload.args) || !Array.isArray(payload.args.vocabList)) {
        return NextResponse.json({ error: "Invalid vocabList." }, { status: 400 });
      }

      if (payload.args.vocabList.length === 0 || payload.args.vocabList.length > 100) {
        return NextResponse.json({ error: "vocabList size is out of range." }, { status: 400 });
      }

      const userProfile = payload.args.userProfile as any;
      const result = await generateQuiz(
        payload.args.vocabList as Parameters<typeof generateQuiz>[0],
        userProfile
      );
      return NextResponse.json(result);
    }

    if (payload.action === "chatSpeakingCoach") {
      if (!isRecord(payload.args)) {
        return NextResponse.json({ error: "Invalid arguments." }, { status: 400 });
      }

      const persona = payload.args.persona;
      const history = payload.args.history;
      const message = validateString(payload.args.message, "message", 1, 1500);
      const userProfile = payload.args.userProfile as any;

      if (
        persona !== "teacher" &&
        persona !== "partner" &&
        persona !== "interviewer"
      ) {
        return NextResponse.json({ error: "Invalid persona." }, { status: 400 });
      }

      if (!Array.isArray(history) || history.length > 40) {
        return NextResponse.json({ error: "Invalid history." }, { status: 400 });
      }

      const historyValid = history.every((item) => {
        if (!isRecord(item)) return false;
        const role = item.role;
        const content = item.content;
        if (role !== "user" && role !== "model") return false;
        return typeof content === "string" && content.length > 0 && content.length <= 1500;
      });

      if (!historyValid) {
        return NextResponse.json({ error: "Invalid history messages." }, { status: 400 });
      }

      const result = await chatSpeakingCoach(
        persona,
        history as Parameters<typeof chatSpeakingCoach>[1],
        message,
        userProfile
      );
      return NextResponse.json(result);
    }

    if (!isRecord(payload.args)) {
      return NextResponse.json({ error: "Invalid arguments." }, { status: 400 });
    }

    const originalText = validateString(payload.args.originalText, "originalText", 1, 3000);
    const audioBase64 = validateString(payload.args.audioBase64, "audioBase64", 50, 10_000_000);
    const result = await evaluateShadowingSpeech(originalText, audioBase64);
    return NextResponse.json(result);
  } catch (error) {
    const message = (error as Error).message || "Internal server error.";
    const isValidationError =
      message.startsWith("Invalid") ||
      message.startsWith("Unsupported") ||
      message.includes("must be");

    return NextResponse.json(
      { error: message },
      { status: isValidationError ? 400 : 500 }
    );
  }
}
