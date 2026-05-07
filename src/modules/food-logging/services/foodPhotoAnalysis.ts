import { supabase } from '@/src/lib/supabase';
import type { MealType } from '@/src/types/models';

export type DetectedFood = {
  name: string;
  quantity_g: number;
  confidence: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
};

export type FoodPhotoAnalysis = {
  detectedFoods: DetectedFood[];
  meal_type: MealType;
};

/**
 * Calls the `analyze-food-photo` edge function which runs Azure GPT-4o vision
 * over the uploaded image and returns detected foods with macros.
 */
export async function analyzeFoodPhoto(
  photoStoragePath: string,
): Promise<FoodPhotoAnalysis> {
  const { data, error } = await supabase.functions.invoke<FoodPhotoAnalysis>(
    'analyze-food-photo',
    { body: { photoStoragePath } },
  );

  if (error) {
    throw new Error(error.message || 'Analysis failed');
  }
  if (!data || !Array.isArray(data.detectedFoods)) {
    throw new Error('Analysis returned invalid response');
  }

  return data;
}
