import { router } from 'expo-router';
import { View } from 'react-native';

import { OnboardingHeader } from '@/src/modules/onboarding/components/OnboardingHeader';
import { SelectCard } from '@/src/modules/onboarding/components/SelectCard';
import { useOnboardingStore } from '@/src/modules/onboarding/api';
import { Button } from '@/src/shared/ui/Button';
import { Screen } from '@/src/shared/ui/Screen';
import type { DietPreference } from '@/src/types/models';

const OPTIONS: {
  value: DietPreference;
  icon: 'leaf-outline' | 'fish-outline' | 'egg-outline' | 'flower-outline' | 'nutrition-outline';
  title: string;
  subtitle: string;
}[] = [
  { value: 'veg', icon: 'leaf-outline', title: 'Vegetarian', subtitle: 'No meat, no eggs (dairy OK)' },
  { value: 'non_veg', icon: 'fish-outline', title: 'Non-vegetarian', subtitle: 'Meat, fish, eggs all good' },
  { value: 'eggetarian', icon: 'egg-outline', title: 'Eggetarian', subtitle: 'Veg plus eggs' },
  { value: 'jain', icon: 'flower-outline', title: 'Jain', subtitle: 'No root vegetables, no onion/garlic' },
  { value: 'vegan', icon: 'nutrition-outline', title: 'Vegan', subtitle: 'No animal products at all' },
];

export default function DietScreen() {
  const diet = useOnboardingStore((s) => s.diet);
  const setDiet = useOnboardingStore((s) => s.setDiet);

  return (
    <Screen contentClassName="px-6 pt-12 pb-12">
      <OnboardingHeader
        step={4}
        totalSteps={5}
        title="What's your diet?"
        subtitle="We'll suggest meals that fit your preference"
      />

      <View>
        {OPTIONS.map((opt) => (
          <SelectCard
            key={opt.value}
            icon={opt.icon}
            title={opt.title}
            subtitle={opt.subtitle}
            selected={diet === opt.value}
            onPress={() => setDiet(opt.value)}
          />
        ))}
      </View>

      <View className="mt-4">
        <Button
          onPress={() => router.push('/(onboarding)/stats' as never)}
          disabled={!diet}>
          Continue
        </Button>
      </View>
    </Screen>
  );
}
