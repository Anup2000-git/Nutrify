/**
 * OpenAI client wrappers.
 *
 * IMPORTANT: The OpenAI API key NEVER ships to the mobile client (security risk).
 * The mobile app calls Supabase Edge Functions, which hold the key server-side
 * and proxy requests to OpenAI.
 *
 * This file exposes typed helpers that hit those edge functions.
 */

import { supabase } from './supabase';

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

export type AnalyzeFoodPhotoResponse = {
  detectedFoods: DetectedFood[];
  meal_type: 'breakfast' | 'lunch' | 'snack' | 'dinner';
};

export async function analyzeFoodPhoto(photoStoragePath: string) {
  const { data, error } = await supabase.functions.invoke<AnalyzeFoodPhotoResponse>(
    'analyze-food-photo',
    { body: { photoStoragePath } }
  );
  if (error) throw error;
  return data;
}

export type CoachChatResponse = {
  message: string;
  recommendations?: { type: string; content: string }[];
};

export async function aiCoachChat(input: {
  message: string;
  context?: Record<string, unknown>;
}) {
  const { data, error } = await supabase.functions.invoke<CoachChatResponse>(
    'ai-coach-chat',
    { body: input }
  );
  if (error) throw error;
  return data;
}
