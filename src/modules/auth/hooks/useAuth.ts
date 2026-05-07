/**
 * Auth hooks — bridge between Supabase auth, the Zustand store, and React.
 *
 * - useAuthInit(): call once at the app root. Loads existing session + profile
 *   and subscribes to auth state changes.
 * - useAuth(): read current session/user/profile/initialized status anywhere.
 */

import { useEffect } from 'react';

import {
  getCurrentSession,
  subscribeToAuthChanges,
} from '../services/authService';
import { fetchProfile } from '../services/profileFetch';
import { useAuthStore } from '../store/authStore';

export function useAuthInit() {
  const setSession = useAuthStore((s) => s.setSession);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setInitialized = useAuthStore((s) => s.setInitialized);

  useEffect(() => {
    let mounted = true;

    async function loadProfile(userId: string) {
      try {
        const profile = await fetchProfile(userId);
        if (mounted) setProfile(profile);
      } catch (err) {
        console.warn('[auth] profile fetch failed', err);
        if (mounted) setProfile(null);
      }
    }

    (async () => {
      const session = await getCurrentSession();
      if (!mounted) return;
      setSession(session);
      if (session?.user) await loadProfile(session.user.id);
      if (mounted) setInitialized(true);
    })();

    const unsubscribe = subscribeToAuthChanges(async (session) => {
      if (!mounted) return;
      setSession(session);
      if (session?.user) {
        await loadProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [setSession, setProfile, setInitialized]);
}

export function useAuth() {
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const initialized = useAuthStore((s) => s.initialized);
  return {
    session,
    user: session?.user ?? null,
    profile,
    isAuthenticated: !!session,
    initialized,
  };
}

export function useRefreshProfile() {
  const session = useAuthStore((s) => s.session);
  const setProfile = useAuthStore((s) => s.setProfile);

  return async () => {
    if (!session?.user) return;
    const profile = await fetchProfile(session.user.id);
    setProfile(profile);
  };
}
