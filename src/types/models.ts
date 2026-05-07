/**
 * Domain models — shared across modules.
 * Stable types you reference in app code (vs database.ts which mirrors DB).
 */

export type Goal =
  | 'weight_loss'
  | 'weight_gain'
  | 'maintain'
  | 'muscle_gain'
  | 'general';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'heavy';

export type LifeStage =
  | 'student'
  | 'working'
  | 'pregnant'
  | 'postpartum'
  | 'senior';

export type DietPreference =
  | 'veg'
  | 'non_veg'
  | 'vegan'
  | 'jain'
  | 'eggetarian';

export type Gender = 'male' | 'female' | 'other';

export type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner';

export type FoodSource =
  | 'ifct'
  | 'usda'
  | 'openfoodfacts'
  | 'llm'
  | 'user';

export type FoodRegion =
  | 'north'
  | 'south'
  | 'east'
  | 'northeast'
  | 'west'
  | 'global';

export type FoodCategory =
  | 'grain'
  | 'dal'
  | 'sabzi'
  | 'snack'
  | 'fruit'
  | 'dairy'
  | 'meat'
  | 'beverage'
  | 'sweets';

export type Macros = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
};

/**
 * Profile row as it lives in the database. All onboarding-driven fields
 * are nullable because new users have an empty profile until they finish
 * the onboarding flow.
 */
export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  goal: Goal | null;
  activity_level: ActivityLevel | null;
  life_stage: LifeStage | null;
  diet_preference: DietPreference | null;
  gender: Gender | null;
  height_cm: number | null;
  current_weight_kg: number | null;
  date_of_birth: string | null;
  daily_calorie_target: number | null;
  daily_protein_g: number | null;
  daily_carbs_g: number | null;
  daily_fat_g: number | null;
  daily_water_ml: number | null;
  created_at: string;
  updated_at: string;
};

export function isProfileComplete(profile: Profile | null): boolean {
  if (!profile) return false;
  return Boolean(
    profile.goal &&
      profile.activity_level &&
      profile.life_stage &&
      profile.diet_preference &&
      profile.gender &&
      profile.height_cm &&
      profile.current_weight_kg &&
      profile.date_of_birth,
  );
}
