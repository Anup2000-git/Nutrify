import { router } from 'expo-router';
import { View } from 'react-native';

import { OnboardingHeader } from '@/src/modules/onboarding/components/OnboardingHeader';
import { SelectCard } from '@/src/modules/onboarding/components/SelectCard';
import { useOnboardingStore } from '@/src/modules/onboarding/api';
import { Button } from '@/src/shared/ui/Button';
import { Screen } from '@/src/shared/ui/Screen';
import type { ActivityLevel } from '@/src/types/models';

const OPTIONS: {
  value: ActivityLevel;
  icon: 'bed-outline' | 'walk-outline' | 'bicycle-outline' | 'flame-outline';
  title: string;
  subtitle: string;
}[] = [
  { value: 'sedentary', icon: 'bed-outline', title: 'Sedentary', subtitle: 'Mostly sitting, no exercise' },
  { value: 'light', icon: 'walk-outline', title: 'Lightly active', subtitle: 'Walks, yoga 1-3x/week' },
  { value: 'moderate', icon: 'bicycle-outline', title: 'Moderately active', subtitle: 'Exercise 3-5x/week' },
  { value: 'heavy', icon: 'flame-outline', title: 'Very active', subtitle: 'Heavy gym 5-7x/week' },
];

export default function ActivityScreen() {
  const activity = useOnboardingStore((s) => s.activity);
  const setActivity = useOnboardingStore((s) => s.setActivity);

  return (
    <Screen contentClassName="px-6 pt-12 pb-12">
      <OnboardingHeader
        step={2}
        totalSteps={5}
        title="How active are you?"
        subtitle="Be honest — this drives your calorie target"
      />

      <View>
        {OPTIONS.map((opt) => (
          <SelectCard
            key={opt.value}
            icon={opt.icon}
            title={opt.title}
            subtitle={opt.subtitle}
            selected={activity === opt.value}
            onPress={() => setActivity(opt.value)}
          />
        ))}
      </View>

      <View className="mt-4">
        <Button
          onPress={() => router.push('/(onboarding)/lifestage' as never)}
          disabled={!activity}>
          Continue
        </Button>
      </View>
    </Screen>
  );
}
