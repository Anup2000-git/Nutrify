import { supabase } from "@/src/lib/supabase";

export type WeightEntry = {
  id: string;
  user_id: string;
  weight_kg: number;
  logged_at: string;
  notes: string | null;
};

export async function logWeight(
  userId: string,
  weightKg: number,
  notes?: string,
): Promise<WeightEntry> {
  const { data, error } = await supabase
    .from("weight_logs")
    .insert({ user_id: userId, weight_kg: weightKg, notes: notes ?? null })
    .select()
    .single();

  if (error) throw error;

  // Also update profile current_weight_kg
  await supabase
    .from("profiles")
    .update({ current_weight_kg: weightKg })
    .eq("id", userId);

  return data as WeightEntry;
}

export async function fetchWeightHistory(
  userId: string,
  limit = 90,
): Promise<WeightEntry[]> {
  const { data, error } = await supabase
    .from("weight_logs")
    .select("id, user_id, weight_kg, logged_at, notes")
    .eq("user_id", userId)
    .order("logged_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as WeightEntry[];
}

export async function deleteWeightEntry(id: string): Promise<void> {
  const { error } = await supabase.from("weight_logs").delete().eq("id", id);
  if (error) throw error;
}

export function calculateBMI(heightCm: number, weightKg: number): number {
  const heightM = heightCm / 100;
  return Number((weightKg / (heightM * heightM)).toFixed(1));
}

export function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  return "Obese";
}
