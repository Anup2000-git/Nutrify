import { forwardRef } from 'react';
import { Text, TextInput, type TextInputProps, View } from 'react-native';

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  hint?: string;
};

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, hint, ...textInputProps },
  ref,
) {
  return (
    <View className="mb-4">
      {label ? (
        <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
          {label}
        </Text>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor="#9ca3af"
        className={`h-12 px-4 rounded-xl bg-neutral-50 dark:bg-neutral-900 text-base text-neutral-900 dark:text-white border ${
          error
            ? 'border-red-400'
            : 'border-neutral-200 dark:border-neutral-800 focus:border-emerald-500'
        }`}
        {...textInputProps}
      />
      {error ? (
        <Text className="text-xs text-red-500 mt-1">{error}</Text>
      ) : hint ? (
        <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{hint}</Text>
      ) : null}
    </View>
  );
});
