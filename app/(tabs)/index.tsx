import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";

import {
    dismissSuggestion,
    fetchTodaySuggestions,
    generateSuggestion,
    type Suggestion,
} from "@/src/modules/ai-coach/api";
import { useAuth } from "@/src/modules/auth/api";
import {
    deleteMeal,
    fetchMealsByDate,
    MEAL_TYPE_META,
    sumDailyTotals,
    type LoggedMeal,
} from "@/src/modules/food-logging/api";
import { useSyncDailySummary } from "@/src/modules/tracking/hooks/useSyncDailySummary";
import { Screen } from "@/src/shared/ui/Screen";
import type { Goal, MealType } from "@/src/types/models";

function getGreeting(): { text: string; emoji: string } {
  const hour = new Date().getHours();
  if (hour < 5) return { text: "Good night", emoji: "🌙" };
  if (hour < 12) return { text: "Good morning", emoji: "☀️" };
  if (hour < 17) return { text: "Good afternoon", emoji: "🌤️" };
  if (hour < 21) return { text: "Good evening", emoji: "🌆" };
  return { text: "Good night", emoji: "🌙" };
}

function dateLabel(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

const GOAL_LABELS: Record<
  Goal,
  {
    label: string;
    icon: "trending-down" | "trending-up" | "remove" | "barbell" | "heart";
  }
> = {
  weight_loss: { label: "Weight loss", icon: "trending-down" },
  weight_gain: { label: "Weight gain", icon: "trending-up" },
  maintain: { label: "Maintain", icon: "remove" },
  muscle_gain: { label: "Build muscle", icon: "barbell" },
  general: { label: "General health", icon: "heart" },
};

const GOAL_TIPS: Record<Goal, string> = {
  weight_loss:
    "Aim for 25-30g protein per meal — protein keeps you full and protects muscle while losing fat.",
  weight_gain:
    "Add a healthy snack between meals — nuts, dahi, or banana with peanut butter helps surplus.",
  maintain:
    "Consistency beats intensity. Focus on whole foods 80% of the time, enjoy what you love 20%.",
  muscle_gain:
    "Eat protein within 60 min of training. Eggs, paneer, dal, or whey help muscle synthesis.",
  general:
    "Half your plate veggies, quarter protein, quarter complex carbs. Easy rule, big impact.",
};

const FIBER_DEFAULT = 30;

export default function HomeScreen() {
  const { profile, user } = useAuth();
  const greeting = getGreeting();
  const queryClient = useQueryClient();

  // Date navigation state
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const viewingToday = isToday(selectedDate);

  function goToPreviousDay() {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 1);
      return d;
    });
  }

  function goToNextDay() {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 1);
      if (d > new Date()) return prev; // don't go beyond today
      return d;
    });
  }

  function goToToday() {
    setSelectedDate(new Date());
  }

  // Meals query based on selected date
  const mealsQuery = useQuery({
    queryKey: ["mealLogs", user?.id, selectedDate.toDateString()],
    queryFn: () => fetchMealsByDate(user!.id, selectedDate),
    enabled: !!user?.id,
  });

  // Adaptive suggestions (only for today)
  const suggestionsQuery = useQuery({
    queryKey: ["suggestions", user?.id, "today"],
    queryFn: () => fetchTodaySuggestions(user!.id),
    enabled: !!user?.id && viewingToday,
    staleTime: 60_000,
  });

  // Auto-generate suggestion after first meal log if none exist
  const meals = mealsQuery.data ?? [];
  const suggestions = (viewingToday ? suggestionsQuery.data : null) ?? [];

  useEffect(() => {
    if (
      viewingToday &&
      user &&
      meals.length > 0 &&
      suggestions.length === 0 &&
      !suggestionsQuery.isLoading
    ) {
      generateSuggestion()
        .then(() =>
          queryClient.invalidateQueries({ queryKey: ["suggestions"] }),
        )
        .catch(() => {}); // silent fail
    }
  }, [meals.length, suggestions.length, user, viewingToday]);

  const fullName =
    profile?.full_name ??
    (user?.user_metadata?.full_name as string | undefined) ??
    null;
  const firstName = fullName?.trim().split(/\s+/)[0] ?? null;

  const calorieTarget = profile?.daily_calorie_target ?? 2000;
  const proteinTarget = profile?.daily_protein_g ?? 120;
  const carbsTarget = profile?.daily_carbs_g ?? 250;
  const fatTarget = profile?.daily_fat_g ?? 65;

  const goal = profile?.goal ?? null;
  const goalInfo = goal ? GOAL_LABELS[goal] : null;
  const tip = goal ? GOAL_TIPS[goal] : null;

  const totals = useMemo(() => sumDailyTotals(meals), [meals]);
  const groupedMeals = useMemo(() => groupByMealType(meals), [meals]);

  // Keep daily_summaries in sync when viewing today
  useSyncDailySummary(viewingToday ? meals.length : 0);

  const caloriesProgress = Math.min(
    100,
    Math.round((totals.calories / calorieTarget) * 100),
  );

  const macros = [
    {
      label: "Protein",
      value: totals.protein_g,
      target: proteinTarget,
      textColor: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Carbs",
      value: totals.carbs_g,
      target: carbsTarget,
      textColor: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Fat",
      value: totals.fat_g,
      target: fatTarget,
      textColor: "text-purple-600 dark:text-purple-400",
    },
    {
      label: "Fiber",
      value: totals.fiber_g,
      target: FIBER_DEFAULT,
      textColor: "text-emerald-600 dark:text-emerald-400",
    },
  ];

  function handleDeleteMeal(meal: LoggedMeal) {
    Alert.alert(
      "Remove meal?",
      `${meal.food_name} hatana hai today's log se?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMeal(meal.id);
              queryClient.invalidateQueries({ queryKey: ["mealLogs"] });
            } catch (err) {
              Alert.alert(
                "Failed to remove",
                err instanceof Error ? err.message : "Unknown error",
              );
            }
          },
        },
      ],
    );
  }

  return (
    <Screen>
      {/* Date navigation */}
      <View className="flex-row items-center justify-between mb-2">
        <Pressable
          onPress={goToPreviousDay}
          hitSlop={12}
          className="p-2 active:opacity-60"
        >
          <Ionicons name="chevron-back" size={22} color="#6b7280" />
        </Pressable>
        <Pressable
          onPress={viewingToday ? undefined : goToToday}
          className="items-center"
        >
          <Text className="text-base font-semibold text-neutral-900 dark:text-white">
            {viewingToday ? "Today" : dateLabel(selectedDate)}
          </Text>
          {!viewingToday && (
            <Text className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
              Tap for today
            </Text>
          )}
        </Pressable>
        <Pressable
          onPress={goToNextDay}
          hitSlop={12}
          className="p-2 active:opacity-60"
          disabled={viewingToday}
        >
          <Ionicons
            name="chevron-forward"
            size={22}
            color={viewingToday ? "#d1d5db" : "#6b7280"}
          />
        </Pressable>
      </View>

      {/* Header */}
      {viewingToday && (
        <View className="mb-6">
          <Text className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            {dateLabel(selectedDate)}
          </Text>
          <Text className="text-3xl font-bold text-neutral-900 dark:text-white">
            {greeting.text}
            {firstName ? `, ${firstName}` : ""} {greeting.emoji}
          </Text>
        </View>
      )}

      {/* Goal badge */}
      {goalInfo ? (
        <View className="flex-row items-center mb-4">
          <View className="flex-row items-center bg-emerald-50 dark:bg-emerald-950/30 rounded-full px-3 py-1.5">
            <Ionicons name={goalInfo.icon} size={14} color="#10b981" />
            <Text className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 ml-1.5">
              {goalInfo.label}
            </Text>
            <Text className="text-xs text-emerald-600 dark:text-emerald-400 mx-1.5">
              ·
            </Text>
            <Text className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
              {calorieTarget} kcal/day
            </Text>
          </View>
        </View>
      ) : null}

      {/* Calories hero card */}
      <View className="rounded-3xl bg-emerald-500 p-6 mb-4 shadow-lg shadow-emerald-500/30">
        <Text className="text-sm font-medium text-emerald-50 mb-2">
          {viewingToday
            ? "Today's energy"
            : `Energy · ${dateLabel(selectedDate)}`}
        </Text>
        <View className="flex-row items-baseline mb-3">
          <Text className="text-5xl font-bold text-white">
            {Math.round(totals.calories)}
          </Text>
          <Text className="text-lg text-emerald-50 ml-2">
            / {calorieTarget.toLocaleString("en-IN")} kcal
          </Text>
        </View>
        <View className="h-2 bg-emerald-700/40 rounded-full overflow-hidden">
          <View
            className="h-full bg-white"
            style={{ width: `${caloriesProgress}%` }}
          />
        </View>
        <Text className="text-sm text-emerald-50 mt-3">
          {totals.meal_count === 0
            ? "Log a meal to start tracking"
            : `${totals.meal_count} meal${totals.meal_count > 1 ? "s" : ""} logged · ${Math.max(0, calorieTarget - Math.round(totals.calories))} kcal remaining`}
        </Text>
      </View>

      {/* Macros row */}
      <Text className="text-base font-semibold text-neutral-900 dark:text-white mb-3 mt-2">
        {viewingToday ? "Macros today" : "Macros"}
      </Text>
      <View className="flex-row gap-3 mb-6">
        {macros.map((m) => (
          <View
            key={m.label}
            className="flex-1 rounded-2xl bg-neutral-50 dark:bg-neutral-900 p-3 items-center"
          >
            <Text className={`text-xl font-bold ${m.textColor}`}>
              {Math.round(m.value)}g
            </Text>
            <Text className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-1">
              {m.label}
            </Text>
            <Text className="text-[10px] text-neutral-400 dark:text-neutral-600 mt-0.5">
              of {m.target}g
            </Text>
          </View>
        ))}
      </View>

      {/* Quick action: Search foods (only today) */}
      {viewingToday && (
        <Pressable
          onPress={() => router.push("/log-search" as never)}
          className="rounded-2xl border-2 border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-5 mb-6 active:opacity-70"
        >
          <View className="flex-row items-center">
            <View className="w-12 h-12 rounded-full bg-emerald-500 items-center justify-center mr-4">
              <Ionicons name="search" size={22} color="white" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-neutral-900 dark:text-white mb-0.5">
                Log a meal
              </Text>
              <Text className="text-sm text-neutral-500 dark:text-neutral-400">
                Search Indian + global foods
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#10b981" />
          </View>
        </Pressable>
      )}

      {/* Goal-aware tip */}
      {viewingToday && tip && totals.meal_count === 0 ? (
        <View className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 p-4 mb-6 flex-row items-start">
          <View className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 items-center justify-center mr-3">
            <Ionicons name="bulb-outline" size={18} color="#d97706" />
          </View>
          <View className="flex-1">
            <Text className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1 uppercase tracking-wide">
              Tip for you
            </Text>
            <Text className="text-sm text-amber-900 dark:text-amber-100 leading-5">
              {tip}
            </Text>
          </View>
        </View>
      ) : null}

      {/* AI Adaptive Suggestions */}
      {suggestions.length > 0 ? (
        <View className="mb-6">
          {suggestions.map((s: Suggestion) => (
            <View
              key={s.id}
              className="rounded-2xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 p-4 mb-2"
            >
              <View className="flex-row items-start">
                <View className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-900/40 items-center justify-center mr-3 mt-0.5">
                  <Ionicons
                    name={
                      s.type === "warning"
                        ? "alert-circle"
                        : s.type === "next_meal"
                          ? "restaurant"
                          : "sparkles"
                    }
                    size={16}
                    color="#7c3aed"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-violet-700 dark:text-violet-300 mb-1 uppercase tracking-wide">
                    {s.type === "next_meal"
                      ? "🍽️ Next Meal"
                      : s.type === "warning"
                        ? "⚠️ Heads up"
                        : "✨ Tip"}
                  </Text>
                  <Text className="text-sm text-violet-900 dark:text-violet-100 leading-5">
                    {s.content}
                  </Text>
                </View>
                <Pressable
                  onPress={async () => {
                    await dismissSuggestion(s.id);
                    queryClient.invalidateQueries({
                      queryKey: ["suggestions"],
                    });
                  }}
                  hitSlop={10}
                  className="ml-2"
                >
                  <Ionicons name="close" size={18} color="#9ca3af" />
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {/* Meals list */}
      <Text className="text-base font-semibold text-neutral-900 dark:text-white mb-3">
        {viewingToday ? "Today's meals" : "Meals"}
      </Text>
      {totals.meal_count === 0 ? (
        <View className="rounded-2xl bg-neutral-50 dark:bg-neutral-900 p-8 items-center">
          <View className="w-14 h-14 rounded-full bg-neutral-200 dark:bg-neutral-800 items-center justify-center mb-3">
            <Ionicons name="restaurant-outline" size={26} color="#9ca3af" />
          </View>
          <Text className="text-base font-medium text-neutral-700 dark:text-neutral-300 text-center">
            No meals logged yet
          </Text>
          <Text className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 text-center">
            Tap the Log tab to add your first meal
          </Text>
        </View>
      ) : (
        <View className="gap-3">
          {(["breakfast", "lunch", "snack", "dinner"] as MealType[]).map(
            (mt) => {
              const items = groupedMeals[mt];
              if (!items || items.length === 0) return null;
              const meta = MEAL_TYPE_META[mt];
              return (
                <View
                  key={mt}
                  className="rounded-2xl bg-neutral-50 dark:bg-neutral-900 p-4"
                >
                  <View className="flex-row items-center mb-3">
                    <Ionicons name={meta.icon} size={16} color="#10b981" />
                    <Text className="ml-2 text-sm font-semibold text-neutral-900 dark:text-white">
                      {meta.label}
                    </Text>
                  </View>
                  {items.map((m, idx) => (
                    <Pressable
                      key={m.id}
                      onLongPress={() => handleDeleteMeal(m)}
                      className={`flex-row items-center ${idx !== 0 ? "mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-800" : ""}`}
                    >
                      <View className="flex-1">
                        <Text className="text-base font-medium text-neutral-900 dark:text-white">
                          {m.food_name}
                        </Text>
                        <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                          {m.quantity_g}g · {formatTime(m.logged_at)}
                        </Text>
                      </View>
                      <Text className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        {Math.round(m.calories)} kcal
                      </Text>
                    </Pressable>
                  ))}
                </View>
              );
            },
          )}
          <Text className="text-xs text-neutral-400 dark:text-neutral-600 text-center mt-1">
            Long-press a meal to remove
          </Text>
        </View>
      )}
    </Screen>
  );
}

function groupByMealType(meals: LoggedMeal[]): Record<MealType, LoggedMeal[]> {
  return meals.reduce<Record<MealType, LoggedMeal[]>>(
    (acc, m) => {
      acc[m.meal_type].push(m);
      return acc;
    },
    { breakfast: [], lunch: [], snack: [], dinner: [] },
  );
}
