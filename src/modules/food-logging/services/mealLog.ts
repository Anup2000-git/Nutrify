/**
 * Meal log persistence — read/write `meal_logs` rows.
 *
 * Macros are snapshotted at log time so historical totals don't drift if
 * the master `foods` row is updated later.
 */

import { supabase } from "@/src/lib/supabase";
import type { MealType } from "@/src/types/models";

export type LoggedMeal = {
  id: string;
  user_id: string;
  food_id: string | null;
  custom_food_name: string | null;
  food_name: string;
  quantity_g: number;
  quantity_label: string | null;
  meal_type: MealType;
  logged_at: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
};

type FoodForCalculation = {
  id: string;
  name: string;
  calories_per_100g: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
};

export type LogMealInput = {
  userId: string;
  food: FoodForCalculation;
  quantityGrams: number;
  quantityLabel?: string;
  mealType: MealType;
  loggedAt?: Date;
};

export function calculateMacrosForQuantity(
  food: Pick<
    FoodForCalculation,
    "calories_per_100g" | "protein_g" | "carbs_g" | "fat_g" | "fiber_g"
  >,
  quantityGrams: number,
) {
  const factor = quantityGrams / 100;
  return {
    calories: round1(food.calories_per_100g * factor),
    protein_g: round1(food.protein_g * factor),
    carbs_g: round1(food.carbs_g * factor),
    fat_g: round1(food.fat_g * factor),
    fiber_g: round1(food.fiber_g * factor),
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export async function logMeal(input: LogMealInput) {
  const macros = calculateMacrosForQuantity(input.food, input.quantityGrams);

  const { error } = await supabase.from("meal_logs").insert({
    user_id: input.userId,
    food_id: input.food.id,
    custom_food_name: null,
    quantity_g: input.quantityGrams,
    quantity_label: input.quantityLabel ?? null,
    meal_type: input.mealType,
    logged_at: (input.loggedAt ?? new Date()).toISOString(),
    ...macros,
  });

  if (error) throw error;
}

export async function deleteMeal(mealLogId: string) {
  const { error } = await supabase
    .from("meal_logs")
    .delete()
    .eq("id", mealLogId);
  if (error) throw error;
}

export type LogCustomMealInput = {
  userId: string;
  foodName: string;
  quantityGrams: number;
  mealType: MealType;
  loggedAt?: Date;
  // Macros for the actual quantity (already calculated, e.g., by the LLM).
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  photoUrl?: string;
};

/**
 * Insert a meal_logs row for a custom food (no entry in `foods` table).
 * Used by photo-based logging where the LLM identifies foods that may not
 * exist in our master DB yet.
 */
export async function logCustomMeal(input: LogCustomMealInput) {
  const { error } = await supabase.from("meal_logs").insert({
    user_id: input.userId,
    food_id: null,
    custom_food_name: input.foodName,
    custom_food_macros: {
      calories: input.calories,
      protein_g: input.protein_g,
      carbs_g: input.carbs_g,
      fat_g: input.fat_g,
      fiber_g: input.fiber_g,
    },
    quantity_g: input.quantityGrams,
    quantity_label: null,
    meal_type: input.mealType,
    logged_at: (input.loggedAt ?? new Date()).toISOString(),
    photo_url: input.photoUrl ?? null,
    calories: input.calories,
    protein_g: input.protein_g,
    carbs_g: input.carbs_g,
    fat_g: input.fat_g,
    fiber_g: input.fiber_g,
  });
  if (error) throw error;
}

/** Today's start in the device's local timezone, returned as ISO. */
function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Tomorrow's start (i.e. exclusive upper bound) in local timezone. */
function startOfTomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfDateIso(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function endOfDateIso(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function fetchTodayMeals(userId: string): Promise<LoggedMeal[]> {
  const { data, error } = await supabase
    .from("meal_logs")
    .select(
      "id, user_id, food_id, custom_food_name, quantity_g, quantity_label, meal_type, logged_at, calories, protein_g, carbs_g, fat_g, fiber_g, food:foods(name)",
    )
    .eq("user_id", userId)
    .gte("logged_at", startOfTodayIso())
    .lt("logged_at", startOfTomorrowIso())
    .order("logged_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const r = row as unknown as Record<string, unknown> & {
      food: { name: string } | { name: string }[] | null;
    };
    const foodName = Array.isArray(r.food)
      ? (r.food[0]?.name ?? "")
      : (r.food?.name ?? "");
    const customName = (r.custom_food_name as string | null) ?? null;
    return {
      id: r.id as string,
      user_id: r.user_id as string,
      food_id: (r.food_id as string | null) ?? null,
      custom_food_name: customName,
      food_name: customName || foodName || "Unknown food",
      quantity_g: Number(r.quantity_g),
      quantity_label: (r.quantity_label as string | null) ?? null,
      meal_type: r.meal_type as MealType,
      logged_at: r.logged_at as string,
      calories: Number(r.calories ?? 0),
      protein_g: Number(r.protein_g ?? 0),
      carbs_g: Number(r.carbs_g ?? 0),
      fat_g: Number(r.fat_g ?? 0),
      fiber_g: Number(r.fiber_g ?? 0),
    };
  });
}

export async function fetchMealsByDate(
  userId: string,
  date: Date,
): Promise<LoggedMeal[]> {
  const { data, error } = await supabase
    .from("meal_logs")
    .select(
      "id, user_id, food_id, custom_food_name, quantity_g, quantity_label, meal_type, logged_at, calories, protein_g, carbs_g, fat_g, fiber_g, food:foods(name)",
    )
    .eq("user_id", userId)
    .gte("logged_at", startOfDateIso(date))
    .lt("logged_at", endOfDateIso(date))
    .order("logged_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const r = row as unknown as Record<string, unknown> & {
      food: { name: string } | { name: string }[] | null;
    };
    const foodName = Array.isArray(r.food)
      ? (r.food[0]?.name ?? "")
      : (r.food?.name ?? "");
    const customName = (r.custom_food_name as string | null) ?? null;
    return {
      id: r.id as string,
      user_id: r.user_id as string,
      food_id: (r.food_id as string | null) ?? null,
      custom_food_name: customName,
      food_name: customName || foodName || "Unknown food",
      quantity_g: Number(r.quantity_g),
      quantity_label: (r.quantity_label as string | null) ?? null,
      meal_type: r.meal_type as MealType,
      logged_at: r.logged_at as string,
      calories: Number(r.calories ?? 0),
      protein_g: Number(r.protein_g ?? 0),
      carbs_g: Number(r.carbs_g ?? 0),
      fat_g: Number(r.fat_g ?? 0),
      fiber_g: Number(r.fiber_g ?? 0),
    };
  });
}

export async function fetchRecentMeals(userId: string): Promise<LoggedMeal[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await supabase
    .from("meal_logs")
    .select(
      "id, user_id, food_id, custom_food_name, quantity_g, quantity_label, meal_type, logged_at, calories, protein_g, carbs_g, fat_g, fiber_g, food:foods(name)",
    )
    .eq("user_id", userId)
    .gte("logged_at", thirtyDaysAgo.toISOString())
    .order("logged_at", { ascending: false })
    .limit(100);

  if (error) throw error;

  const meals = (data ?? []).map((row) => {
    const r = row as unknown as Record<string, unknown> & {
      food: { name: string } | { name: string }[] | null;
    };
    const foodName = Array.isArray(r.food)
      ? (r.food[0]?.name ?? "")
      : (r.food?.name ?? "");
    const customName = (r.custom_food_name as string | null) ?? null;
    return {
      id: r.id as string,
      user_id: r.user_id as string,
      food_id: (r.food_id as string | null) ?? null,
      custom_food_name: customName,
      food_name: customName || foodName || "Unknown food",
      quantity_g: Number(r.quantity_g),
      quantity_label: (r.quantity_label as string | null) ?? null,
      meal_type: r.meal_type as MealType,
      logged_at: r.logged_at as string,
      calories: Number(r.calories ?? 0),
      protein_g: Number(r.protein_g ?? 0),
      carbs_g: Number(r.carbs_g ?? 0),
      fat_g: Number(r.fat_g ?? 0),
      fiber_g: Number(r.fiber_g ?? 0),
    };
  });

  const seen = new Set<string>();
  const recent: typeof meals = [];
  for (const m of meals) {
    const key = m.food_name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      recent.push(m);
    }
    if (recent.length >= 20) break;
  }

  return recent;
}
