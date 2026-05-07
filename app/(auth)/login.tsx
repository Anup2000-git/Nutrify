import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";

import { signIn, signInWithGoogle } from "@/src/modules/auth/api";
import { Button } from "@/src/shared/ui/Button";
import { Input } from "@/src/shared/ui/Input";
import { Screen } from "@/src/shared/ui/Screen";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleLogin() {
    setError(null);

    if (!email.trim() || !password) {
      setError("Email aur password dono daalo");
      return;
    }

    setLoading(true);
    const { error: authError } = await signIn({ email, password });
    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    router.replace("/(tabs)");
  }

  async function handleGoogleLogin() {
    setError(null);
    setGoogleLoading(true);
    const { error: authError } = await signInWithGoogle();
    setGoogleLoading(false);

    if (authError) {
      if (authError.message !== "Login cancelled") {
        setError(authError.message);
      }
      return;
    }

    router.replace("/(tabs)");
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1"
    >
      <Screen scroll={false} contentClassName="px-6 pt-12 flex-1">
        <View className="flex-1 justify-center">
          <View className="mb-10">
            <Text className="text-3xl font-bold text-neutral-900 dark:text-white">
              Welcome back
            </Text>
            <Text className="text-base text-neutral-500 dark:text-neutral-400 mt-2">
              Sign in to continue your nutrition journey
            </Text>
          </View>

          <Input
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
          />

          <Input
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
            error={error ?? undefined}
          />

          <View className="mt-2">
            <Button onPress={handleLogin} loading={loading}>
              Sign in
            </Button>
          </View>

          {/* Divider */}
          <View className="flex-row items-center my-5">
            <View className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
            <Text className="mx-4 text-xs text-neutral-400 dark:text-neutral-600">
              or
            </Text>
            <View className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
          </View>

          {/* Google sign-in */}
          <Button
            onPress={handleGoogleLogin}
            loading={googleLoading}
            variant="secondary"
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="logo-google" size={18} color="#4285F4" />
              <Text className="ml-2 text-base font-semibold text-neutral-900 dark:text-white">
                Continue with Google
              </Text>
            </View>
          </Button>

          <View className="mt-8 flex-row justify-center">
            <Text className="text-sm text-neutral-500 dark:text-neutral-400">
              Don't have an account?{" "}
            </Text>
            <Link href="/(auth)/signup" replace>
              <Text className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                Sign up
              </Text>
            </Link>
          </View>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
