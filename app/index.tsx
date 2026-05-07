import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/src/modules/auth/api';
import { isProfileComplete } from '@/src/types/models';

/**
 * Root index — decides where to send the user based on auth + profile state.
 *
 * - Not initialized yet  → spinner (very brief)
 * - No session            → /(auth)/login
 * - Session, no profile   → /(onboarding)/goal
 * - Session, profile done → /(tabs)
 */
export default function Index() {
  const { isAuthenticated, profile, initialized } = useAuth();

  if (!initialized) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-950">
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!isProfileComplete(profile)) {
    // Cast required until Expo's typed routes regenerate after `expo start`
    // picks up the new (onboarding) folder.
    return <Redirect href={'/(onboarding)/goal' as never} />;
  }

  return <Redirect href="/(tabs)" />;
}
