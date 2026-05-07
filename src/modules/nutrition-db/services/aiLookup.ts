import { supabase } from '@/src/lib/supabase';

import type { FoodSearchResult } from './foodSearch';

/**
 * Ask Azure GPT-4o for nutrition data on a food name not present in the DB.
 * The edge function inserts the result into `foods` with source='llm' and
 * returns the row, so the caller can immediately use it.
 */
export async function lookupFoodViaAI(query: string): Promise<FoodSearchResult> {
  const { data, error } = await supabase.functions.invoke<{
    food?: FoodSearchResult;
    error?: string;
    message?: string;
    details?: string;
  }>('lookup-food-via-ai', { body: { query } });

  if (error) {
    // Try to extract detailed error from the response context
    let detail = error.message || 'AI lookup failed';
    try {
      // FunctionsHttpError has a context with the response
      if ('context' in error && (error as any).context) {
        const response = (error as any).context as Response;
        if (response && typeof response.json === 'function') {
          const body = await response.json();
          detail = body?.details || body?.error || body?.message || detail;
        }
      }
    } catch {
      // ignore parsing errors
    }
    console.error('[AI Lookup] Edge Function error:', detail);
    throw new Error(detail);
  }
  if (!data) {
    throw new Error('AI lookup returned no data');
  }
  if (data.error === 'not_a_food') {
    throw new Error('Ye food identify nahi hua — koi aur naam try karo');
  }
  if (data.error || !data.food) {
    const msg = data.details || data.error || 'AI lookup failed';
    console.error('[AI Lookup] Function returned error:', msg);
    throw new Error(msg);
  }
  return data.food;
}
