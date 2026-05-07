/**
 * Auth + profile state store (Zustand).
 *
 * Bundles session and the user's profile row in one place because they
 * always travel together — the app needs both to decide routing
 * (login → onboarding → tabs).
 */

import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import type { Profile } from '@/src/types/models';

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  initialized: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setInitialized: (initialized: boolean) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  profile: null,
  initialized: false,
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setInitialized: (initialized) => set({ initialized }),
}));
