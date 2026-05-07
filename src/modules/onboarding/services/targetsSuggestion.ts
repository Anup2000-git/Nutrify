import { supabase } from '@/src/lib/supabase';

export type AISuggestedTargets = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  water_ml: number;
  reasoning: string;
  weekly_change_estimate_kg: number;
  warning: string | null;
};

/**
 * Ask Azure GPT-5 (coach deployment) for context-aware daily targets
 * based on the logged-in user's profile.
 */
export async function suggestDailyTargetsViaAI(): Promise<AISuggestedTargets> {
  const { data, error } = await supabase.functions.invoke<AISuggestedTargets>(
    'suggest-daily-targets',
    { body: {} },
  );
  if (error) throw new Error(error.message || 'AI suggestion failed');
  if (!data || typeof data.calories !== 'number') {
    throw new Error('AI returned invalid response');
  }
  return data;
}
