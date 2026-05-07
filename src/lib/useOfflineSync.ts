import NetInfo from "@react-native-community/netinfo";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { processQueue, type QueuedAction } from "@/src/lib/offlineQueue";
import { useAuth } from "@/src/modules/auth/api";
import { logCustomMeal, logMeal } from "@/src/modules/food-logging/api";
import { logWater, logWeight } from "@/src/modules/tracking/api";

/**
 * Hook that watches connectivity and processes queued actions when back online.
 * Place in root layout.
 */
export function useOfflineSync() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        processQueue(async (action: QueuedAction) => {
          const payload = action.payload;
          switch (action.type) {
            case "log_meal":
              if (payload.custom) {
                await logCustomMeal(
                  payload.input as Parameters<typeof logCustomMeal>[0],
                );
              } else {
                await logMeal(payload.input as Parameters<typeof logMeal>[0]);
              }
              break;
            case "log_weight":
              await logWeight(user.id, payload.weightKg as number);
              break;
            case "log_water":
              await logWater(user.id, payload.ml as number);
              break;
          }
        }).then(({ processed }) => {
          if (processed > 0) {
            queryClient.invalidateQueries({ queryKey: ["mealLogs"] });
            queryClient.invalidateQueries({ queryKey: ["weightHistory"] });
            queryClient.invalidateQueries({ queryKey: ["todayWater"] });
          }
        });
      }
    });

    return () => unsubscribe();
  }, [user]);
}
