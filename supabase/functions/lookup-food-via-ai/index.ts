// Edge Function: lookup-food-via-ai
//
// POST { query: "Idli sambhar" }
// Returns: { food: <foods row inserted into DB> }
//
// Used when a user searches the foods table and doesn't find what they want.
// Calls Azure GPT-4o, parses the JSON, and inserts the food into the master DB
// with source='llm' and verified=false. Future searches will hit it directly.

// @ts-expect-error — Deno-specific imports resolved at edge runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { azureChat } from '../_shared/azure-openai.ts';
import { FOOD_LOOKUP_SYSTEM_PROMPT } from '../_shared/prompts.ts';

// @ts-expect-error — Deno global at edge runtime
const env = Deno.env;

// @ts-expect-error — Deno.serve at edge runtime
Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing Authorization' }, 401);

  let body: { query?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const query = body.query?.trim();
  if (!query || query.length < 2) {
    return json({ error: 'query must be at least 2 chars' }, 400);
  }
  if (query.length > 80) {
    return json({ error: 'query too long' }, 400);
  }

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

  // Call Azure GPT-4o (vision deployment is fine — also works for text)
  let aiContent: string;
  try {
    const res = await azureChat({
      deployment: 'quick',
      messages: [
        { role: 'system', content: FOOD_LOOKUP_SYSTEM_PROMPT },
        { role: 'user', content: query },
      ],
      temperature: 0.2,
      max_tokens: 600,
      response_format: { type: 'json_object' },
    });
    aiContent = res.content;
  } catch (err) {
    return json(
      {
        error: 'AI lookup failed',
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

  if (parsed.error) {
    return json({ error: 'not_a_food', message: String(parsed.error) }, 422);
  }

  // Sanity check required fields
  const required = [
    'name',
    'region',
    'category',
    'calories_per_100g',
    'protein_g',
    'carbs_g',
    'fat_g',
    'fiber_g',
  ];
  for (const f of required) {
    if (parsed[f] === undefined || parsed[f] === null) {
      return json({ error: 'AI response missing field', field: f, raw: parsed }, 502);
    }
  }

  // Insert into foods table.
  // RLS on foods only allows authenticated SELECT, not INSERT — we need to insert with service role.
  // Alternative: open up insert policy for authenticated users. For MVP, do that.
  const { data: inserted, error: insertError } = await supabase
    .from('foods')
    .insert({
      name: parsed.name,
      name_hindi: parsed.name_hindi ?? null,
      region: parsed.region,
      category: parsed.category,
      serving_size_g: parsed.serving_size_g ?? null,
      serving_label: parsed.serving_label ?? null,
      calories_per_100g: parsed.calories_per_100g,
      protein_g: parsed.protein_g,
      carbs_g: parsed.carbs_g,
      fat_g: parsed.fat_g,
      fiber_g: parsed.fiber_g,
      sugar_g: parsed.sugar_g ?? 0,
      sodium_mg: parsed.sodium_mg ?? 0,
      source: 'llm',
      verified: false,
    })
    .select()
    .single();

  if (insertError) {
    return json(
      { error: 'Failed to save food', details: insertError.message },
      500,
    );
  }

  return json({ food: inserted });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
