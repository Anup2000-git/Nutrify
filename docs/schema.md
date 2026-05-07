# Database Schema

10 tables in the `public` schema. All user-owned tables have Row Level Security enabled — the database itself rejects unauthorized cross-user access.

## Tables

### `profiles`
Extends `auth.users`. Holds onboarding answers (goal, activity, life stage, diet preference) and stats (height, current weight, daily targets). Auto-created by trigger on signup.

### `foods`
Master food database. Combines IFCT 2017 (Indian foods), USDA, Open Food Facts, and LLM-generated entries. `verified` flag marks human-reviewed entries. Indexed full-text on name.

### `meal_logs`
User's food entries. References `foods.id` for known items, or stores `custom_food_name` + `custom_food_macros` JSONB for one-off LLM-generated entries. Macros snapshotted at log time so historical records stay stable even if `foods` row is updated later.

### `weight_logs`
Weight history. One row per logging event.

### `daily_summaries`
Cached per-day rollup (calories, macros, water, weight). Updated by trigger or batch job. Speeds up the dashboard — avoids scanning `meal_logs` for the home screen.

### `ai_conversations`
Coach chat history. Each turn (user or assistant) is a row. `context_data` JSONB stores what was passed to the LLM for reproducibility/debugging.

### `ai_recommendations`
Proactive suggestions ("eat lighter dinner", "you're behind on protein"). Tied to a `valid_for_date`. `accepted` lets us learn what users actually find useful.

### `goals`
Goal history. Lets users change goals and view past attempts. Status enum tracks active/paused/achieved/abandoned.

### `food_photos`
Uploaded images metadata. Tracks upload + AI analysis status. Links back to the `meal_logs` row created from the analysis.

### `app_feedback`
Free-text feedback + rating. Used during beta to triage UX issues.

## Enums

`goal_type`, `activity_level`, `life_stage`, `diet_preference`, `gender_type`, `meal_type`, `food_source`, `food_region`, `food_category`, `goal_status`, `photo_upload_status`, `photo_analysis_status`, `ai_recommendation_type`, `ai_role`.

## Security

RLS policies on every table:
- `profiles` — user reads/updates own row only
- `meal_logs / weight_logs / daily_summaries / ai_conversations / ai_recommendations / goals / food_photos` — user has full CRUD on own `user_id` rows only
- `foods` — all authenticated users can read; only service role can write (admin imports)
- `app_feedback` — user can insert their own rows

The mobile app uses the **anon** key — RLS is what actually enforces user isolation. Edge functions can use the **service role** key when they need to bypass RLS (e.g., admin imports of food DB).

## Migrations

Located in `supabase/migrations/`. Numbered prefix (`0001_`, `0002_`, ...) determines apply order.

To regenerate the `Database` TypeScript types after schema changes:

```bash
npx supabase gen types typescript --project-id <id> > src/types/database.ts
```
