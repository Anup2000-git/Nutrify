import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { useAuth, useRefreshProfile } from '@/src/modules/auth/api';
import {
  suggestDailyTargetsViaAI,
  updateProfileFields,
  type AISuggestedTargets,
} from '@/src/modules/onboarding/api';
import { OnboardingHeader } from '@/src/modules/onboarding/components/OnboardingHeader';
import { Button } from '@/src/shared/ui/Button';
import { Screen } from '@/src/shared/ui/Screen';

export default function ReviewScreen() {
  const { user, profile } = useAuth();
  const refreshProfile = useRefreshProfile();
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestedTargets | null>(null);
  const [applying, setApplying] = useState(false);

  const calculated = {
    calories: profile?.daily_calorie_target ?? 0,
    protein_g: profile?.daily_protein_g ?? 0,
    carbs_g: profile?.daily_carbs_g ?? 0,
    fat_g: profile?.daily_fat_g ?? 0,
    water_ml: profile?.daily_water_ml ?? 0,
  };

  async function handleAskAI() {
    setAiLoading(true);
    try {
      const result = await suggestDailyTargetsViaAI();
      setAiSuggestion(result);
    } catch (err) {
      Alert.alert(
        'AI suggestion failed',
        err instanceof Error ? err.message : 'Please try again',
      );
    } finally {
      setAiLoading(false);
    }
  }

  async function applyAISuggestion() {
    if (!aiSuggestion || !user) return;
    setApplying(true);
    try {
      await updateProfileFields(user.id, {
        daily_calorie_target: aiSuggestion.calories,
        daily_protein_g: aiSuggestion.protein_g,
        daily_carbs_g: aiSuggestion.carbs_g,
        daily_fat_g: aiSuggestion.fat_g,
        daily_water_ml: aiSuggestion.water_ml,
      });
      await refreshProfile();
      router.replace('/(tabs)');
    } catch (err) {
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Try again');
    } finally {
      setApplying(false);
    }
  }

  return (
    <Screen contentClassName="px-6 pt-12 pb-12">
      <OnboardingHeader
        step={5}
        totalSteps={5}
        title="Your daily targets"
        subtitle="Calculated from your stats. Customize anytime later."
      />

      {/* Calculated targets card */}
      <View className="rounded-3xl bg-emerald-500 p-6 mb-4 shadow-lg shadow-emerald-500/30">
        <Text className="text-xs font-semibold text-emerald-50 uppercase tracking-wide mb-2">
          Auto-calculated
        </Text>
        <View className="flex-row items-baseline mb-3">
          <Text className="text-5xl font-bold text-white">{calculated.calories}</Text>
          <Text className="text-lg text-emerald-50 ml-2">kcal/day</Text>
        </View>
        <View className="flex-row flex-wrap gap-x-4 gap-y-1">
          <Text className="text-sm text-emerald-50">
            P <Text className="font-bold">{calculated.protein_g}g</Text>
          </Text>
          <Text className="text-sm text-emerald-50">
            C <Text className="font-bold">{calculated.carbs_g}g</Text>
          </Text>
          <Text className="text-sm text-emerald-50">
            F <Text className="font-bold">{calculated.fat_g}g</Text>
          </Text>
          <Text className="text-sm text-emerald-50">
            Water <Text className="font-bold">{calculated.water_ml} ml</Text>
          </Text>
        </View>
      </View>

      {/* AI suggestion card */}
      {aiSuggestion ? (
        <View className="rounded-3xl bg-neutral-900 dark:bg-neutral-100 p-6 mb-4">
          <View className="flex-row items-center mb-2">
            <Ionicons name="sparkles" size={16} color="#10b981" />
            <Text className="ml-2 text-xs font-semibold text-emerald-400 dark:text-emerald-600 uppercase tracking-wide">
              AI Coach suggests
            </Text>
          </View>
          <View className="flex-row items-baseline mb-3">
            <Text className="text-5xl font-bold text-white dark:text-neutral-900">
              {aiSuggestion.calories}
            </Text>
            <Text className="text-lg text-neutral-400 dark:text-neutral-600 ml-2">kcal/day</Text>
          </View>
          <View className="flex-row flex-wrap gap-x-4 gap-y-1 mb-3">
            <Text className="text-sm text-neutral-300 dark:text-neutral-600">
              P <Text className="font-bold">{aiSuggestion.protein_g}g</Text>
            </Text>
            <Text className="text-sm text-neutral-300 dark:text-neutral-600">
              C <Text className="font-bold">{aiSuggestion.carbs_g}g</Text>
            </Text>
            <Text className="text-sm text-neutral-300 dark:text-neutral-600">
              F <Text className="font-bold">{aiSuggestion.fat_g}g</Text>
            </Text>
            <Text className="text-sm text-neutral-300 dark:text-neutral-600">
              Water <Text className="font-bold">{aiSuggestion.water_ml} ml</Text>
            </Text>
          </View>
          <Text className="text-sm leading-5 text-neutral-200 dark:text-neutral-700 mb-3">
            {aiSuggestion.reasoning}
          </Text>
          {aiSuggestion.weekly_change_estimate_kg ? (
            <Text className="text-xs text-emerald-400 dark:text-emerald-600 mb-1">
              Estimated: {aiSuggestion.weekly_change_estimate_kg > 0 ? '+' : ''}
              {aiSuggestion.weekly_change_estimate_kg.toFixed(2)} kg/week
            </Text>
          ) : null}
          {aiSuggestion.warning ? (
            <View className="rounded-xl bg-amber-900/30 dark:bg-amber-100/40 p-3 mt-3 flex-row items-start">
              <Ionicons name="warning-outline" size={16} color="#fbbf24" style={{ marginTop: 1 }} />
              <Text className="ml-2 flex-1 text-xs text-amber-300 dark:text-amber-700">
                {aiSuggestion.warning}
              </Text>
            </View>
          ) : null}
          <View className="mt-4">
            <Button onPress={applyAISuggestion} loading={applying}>
              Use AI suggestion
            </Button>
          </View>
        </View>
      ) : null}

      {/* Action buttons */}
      <View className="gap-3 mt-2">
        {!aiSuggestion ? (
          <Pressable
            onPress={handleAskAI}
            disabled={aiLoading}
            className="rounded-2xl border-2 border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 flex-row items-center active:opacity-70">
            <View className="w-10 h-10 rounded-xl bg-emerald-500 items-center justify-center mr-3">
              {aiLoading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Ionicons name="sparkles" size={18} color="white" />
              )}
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-neutral-900 dark:text-white">
                {aiLoading ? 'AI is thinking…' : 'Ask AI Coach for a custom target'}
              </Text>
              <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                GPT-5 considers your full context
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#10b981" />
          </Pressable>
        ) : null}

        <Button onPress={() => router.replace('/(tabs)')} variant="primary">
          Looks good — start tracking
        </Button>

        <Button
          onPress={() => router.push('/profile-edit-targets' as never)}
          variant="ghost"
          size="md">
          Customize manually
        </Button>
      </View>
    </Screen>
  );
}
