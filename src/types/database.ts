/**
 * Hand-rolled type stub mirroring 0001_initial_schema.sql.
 *
 * Once `supabase` CLI is set up, regenerate via:
 *   npx supabase gen types typescript --project-id <id> > src/types/database.ts
 */

import type {
  ActivityLevel,
  DietPreference,
  Gender,
  Goal,
  LifeStage,
} from './models';

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  date_of_birth: string | null;
  gender: Gender | null;
  height_cm: number | null;
  current_weight_kg: number | null;
  goal: Goal | null;
  activity_level: ActivityLevel | null;
  life_stage: LifeStage | null;
  diet_preference: DietPreference | null;
  daily_calorie_target: number | null;
  daily_protein_g: number | null;
  daily_carbs_g: number | null;
  daily_fat_g: number | null;
  daily_water_ml: number | null;
  timezone: string | null;
  locale: string | null;
  created_at: string;
  updated_at: string;
};

type GenericRow = Record<string, unknown> & { id?: string };

type GenericTable = {
  Row: GenericRow;
  Insert: GenericRow;
  Update: Partial<GenericRow>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { id: string };
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      foods: GenericTable;
      meal_logs: GenericTable;
      weight_logs: GenericTable;
      daily_summaries: GenericTable;
      ai_conversations: GenericTable;
      ai_recommendations: GenericTable;
      goals: GenericTable;
      food_photos: GenericTable;
      app_feedback: GenericTable;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
