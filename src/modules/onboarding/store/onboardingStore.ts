import { create } from 'zustand';

import type {
  ActivityLevel,
  DietPreference,
  Gender,
  Goal,
  LifeStage,
} from '@/src/types/models';

type OnboardingState = {
  goal: Goal | null;
  activity: ActivityLevel | null;
  lifestage: LifeStage | null;
  diet: DietPreference | null;
  // Stats screen
  gender: Gender | null;
  heightCm: string;
  weightKg: string;
  dateOfBirth: string; // YYYY-MM-DD

  setGoal: (g: Goal) => void;
  setActivity: (a: ActivityLevel) => void;
  setLifestage: (l: LifeStage) => void;
  setDiet: (d: DietPreference) => void;
  setGender: (g: Gender) => void;
  setHeightCm: (h: string) => void;
  setWeightKg: (w: string) => void;
  setDateOfBirth: (d: string) => void;
  reset: () => void;
};

const initialState = {
  goal: null,
  activity: null,
  lifestage: null,
  diet: null,
  gender: null,
  heightCm: '',
  weightKg: '',
  dateOfBirth: '',
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...initialState,
  setGoal: (g) => set({ goal: g }),
  setActivity: (a) => set({ activity: a }),
  setLifestage: (l) => set({ lifestage: l }),
  setDiet: (d) => set({ diet: d }),
  setGender: (g) => set({ gender: g }),
  setHeightCm: (h) => set({ heightCm: h }),
  setWeightKg: (w) => set({ weightKg: w }),
  setDateOfBirth: (d) => set({ dateOfBirth: d }),
  reset: () => set({ ...initialState }),
}));
