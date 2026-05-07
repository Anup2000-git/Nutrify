// Edge Function: health check.
// Runs in Deno on Supabase. Deploy with:
//   npx supabase functions deploy health
//
// Test with:
//   curl https://<project-ref>.supabase.co/functions/v1/health
//        -H "Authorization: Bearer <anon-key>"

// @ts-expect-error — Deno globals available at runtime in Supabase Edge Functions
Deno.serve(() => {
  return new Response(
    JSON.stringify({
      status: 'ok',
      service: 'nutrify-edge-functions',
      timestamp: new Date().toISOString(),
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
