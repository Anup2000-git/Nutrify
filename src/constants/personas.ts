/**
 * Persona configs — drives AI coach behavior based on user profile.
 *
 * Each user's combination of (goal, activity_level, life_stage, diet_preference)
 * picks the most relevant persona context to inject into LLM prompts.
 */

import type { ActivityLevel, DietPreference, Goal, LifeStage } from '@/src/types/models';

export const goalPersona: Record<Goal, string> = {
  weight_loss:
    'User wants to lose weight sustainably. Prioritize calorie deficit (~500 kcal under TDEE), high protein, high fiber, low refined carbs. Discourage extreme deficits.',
  weight_gain:
    'User wants to gain weight healthily. Prioritize calorie surplus (~300-500 kcal over TDEE), nutrient-dense foods, frequent small meals.',
  maintain:
    'User wants to maintain current weight. Focus on consistent calorie balance and balanced macros.',
  muscle_gain:
    'User is building muscle. Prioritize 1.6-2.2g protein per kg bodyweight, slight calorie surplus, complex carbs around training.',
  general:
    'User wants overall healthy eating. Focus on whole foods, variety, fiber, and avoiding ultra-processed foods.',
};

export const activityPersona: Record<ActivityLevel, string> = {
  sedentary:
    'Low daily activity. TDEE multiplier ~1.2. Suggest small post-meal walks.',
  light:
    'Light activity (walk, yoga 1-3x/week). TDEE multiplier ~1.375.',
  moderate:
    'Moderate exercise 3-5x/week. TDEE multiplier ~1.55. Time carbs around workouts.',
  heavy:
    'Heavy gym training 5-7x/week. TDEE multiplier ~1.725. High protein, complex carbs, focus on recovery.',
};

export const lifeStagePersona: Record<LifeStage, string> = {
  student:
    'Likely budget-conscious, may eat hostel mess or street food. Suggest affordable, easy-to-find options. Account for irregular schedules.',
  working:
    'Office routine, lunch often packed or canteen. Suggest meal-prep options and quick healthy alternatives for office.',
  pregnant:
    'Pregnant — emphasize folic acid, iron, calcium, B12. Avoid raw fish, unpasteurized dairy, excess caffeine. Always recommend doctor consult for medical questions.',
  postpartum:
    'Postpartum / nursing. Calorie needs slightly elevated (+300-500 kcal if breastfeeding). Iron, calcium, hydration priority.',
  senior:
    'Senior — prioritize protein for muscle preservation, calcium and vitamin D for bones, fiber for digestion, low sodium for heart health. Smaller frequent meals.',
};

export const dietPersona: Record<DietPreference, string> = {
  veg: 'Vegetarian (no meat, no eggs, but dairy OK). Emphasize dal, paneer, tofu, sprouts, milk for protein. Watch B12 and iron.',
  non_veg: 'Eats meat, fish, eggs. Wide protein options.',
  vegan: 'No animal products. Strict B12 supplementation needed. Plant proteins: dal, soya, tofu, tempeh, nuts. Watch omega-3, iron, calcium.',
  jain: 'No meat/eggs/onion/garlic/root vegetables. Dairy + grains + above-ground vegetables only. Plan around protein from dairy + legumes.',
  eggetarian: 'Vegetarian + eggs. Eggs add complete protein, B12.',
};

export function buildPersonaContext(profile: {
  goal: Goal;
  activity_level: ActivityLevel;
  life_stage: LifeStage;
  diet_preference: DietPreference;
}) {
  return [
    `Goal: ${goalPersona[profile.goal]}`,
    `Activity: ${activityPersona[profile.activity_level]}`,
    `Life stage: ${lifeStagePersona[profile.life_stage]}`,
    `Diet: ${dietPersona[profile.diet_preference]}`,
  ].join('\n\n');
}
