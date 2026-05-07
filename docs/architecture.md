# Nutrify Architecture

## High-level

```
[ React Native + Expo (Android-first, iOS supported) ]
                  ↓ HTTPS
[ Supabase managed cloud ]
   ├── PostgreSQL (10 tables, RLS-protected)
   ├── Auth (email + Google OAuth)
   ├── Storage (food photos)
   └── Edge Functions (Deno) → proxy LLM calls
                  ↓ HTTPS
[ Azure OpenAI ]
   ├── GPT-4o deployment → vision + quick chat
   └── GPT-5 deployment   → deep coaching, weekly roadmaps
```

## Modular monolith

The mobile app is a single deployable unit, but **internally organized as feature modules** with strict boundaries.

```
src/modules/
├── auth/
├── onboarding/
├── food-logging/
├── ai-coach/
├── tracking/
├── nutrition-db/
└── analytics/
```

**Module boundary rule:** Modules only talk to each other via `api.ts`. No deep imports across module internals. This keeps modules independently extractable later — e.g., if `ai-coach` ever needs its own service, the public API surface stays the same.

## Data flow examples

### Logging a meal from a photo

1. User taps Log → opens camera (Expo Camera)
2. Photo captured → uploaded to Supabase Storage (`food_photos` bucket)
3. App calls `analyze-food-photo` edge function with the storage path
4. Edge function fetches image, calls Azure OpenAI GPT-4o vision deployment with `FOOD_VISION_SYSTEM_PROMPT`
5. Response parsed → `meal_logs` row inserted, `food_photos.linked_meal_log_id` set
6. App shows the detected items with edit-and-confirm UI
7. `daily_summaries` updated by trigger / batch job

### AI coach chat

1. User sends message in Coach tab
2. App calls `ai-coach-chat` edge function with message + recent context
3. Edge function loads user profile + last 7 days of `meal_logs` + active `goals`
4. Builds persona context via `buildPersonaContext()`
5. Calls Azure OpenAI GPT-5 deployment with persona-aware system prompt
6. Stores user message + assistant reply in `ai_conversations`
7. Returns response to app

## Why these choices

| Choice | Reason |
|---|---|
| Expo (React Native) | Single codebase, fast iteration, EAS Build solves "works on my machine" |
| Supabase managed | All-in-one (DB + Auth + Storage + Functions), free tier covers ~50K users |
| Modular monolith | Solo dev shipping speed > microservices ceremony. Clean module boundaries make future extraction painless. |
| Azure OpenAI via Edge Functions | API key stays server-side; client never sees it. Latency added is small (~100ms). |
| Postgres RLS | Single source of truth for authorization — DB rejects unauthorized queries even if app code has a bug. |
| NativeWind (Tailwind) | Premium UX achievable solo. Consistent design without writing many StyleSheets. |

## Future extraction path

If `ai-coach` becomes hot (heavy GPU compute, batch jobs):

1. Lift `src/modules/ai-coach/services/` into a separate Deno/Node service.
2. Re-export `ai-coach/api.ts` to call that service over HTTP instead of inline.
3. Mobile app code unchanged — module boundary makes this a one-file edit.

Same pattern for any other module.
