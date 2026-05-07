import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';

import { useRecentMeals } from '@/src/modules/food-logging/api';
import { Screen } from '@/src/shared/ui/Screen';

export default function LogRecentScreen() {
  const { data: recentMeals, isLoading, error } = useRecentMeals();

  return (
    <Screen scroll={false}>
      <View className="mb-4 flex-row items-center">
        <Pressable onPress={() => router.back()} className="mr-3" hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color="#9ca3af" />
        </Pressable>
        <Text className="text-2xl font-bold text-neutral-900 dark:text-white">
          Recent meals
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#10b981" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-red-500 text-center">Failed to load recent meals</Text>
        </View>
      ) : recentMeals?.length === 0 ? (
        <View className="flex-1 items-center justify-center p-4">
          <Ionicons name="fast-food-outline" size={48} color="#d1d5db" />
          <Text className="text-neutral-500 dark:text-neutral-400 mt-4 text-center">
            No recent meals found. Log some foods to see them here!
          </Text>
        </View>
      ) : (
        <FlatList
          data={recentMeals}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                if (item.food_id) {
                  router.push(`/log-food-detail?foodId=${item.food_id}`);
                } else {
                  // If no food_id (custom food), we would ideally have a log-custom screen
                  // For now, we alert the user
                  alert("Custom foods (from photos without database entry) can't be quickly re-logged yet.");
                }
              }}
              className="flex-row items-center bg-white dark:bg-neutral-900 p-4 mb-3 rounded-2xl border border-neutral-100 dark:border-neutral-800 active:opacity-70">
              <View className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 items-center justify-center mr-4">
                <Ionicons name="time-outline" size={24} color="#10b981" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-neutral-900 dark:text-white">
                  {item.food_name}
                </Text>
                <Text className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Logged as {item.quantity_g}g
                </Text>
              </View>
              <Text className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {Math.round(item.calories)} kcal
              </Text>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}
