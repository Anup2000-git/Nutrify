import { supabase } from '@/src/lib/supabase';
import type {
  ActivityLevel,
  DietPreference,
  Gender,
  Goal,
  LifeStage,
} from '@/src/types/models';

import { calculateDailyTargets } from './nutritionCalc';

export type FullOnboardingPayload = {
  goal: Goal;
  activity_level: ActivityLevel;
  life_stage: LifeStage;
  diet_preference: DietPreference;
  gender: Gender;
  height_cm: number;
  current_weight_kg: number;
  date_of_birth: string; // ISO date "YYYY-MM-DD"
};

export type ProfileUpdates = Partial<{
  goal: Goal;
  activity_level: ActivityLevel;
  life_stage: LifeStage;
  diet_preference: DietPreference;
  gender: Gender;
  height_cm: number;
  current_weight_kg: number;
  date_of_birth: string;
  daily_calorie_target: number;
  daily_protein_g: number;
  daily_carbs_g: number;
  daily_fat_g: number;
  daily_water_ml: number;
  full_name: string;
}>;

/**
 * Save the full onboarding payload to `profiles`, computing daily targets
 * via the local Mifflin-St Jeor formula. Used at the end of the onboarding flow.
 */
export async function saveFullProfile(
  userId: string,
  data: FullOnboardingPayload,
) {
  const targets = calculateDailyTargets({
    gender: data.gender,
    weightKg: data.current_weight_kg,
    heightCm: data.height_cm,
    dateOfBirth: data.date_of_birth,
    activity: data.activity_level,
    goal: data.goal,
    lifeStage: data.life_stage,
  });

  const { data: row, error } = await supabase
    .from('profiles')
    .update({
      goal: data.goal,
      activity_level: data.activity_level,
      life_stage: data.life_stage,
      diet_preference: data.diet_preference,
      gender: data.gender,
      height_cm: data.height_cm,
      current_weight_kg: data.current_weight_kg,
      date_of_birth: data.date_of_birth,
      daily_calorie_target: targets.calories,
      daily_protein_g: targets.protein_g,
      daily_carbs_g: targets.carbs_g,
      daily_fat_g: targets.fat_g,
      daily_water_ml: targets.water_ml,
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return row;
}

/**
 * Update arbitrary profile fields. Used by Edit Targets / Edit Stats screens.
 * Does NOT auto-recalculate targets — caller can do that explicitly via
 * `recomputeTargets()` if they're updating stats and want fresh targets.
 */
export async function updateProfileFields(
  userId: string,
  updates: ProfileUpdates,
) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Recompute targets from the user's current profile fields and save.
 * Use this after the user edits stats and wants the auto-calculated values.
 */
export async function recomputeTargets(userId: string) {
  // Read current profile
  const { data: profile, error: readErr } = await supabase
    .from('profiles')
    .select(
      'goal, activity_level, life_stage, diet_preference, gender, height_cm, current_weight_kg, date_of_birth',
    )
    .eq('id', userId)
    .single();
  if (readErr) throw readErr;
  if (!profile) throw new Error('Profile not found');

  const p = profile as unknown as {
    goal: Goal;
    activity_level: ActivityLevel;
    life_stage: LifeStage;
    diet_preference: DietPreference;
    gender: Gender;
    height_cm: number;
    current_weight_kg: number;
    date_of_birth: string;
  };

  if (
    !p.goal ||
    !p.activity_level ||
    !p.life_stage ||
    !p.gender ||
    !p.height_cm ||
    !p.current_weight_kg ||
    !p.date_of_birth
  ) {
    throw new Error('Profile incomplete — finish onboarding first');
  }

  const targets = calculateDailyTargets({
    gender: p.gender,
    weightKg: p.current_weight_kg,
    heightCm: p.height_cm,
    dateOfBirth: p.date_of_birth,
    activity: p.activity_level,
    goal: p.goal,
    lifeStage: p.life_stage,
  });

  return updateProfileFields(userId, {
    daily_calorie_target: targets.calories,
    daily_protein_g: targets.protein_g,
    daily_carbs_g: targets.carbs_g,
    daily_fat_g: targets.fat_g,
    daily_water_ml: targets.water_ml,
  });
}
