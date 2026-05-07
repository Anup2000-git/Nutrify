/**
 * Tracking module — public API.
 * Weight logs, BMI calculation, water intake, daily summaries, goals.
 */

export {
    bmiCategory, calculateBMI, deleteWeightEntry, fetchWeightHistory, logWeight
} from "./services/weightLog";
export type { WeightEntry } from "./services/weightLog";

export {
    fetchDailySummaries, getTodayWater, logWater, upsertDailySummary
} from "./services/dailySummary";
export type { DailySummaryRow } from "./services/dailySummary";

export {
    createGoal, fetchActiveGoal, fetchGoalHistory, markGoalAchieved
} from "./services/goals";
export type { GoalEntry } from "./services/goals";

