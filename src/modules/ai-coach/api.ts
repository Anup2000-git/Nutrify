import { supabase } from "@/src/lib/supabase";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  message: string;
  created_at: string;
};

export async function fetchChatHistory(userId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("ai_conversations")
    .select("id, role, message, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data as ChatMessage[];
}

export async function sendChatMessage(message: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("ai-coach-chat", {
    body: { message },
  });

  if (error) {
    let detailedMsg = "";
    if (error.context && typeof error.context.text === "function") {
      try {
        const errText = await error.context.text();
        detailedMsg = `Edge Error (${error.context.status}): ${errText.substring(0, 300)}`;
      } catch {
        // Could not read response body
      }
    }
    throw new Error(
      detailedMsg ||
        error.message ||
        "Edge Function returned a non-2xx status code",
    );
  }

  // Handle different response shapes
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data);
      if (parsed.message) return parsed.message;
    } catch {
      if (data.trim()) return data;
    }
  }
  if (data && data.message) {
    return data.message;
  }

  throw new Error("No response from coach");
}

export async function clearChatHistory(userId: string): Promise<void> {
  const { error } = await supabase
    .from("ai_conversations")
    .delete()
    .eq("user_id", userId);
  if (error) throw error;
}

// ─── Adaptive Suggestions ───

export type Suggestion = {
  id: string;
  type: "next_meal" | "weekly_plan" | "warning" | "tip";
  content: string;
  content_data: Record<string, unknown> | null;
  valid_for_date: string;
  accepted: boolean;
  created_at: string;
};

export async function fetchTodaySuggestions(
  userId: string,
): Promise<Suggestion[]> {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("ai_recommendations")
    .select("*")
    .eq("user_id", userId)
    .eq("valid_for_date", today)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as Suggestion[];
}

export async function generateSuggestion(): Promise<{
  type: string;
  content: string;
}> {
  const { data, error } = await supabase.functions.invoke(
    "generate-suggestion",
    {
      body: {},
    },
  );

  if (error) {
    throw new Error(error.message || "Failed to generate suggestion");
  }
  if (!data?.suggestion) {
    throw new Error("No suggestion returned");
  }
  return data.suggestion;
}

export async function dismissSuggestion(suggestionId: string): Promise<void> {
  const { error } = await supabase
    .from("ai_recommendations")
    .delete()
    .eq("id", suggestionId);
  if (error) throw error;
}

export async function acceptSuggestion(suggestionId: string): Promise<void> {
  const { error } = await supabase
    .from("ai_recommendations")
    .update({ accepted: true })
    .eq("id", suggestionId);
  if (error) throw error;
}

export const aiCoach = {
  fetchChatHistory,
  sendChatMessage,
  clearChatHistory,
  fetchTodaySuggestions,
  generateSuggestion,
  dismissSuggestion,
  acceptSuggestion,
};
