import { useEffect } from "react";

import { useAuth } from "@/src/modules/auth/api";
import { upsertDailySummary } from "@/src/modules/tracking/api";

/**
 * Hook that auto-updates the daily_summary row whenever meal data changes.
 * Place in the root layout or home screen to keep summaries fresh.
 */
export function useSyncDailySummary(mealCount: number) {
  const { user } = useAuth();

  useEffect(() => {
    if (user && mealCount > 0) {
      upsertDailySummary(user.id).catch(() => {});
    }
  }, [user, mealCount]);
}
