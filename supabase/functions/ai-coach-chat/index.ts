// @ts-expect-error — Deno-specific imports resolved at edge runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { azureChat } from "../_shared/azure-openai.ts";

// @ts-expect-error — Deno global at edge runtime
const env = Deno.env;

// ─── Persona configs (mirrors src/constants/personas.ts for edge runtime) ───

const goalPersona: Record<string, string> = {
  weight_loss:
    "User wants to lose weight sustainably. Prioritize calorie deficit (~500 kcal under TDEE), high protein, high fiber, low refined carbs. Discourage extreme deficits.",
  weight_gain:
    "User wants to gain weight healthily. Prioritize calorie surplus (~300-500 kcal over TDEE), nutrient-dense foods, frequent small meals.",
  maintain:
    "User wants to maintain current weight. Focus on consistent calorie balance and balanced macros.",
  muscle_gain:
    "User is building muscle. Prioritize 1.6-2.2g protein per kg bodyweight, slight calorie surplus, complex carbs around training.",
  general:
    "User wants overall healthy eating. Focus on whole foods, variety, fiber, and avoiding ultra-processed foods.",
};

const activityPersona: Record<string, string> = {
  sedentary:
    "Low daily activity. TDEE multiplier ~1.2. Suggest small post-meal walks.",
  light: "Light activity (walk, yoga 1-3x/week). TDEE multiplier ~1.375.",
  moderate:
    "Moderate exercise 3-5x/week. TDEE multiplier ~1.55. Time carbs around workouts.",
  heavy:
    "Heavy gym training 5-7x/week. TDEE multiplier ~1.725. High protein, complex carbs, focus on recovery.",
};

const lifeStagePersona: Record<string, string> = {
  student:
    "Likely budget-conscious, may eat hostel mess or street food. Suggest affordable, easy-to-find options.",
  working:
    "Office routine, lunch often packed or canteen. Suggest meal-prep options and quick healthy alternatives.",
  pregnant:
    "Pregnant — emphasize folic acid, iron, calcium, B12. Avoid raw fish, unpasteurized dairy, excess caffeine. Always recommend doctor consult.",
  postpartum:
    "Postpartum / nursing. Calorie needs slightly elevated (+300-500 kcal if breastfeeding). Iron, calcium, hydration priority.",
  senior:
    "Senior — prioritize protein for muscle preservation, calcium and vitamin D for bones, fiber for digestion, low sodium.",
};

const dietPersona: Record<string, string> = {
  veg: "Vegetarian (no meat, no eggs, dairy OK). Emphasize dal, paneer, tofu, sprouts for protein. Watch B12 and iron.",
  non_veg: "Eats meat, fish, eggs. Wide protein options.",
  vegan:
    "No animal products. B12 supplementation needed. Plant proteins: dal, soya, tofu, tempeh, nuts.",
  jain: "No meat/eggs/onion/garlic/root vegetables. Dairy + grains + above-ground vegetables only.",
  eggetarian: "Vegetarian + eggs. Eggs add complete protein, B12.",
};

function buildPersonaContext(profile: any): string {
  const parts: string[] = [];
  if (profile.goal && goalPersona[profile.goal])
    parts.push(`Goal: ${goalPersona[profile.goal]}`);
  if (profile.activity_level && activityPersona[profile.activity_level])
    parts.push(`Activity: ${activityPersona[profile.activity_level]}`);
  if (profile.life_stage && lifeStagePersona[profile.life_stage])
    parts.push(`Life stage: ${lifeStagePersona[profile.life_stage]}`);
  if (profile.diet_preference && dietPersona[profile.diet_preference])
    parts.push(`Diet: ${dietPersona[profile.diet_preference]}`);
  return parts.join("\n\n");
}

// ─── Coach system prompt ───

const COACH_PROMPT_BASE = `You are Nutrify's AI nutrition coach. You are NOT a doctor — never diagnose disease.
Speak naturally, like a thoughtful, supportive coach who knows the user well.
Avoid scripted, generic advice. Reference the user's actual data when giving suggestions.
Keep replies concise (2-4 sentences) unless the user asks for detail.
You support Hinglish freely — match the user's language style.
If the user greets you, greet back warmly and offer a quick actionable tip based on their current data.`;

function buildSystemPrompt(
  personaContext: string,
  userContext: string,
): string {
  return `${COACH_PROMPT_BASE}

PERSONA CONTEXT:
${personaContext}

USER CONTEXT:
${userContext}`;
}

// ─── Handler ───

// @ts-expect-error — Deno.serve at edge runtime
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "Missing Authorization header" }, 401);
  }

  let body: { message: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (!body.message || typeof body.message !== "string") {
    return json({ error: "message required" }, 400);
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

  // ─── Insert user message ───
  await supabase.from("ai_conversations").insert({
    user_id: user.id,
    role: "user",
    message: body.message,
  });

  // ─── Fetch profile ───
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // ─── Fetch last 7 days of meals ───
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const { data: meals } = await supabase
    .from("meal_logs")
    .select(
      "custom_food_name, quantity_g, calories, protein_g, carbs_g, fat_g, fiber_g, meal_type, logged_at, food:foods(name)",
    )
    .eq("user_id", user.id)
    .gte("logged_at", sevenDaysAgo.toISOString())
    .order("logged_at", { ascending: false });

  // Group meals by date
  const today = new Date().toISOString().split("T")[0];
  const mealsByDate: Record<string, string[]> = {};
  for (const m of (meals || []) as any[]) {
    const foodName =
      m.custom_food_name ||
      (Array.isArray(m.food) ? m.food[0]?.name : m.food?.name) ||
      "Unknown";
    const date = (m.logged_at as string).split("T")[0];
    if (!mealsByDate[date]) mealsByDate[date] = [];
    mealsByDate[date].push(
      `  - ${m.meal_type}: ${foodName} (${m.quantity_g}g) → ${m.calories} kcal, P:${m.protein_g}g C:${m.carbs_g}g F:${m.fat_g}g`,
    );
  }

  let mealContext = "";
  if (mealsByDate[today]) {
    mealContext += `Today's meals:\n${mealsByDate[today].join("\n")}`;
    const todayMeals = (meals || []).filter((m: any) =>
      (m.logged_at as string).startsWith(today),
    );
    const todayTotals = todayMeals.reduce(
      (acc: any, m: any) => ({
        calories: acc.calories + (m.calories || 0),
        protein: acc.protein + (m.protein_g || 0),
        carbs: acc.carbs + (m.carbs_g || 0),
        fat: acc.fat + (m.fat_g || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
    mealContext += `\n  TOTALS today: ${Math.round(todayTotals.calories)} kcal, P:${Math.round(todayTotals.protein)}g C:${Math.round(todayTotals.carbs)}g F:${Math.round(todayTotals.fat)}g`;
    mealContext += `\n  Target: ${profile?.daily_calorie_target || 2000} kcal, P:${profile?.daily_protein_g || 120}g C:${profile?.daily_carbs_g || 250}g F:${profile?.daily_fat_g || 65}g`;
    const remaining =
      (profile?.daily_calorie_target || 2000) - todayTotals.calories;
    mealContext += `\n  Remaining: ${Math.round(remaining)} kcal`;
  } else {
    mealContext += "Today: No meals logged yet.";
  }

  // Recent days summary (3 days excluding today)
  const recentDates = Object.keys(mealsByDate)
    .filter((d) => d !== today)
    .sort()
    .reverse()
    .slice(0, 3);
  if (recentDates.length > 0) {
    mealContext += "\n\nRecent days:";
    for (const date of recentDates) {
      mealContext += `\n${date}:\n${mealsByDate[date].slice(0, 5).join("\n")}`;
      if (mealsByDate[date].length > 5)
        mealContext += `\n  ... and ${mealsByDate[date].length - 5} more items`;
    }
  }

  // ─── Fetch active goals ───
  const { data: goals } = await supabase
    .from("goals")
    .select("goal_type, start_weight_kg, target_weight_kg, target_date, status")
    .eq("user_id", user.id)
    .eq("status", "active");

  let goalsContext = "";
  if (goals && goals.length > 0) {
    goalsContext =
      "\n\nActive Goals:\n" +
      goals
        .map((g: any) => {
          let goalStr = `- ${g.goal_type}`;
          if (g.start_weight_kg && g.target_weight_kg)
            goalStr += ` (${g.start_weight_kg}kg → ${g.target_weight_kg}kg)`;
          if (g.target_date) goalStr += ` by ${g.target_date}`;
          return goalStr;
        })
        .join("\n");
  }

  // ─── Build full context ───
  const userContext = `Profile: ${profile?.full_name || "User"}, ${profile?.gender || "unknown"}, ${profile?.current_weight_kg || "?"}kg, ${profile?.height_cm || "?"}cm
${mealContext}${goalsContext}`;

  const personaContext = buildPersonaContext(profile || {});
  const fullSystemPrompt = buildSystemPrompt(personaContext, userContext);

  // ─── Fetch conversation history (last 10 messages) ───
  const { data: history } = await supabase
    .from("ai_conversations")
    .select("role, message")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const previousMessages = (history || []).reverse().map((msg: any) => ({
    role: msg.role,
    content: msg.message,
  }));

  // Reasoning model compatible format (user+assistant prefix)
  const messages = [
    {
      role: "user",
      content: `[SYSTEM INSTRUCTIONS — follow these for all responses]\n${fullSystemPrompt}\n[END INSTRUCTIONS]`,
    },
    {
      role: "assistant",
      content:
        "Understood! I have your profile, meal data, and goals. I'll be your concise, practical nutrition coach. How can I help?",
    },
    ...previousMessages,
  ];

  // ─── Call Azure OpenAI ───
  const deploymentName =
    env.get("AZURE_OPENAI_DEPLOYMENT_COACH") ||
    env.get("AZURE_OPENAI_DEPLOYMENT_VISION") ||
    "unknown";
  let aiContent: string;
  let tokensUsed: number | null = null;

  try {
    const res = await azureChat({
      deployment: "coach",
      // @ts-ignore
      messages,
      max_tokens: 16000,
    });
    aiContent = res.content;
    tokensUsed = res.usage?.total_tokens ?? null;
  } catch (err) {
    return json(
      { error: "Azure OpenAI call failed", details: String(err) },
      502,
    );
  }

  // ─── Insert assistant response with tracking ───
  await supabase.from("ai_conversations").insert({
    user_id: user.id,
    role: "assistant",
    message: aiContent,
    model_used: deploymentName,
    tokens_used: tokensUsed,
    context_data: {
      persona: profile?.goal || "general",
      meals_in_context: (meals || []).length,
      goals_active: (goals || []).length,
    },
  });

  return json({ message: aiContent });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
