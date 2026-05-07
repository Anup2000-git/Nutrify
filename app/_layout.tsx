import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { useOfflineSync } from "@/src/lib/useOfflineSync";
import { useAuthInit } from "@/src/modules/auth/api";

export const unstable_settings = {
  anchor: "index",
};

/** Child component that uses hooks requiring QueryClientProvider */
function AppContent() {
  // Sync offline queue when connectivity restored
  useOfflineSync();

  // Register push notifications on mount (safe for Expo Go)
  useEffect(() => {
    (async () => {
      try {
        const { configureNotificationHandler, registerForPushNotifications, scheduleDefaultReminders } =
          await import("@/src/modules/notifications/api");
        await configureNotificationHandler();
        const token = await registerForPushNotifications();
        if (token) {
          await scheduleDefaultReminders();
        }
      } catch {
        // Notifications not available (Expo Go), silently skip
      }
    })();
  }, []);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  useAuthInit();

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      <SafeAreaProvider>
        <ThemeProvider
          value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
        >
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" options={{ animation: "fade" }} />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="log-search"
              options={{
                presentation: "modal",
                animation: "slide_from_bottom",
              }}
            />
            <Stack.Screen
              name="log-food-detail"
              options={{
                presentation: "modal",
                animation: "slide_from_bottom",
              }}
            />
            <Stack.Screen
              name="log-camera"
              options={{
                presentation: "modal",
                animation: "slide_from_bottom",
              }}
            />
            <Stack.Screen
              name="log-photo-confirm"
              options={{
                presentation: "modal",
                animation: "slide_from_bottom",
              }}
            />
            <Stack.Screen
              name="profile-edit-targets"
              options={{
                presentation: "modal",
                animation: "slide_from_bottom",
              }}
            />
            <Stack.Screen
              name="profile-edit-stats"
              options={{
                presentation: "modal",
                animation: "slide_from_bottom",
              }}
            />
            <Stack.Screen
              name="feedback"
              options={{
                presentation: "modal",
                animation: "slide_from_bottom",
              }}
            />
          </Stack>
          <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
