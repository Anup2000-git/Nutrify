import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/src/modules/auth/api';

import { fetchTodayMeals } from '../services/mealLog';

export function useTodayMeals() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['mealLogs', user?.id, 'today'],
    queryFn: () => {
      if (!user) return [];
      return fetchTodayMeals(user.id);
    },
    enabled: !!user,
    staleTime: 30_000,
  });
}
