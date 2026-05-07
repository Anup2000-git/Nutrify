/**
 * BMR / TDEE / macro target calculations.
 * Uses Mifflin-St Jeor formula (most accurate for general adults).
 */

import type {
  ActivityLevel,
  Gender,
  Goal,
  LifeStage,
} from '@/src/types/models';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  heavy: 1.725,
};

export function calculateAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

/** Mifflin-St Jeor BMR. */
export function calculateBMR(input: {
  gender: Gender;
  weightKg: number;
  heightCm: number;
  ageYears: number;
}): number {
  const base =
    10 * input.weightKg + 6.25 * input.heightCm - 5 * input.ageYears;
  if (input.gender === 'male') return base + 5;
  if (input.gender === 'female') return base - 161;
  // 'other' → average
  return base + (5 - 161) / 2;
}

export function calculateTDEE(bmr: number, activity: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activity]);
}

export type DailyTargets = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  water_ml: number;
};

/**
 * Calculate daily targets given user's full onboarding data.
 *
 * - Calories: TDEE adjusted for goal (deficit/surplus)
 * - Protein: g per kg bodyweight, scaled by goal/lifestage
 * - Fat: ~25% of calories
 * - Carbs: remainder of calories
 * - Water: ~33 ml/kg bodyweight, with floor and adjustments
 */
export function calculateDailyTargets(input: {
  gender: Gender;
  weightKg: number;
  heightCm: number;
  dateOfBirth: string;
  activity: ActivityLevel;
  goal: Goal;
  lifeStage: LifeStage;
}): DailyTargets {
  const ageYears = calculateAge(input.dateOfBirth);
  const bmr = calculateBMR({
    gender: input.gender,
    weightKg: input.weightKg,
    heightCm: input.heightCm,
    ageYears,
  });
  const tdee = calculateTDEE(bmr, input.activity);

  // Goal adjustment
  const calorieAdjustments: Record<Goal, number> = {
    weight_loss: -500,
    weight_gain: 400,
    muscle_gain: 300,
    maintain: 0,
    general: 0,
  };

  let calories = tdee + calorieAdjustments[input.goal];

  // Pregnant/postpartum need extra
  if (input.lifeStage === 'pregnant') calories += 300;
  if (input.lifeStage === 'postpartum') calories += 400;

  // Floor — never below 1200 (women) / 1500 (men) for safety
  const floor = input.gender === 'male' ? 1500 : 1200;
  if (calories < floor) calories = floor;

  // Protein g/kg — heavier for muscle gain, gym goers
  let proteinPerKg = 1.2;
  if (input.goal === 'muscle_gain') proteinPerKg = 2.0;
  else if (input.goal === 'weight_loss') proteinPerKg = 1.6;
  else if (input.goal === 'weight_gain') proteinPerKg = 1.8;
  if (input.activity === 'heavy') proteinPerKg = Math.max(proteinPerKg, 1.8);
  if (input.lifeStage === 'senior') proteinPerKg = Math.max(proteinPerKg, 1.2);
  if (input.lifeStage === 'pregnant' || input.lifeStage === 'postpartum') {
    proteinPerKg = Math.max(proteinPerKg, 1.4);
  }

  const protein_g = Math.round(input.weightKg * proteinPerKg);
  const proteinKcal = protein_g * 4;

  // Fat ~25% of calories (9 kcal/g)
  const fat_g = Math.round((calories * 0.25) / 9);
  const fatKcal = fat_g * 9;

  // Carbs = remaining calories / 4 kcal/g
  const carbsKcal = Math.max(0, calories - proteinKcal - fatKcal);
  const carbs_g = Math.round(carbsKcal / 4);

  // Water ~33 ml/kg, with adjustments
  let water_ml = Math.round(input.weightKg * 33);
  if (input.activity === 'moderate') water_ml += 300;
  if (input.activity === 'heavy') water_ml += 500;
  if (input.lifeStage === 'pregnant') water_ml += 300;
  if (input.lifeStage === 'postpartum') water_ml += 700;
  water_ml = Math.max(2000, Math.min(4000, water_ml));

  return {
    calories: Math.round(calories),
    protein_g,
    carbs_g,
    fat_g,
    water_ml,
  };
}
