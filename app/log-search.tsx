import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  lookupFoodViaAI,
  searchFoods,
  type FoodSearchResult,
} from '@/src/modules/nutrition-db/api';

export default function LogSearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiLooking, setAiLooking] = useState(false);

  // Debounced search — fires 250ms after typing stops
  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await searchFoods(query);
        if (!cancelled) setResults(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Search failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query]);

  async function handleAskAI() {
    const q = query.trim();
    if (q.length < 2) return;
    setAiLooking(true);
    try {
      const newFood = await lookupFoodViaAI(q);
      // Navigate directly to detail with the new food id
      router.replace({
        pathname: '/log-food-detail' as never,
        params: { foodId: newFood.id },
      });
    } catch (err) {
      Alert.alert(
        'AI lookup failed',
        err instanceof Error ? err.message : 'Try a clearer name',
      );
    } finally {
      setAiLooking(false);
    }
  }

  const trimmedQuery = query.trim();
  const showAiCta = trimmedQuery.length >= 2;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white dark:bg-neutral-950">
      {/* Header with back + search */}
      <View className="px-4 pb-3 border-b border-neutral-200 dark:border-neutral-800">
        <View className="flex-row items-center mb-3">
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            className="w-10 h-10 items-center justify-center -ml-2">
            <Ionicons name="close" size={26} color="#9ca3af" />
          </Pressable>
          <Text className="text-lg font-semibold text-neutral-900 dark:text-white ml-2">
            Search foods
          </Text>
        </View>

        <View className="flex-row items-center h-12 px-4 rounded-xl bg-neutral-100 dark:bg-neutral-900">
          <Ionicons name="search" size={18} color="#9ca3af" />
          <TextInput
            autoFocus
            placeholder="Search chapati, dal, paneer..."
            placeholderTextColor="#9ca3af"
            value={query}
            onChangeText={setQuery}
            className="ml-3 flex-1 text-base text-neutral-900 dark:text-white"
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery('')} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Results */}
      {loading && results.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#10b981" />
        </View>
      ) : error ? (
        <View className="px-6 pt-8 items-center">
          <Text className="text-sm text-red-500 text-center">{error}</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 }}
          renderItem={({ item }) => <FoodRow food={item} />}
          ItemSeparatorComponent={() => <View className="h-px bg-neutral-100 dark:bg-neutral-900" />}
          ListEmptyComponent={
            <View className="items-center justify-center px-8 pt-16">
              <Ionicons name="search-outline" size={40} color="#d4d4d8" />
              <Text className="text-base text-neutral-500 dark:text-neutral-400 mt-3 text-center">
                {trimmedQuery
                  ? `No foods found for "${trimmedQuery}"`
                  : 'Type to search Indian + global foods'}
              </Text>
              {showAiCta ? (
                <Text className="text-xs text-neutral-400 dark:text-neutral-600 mt-2 text-center">
                  Tap below to ask AI for nutrition data
                </Text>
              ) : null}
            </View>
          }
          ListFooterComponent={
            showAiCta ? (
              <Pressable
                onPress={handleAskAI}
                disabled={aiLooking}
                className="mt-4 mx-2 rounded-2xl border-2 border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 flex-row items-center active:opacity-70">
                <View className="w-10 h-10 rounded-xl bg-emerald-500 items-center justify-center mr-3">
                  {aiLooking ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Ionicons name="sparkles" size={18} color="white" />
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-neutral-900 dark:text-white">
                    {aiLooking ? 'AI is fetching nutrition…' : `Ask AI: "${trimmedQuery}"`}
                  </Text>
                  <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {aiLooking
                      ? 'This adds it to your foods database'
                      : "Can't find it? GPT-4o will look it up"}
                  </Text>
                </View>
                {!aiLooking ? (
                  <Ionicons name="chevron-forward" size={18} color="#10b981" />
                ) : null}
              </Pressable>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

function FoodRow({ food }: { food: FoodSearchResult }) {
  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/log-food-detail' as never,
          params: { foodId: food.id },
        })
      }
      className="flex-row items-center py-3 active:bg-neutral-50 dark:active:bg-neutral-900 rounded-xl px-2">
      <View className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 items-center justify-center mr-3">
        <Ionicons name="restaurant-outline" size={18} color="#10b981" />
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-neutral-900 dark:text-white">
          {food.name}
        </Text>
        <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
          {food.serving_label
            ? `${food.serving_label} (${food.serving_size_g}g)`
            : `per 100g`}
          {' · '}
          {Math.round(food.calories_per_100g)} kcal
          {food.region && food.region !== 'global' ? ` · ${food.region}` : ''}
          {!food.verified ? ' · AI' : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
    </Pressable>
  );
}
