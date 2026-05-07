import { supabase } from "@/src/lib/supabase";
import type { Goal } from "@/src/types/models";

export type GoalEntry = {
  id: string;
  user_id: string;
  goal_type: Goal;
  start_weight_kg: number | null;
  target_weight_kg: number | null;
  target_date: string | null;
  status: "active" | "paused" | "achieved" | "abandoned";
  created_at: string;
  completed_at: string | null;
};

export async function fetchActiveGoal(
  userId: string,
): Promise<GoalEntry | null> {
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows
  return (data as GoalEntry) ?? null;
}

export async function createGoal(
  userId: string,
  goalType: Goal,
  opts?: {
    startWeightKg?: number;
    targetWeightKg?: number;
    targetDate?: string;
  },
): Promise<GoalEntry> {
  // Deactivate existing active goals
  await supabase
    .from("goals")
    .update({ status: "abandoned" })
    .eq("user_id", userId)
    .eq("status", "active");

  const { data, error } = await supabase
    .from("goals")
    .insert({
      user_id: userId,
      goal_type: goalType,
      start_weight_kg: opts?.startWeightKg ?? null,
      target_weight_kg: opts?.targetWeightKg ?? null,
      target_date: opts?.targetDate ?? null,
      status: "active",
    })
    .select()
    .single();

  if (error) throw error;
  return data as GoalEntry;
}

export async function markGoalAchieved(goalId: string): Promise<void> {
  const { error } = await supabase
    .from("goals")
    .update({ status: "achieved", completed_at: new Date().toISOString() })
    .eq("id", goalId);
  if (error) throw error;
}

export async function fetchGoalHistory(userId: string): Promise<GoalEntry[]> {
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as GoalEntry[];
}
