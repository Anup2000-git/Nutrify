import { supabase } from "@/src/lib/supabase";

export type DailySummaryRow = {
  id: string;
  user_id: string;
  date: string;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  total_fiber_g: number;
  water_ml: number;
  meal_count: number;
  weight_kg: number | null;
};

/**
 * Fetch daily summaries for a given range (default last 30 days).
 */
export async function fetchDailySummaries(
  userId: string,
  days = 30,
): Promise<DailySummaryRow[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startIso = startDate.toISOString().split("T")[0]; // YYYY-MM-DD

  const { data, error } = await supabase
    .from("daily_summaries")
    .select("*")
    .eq("user_id", userId)
    .gte("date", startIso)
    .order("date", { ascending: true });

  if (error) throw error;
  return (data ?? []) as DailySummaryRow[];
}

/**
 * Upsert today's daily summary (recalculate from meal_logs).
 */
export async function upsertDailySummary(userId: string): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  const startOfDay = new Date(`${today}T00:00:00`).toISOString();
  const endOfDay = new Date(`${today}T23:59:59.999`).toISOString();

  // Sum today's meals
  const { data: meals, error: mealErr } = await supabase
    .from("meal_logs")
    .select("calories, protein_g, carbs_g, fat_g, fiber_g")
    .eq("user_id", userId)
    .gte("logged_at", startOfDay)
    .lte("logged_at", endOfDay);

  if (mealErr) throw mealErr;

  const totals = (meals ?? []).reduce(
    (acc, m) => ({
      calories: acc.calories + Number(m.calories ?? 0),
      protein_g: acc.protein_g + Number(m.protein_g ?? 0),
      carbs_g: acc.carbs_g + Number(m.carbs_g ?? 0),
      fat_g: acc.fat_g + Number(m.fat_g ?? 0),
      fiber_g: acc.fiber_g + Number(m.fiber_g ?? 0),
      count: acc.count + 1,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, count: 0 },
  );

  // Get latest weight for today
  const { data: weightData } = await supabase
    .from("weight_logs")
    .select("weight_kg")
    .eq("user_id", userId)
    .gte("logged_at", startOfDay)
    .lte("logged_at", endOfDay)
    .order("logged_at", { ascending: false })
    .limit(1);

  const weightKg = weightData?.[0]?.weight_kg ?? null;

  const { error } = await supabase.from("daily_summaries").upsert(
    {
      user_id: userId,
      date: today,
      total_calories: totals.calories,
      total_protein_g: totals.protein_g,
      total_carbs_g: totals.carbs_g,
      total_fat_g: totals.fat_g,
      total_fiber_g: totals.fiber_g,
      meal_count: totals.count,
      weight_kg: weightKg,
    },
    { onConflict: "user_id,date" },
  );

  if (error) throw error;
}

/**
 * Log water intake for today (add to existing).
 */
export async function logWater(userId: string, ml: number): Promise<void> {
  const today = new Date().toISOString().split("T")[0];

  // First check if row exists
  const { data: existing } = await supabase
    .from("daily_summaries")
    .select("id, water_ml")
    .eq("user_id", userId)
    .eq("date", today)
    .single();

  if (existing) {
    await supabase
      .from("daily_summaries")
      .update({ water_ml: (existing.water_ml ?? 0) + ml })
      .eq("id", existing.id);
  } else {
    await supabase.from("daily_summaries").insert({
      user_id: userId,
      date: today,
      water_ml: ml,
    });
  }
}

/**
 * Get today's water intake.
 */
export async function getTodayWater(userId: string): Promise<number> {
  const today = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("daily_summaries")
    .select("water_ml")
    .eq("user_id", userId)
    .eq("date", today)
    .single();

  return data?.water_ml ?? 0;
}
