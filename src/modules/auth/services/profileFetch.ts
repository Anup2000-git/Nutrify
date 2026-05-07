import { supabase } from '@/src/lib/supabase';
import type { Profile } from '@/src/types/models';

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No profile row found — auto-create trigger may not have fired yet.
      return null;
    }
    throw error;
  }

  return data as unknown as Profile;
}
