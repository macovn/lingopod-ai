import { createBrowserClient } from "@supabase/ssr";

export const isSupabaseConfigured = (): boolean => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !!url && !!key;
};

export function createSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window !== "undefined") {
      console.warn("LƯU Ý: Thiếu cấu hình Supabase. Ứng dụng sẽ hoạt động ở chế độ Demo/LocalStorage.");
    }
    return null;
  }

  try {
    return createBrowserClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.error("Lỗi khởi tạo Supabase client:", error);
    return null;
  }
}

