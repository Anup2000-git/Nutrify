import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Alert, Pressable, Text, View } from "react-native";

import { signOut, useAuth } from "@/src/modules/auth/api";
import { Screen } from "@/src/shared/ui/Screen";
import type { Goal } from "@/src/types/models";

const GOAL_LABELS: Record<Goal, string> = {
  weight_loss: "Weight loss",
  weight_gain: "Weight gain",
  maintain: "Maintain",
  muscle_gain: "Build muscle",
  general: "General health",
};

const GOAL_ICONS: Record<
  Goal,
  "trending-down" | "trending-up" | "remove" | "barbell" | "heart"
> = {
  weight_loss: "trending-down",
  weight_gain: "trending-up",
  maintain: "remove",
  muscle_gain: "barbell",
  general: "heart",
};

function getInitial(emailOrName: string | null | undefined): string {
  if (!emailOrName) return "N";
  return emailOrName.trim().charAt(0).toUpperCase();
}

function calculateBMI(
  heightCm: number | null,
  weightKg: number | null,
): number | null {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) return null;
  const heightM = heightCm / 100;
  return Number((weightKg / (heightM * heightM)).toFixed(1));
}

function bmiCategory(bmi: number | null): string | null {
  if (!bmi) return null;
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

export default function ProfileScreen() {
  const { user, profile } = useAuth();

  const fullName =
    profile?.full_name ??
    (user?.user_metadata?.full_name as string | undefined) ??
    null;
  const email = user?.email ?? null;
  const displayName = fullName || email?.split("@")[0] || "Nutrify user";

  const heightCm = profile?.height_cm ?? null;
  const weightKg = profile?.current_weight_kg ?? null;
  const bmi = calculateBMI(heightCm, weightKg);
  const bmiCat = bmiCategory(bmi);
  const goal = profile?.goal ?? null;

  function handleLogoutPress() {
    Alert.alert("Sign out", "Aap sure ho? Aapko firse sign in karna padega.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  return (
    <Screen>
      <View className="mb-6">
        <Text className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">
          Account
        </Text>
        <Text className="text-3xl font-bold text-neutral-900 dark:text-white">
          Profile
        </Text>
      </View>

      {/* User card */}
      <View className="rounded-3xl bg-neutral-50 dark:bg-neutral-900 p-5 mb-4 flex-row items-center">
        <View className="w-14 h-14 rounded-full bg-emerald-500 items-center justify-center mr-4">
          <Text className="text-xl font-bold text-white">
            {getInitial(fullName ?? email)}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-neutral-900 dark:text-white">
            {displayName}
          </Text>
          <Text
            className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5"
            numberOfLines={1}
          >
            {email ?? "Not signed in"}
          </Text>
        </View>
      </View>

      {/* Goal card */}
      {goal ? (
        <Pressable
          onPress={() => router.push("/profile-edit-stats" as never)}
          className="rounded-2xl bg-emerald-500 p-4 mb-4 flex-row items-center active:opacity-80"
        >
          <View className="w-10 h-10 rounded-xl bg-white/20 items-center justify-center mr-3">
            <Ionicons name={GOAL_ICONS[goal]} size={18} color="white" />
          </View>
          <View className="flex-1">
            <Text className="text-xs font-semibold text-emerald-50 uppercase tracking-wide">
              Current goal
            </Text>
            <Text className="text-base font-bold text-white mt-0.5">
              {GOAL_LABELS[goal]}
            </Text>
          </View>
          <Ionicons name="pencil" size={16} color="white" />
        </Pressable>
      ) : null}

      {/* Stats row */}
      <View className="flex-row gap-3 mb-4">
        <View className="flex-1 rounded-2xl bg-neutral-50 dark:bg-neutral-900 p-4 items-center">
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white">
            {heightCm ? heightCm : "—"}
          </Text>
          <Text className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-1">
            {heightCm ? "Height (cm)" : "Height"}
          </Text>
        </View>
        <View className="flex-1 rounded-2xl bg-neutral-50 dark:bg-neutral-900 p-4 items-center">
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white">
            {weightKg ? weightKg : "—"}
          </Text>
          <Text className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-1">
            {weightKg ? "Weight (kg)" : "Weight"}
          </Text>
        </View>
        <View className="flex-1 rounded-2xl bg-neutral-50 dark:bg-neutral-900 p-4 items-center">
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white">
            {bmi ? bmi : "—"}
          </Text>
          <Text className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-1">
            BMI
          </Text>
          {bmiCat ? (
            <Text className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {bmiCat}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Daily targets card */}
      {profile?.daily_calorie_target ? (
        <Pressable
          onPress={() => router.push("/profile-edit-targets" as never)}
          className="rounded-2xl bg-neutral-50 dark:bg-neutral-900 p-4 mb-4 active:opacity-70"
        >
          <View className="flex-row items-center mb-2">
            <Ionicons name="flame-outline" size={16} color="#10b981" />
            <Text className="ml-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide flex-1">
              Daily targets
            </Text>
            <Ionicons name="pencil" size={14} color="#9ca3af" />
          </View>
          <View className="flex-row flex-wrap gap-x-4 gap-y-1">
            <Text className="text-sm text-neutral-700 dark:text-neutral-300">
              <Text className="font-bold">{profile.daily_calorie_target}</Text>{" "}
              kcal
            </Text>
            <Text className="text-sm text-neutral-700 dark:text-neutral-300">
              <Text className="font-bold">{profile.daily_protein_g}g</Text>{" "}
              protein
            </Text>
            <Text className="text-sm text-neutral-700 dark:text-neutral-300">
              <Text className="font-bold">{profile.daily_carbs_g}g</Text> carbs
            </Text>
            <Text className="text-sm text-neutral-700 dark:text-neutral-300">
              <Text className="font-bold">{profile.daily_fat_g}g</Text> fat
            </Text>
            <Text className="text-sm text-neutral-700 dark:text-neutral-300">
              <Text className="font-bold">{profile.daily_water_ml} ml</Text>{" "}
              water
            </Text>
          </View>
        </Pressable>
      ) : null}

      {/* Action menu */}
      <View className="rounded-2xl bg-neutral-50 dark:bg-neutral-900 overflow-hidden mb-4">
        <Pressable
          onPress={() => router.push("/profile-edit-stats" as never)}
          className="p-4 flex-row items-center active:bg-neutral-100 dark:active:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-800"
        >
          <View className="w-10 h-10 rounded-xl bg-white dark:bg-neutral-950 items-center justify-center mr-3">
            <Ionicons name="person-outline" size={20} color="#10b981" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-medium text-neutral-900 dark:text-white">
              Edit profile
            </Text>
            <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Goal, height, weight, diet, life stage
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
        </Pressable>

        <Pressable
          onPress={() => router.push("/profile-edit-targets" as never)}
          className="p-4 flex-row items-center active:bg-neutral-100 dark:active:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-800"
        >
          <View className="w-10 h-10 rounded-xl bg-white dark:bg-neutral-950 items-center justify-center mr-3">
            <Ionicons name="flame-outline" size={20} color="#10b981" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-medium text-neutral-900 dark:text-white">
              Edit daily targets
            </Text>
            <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Calories, macros, water — manual or AI
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
        </Pressable>

        <Pressable
          onPress={() => router.push("/feedback" as never)}
          className="p-4 flex-row items-center active:bg-neutral-100 dark:active:bg-neutral-800"
        >
          <View className="w-10 h-10 rounded-xl bg-white dark:bg-neutral-950 items-center justify-center mr-3">
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={20}
              color="#10b981"
            />
          </View>
          <View className="flex-1">
            <Text className="text-base font-medium text-neutral-900 dark:text-white">
              Send feedback
            </Text>
            <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Bugs, suggestions, feature requests
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
        </Pressable>
      </View>

      {/* Sign out */}
      <Pressable
        onPress={handleLogoutPress}
        className="rounded-2xl bg-red-50 dark:bg-red-950/30 p-4 flex-row items-center justify-center active:opacity-70"
      >
        <Ionicons name="log-out-outline" size={20} color="#dc2626" />
        <Text className="ml-2 text-base font-semibold text-red-600 dark:text-red-400">
          Sign out
        </Text>
      </Pressable>
    </Screen>
  );
}
