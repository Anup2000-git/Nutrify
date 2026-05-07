import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Screen } from '@/src/shared/ui/Screen';

type Method = {
  icon: 'camera' | 'search' | 'barcode-outline' | 'time-outline';
  title: string;
  subtitle: string;
  accent: string;
  onPress: () => void;
  comingSoon?: boolean;
};

export default function LogScreen() {
  const methods: Method[] = [
    {
      icon: 'camera',
      title: 'Snap a photo',
      subtitle: 'AI identifies food + macros',
      accent: 'bg-emerald-500',
      onPress: () => router.push('/log-camera' as never),
    },
    {
      icon: 'search',
      title: 'Search foods',
      subtitle: 'Indian + global database',
      accent: 'bg-blue-500',
      onPress: () => router.push('/log-search' as never),
    },
    {
      icon: 'barcode-outline',
      title: 'Scan barcode',
      subtitle: 'For packaged items',
      accent: 'bg-purple-500',
      onPress: () => router.push('/log-barcode' as never),
    },
    {
      icon: 'time-outline',
      title: 'Recent meals',
      subtitle: 'Re-log what you ate before',
      accent: 'bg-amber-500',
      onPress: () => router.push('/log-recent' as never),
    },
  ];

  return (
    <Screen>
      <View className="mb-6">
        <Text className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">
          Add to today
        </Text>
        <Text className="text-3xl font-bold text-neutral-900 dark:text-white">
          Log a meal
        </Text>
      </View>

      <View className="gap-3">
        {methods.map((m) => (
          <Pressable
            key={m.title}
            onPress={m.onPress}
            disabled={m.comingSoon}
            className={`rounded-2xl bg-neutral-50 dark:bg-neutral-900 p-4 active:opacity-70 flex-row items-center ${
              m.comingSoon ? 'opacity-50' : ''
            }`}>
            <View className={`w-12 h-12 rounded-2xl ${m.accent} items-center justify-center mr-4`}>
              <Ionicons name={m.icon} size={22} color="white" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-neutral-900 dark:text-white">
                {m.title}
              </Text>
              <Text className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                {m.subtitle}
              </Text>
            </View>
            {m.comingSoon ? (
              <Text className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide mr-1">
                Soon
              </Text>
            ) : (
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            )}
          </Pressable>
        ))}
      </View>

      <View className="mt-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 p-4 flex-row items-start">
        <Ionicons name="sparkles-outline" size={20} color="#10b981" style={{ marginTop: 2 }} />
        <Text className="ml-3 flex-1 text-sm text-emerald-800 dark:text-emerald-200">
          <Text className="font-semibold">AI photo logging is live!</Text> Snap a meal and let GPT-4o do the work. Barcode + recents coming next.
        </Text>
      </View>
    </Screen>
  );
}
