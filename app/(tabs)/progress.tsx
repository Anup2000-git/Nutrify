import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
    Alert,
    Dimensions,
    Pressable,
    Text,
    TextInput,
    View
} from "react-native";
import { LineChart } from "react-native-chart-kit";

import { useAuth } from "@/src/modules/auth/api";
import {
    bmiCategory,
    calculateBMI,
    deleteWeightEntry,
    fetchActiveGoal,
    fetchDailySummaries,
    fetchWeightHistory,
    getTodayWater,
    logWater,
    logWeight,
    type DailySummaryRow,
    type GoalEntry,
    type WeightEntry,
} from "@/src/modules/tracking/api";
import { Screen } from "@/src/shared/ui/Screen";

const screenWidth = Dimensions.get("window").width - 48; // account for padding

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function ProgressScreen() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [weightInput, setWeightInput] = useState("");
  const [showWeightInput, setShowWeightInput] = useState(false);

  // Queries
  const weightQuery = useQuery({
    queryKey: ["weightHistory", user?.id],
    queryFn: () => fetchWeightHistory(user!.id),
    enabled: !!user?.id,
  });

  const summariesQuery = useQuery({
    queryKey: ["dailySummaries", user?.id],
    queryFn: () => fetchDailySummaries(user!.id, 30),
    enabled: !!user?.id,
  });

  const waterQuery = useQuery({
    queryKey: ["todayWater", user?.id],
    queryFn: () => getTodayWater(user!.id),
    enabled: !!user?.id,
  });

  const goalQuery = useQuery({
    queryKey: ["activeGoal", user?.id],
    queryFn: () => fetchActiveGoal(user!.id),
    enabled: !!user?.id,
  });

  // Mutations
  const logWeightMut = useMutation({
    mutationFn: (kg: number) => logWeight(user!.id, kg),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weightHistory"] });
      queryClient.invalidateQueries({ queryKey: ["activeGoal"] });
      setWeightInput("");
      setShowWeightInput(false);
    },
  });

  const logWaterMut = useMutation({
    mutationFn: (ml: number) => logWater(user!.id, ml),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todayWater"] });
    },
  });

  const weights = weightQuery.data ?? [];
  const summaries = summariesQuery.data ?? [];
  const todayWater = waterQuery.data ?? 0;
  const goal = goalQuery.data;
  const waterTarget = profile?.daily_water_ml ?? 2500;

  // Weight chart data
  const weightChartData = buildWeightChart(weights);
  const calorieChartData = buildCalorieChart(summaries);

  // Current stats
  const latestWeight =
    weights.length > 0
      ? weights[weights.length - 1].weight_kg
      : (profile?.current_weight_kg ?? null);
  const heightCm = profile?.height_cm ?? null;
  const currentBMI =
    latestWeight && heightCm ? calculateBMI(heightCm, latestWeight) : null;

  // Goal progress
  const goalProgress = computeGoalProgress(goal, latestWeight);

  function handleLogWeight() {
    const kg = parseFloat(weightInput);
    if (isNaN(kg) || kg < 20 || kg > 300) {
      Alert.alert("Invalid weight", "Enter a value between 20-300 kg");
      return;
    }
    logWeightMut.mutate(kg);
  }

  function handleDeleteWeight(entry: WeightEntry) {
    Alert.alert("Delete entry?", `Remove ${entry.weight_kg} kg log?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteWeightEntry(entry.id).then(() =>
            queryClient.invalidateQueries({ queryKey: ["weightHistory"] }),
          );
        },
      },
    ]);
  }

  return (
    <Screen>
      {/* Header */}
      <View className="mb-6">
        <Text className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">
          Track
        </Text>
        <Text className="text-3xl font-bold text-neutral-900 dark:text-white">
          Progress
        </Text>
      </View>

      {/* Goal progress card */}
      {goal && goalProgress ? (
        <View className="rounded-3xl bg-emerald-500 p-5 mb-4 shadow-lg shadow-emerald-500/30">
          <Text className="text-sm font-medium text-emerald-50 mb-1">
            Goal progress
          </Text>
          <View className="flex-row items-baseline mb-2">
            <Text className="text-4xl font-bold text-white">
              {goalProgress.percent}%
            </Text>
            <Text className="text-base text-emerald-50 ml-2">
              {goalProgress.label}
            </Text>
          </View>
          <View className="h-2 bg-emerald-700/40 rounded-full overflow-hidden mb-2">
            <View
              className="h-full bg-white"
              style={{ width: `${Math.min(100, goalProgress.percent)}%` }}
            />
          </View>
          <Text className="text-xs text-emerald-50">
            {goal.start_weight_kg} kg → {goal.target_weight_kg} kg
            {latestWeight ? ` · Now ${latestWeight} kg` : ""}
          </Text>
        </View>
      ) : null}

      {/* Current stats */}
      <View className="flex-row gap-3 mb-4">
        <View className="flex-1 rounded-2xl bg-neutral-50 dark:bg-neutral-900 p-4 items-center">
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white">
            {latestWeight ?? "—"}
          </Text>
          <Text className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-1">
            Weight (kg)
          </Text>
        </View>
        <View className="flex-1 rounded-2xl bg-neutral-50 dark:bg-neutral-900 p-4 items-center">
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white">
            {currentBMI ?? "—"}
          </Text>
          <Text className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-1">
            BMI
          </Text>
          {currentBMI ? (
            <Text className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {bmiCategory(currentBMI)}
            </Text>
          ) : null}
        </View>
        <View className="flex-1 rounded-2xl bg-neutral-50 dark:bg-neutral-900 p-4 items-center">
          <Text className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {todayWater}
          </Text>
          <Text className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-1">
            Water (ml)
          </Text>
          <Text className="text-[10px] text-neutral-400 mt-0.5">
            of {waterTarget}
          </Text>
        </View>
      </View>

      {/* Quick weight log */}
      {showWeightInput ? (
        <View className="rounded-2xl bg-neutral-50 dark:bg-neutral-900 p-4 mb-4">
          <Text className="text-sm font-semibold text-neutral-900 dark:text-white mb-2">
            Log today's weight
          </Text>
          <View className="flex-row gap-3">
            <TextInput
              className="flex-1 rounded-xl bg-white dark:bg-neutral-800 px-4 py-3 text-base text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700"
              placeholder="e.g. 72.5"
              placeholderTextColor="#9ca3af"
              keyboardType="decimal-pad"
              value={weightInput}
              onChangeText={setWeightInput}
              autoFocus
            />
            <Pressable
              onPress={handleLogWeight}
              disabled={logWeightMut.isPending}
              className="rounded-xl bg-emerald-500 px-5 items-center justify-center active:opacity-70"
            >
              <Text className="text-white font-semibold">
                {logWeightMut.isPending ? "..." : "Save"}
              </Text>
            </Pressable>
          </View>
          <Pressable onPress={() => setShowWeightInput(false)} className="mt-2">
            <Text className="text-xs text-neutral-500 text-center">Cancel</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => setShowWeightInput(true)}
          className="rounded-2xl border-2 border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 mb-4 active:opacity-70"
        >
          <View className="flex-row items-center justify-center">
            <Ionicons name="scale-outline" size={20} color="#10b981" />
            <Text className="ml-2 text-base font-semibold text-emerald-700 dark:text-emerald-300">
              Log weight
            </Text>
          </View>
        </Pressable>
      )}

      {/* Water quick add */}
      <View className="rounded-2xl bg-blue-50 dark:bg-blue-950/30 p-4 mb-4">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center">
            <Ionicons name="water-outline" size={18} color="#2563eb" />
            <Text className="ml-2 text-sm font-semibold text-blue-800 dark:text-blue-200">
              Water today
            </Text>
          </View>
          <Text className="text-sm font-bold text-blue-700 dark:text-blue-300">
            {todayWater} / {waterTarget} ml
          </Text>
        </View>
        <View className="h-2 bg-blue-200 dark:bg-blue-900 rounded-full overflow-hidden mb-3">
          <View
            className="h-full bg-blue-500 rounded-full"
            style={{
              width: `${Math.min(100, (todayWater / waterTarget) * 100)}%`,
            }}
          />
        </View>
        <View className="flex-row gap-2">
          {[250, 500, 750].map((ml) => (
            <Pressable
              key={ml}
              onPress={() => logWaterMut.mutate(ml)}
              disabled={logWaterMut.isPending}
              className="flex-1 rounded-xl bg-blue-100 dark:bg-blue-900/40 py-2.5 items-center active:opacity-70"
            >
              <Text className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                +{ml}ml
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Weight chart */}
      {weightChartData && weights.length >= 2 ? (
        <View className="mb-4">
          <Text className="text-base font-semibold text-neutral-900 dark:text-white mb-3">
            Weight trend
          </Text>
          <View className="rounded-2xl bg-neutral-50 dark:bg-neutral-900 p-3 overflow-hidden">
            <LineChart
              data={weightChartData}
              width={screenWidth - 24}
              height={180}
              chartConfig={{
                backgroundColor: "transparent",
                backgroundGradientFrom: "#fafafa",
                backgroundGradientTo: "#fafafa",
                decimalCount: 1,
                color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                labelColor: () => "#6b7280",
                propsForDots: { r: "4", strokeWidth: "2", stroke: "#10b981" },
                propsForBackgroundLines: {
                  strokeDasharray: "4",
                  stroke: "#e5e7eb",
                },
              }}
              bezier
              style={{ borderRadius: 12 }}
              withInnerLines
              withOuterLines={false}
            />
          </View>
        </View>
      ) : null}

      {/* Calorie trend */}
      {calorieChartData && summaries.length >= 2 ? (
        <View className="mb-4">
          <Text className="text-base font-semibold text-neutral-900 dark:text-white mb-3">
            Calorie trend (30 days)
          </Text>
          <View className="rounded-2xl bg-neutral-50 dark:bg-neutral-900 p-3 overflow-hidden">
            <LineChart
              data={calorieChartData}
              width={screenWidth - 24}
              height={180}
              chartConfig={{
                backgroundColor: "transparent",
                backgroundGradientFrom: "#fafafa",
                backgroundGradientTo: "#fafafa",
                decimalCount: 0,
                color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,
                labelColor: () => "#6b7280",
                propsForDots: { r: "3", strokeWidth: "2", stroke: "#f59e0b" },
                propsForBackgroundLines: {
                  strokeDasharray: "4",
                  stroke: "#e5e7eb",
                },
              }}
              bezier
              style={{ borderRadius: 12 }}
              withInnerLines
              withOuterLines={false}
            />
          </View>
        </View>
      ) : null}

      {/* Recent weight entries */}
      {weights.length > 0 ? (
        <View className="mb-4">
          <Text className="text-base font-semibold text-neutral-900 dark:text-white mb-3">
            Recent weight logs
          </Text>
          <View className="rounded-2xl bg-neutral-50 dark:bg-neutral-900 p-4">
            {weights
              .slice(-7)
              .reverse()
              .map((w, idx) => (
                <Pressable
                  key={w.id}
                  onLongPress={() => handleDeleteWeight(w)}
                  className={`flex-row items-center justify-between ${idx !== 0 ? "mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-800" : ""}`}
                >
                  <View>
                    <Text className="text-base font-medium text-neutral-900 dark:text-white">
                      {w.weight_kg} kg
                    </Text>
                    <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      {formatDate(w.logged_at)}
                    </Text>
                  </View>
                  {idx > 0 && weights.length > 1 ? (
                    <WeightDelta
                      current={w.weight_kg}
                      previous={
                        weights[weights.length - 1 - idx + 1]?.weight_kg
                      }
                    />
                  ) : null}
                </Pressable>
              ))}
            <Text className="text-xs text-neutral-400 dark:text-neutral-600 text-center mt-3">
              Long-press to delete
            </Text>
          </View>
        </View>
      ) : (
        <View className="rounded-2xl bg-neutral-50 dark:bg-neutral-900 p-8 items-center mb-4">
          <Ionicons name="analytics-outline" size={32} color="#9ca3af" />
          <Text className="text-base font-medium text-neutral-700 dark:text-neutral-300 mt-3 text-center">
            No weight data yet
          </Text>
          <Text className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 text-center">
            Log your weight to see trends
          </Text>
        </View>
      )}
    </Screen>
  );
}

// ─── Helpers ────────────────────────────────────────────────

function WeightDelta({
  current,
  previous,
}: {
  current: number;
  previous?: number;
}) {
  if (!previous) return null;
  const diff = current - previous;
  if (Math.abs(diff) < 0.01) return null;
  const isLoss = diff < 0;
  return (
    <View
      className={`flex-row items-center px-2 py-1 rounded-lg ${isLoss ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-red-100 dark:bg-red-900/30"}`}
    >
      <Ionicons
        name={isLoss ? "trending-down" : "trending-up"}
        size={14}
        color={isLoss ? "#10b981" : "#ef4444"}
      />
      <Text
        className={`ml-1 text-xs font-semibold ${isLoss ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}
      >
        {Math.abs(diff).toFixed(1)} kg
      </Text>
    </View>
  );
}

function buildWeightChart(weights: WeightEntry[]) {
  if (weights.length < 2) return null;
  const recent = weights.slice(-14); // last 14 entries
  return {
    labels: recent.map((w) => {
      const d = new Date(w.logged_at);
      return `${d.getDate()}/${d.getMonth() + 1}`;
    }),
    datasets: [{ data: recent.map((w) => w.weight_kg) }],
  };
}

function buildCalorieChart(summaries: DailySummaryRow[]) {
  if (summaries.length < 2) return null;
  const recent = summaries.slice(-14);
  return {
    labels: recent.map((s) => {
      const d = new Date(s.date);
      return `${d.getDate()}/${d.getMonth() + 1}`;
    }),
    datasets: [{ data: recent.map((s) => s.total_calories || 0) }],
  };
}

function computeGoalProgress(
  goal: GoalEntry | null,
  currentWeight: number | null,
): { percent: number; label: string } | null {
  if (
    !goal ||
    !goal.start_weight_kg ||
    !goal.target_weight_kg ||
    !currentWeight
  )
    return null;

  const totalChange = Math.abs(goal.target_weight_kg - goal.start_weight_kg);
  if (totalChange === 0) return { percent: 100, label: "At target!" };

  const currentChange = Math.abs(currentWeight - goal.start_weight_kg);
  // Check direction
  const isLoss = goal.target_weight_kg < goal.start_weight_kg;
  const movedCorrectDirection = isLoss
    ? currentWeight < goal.start_weight_kg
    : currentWeight > goal.start_weight_kg;

  if (!movedCorrectDirection)
    return { percent: 0, label: `${totalChange.toFixed(1)} kg to go` };

  const percent = Math.round((currentChange / totalChange) * 100);
  const remaining = Math.abs(goal.target_weight_kg - currentWeight);
  return {
    percent: Math.min(100, percent),
    label: `${remaining.toFixed(1)} kg to go`,
  };
}
