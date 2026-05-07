import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';

type ButtonProps = {
  children: ReactNode;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
};

const variantStyles = {
  primary: {
    container: 'bg-emerald-500 active:bg-emerald-600',
    text: 'text-white',
    spinner: '#ffffff',
  },
  secondary: {
    container: 'bg-neutral-100 dark:bg-neutral-800 active:bg-neutral-200 dark:active:bg-neutral-700',
    text: 'text-neutral-900 dark:text-white',
    spinner: '#10b981',
  },
  ghost: {
    container: 'bg-transparent active:bg-neutral-100 dark:active:bg-neutral-900',
    text: 'text-emerald-600 dark:text-emerald-400',
    spinner: '#10b981',
  },
} as const;

const sizeStyles = {
  md: { container: 'h-11 px-4 rounded-xl', text: 'text-sm font-semibold' },
  lg: { container: 'h-14 px-6 rounded-2xl', text: 'text-base font-semibold' },
} as const;

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'lg',
  loading = false,
  disabled = false,
}: ButtonProps) {
  const v = variantStyles[variant];
  const s = sizeStyles[size];
  const isInactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isInactive}
      className={`${v.container} ${s.container} items-center justify-center flex-row ${
        isInactive ? 'opacity-50' : ''
      }`}>
      {loading ? (
        <ActivityIndicator color={v.spinner} />
      ) : (
        <Text className={`${v.text} ${s.text}`}>{children}</Text>
      )}
    </Pressable>
  );
}
