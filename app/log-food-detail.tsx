import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/src/modules/auth/api';
import {
  calculateMacrosForQuantity,
  detectMealType,
  logMeal,
  MEAL_TYPE_META,
} from '@/src/modules/food-logging/api';
import { getFoodById, type FoodSearchResult } from '@/src/modules/nutrition-db/api';
import { Button } from '@/src/shared/ui/Button';
import { Input } from '@/src/shared/ui/Input';
import type { MealType } from '@/src/types/models';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner'];

type PortionChip = { label: string; grams: number };

/**
 * Liquid foods are measured in ml (≈ g for water-based liquids).
 * For these we show ml-based labels and the custom input asks for ml.
 */
function isLiquidFood(food: FoodSearchResult): boolean {
  if (food.category === 'beverage') return true;
  if (food.category === 'dairy' && /milk|lassi|buttermilk|shake/i.test(food.name)) {
    return true;
  }
  if (/juice|water|smoothie/i.test(food.name)) return true;
  return false;
}

/**
 * Build relatable quick-portion chips for the food.
 *
 * - With serving info: ½ / 1 / 1½ / 2 / 3 servings using the food's natural unit
 *   (katori, piece, cup, glass, etc.)
 * - Without serving info: generic Small/Medium/Large/XL gram presets
 * - Liquids show "ml" instead of "g" in the chip suffix
 */
function buildPortionChips(food: FoodSearchResult): PortionChip[] {
  const liquid = isLiquidFood(food);
  const unitSuffix = liquid ? 'ml' : 'g';

  if (food.serving_size_g && food.serving_label) {
    const base = food.serving_size_g;
    // Strip leading "1 " from labels like "1 katori" → "katori"
    const unit = food.serving_label.replace(/^1\s+/, '').trim();
    return [
      { label: `½ ${unit} · ${Math.max(1, Math.round(base / 2))}${unitSuffix}`, grams: Math.max(1, Math.round(base / 2)) },
      { label: `1 ${unit} · ${base}${unitSuffix}`, grams: base },
      { label: `1½ ${unit} · ${Math.round(base * 1.5)}${unitSuffix}`, grams: Math.round(base * 1.5) },
      { label: `2 ${unit}s · ${base * 2}${unitSuffix}`, grams: base * 2 },
      { label: `3 ${unit}s · ${base * 3}${unitSuffix}`, grams: base * 3 },
    ];
  }

  // No serving info — generic presets
  if (liquid) {
    return [
      { label: `Small · 100ml`, grams: 100 },
      { label: `Medium · 200ml`, grams: 200 },
      { label: `Large · 300ml`, grams: 300 },
      { label: `XL · 500ml`, grams: 500 },
    ];
  }
  return [
    { label: 'Small · 50g', grams: 50 },
    { label: 'Medium · 100g', grams: 100 },
    { label: 'Large · 200g', grams: 200 },
    { label: 'XL · 300g', grams: 300 },
  ];
}

export default function LogFoodDetailScreen() {
  const { foodId } = useLocalSearchParams<{ foodId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [food, setFood] = useState<FoodSearchResult | null>(null);
  const [loadingFood, setLoadingFood] = useState(true);
  const [quantityStr, setQuantityStr] = useState<string>('');
  const [mealType, setMealType] = useState<MealType>(detectMealType());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!foodId) return;
        const result = await getFoodById(foodId);
        if (!cancelled) {
          setFood(result);
          // Default to serving size if available, else 100g
          if (result?.serving_size_g) {
            setQuantityStr(String(result.serving_size_g));
          } else {
            setQuantityStr('100');
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load food');
      } finally {
        if (!cancelled) setLoadingFood(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [foodId]);

  const quantity = Number(quantityStr) || 0;
  const macros = useMemo(() => {
    if (!food) return null;
    return calculateMacrosForQuantity(food, quantity);
  }, [food, quantity]);

  async function handleAdd() {
    setError(null);
    if (!food) return;
    if (!user) {
      setError('Login session khatam ho gaya');
      return;
    }
    if (!quantity || quantity <= 0) {
      setError('Quantity daalo');
      return;
    }
    if (quantity > 5000) {
      setError('5kg/5L se zyada quantity? recheck karo');
      return;
    }

    setSubmitting(true);
    try {
      await logMeal({
        userId: user.id,
        food: food,
        quantityGrams: quantity,
        quantityLabel: food.serving_label ?? undefined,
        mealType,
      });
      queryClient.invalidateQueries({ queryKey: ['mealLogs'] });
      router.dismissAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingFood) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-white dark:bg-neutral-950 items-center justify-center">
        <ActivityIndicator color="#10b981" />
      </SafeAreaView>
    );
  }

  if (!food) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-white dark:bg-neutral-950 px-6 pt-8">
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={26} color="#9ca3af" />
        </Pressable>
        <Text className="text-base text-neutral-500 dark:text-neutral-400 mt-8 text-center">
          Food not found.
        </Text>
      </SafeAreaView>
    );
  }

  const liquid = isLiquidFood(food);
  const chips = buildPortionChips(food);
  const unitWord = liquid ? 'ml' : 'grams';

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
            Add to log
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* Food info card */}
          <View className="rounded-3xl bg-emerald-50 dark:bg-emerald-950/30 p-5 mb-5">
            <Text className="text-2xl font-bold text-neutral-900 dark:text-white">
              {food.name}
            </Text>
            {food.name_hindi ? (
              <Text className="text-base text-neutral-600 dark:text-neutral-400 mt-1">
                {food.name_hindi}
              </Text>
            ) : null}
            <Text className="text-xs text-emerald-700 dark:text-emerald-300 mt-2 uppercase tracking-wide font-semibold">
              {Math.round(food.calories_per_100g)} kcal per 100{liquid ? 'ml' : 'g'}
              {food.serving_label ? ` · ${food.serving_label} ≈ ${food.serving_size_g}${liquid ? 'ml' : 'g'}` : ''}
            </Text>
          </View>

          {/* Quick portion chips */}
          <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Portion size
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {chips.map((c) => {
              const selected = Math.abs(quantity - c.grams) < 0.5;
              return (
                <Pressable
                  key={c.label}
                  onPress={() => setQuantityStr(String(c.grams))}
                  className={`px-3 py-2 rounded-full border-2 ${
                    selected
                      ? 'border-emerald-500 bg-emerald-500'
                      : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'
                  }`}>
                  <Text
                    className={`text-xs font-semibold ${
                      selected ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'
                    }`}>
                    {c.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Custom amount input */}
          <Input
            label={`Or enter custom (${unitWord})`}
            placeholder={liquid ? '250' : '100'}
            value={quantityStr}
            onChangeText={setQuantityStr}
            keyboardType="decimal-pad"
            maxLength={6}
            error={error ?? undefined}
          />

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

          {/* Macros preview */}
          {macros && quantity > 0 ? (
            <View className="rounded-2xl bg-neutral-50 dark:bg-neutral-900 p-4 mb-5">
              <Text className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-2 uppercase tracking-wide">
                You'll log
              </Text>
              <Text className="text-3xl font-bold text-neutral-900 dark:text-white">
                {Math.round(macros.calories)} kcal
              </Text>
              <View className="flex-row flex-wrap gap-x-4 gap-y-1 mt-2">
                <Text className="text-sm text-neutral-700 dark:text-neutral-300">
                  P: <Text className="font-semibold">{macros.protein_g.toFixed(1)}g</Text>
                </Text>
                <Text className="text-sm text-neutral-700 dark:text-neutral-300">
                  C: <Text className="font-semibold">{macros.carbs_g.toFixed(1)}g</Text>
                </Text>
                <Text className="text-sm text-neutral-700 dark:text-neutral-300">
                  F: <Text className="font-semibold">{macros.fat_g.toFixed(1)}g</Text>
                </Text>
                <Text className="text-sm text-neutral-700 dark:text-neutral-300">
                  Fiber: <Text className="font-semibold">{macros.fiber_g.toFixed(1)}g</Text>
                </Text>
              </View>
            </View>
          ) : null}

          <Button onPress={handleAdd} loading={submitting}>
            Add to log
          </Button>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
