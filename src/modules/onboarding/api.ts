/**
 * Onboarding module — public API.
 * Handles the 5-step persona setup, AI target suggestions, and profile edits.
 */

export {
  saveFullProfile,
  updateProfileFields,
  recomputeTargets,
} from './services/profileService';
export type { FullOnboardingPayload, ProfileUpdates } from './services/profileService';

export {
  calculateDailyTargets,
  calculateAge,
  calculateBMR,
  calculateTDEE,
} from './services/nutritionCalc';
export type { DailyTargets } from './services/nutritionCalc';

export { suggestDailyTargetsViaAI } from './services/targetsSuggestion';
export type { AISuggestedTargets } from './services/targetsSuggestion';

export { useOnboardingStore } from './store/onboardingStore';
