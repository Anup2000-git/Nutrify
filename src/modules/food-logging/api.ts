/**
 * Food Logging module — public API.
 * Manual entry, photo-based AI logging via Azure GPT-4o vision.
 */

export {
    calculateMacrosForQuantity, deleteMeal, fetchMealsByDate,
    fetchRecentMeals, fetchTodayMeals, logCustomMeal, logMeal
} from "./services/mealLog";
export type {
    LogCustomMealInput, LoggedMeal,
    LogMealInput
} from "./services/mealLog";

export { detectMealType, MEAL_TYPE_META } from "./services/mealTypeDetector";

export { sumDailyTotals } from "./services/dailyTotals";
export type { DailyTotals } from "./services/dailyTotals";

export { useRecentMeals } from "./hooks/useRecentMeals";
export { useTodayMeals } from "./hooks/useTodayMeals";

export { getSignedPhotoUrl, uploadFoodPhoto } from "./services/photoUpload";
export type { UploadedPhoto } from "./services/photoUpload";

export { analyzeFoodPhoto } from "./services/foodPhotoAnalysis";
export type {
    DetectedFood, FoodPhotoAnalysis
} from "./services/foodPhotoAnalysis";

