// @ts-expect-error — Deno-specific imports resolved at edge runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { azureChat } from "../_shared/azure-openai.ts";

// @ts-expect-error — Deno global at edge runtime
const env = Deno.env;

/**
 * Adaptive Suggestions Edge Function
 *
 * Called after meals are logged or periodically. Analyzes user's eating pattern
 * and generates proactive recommendations stored in ai_recommendations.
 *
 * Types: next_meal, weekly_plan, warning, tip
 */

// @ts-expect-error — Deno.serve at edge runtime
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "Missing Authorization header" }, 401);
  }

  let body: { type?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const supabaseUrl = env.get("SUPABASE_URL");
  const anonKey = env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    return json({ error: "Edge function misconfigured" }, 500);
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return json({ error: "Invalid auth" }, 401);
  }

  // ─── Fetch profile ───
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return json({ error: "Profile not found" }, 404);
  }

  // ─── Fetch today's meals ───
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const { data: todayMeals } = await supabase
    .from("meal_logs")
    .select(
      "custom_food_name, quantity_g, calories, protein_g, carbs_g, fat_g, fiber_g, meal_type, logged_at, food:foods(name)",
    )
    .eq("user_id", user.id)
    .gte("logged_at", todayIso)
    .order("logged_at", { ascending: true });

  // ─── Fetch last 7 days for pattern analysis ───
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const { data: weekMeals } = await supabase
    .from("meal_logs")
    .select(
      "calories, protein_g, carbs_g, fat_g, fiber_g, meal_type, logged_at",
    )
    .eq("user_id", user.id)
    .gte("logged_at", sevenDaysAgo.toISOString())
    .lt("logged_at", todayIso);

  // ─── Calculate today's totals ───
  const todayTotals = (todayMeals || []).reduce(
    (acc: any, m: any) => ({
      calories: acc.calories + (m.calories || 0),
      protein: acc.protein + (m.protein_g || 0),
      carbs: acc.carbs + (m.carbs_g || 0),
      fat: acc.fat + (m.fat_g || 0),
      fiber: acc.fiber + (m.fiber_g || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );

  const mealTypes = (todayMeals || []).map((m: any) => m.meal_type);
  const todayMealsList = (todayMeals || [])
    .map((m: any) => {
      const name =
        m.custom_food_name ||
        (Array.isArray(m.food) ? m.food[0]?.name : m.food?.name) ||
        "Unknown";
      return `${m.meal_type}: ${name} (${m.quantity_g}g, ${m.calories}kcal)`;
    })
    .join(", ");

  // ─── Calculate weekly averages ───
  const dayCount = Math.max(
    1,
    new Set(
      (weekMeals || []).map((m: any) => (m.logged_at as string).split("T")[0]),
    ).size,
  );
  const weekTotals = (weekMeals || []).reduce(
    (acc: any, m: any) => ({
      calories: acc.calories + (m.calories || 0),
      protein: acc.protein + (m.protein_g || 0),
    }),
    { calories: 0, protein: 0 },
  );
  const avgCalories = Math.round(weekTotals.calories / dayCount);
  const avgProtein = Math.round(weekTotals.protein / dayCount);

  // ─── Determine what suggestion to generate ───
  const hour = new Date().getHours();
  const calorieTarget = profile.daily_calorie_target || 2000;
  const proteinTarget = profile.daily_protein_g || 120;
  const remaining = calorieTarget - todayTotals.calories;

  const analysisPrompt = `You are a nutrition advisor for an Indian user. Generate ONE actionable suggestion.

USER PROFILE:
- Goal: ${profile.goal || "general"}
- Diet: ${profile.diet_preference || "non_veg"}
- Daily targets: ${calorieTarget} kcal, ${proteinTarget}g protein, ${profile.daily_carbs_g || 250}g carbs, ${profile.daily_fat_g || 65}g fat
- Current weight: ${profile.current_weight_kg || "?"}kg

TODAY'S DATA:
- Time now: ${hour}:00
- Meals logged: ${todayMealsList || "None yet"}
- Totals so far: ${Math.round(todayTotals.calories)} kcal, P:${Math.round(todayTotals.protein)}g, C:${Math.round(todayTotals.carbs)}g, F:${Math.round(todayTotals.fat)}g
- Remaining: ${Math.round(remaining)} kcal
- Meal types done: ${mealTypes.join(", ") || "none"}

WEEKLY PATTERN (last ${dayCount} days):
- Avg daily calories: ${avgCalories} kcal (target: ${calorieTarget})
- Avg daily protein: ${avgProtein}g (target: ${proteinTarget}g)

TASK: Based on the time of day and what's been eaten, generate a suggestion. Consider:
- If it's meal time and that meal hasn't been logged, suggest what to eat next
- If protein is consistently low, warn about it
- If over-eating pattern, suggest adjustment
- If doing well, give a motivational tip

Respond ONLY with valid JSON:
{
  "type": "next_meal" | "warning" | "tip",
  "content": "Short actionable suggestion in Hinglish (1-2 sentences max)",
  "reasoning": "Brief internal reasoning (not shown to user)"
}`;

  try {
    const res = await azureChat({
      deployment: "quick",
      messages: [{ role: "user", content: analysisPrompt }],
      max_tokens: 8000,
      response_format: { type: "json_object" },
    });

    let suggestion: { type: string; content: string; reasoning?: string };
    try {
      suggestion = JSON.parse(res.content);
    } catch {
      return json(
        { error: "Failed to parse AI suggestion", raw: res.content },
        500,
      );
    }

    // Validate type
    const validTypes = ["next_meal", "weekly_plan", "warning", "tip"];
    const suggestionType = validTypes.includes(suggestion.type)
      ? suggestion.type
      : "tip";

    // ─── Store in ai_recommendations ───
    const todayDate = new Date().toISOString().split("T")[0];

    // Delete old suggestion of same type for today (replace with fresh)
    await supabase
      .from("ai_recommendations")
      .delete()
      .eq("user_id", user.id)
      .eq("type", suggestionType)
      .eq("valid_for_date", todayDate);

    const { error: insertError } = await supabase
      .from("ai_recommendations")
      .insert({
        user_id: user.id,
        type: suggestionType,
        content: suggestion.content,
        content_data: {
          reasoning: suggestion.reasoning,
          today_calories: todayTotals.calories,
          remaining,
          generated_at_hour: hour,
        },
        valid_for_date: todayDate,
      });

    if (insertError) {
      return json(
        { error: "Failed to store suggestion", details: insertError.message },
        500,
      );
    }

    return json({
      suggestion: {
        type: suggestionType,
        content: suggestion.content,
      },
    });
  } catch (err) {
    return json({ error: "AI suggestion failed", details: String(err) }, 502);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
