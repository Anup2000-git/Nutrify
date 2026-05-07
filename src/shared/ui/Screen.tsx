import { ReactNode } from 'react';
import { ScrollView, View, ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

type ScreenProps = {
  children: ReactNode;
  /** Whether to wrap content in a ScrollView. Default true. */
  scroll?: boolean;
  /** Which edges to apply safe-area insets on. Defaults to all except bottom (tab bar handles bottom). */
  edges?: Edge[];
  /** Override container padding. Default: horizontal py for content readability. */
  contentClassName?: string;
  /** Background color. Use Tailwind class. */
  bgClassName?: string;
  style?: ViewStyle;
};

/**
 * Standard screen wrapper for Nutrify.
 *
 * Handles safe-area insets correctly across iOS notch / Android edge-to-edge
 * status bar. Always import this instead of bare SafeAreaView.
 */
export function Screen({
  children,
  scroll = true,
  edges = ['top', 'left', 'right'],
  contentClassName = 'px-5 pt-2 pb-32',
  bgClassName = 'bg-white dark:bg-neutral-950',
  style,
}: ScreenProps) {
  return (
    <SafeAreaView
      edges={edges}
      className={`flex-1 ${bgClassName}`}
      style={style}>
      {scroll ? (
        <ScrollView
          contentContainerClassName={contentClassName}
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View className={`flex-1 ${contentClassName}`}>{children}</View>
      )}
    </SafeAreaView>
  );
}
