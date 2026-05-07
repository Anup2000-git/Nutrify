import { Text, View } from 'react-native';

type OnboardingHeaderProps = {
  step: number; // 1-indexed
  totalSteps: number;
  title: string;
  subtitle?: string;
};

export function OnboardingHeader({
  step,
  totalSteps,
  title,
  subtitle,
}: OnboardingHeaderProps) {
  const progress = (step / totalSteps) * 100;

  return (
    <View className="mb-6">
      {/* Progress bar */}
      <View className="flex-row items-center mb-6">
        <View className="flex-1 h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
          <View
            className="h-full bg-emerald-500"
            style={{ width: `${progress}%` }}
          />
        </View>
        <Text className="ml-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
          {step}/{totalSteps}
        </Text>
      </View>

      {/* Title block */}
      <Text className="text-3xl font-bold text-neutral-900 dark:text-white">
        {title}
      </Text>
      {subtitle ? (
        <Text className="text-base text-neutral-500 dark:text-neutral-400 mt-2">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
