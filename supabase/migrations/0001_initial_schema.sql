-- =====================================================
-- Nutrify — Initial Schema (Phase 0)
-- =====================================================
-- Apply this in your Supabase project:
--   Dashboard → SQL Editor → New query → paste → Run
-- =====================================================

-- -----------------------------
-- Enums
-- -----------------------------
create type goal_type as enum ('weight_loss', 'weight_gain', 'maintain', 'muscle_gain', 'general');
create type activity_level as enum ('sedentary', 'light', 'moderate', 'heavy');
create type life_stage as enum ('student', 'working', 'pregnant', 'postpartum', 'senior');
create type diet_preference as enum ('veg', 'non_veg', 'vegan', 'jain', 'eggetarian');
create type gender_type as enum ('male', 'female', 'other');
create type meal_type as enum ('breakfast', 'lunch', 'snack', 'dinner');
create type food_source as enum ('ifct', 'usda', 'openfoodfacts', 'llm', 'user');
create type food_region as enum ('north', 'south', 'east', 'northeast', 'west', 'global');
create type food_category as enum ('grain', 'dal', 'sabzi', 'snack', 'fruit', 'dairy', 'meat', 'beverage', 'sweets');
create type goal_status as enum ('active', 'paused', 'achieved', 'abandoned');
create type photo_upload_status as enum ('pending', 'uploaded', 'failed');
create type photo_analysis_status as enum ('pending', 'done', 'failed');
create type ai_recommendation_type as enum ('next_meal', 'weekly_plan', 'warning', 'tip');
create type ai_role as enum ('user', 'assistant');

-- -----------------------------
-- 1. profiles (extends auth.users)
-- -----------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  date_of_birth date,
  gender gender_type,
  height_cm numeric(5,2),
  current_weight_kg numeric(5,2),
  goal goal_type,
  activity_level activity_level,
  life_stage life_stage,
  diet_preference diet_preference,
  daily_calorie_target integer,
  daily_protein_g integer,
  daily_carbs_g integer,
  daily_fat_g integer,
  daily_water_ml integer default 2500,
  timezone text default 'Asia/Kolkata',
  locale text default 'en-IN',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- -----------------------------
-- 2. foods (master DB)
-- -----------------------------
create table foods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_hindi text,
  regional_names jsonb default '{}'::jsonb,
  region food_region default 'global',
  category food_category,
  serving_size_g numeric(8,2),
  serving_label text,
  calories_per_100g numeric(8,2) not null,
  protein_g numeric(8,2) not null default 0,
  carbs_g numeric(8,2) not null default 0,
  fat_g numeric(8,2) not null default 0,
  fiber_g numeric(8,2) not null default 0,
  sugar_g numeric(8,2) default 0,
  sodium_mg numeric(8,2) default 0,
  calcium_mg numeric(8,2) default 0,
  iron_mg numeric(8,2) default 0,
  vitamin_c_mg numeric(8,2) default 0,
  micros jsonb default '{}'::jsonb,
  source food_source default 'llm',
  verified boolean default false,
  created_at timestamptz default now()
);

create index idx_foods_name on foods using gin (to_tsvector('english', name));
create index idx_foods_region on foods (region);
create index idx_foods_category on foods (category);

-- -----------------------------
-- 3. meal_logs
-- -----------------------------
create table meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  food_id uuid references foods(id) on delete set null,
  custom_food_name text,
  custom_food_macros jsonb,
  quantity_g numeric(8,2) not null,
  quantity_label text,
  meal_type meal_type not null,
  logged_at timestamptz not null default now(),
  photo_url text,
  -- Snapshot of macros (so historical records don't change if food DB is updated)
  calories numeric(8,2),
  protein_g numeric(8,2),
  carbs_g numeric(8,2),
  fat_g numeric(8,2),
  fiber_g numeric(8,2),
  notes text,
  created_at timestamptz default now()
);

create index idx_meal_logs_user_date on meal_logs (user_id, logged_at desc);

-- -----------------------------
-- 4. weight_logs
-- -----------------------------
create table weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weight_kg numeric(5,2) not null,
  logged_at timestamptz not null default now(),
  notes text,
  created_at timestamptz default now()
);

create index idx_weight_logs_user_date on weight_logs (user_id, logged_at desc);

-- -----------------------------
-- 5. daily_summaries (cached for fast dashboard)
-- -----------------------------
create table daily_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  total_calories numeric(10,2) default 0,
  total_protein_g numeric(10,2) default 0,
  total_carbs_g numeric(10,2) default 0,
  total_fat_g numeric(10,2) default 0,
  total_fiber_g numeric(10,2) default 0,
  water_ml integer default 0,
  meal_count integer default 0,
  weight_kg numeric(5,2),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, date)
);

create index idx_daily_summaries_user_date on daily_summaries (user_id, date desc);

-- -----------------------------
-- 6. ai_conversations (coach chat history)
-- -----------------------------
create table ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role ai_role not null,
  message text not null,
  context_data jsonb,
  model_used text,
  tokens_used integer,
  created_at timestamptz default now()
);

create index idx_ai_conv_user_date on ai_conversations (user_id, created_at desc);

-- -----------------------------
-- 7. ai_recommendations
-- -----------------------------
create table ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type ai_recommendation_type not null,
  content text not null,
  content_data jsonb,
  valid_for_date date,
  accepted boolean default false,
  created_at timestamptz default now()
);

create index idx_ai_rec_user_date on ai_recommendations (user_id, valid_for_date desc);

-- -----------------------------
-- 8. goals (history)
-- -----------------------------
create table goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_type goal_type not null,
  start_weight_kg numeric(5,2),
  target_weight_kg numeric(5,2),
  target_date date,
  status goal_status default 'active',
  created_at timestamptz default now(),
  completed_at timestamptz
);

create index idx_goals_user on goals (user_id, status);

-- -----------------------------
-- 9. food_photos
-- -----------------------------
create table food_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  file_size integer,
  mime_type text,
  upload_status photo_upload_status default 'pending',
  ai_analysis_status photo_analysis_status default 'pending',
  ai_detected_foods jsonb,
  linked_meal_log_id uuid references meal_logs(id) on delete set null,
  created_at timestamptz default now()
);

create index idx_food_photos_user on food_photos (user_id, created_at desc);

-- -----------------------------
-- 10. app_feedback
-- -----------------------------
create table app_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  message text not null,
  rating integer check (rating between 1 and 5),
  screenshot_url text,
  created_at timestamptz default now()
);

-- =====================================================
-- Triggers — auto-update updated_at
-- =====================================================
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

create trigger daily_summaries_updated_at before update on daily_summaries
  for each row execute function set_updated_at();

-- =====================================================
-- Auto-create profile on user signup
-- =====================================================
create or replace function handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =====================================================
-- Row Level Security
-- =====================================================
alter table profiles enable row level security;
alter table meal_logs enable row level security;
alter table weight_logs enable row level security;
alter table daily_summaries enable row level security;
alter table ai_conversations enable row level security;
alter table ai_recommendations enable row level security;
alter table goals enable row level security;
alter table food_photos enable row level security;
alter table app_feedback enable row level security;
alter table foods enable row level security;

-- Profiles: user can read/update own
create policy "Users read own profile" on profiles
  for select using (auth.uid() = id);
create policy "Users update own profile" on profiles
  for update using (auth.uid() = id);

-- Meal logs: full CRUD on own rows
create policy "Users CRUD own meal logs" on meal_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Weight logs
create policy "Users CRUD own weight logs" on weight_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Daily summaries
create policy "Users read own summaries" on daily_summaries
  for select using (auth.uid() = user_id);
create policy "System inserts summaries" on daily_summaries
  for insert with check (auth.uid() = user_id);
create policy "System updates own summaries" on daily_summaries
  for update using (auth.uid() = user_id);

-- AI conversations
create policy "Users CRUD own AI convs" on ai_conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- AI recommendations
create policy "Users CRUD own AI recs" on ai_recommendations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Goals
create policy "Users CRUD own goals" on goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Food photos
create policy "Users CRUD own photos" on food_photos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- App feedback (insert only, by user)
create policy "Users insert own feedback" on app_feedback
  for insert with check (auth.uid() = user_id);

-- Foods: read by all authenticated users (master DB), insert/update only by service role
create policy "Authenticated users read foods" on foods
  for select using (auth.role() = 'authenticated');
