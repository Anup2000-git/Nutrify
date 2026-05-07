# Setup Guide — Phase 0

This is a one-time setup. Should take ~25 minutes.

## 1. Supabase project (5 min)

1. Go to https://app.supabase.com → **New project**
2. Choose region: **Singapore (ap-southeast-1)** or **Mumbai (ap-south-1)** — closest to India
3. Set a strong database password (save it in a password manager)
4. Wait ~2 min for the project to provision
5. Once ready: **Settings → API**, copy:
   - `Project URL` → `EXPO_PUBLIC_SUPABASE_URL` in `.env`
   - `anon public` key → `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env`

## 2. Apply database schema (5 min)

1. Supabase dashboard → **SQL Editor** → **New query**
2. Open `supabase/migrations/0001_initial_schema.sql` in your editor
3. Copy entire contents → paste into the SQL editor → **Run**
4. Verify: **Table editor** should now show all 10 tables (profiles, foods, meal_logs, etc.)

Then optionally seed sample foods:
1. New query → paste `supabase/seed.sql` → Run
2. Verify: `select * from foods` should return 10 rows

## 3. Azure OpenAI deployments (5 min)

You should already have an Azure OpenAI resource. If not:
1. Azure Portal → Create resource → Azure OpenAI
2. Once provisioned, open **Azure AI Studio** → Deployments
3. Deploy two models:
   - `gpt-4o` (vision + quick chat)
   - `gpt-5` (coach reasoning)
4. Note the **deployment name** for each (it's whatever name you chose, often the model name itself)
5. From the resource's **Keys and Endpoint** page, copy:
   - Endpoint URL → `AZURE_OPENAI_ENDPOINT` in `.env`
   - Key 1 → `AZURE_OPENAI_API_KEY` in `.env`
   - Set `AZURE_OPENAI_DEPLOYMENT_VISION` and `AZURE_OPENAI_DEPLOYMENT_COACH` to your deployment names

## 4. Install Expo Go on your Android phone (2 min)

1. Play Store → search **Expo Go** → Install
2. Open Expo Go (no signup needed for development)

## 5. Run the app (3 min)

In your project directory:

```powershell
npm install
npx expo start
```

A QR code appears in the terminal. On your phone:
- Open **Expo Go**
- Scan the QR code
- App should load with 4 bottom tabs: Home, Log, Coach, Profile

## 6. (Optional) Supabase CLI for edge functions (5 min)

To deploy edge functions later:

```powershell
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase functions deploy health
```

Test:
```powershell
curl https://<project-ref>.supabase.co/functions/v1/health `
  -H "Authorization: Bearer <anon-key>"
```

Should return `{ "status": "ok", "service": "nutrify-edge-functions", "timestamp": "..." }`.

## What's next

Phase 0 done. Phase 1 starts: real auth screens + 5-step onboarding.
