import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/src/modules/auth/api';
import {
  analyzeFoodPhoto,
  type DetectedFood,
  logCustomMeal,
  MEAL_TYPE_META,
} from '@/src/modules/food-logging/api';
import { Button } from '@/src/shared/ui/Button';
import type { MealType } from '@/src/types/models';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner'];

type EditableFood = DetectedFood & {
  enabled: boolean;
  // Keep the original quantity/macros so we can re-scale when user edits quantity
  origQuantity: number;
  origCalories: number;
  origProtein: number;
  origCarbs: number;
  origFat: number;
  origFiber: number;
};

function rescale(food: EditableFood, newQuantity: number): EditableFood {
  if (food.origQuantity <= 0) return food;
  const factor = newQuantity / food.origQuantity;
  return {
    ...food,
    quantity_g: newQuantity,
    calories: round1(food.origCalories * factor),
    protein_g: round1(food.origProtein * factor),
    carbs_g: round1(food.origCarbs * factor),
    fat_g: round1(food.origFat * factor),
    fiber_g: round1(food.origFiber * factor),
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export default function LogPhotoConfirmScreen() {
  const { storagePath, localUri } = useLocalSearchParams<{
    storagePath: string;
    localUri?: string;
  }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [foods, setFoods] = useState<EditableFood[]>([]);
  const [mealType, setMealType] = useState<MealType>('snack');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!storagePath) {
        setError('No photo to analyze');
        setLoading(false);
        return;
      }
      try {
        const result = await analyzeFoodPhoto(storagePath);
        if (cancelled) return;

        const editable: EditableFood[] = result.detectedFoods.map((f) => ({
          ...f,
          enabled: true,
          origQuantity: f.quantity_g,
          origCalories: f.calories,
          origProtein: f.protein_g,
          origCarbs: f.carbs_g,
          origFat: f.fat_g,
          origFiber: f.fiber_g,
        }));
        setFoods(editable);
        setMealType(result.meal_type);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Analysis failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storagePath]);

  const totals = useMemo(() => {
    return foods.filter((f) => f.enabled).reduce(
      (acc, f) => ({
        calories: acc.calories + f.calories,
        protein_g: acc.protein_g + f.protein_g,
        carbs_g: acc.carbs_g + f.carbs_g,
        fat_g: acc.fat_g + f.fat_g,
        fiber_g: acc.fiber_g + f.fiber_g,
      }),
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 },
    );
  }, [foods]);

  function toggleFood(idx: number) {
    setFoods((prev) =>
      prev.map((f, i) => (i === idx ? { ...f, enabled: !f.enabled } : f)),
    );
  }

  function updateQuantity(idx: number, value: string) {
    const num = Number(value) || 0;
    setFoods((prev) => prev.map((f, i) => (i === idx ? rescale(f, num) : f)));
  }

  async function handleAddAll() {
    if (!user) return;
    const enabled = foods.filter((f) => f.enabled);
    if (enabled.length === 0) {
      Alert.alert('Nothing to log', 'At least ek food select karo, ya skip karo.');
      return;
    }

    setSubmitting(true);
    try {
      // Insert each as a separate meal_logs row.
      for (const f of enabled) {
        await logCustomMeal({
          userId: user.id,
          foodName: f.name,
          quantityGrams: f.quantity_g,
          mealType,
          calories: f.calories,
          protein_g: f.protein_g,
          carbs_g: f.carbs_g,
          fat_g: f.fat_g,
          fiber_g: f.fiber_g,
          photoUrl: storagePath,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['mealLogs'] });
      router.dismissAll();
    } catch (err) {
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Retry karo');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1">
      <SafeAreaView edges={['top']} className="flex-1 bg-white dark:bg-neutral-950">
        {/* Header */}
        <View className="px-5 pb-2 flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            className="w-10 h-10 items-center justify-center -ml-2">
            <Ionicons name="close" size={26} color="#9ca3af" />
          </Pressable>
          <Text className="text-lg font-semibold text-neutral-900 dark:text-white ml-2">
            Confirm meal
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}>
          {/* Photo preview */}
          {localUri ? (
            <Image
              source={{ uri: localUri }}
              style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 24, marginBottom: 16 }}
              contentFit="cover"
            />
          ) : null}

          {/* Loading state */}
          {loading ? (
            <View className="items-center py-10">
              <ActivityIndicator color="#10b981" />
              <Text className="text-base text-neutral-500 dark:text-neutral-400 mt-4">
                Analyzing your meal…
              </Text>
              <Text className="text-xs text-neutral-400 dark:text-neutral-600 mt-2 text-center px-8">
                AI is identifying foods and estimating macros. This takes a few seconds.
              </Text>
            </View>
          ) : error ? (
            <View className="rounded-2xl bg-red-50 dark:bg-red-950/30 p-4 mb-4">
              <Text className="text-sm font-semibold text-red-700 dark:text-red-300 mb-1">
                Analysis failed
              </Text>
              <Text className="text-xs text-red-600 dark:text-red-400">{error}</Text>
            </View>
          ) : foods.length === 0 ? (
            <View className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 p-5 mb-4 items-center">
              <Ionicons name="alert-circle-outline" size={28} color="#d97706" />
              <Text className="text-base font-semibold text-amber-900 dark:text-amber-200 mt-2 text-center">
                No food detected
              </Text>
              <Text className="text-xs text-amber-700 dark:text-amber-400 mt-1 text-center">
                Try a clearer photo with more of the plate visible
              </Text>
            </View>
          ) : (
            <>
              {/* Detected foods */}
              <Text className="text-base font-semibold text-neutral-900 dark:text-white mb-3">
                Detected items
              </Text>
              <View className="gap-3 mb-5">
                {foods.map((f, idx) => (
                  <View
                    key={idx}
                    className={`rounded-2xl border p-4 ${
                      f.enabled
                        ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20'
                        : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 opacity-50'
                    }`}>
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 mr-3">
                        <Text className="text-base font-semibold text-neutral-900 dark:text-white">
                          {f.name}
                        </Text>
                        <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                          AI confidence: {Math.round(f.confidence * 100)}%
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => toggleFood(idx)}
                        hitSlop={8}
                        className="w-7 h-7 rounded-full items-center justify-center"
                        style={{
                          backgroundColor: f.enabled ? '#10b981' : '#e5e5e5',
                        }}>
                        <Ionicons
                          name={f.enabled ? 'checkmark' : 'close'}
                          size={16}
                          color="white"
                        />
                      </Pressable>
                    </View>

                    {f.enabled ? (
                      <>
                        <View className="flex-row items-center mt-3">
                          <Text className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mr-2">
                            Qty (g):
                          </Text>
                          <TextInput
                            value={String(f.quantity_g)}
                            onChangeText={(v) => updateQuantity(idx, v)}
                            keyboardType="decimal-pad"
                            maxLength={5}
                            className="flex-1 h-9 px-3 rounded-lg bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-sm text-neutral-900 dark:text-white"
                          />
                          <Text className="text-sm font-bold text-emerald-700 dark:text-emerald-300 ml-3">
                            {Math.round(f.calories)} kcal
                          </Text>
                        </View>
                        <View className="flex-row flex-wrap gap-x-3 gap-y-0.5 mt-2">
                          <Text className="text-[11px] text-neutral-600 dark:text-neutral-400">
                            P {f.protein_g.toFixed(1)}g
                          </Text>
                          <Text className="text-[11px] text-neutral-600 dark:text-neutral-400">
                            C {f.carbs_g.toFixed(1)}g
                          </Text>
                          <Text className="text-[11px] text-neutral-600 dark:text-neutral-400">
                            F {f.fat_g.toFixed(1)}g
                          </Text>
                          <Text className="text-[11px] text-neutral-600 dark:text-neutral-400">
                            Fiber {f.fiber_g.toFixed(1)}g
                          </Text>
                        </View>
                      </>
                    ) : null}
                  </View>
                ))}
              </View>

              {/* Meal type */}
              <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Meal
              </Text>
              <View className="flex-row gap-2 mb-5">
                {MEAL_TYPES.map((mt) => {
                  const meta = MEAL_TYPE_META[mt];
                  const selected = mealType === mt;
                  return (
                    <Pressable
                      key={mt}
                      onPress={() => setMealType(mt)}
                      className={`flex-1 h-14 rounded-xl items-center justify-center border-2 ${
                        selected
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                          : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'
                      }`}>
                      <Ionicons
                        name={meta.icon}
                        size={18}
                        color={selected ? '#10b981' : '#9ca3af'}
                      />
                      <Text
                        className={`text-[10px] font-semibold mt-1 ${
                          selected
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : 'text-neutral-500 dark:text-neutral-400'
                        }`}>
                        {meta.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Totals */}
              <View className="rounded-2xl bg-neutral-900 dark:bg-neutral-100 p-5 mb-5">
                <Text className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wide mb-1">
                  Total to log
                </Text>
                <Text className="text-3xl font-bold text-white dark:text-neutral-900">
                  {Math.round(totals.calories)} kcal
                </Text>
                <View className="flex-row flex-wrap gap-x-4 gap-y-0.5 mt-2">
                  <Text className="text-sm text-neutral-300 dark:text-neutral-600">
                    P: <Text className="font-semibold">{totals.protein_g.toFixed(1)}g</Text>
                  </Text>
                  <Text className="text-sm text-neutral-300 dark:text-neutral-600">
                    C: <Text className="font-semibold">{totals.carbs_g.toFixed(1)}g</Text>
                  </Text>
                  <Text className="text-sm text-neutral-300 dark:text-neutral-600">
                    F: <Text className="font-semibold">{totals.fat_g.toFixed(1)}g</Text>
                  </Text>
                  <Text className="text-sm text-neutral-300 dark:text-neutral-600">
                    Fiber: <Text className="font-semibold">{totals.fiber_g.toFixed(1)}g</Text>
                  </Text>
                </View>
              </View>

              <Button onPress={handleAddAll} loading={submitting}>
                Add to log
              </Button>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
