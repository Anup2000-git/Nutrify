// Edge Function: analyze-food-photo
//
// POST { photoStoragePath: "userId/photoId.jpg" }
// Returns: { detectedFoods: [...], meal_type: "lunch" }
//
// Flow:
//   1. Verify the caller's JWT and user
//   2. Confirm the photo path belongs to the caller (security)
//   3. Generate a short-lived signed URL for the photo
//   4. Send signed URL to Azure OpenAI GPT-4o vision deployment
//   5. Parse JSON response and return

// @ts-expect-error — Deno-specific imports resolved at edge runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { azureChat } from '../_shared/azure-openai.ts';
import { FOOD_VISION_SYSTEM_PROMPT } from '../_shared/prompts.ts';

// @ts-expect-error — Deno global at edge runtime
const env = Deno.env;

// @ts-expect-error — Deno.serve at edge runtime
Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json({ error: 'Missing Authorization header' }, 401);
  }

  let body: { photoStoragePath?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const photoStoragePath = body.photoStoragePath;
  if (!photoStoragePath || typeof photoStoragePath !== 'string') {
    return json({ error: 'photoStoragePath required' }, 400);
  }

  // Supabase client scoped to this user via their JWT.
  const supabaseUrl = env.get('SUPABASE_URL');
  const anonKey = env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !anonKey) {
    return json({ error: 'Edge function misconfigured' }, 500);
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return json({ error: 'Invalid auth' }, 401);
  }

  // Security: photo path must start with the user's id.
  if (!photoStoragePath.startsWith(`${user.id}/`)) {
    return json({ error: 'Forbidden — path does not belong to user' }, 403);
  }

  // Generate signed URL valid for 5 minutes — Azure OpenAI fetches the image.
  const { data: signedData, error: signedError } = await supabase.storage
    .from('food-photos')
    .createSignedUrl(photoStoragePath, 300);

  if (signedError || !signedData?.signedUrl) {
    return json(
      { error: 'Failed to generate signed URL', details: signedError?.message },
      500,
    );
  }

  // Azure OpenAI vision call
  let aiContent: string;
  try {
    const res = await azureChat({
      deployment: 'vision',
      messages: [
        { role: 'system', content: FOOD_VISION_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this meal photo and identify each food item with macros.' },
            { type: 'image_url', image_url: { url: signedData.signedUrl } },
          ],
        },
      ],
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    });
    aiContent = res.content;
  } catch (err) {
    return json(
      {
        error: 'Azure OpenAI call failed',
        details: err instanceof Error ? err.message : String(err),
      },
      502,
    );
  }

  // Parse the JSON the model returned
  let parsed: unknown;
  try {
    parsed = JSON.parse(aiContent);
  } catch {
    return json({ error: 'Model returned invalid JSON', raw: aiContent }, 502);
  }

  return json(parsed);
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
