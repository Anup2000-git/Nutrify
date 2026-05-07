import { supabase } from "@/src/lib/supabase";

export type FeedbackInput = {
  userId: string;
  message: string;
  rating: number; // 1-5
};

export async function submitFeedback(input: FeedbackInput): Promise<void> {
  const { error } = await supabase.from("app_feedback").insert({
    user_id: input.userId,
    message: input.message,
    rating: input.rating,
  });
  if (error) throw error;
}
