import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type SelectCardProps = {
  icon: IoniconName;
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
};

export function SelectCard({
  icon,
  title,
  subtitle,
  selected,
  onPress,
}: SelectCardProps) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-2xl p-4 flex-row items-center border-2 mb-3 active:opacity-80 ${
        selected
          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
          : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'
      }`}>
      <View
        className={`w-12 h-12 rounded-2xl items-center justify-center mr-3 ${
          selected
            ? 'bg-emerald-500'
            : 'bg-neutral-100 dark:bg-neutral-800'
        }`}>
        <Ionicons
          name={icon}
          size={22}
          color={selected ? 'white' : '#10b981'}
        />
      </View>
      <View className="flex-1">
        <Text
          className={`text-base font-semibold ${
            selected
              ? 'text-emerald-900 dark:text-emerald-200'
              : 'text-neutral-900 dark:text-white'
          }`}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {selected ? (
        <Ionicons name="checkmark-circle" size={24} color="#10b981" />
      ) : null}
    </Pressable>
  );
}
