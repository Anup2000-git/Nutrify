import { router } from 'expo-router';
import { View } from 'react-native';

import { OnboardingHeader } from '@/src/modules/onboarding/components/OnboardingHeader';
import { SelectCard } from '@/src/modules/onboarding/components/SelectCard';
import { useOnboardingStore } from '@/src/modules/onboarding/api';
import { Button } from '@/src/shared/ui/Button';
import { Screen } from '@/src/shared/ui/Screen';
import type { LifeStage } from '@/src/types/models';

const OPTIONS: {
  value: LifeStage;
  icon: 'school-outline' | 'briefcase-outline' | 'woman-outline' | 'happy-outline' | 'leaf-outline';
  title: string;
  subtitle: string;
}[] = [
  { value: 'student', icon: 'school-outline', title: 'Student', subtitle: 'Hostel, college, school' },
  { value: 'working', icon: 'briefcase-outline', title: 'Working', subtitle: 'Office, business, freelance' },
  { value: 'pregnant', icon: 'woman-outline', title: 'Pregnant', subtitle: 'Extra nutrients prioritized' },
  { value: 'postpartum', icon: 'happy-outline', title: 'Postpartum', subtitle: 'Recovery and breastfeeding' },
  { value: 'senior', icon: 'leaf-outline', title: 'Senior', subtitle: '60+ years, gentle approach' },
];

export default function LifestageScreen() {
  const lifestage = useOnboardingStore((s) => s.lifestage);
  const setLifestage = useOnboardingStore((s) => s.setLifestage);

  return (
    <Screen contentClassName="px-6 pt-12 pb-12">
      <OnboardingHeader
        step={3}
        totalSteps={5}
        title="Tell us about your stage"
        subtitle="Helps your coach give context-aware advice"
      />

      <View>
        {OPTIONS.map((opt) => (
          <SelectCard
            key={opt.value}
            icon={opt.icon}
            title={opt.title}
            subtitle={opt.subtitle}
            selected={lifestage === opt.value}
            onPress={() => setLifestage(opt.value)}
          />
        ))}
      </View>

      <View className="mt-4">
        <Button
          onPress={() => router.push('/(onboarding)/diet' as never)}
          disabled={!lifestage}>
          Continue
        </Button>
      </View>
    </Screen>
  );
}
