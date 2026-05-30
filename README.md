# LingoPod AI

LingoPod AI là nền tảng SaaS học tiếng Anh bằng podcast và AI, tập trung vào
luồng học: nghe podcast, thu thập từ vựng, ghi nhớ, shadowing và luyện nói với
Gemini.

## Tech Stack

- Next.js 15
- TypeScript
- TailwindCSS
- Shadcn UI
- Supabase
- Gemini 2.5 Flash
- Vercel

## Cấu trúc

```text
docs/
src/
src/app/
src/components/
src/lib/
src/hooks/
src/services/
src/types/
supabase/
```

## Chạy local

```bash
npm install
npm run dev
```

Sao chép `.env.example` thành `.env.local` và điền Supabase/Gemini key trước
khi bật các module cần backend.
