// Edge Function: suggest-daily-targets
//
// POST {}  (no body — uses logged-in user's profile from DB)
// Returns: {
//   calories, protein_g, carbs_g, fat_g, water_ml,
//   reasoning, weekly_change_estimate_kg, warning
// }
//
// Calls Azure GPT-5 (coach deployment) with the user's full persona,
// asking for context-aware target recommendations.

// @ts-expect-error — Deno-specific imports resolved at edge runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { azureChat } from '../_shared/azure-openai.ts';

// @ts-expect-error — Deno global at edge runtime
const env = Deno.env;

const SYSTEM_PROMPT = `
You are Nutrify's expert nutrition coach. Given a user's profile, calculate context-aware daily nutrition targets for their goal.

Apply these principles:
- Sustainable weight change rate: 0.5-0.75 kg per week max for loss/gain
- Protein: 1.6-2.2 g/kg bodyweight for active/muscle, 1.2-1.4 g/kg sedentary
- Pregnant: +300 kcal, postpartum (nursing): +400-500 kcal, +1.4 g/kg protein min
- Indian veg/jain users: prioritize dal, paneer, sprouts for protein adequacy
- Hydration: 33-40 ml/kg/day; +500-700 ml for heavy activity or pregnancy
- Calorie floor: never below 1500 (men) / 1200 (women) for safety

Respond ONLY with a single valid JSON object (no markdown, no prose):
{
  "calories": <integer>,
  "protein_g": <integer>,
  "carbs_g": <integer>,
  "fat_g": <integer>,
  "water_ml": <integer>,
  "reasoning": "<2-3 sentences in Hinglish (Roman script Hindi + English) explaining the choice>",
  "weekly_change_estimate_kg": <number, positive or negative>,
  "warning": <string or null — e.g. 'Aggressive deficit, monitor energy levels' or null>
}
`.trim();

// @ts-expect-error — Deno.serve at edge runtime
Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing Authorization' }, 401);

  const supabaseUrl = env.get('SUPABASE_URL');
  const anonKey = env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !anonKey) return json({ error: 'Edge misconfigured' }, 500);

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return json({ error: 'Invalid auth' }, 401);

  // Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  if (profileError || !profile) {
    return json({ error: 'Profile not found' }, 404);
  }

  // Compute age
  let age: number | null = null;
  if (profile.date_of_birth) {
    const dob = new Date(profile.date_of_birth);
    const now = new Date();
    age = now.getFullYear() - dob.getFullYear();
    const m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  }

  const userContext = `
User profile:
- Goal: ${profile.goal ?? 'unknown'}
- Activity level: ${profile.activity_level ?? 'unknown'}
- Life stage: ${profile.life_stage ?? 'unknown'}
- Diet preference: ${profile.diet_preference ?? 'unknown'}
- Gender: ${profile.gender ?? 'unknown'}
- Age: ${age ?? 'unknown'} years
- Height: ${profile.height_cm ?? 'unknown'} cm
- Current weight: ${profile.current_weight_kg ?? 'unknown'} kg

Provide their optimal daily nutrition targets in JSON.
`.trim();

  let aiContent: string;
  try {
    const res = await azureChat({
      deployment: 'coach',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContext },
      ],
      temperature: 0.4,
      max_tokens: 700,
      response_format: { type: 'json_object' },
    });
    aiContent = res.content;
  } catch (err) {
    return json(
      {
        error: 'AI suggestion failed',
        details: err instanceof Error ? err.message : String(err),
      },
      502,
    );
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(aiContent);
  } catch {
    return json({ error: 'AI returned invalid JSON', raw: aiContent }, 502);
  }

  return json(parsed);
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
