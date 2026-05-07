import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/src/modules/auth/api';
import { fetchRecentMeals } from '../services/mealLog';

export function useRecentMeals() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['recentMeals', user?.id],
    queryFn: () => fetchRecentMeals(user!.id),
    enabled: !!user?.id,
  });
}
