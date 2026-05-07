/**
 * Food search — queries the master `foods` table.
 * Matches against both English and Hindi names.
 */

import { supabase } from '@/src/lib/supabase';
import type { FoodCategory, FoodRegion, FoodSource } from '@/src/types/models';

export type FoodSearchResult = {
  id: string;
  name: string;
  name_hindi: string | null;
  region: FoodRegion;
  category: FoodCategory | null;
  serving_size_g: number | null;
  serving_label: string | null;
  calories_per_100g: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  source: FoodSource;
  verified: boolean;
};

export async function searchFoods(query: string, limit = 30): Promise<FoodSearchResult[]> {
  const trimmed = query.trim();

  let q = supabase
    .from('foods')
    .select(
      'id, name, name_hindi, region, category, serving_size_g, serving_label, calories_per_100g, protein_g, carbs_g, fat_g, fiber_g, source, verified',
    )
    .order('verified', { ascending: false })
    .order('name')
    .limit(limit);

  if (trimmed.length > 0) {
    // Match against English and Hindi names (case-insensitive partial match)
    q = q.or(`name.ilike.%${trimmed}%,name_hindi.ilike.%${trimmed}%`);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as FoodSearchResult[];
}

export async function getFoodById(id: string): Promise<FoodSearchResult | null> {
  const { data, error } = await supabase
    .from('foods')
    .select(
      'id, name, name_hindi, region, category, serving_size_g, serving_label, calories_per_100g, protein_g, carbs_g, fat_g, fiber_g, source, verified',
    )
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as unknown as FoodSearchResult;
}
