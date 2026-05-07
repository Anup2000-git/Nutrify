import { router } from 'expo-router';
import { View } from 'react-native';

import { OnboardingHeader } from '@/src/modules/onboarding/components/OnboardingHeader';
import { SelectCard } from '@/src/modules/onboarding/components/SelectCard';
import { useOnboardingStore } from '@/src/modules/onboarding/api';
import { Button } from '@/src/shared/ui/Button';
import { Screen } from '@/src/shared/ui/Screen';
import type { Goal } from '@/src/types/models';

const OPTIONS: {
  value: Goal;
  icon: 'trending-down-outline' | 'trending-up-outline' | 'remove-outline' | 'barbell-outline' | 'heart-outline';
  title: string;
  subtitle: string;
}[] = [
  { value: 'weight_loss', icon: 'trending-down-outline', title: 'Weight loss', subtitle: 'Healthy calorie deficit' },
  { value: 'weight_gain', icon: 'trending-up-outline', title: 'Weight gain', subtitle: 'Sustainable surplus' },
  { value: 'maintain', icon: 'remove-outline', title: 'Maintain', subtitle: "Stay where I am" },
  { value: 'muscle_gain', icon: 'barbell-outline', title: 'Build muscle', subtitle: 'High protein, training-focused' },
  { value: 'general', icon: 'heart-outline', title: 'General health', subtitle: 'Eat better overall' },
];

export default function GoalScreen() {
  const goal = useOnboardingStore((s) => s.goal);
  const setGoal = useOnboardingStore((s) => s.setGoal);

  return (
    <Screen contentClassName="px-6 pt-12 pb-12">
      <OnboardingHeader
        step={1}
        totalSteps={5}
        title="What's your goal?"
        subtitle="Pick one — you can change it later"
      />

      <View>
        {OPTIONS.map((opt) => (
          <SelectCard
            key={opt.value}
            icon={opt.icon}
            title={opt.title}
            subtitle={opt.subtitle}
            selected={goal === opt.value}
            onPress={() => setGoal(opt.value)}
          />
        ))}
      </View>

      <View className="mt-4">
        <Button
          onPress={() => router.push('/(onboarding)/activity' as never)}
          disabled={!goal}>
          Continue
        </Button>
      </View>
    </Screen>
  );
}
