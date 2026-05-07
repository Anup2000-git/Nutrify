import type { MealType } from '@/src/types/models';

/**
 * Suggest a meal type based on hour of day.
 * User can always override on the log screen.
 */
export function detectMealType(date = new Date()): MealType {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 16) return 'lunch';
  if (hour >= 16 && hour < 19) return 'snack';
  if (hour >= 19 && hour < 23) return 'dinner';
  return 'snack'; // late-night/early-morning
}

export const MEAL_TYPE_META: Record<MealType, { label: string; icon: 'sunny-outline' | 'restaurant-outline' | 'cafe-outline' | 'moon-outline' }> = {
  breakfast: { label: 'Breakfast', icon: 'sunny-outline' },
  lunch: { label: 'Lunch', icon: 'restaurant-outline' },
  snack: { label: 'Snack', icon: 'cafe-outline' },
  dinner: { label: 'Dinner', icon: 'moon-outline' },
};
