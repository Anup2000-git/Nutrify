/**
 * Auth service — pure functions wrapping Supabase Auth.
 * No React, no hooks. Hooks live in `../hooks/useAuth.ts`.
 */

import type { Session } from "@supabase/supabase-js";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";

import { supabase } from "@/src/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

export type AuthError = { message: string };

export async function signUp(input: {
  email: string;
  password: string;
  fullName: string;
}): Promise<{ session: Session | null; error: AuthError | null }> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: {
      data: { full_name: input.fullName.trim() },
    },
  });
  if (error) return { session: null, error: { message: error.message } };
  return { session: data.session, error: null };
}

export async function signIn(input: {
  email: string;
  password: string;
}): Promise<{ session: Session | null; error: AuthError | null }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email.trim().toLowerCase(),
    password: input.password,
  });
  if (error) return { session: null, error: { message: error.message } };
  return { session: data.session, error: null };
}

export async function signOut(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signOut();
  if (error) return { error: { message: error.message } };
  return { error: null };
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function signInWithGoogle(): Promise<{
  session: Session | null;
  error: AuthError | null;
}> {
  const redirectUrl = AuthSession.makeRedirectUri({ path: "auth/callback" });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    return {
      session: null,
      error: { message: error?.message ?? "Failed to start OAuth" },
    };
  }

  // Open browser for auth
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

  if (result.type !== "success" || !("url" in result)) {
    return { session: null, error: { message: "Login cancelled" } };
  }

  // Extract tokens from the redirect URL
  const url = new URL(result.url);
  const params = new URLSearchParams(url.hash.replace("#", ""));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (!accessToken || !refreshToken) {
    return { session: null, error: { message: "Missing tokens in response" } };
  }

  const { data: sessionData, error: sessionError } =
    await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

  if (sessionError) {
    return { session: null, error: { message: sessionError.message } };
  }

  return { session: sessionData.session, error: null };
}

export function subscribeToAuthChanges(
  callback: (session: Session | null) => void,
): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => data.subscription.unsubscribe();
}
