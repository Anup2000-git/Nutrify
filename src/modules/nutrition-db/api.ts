/**
 * Nutrition DB module — public API.
 * Search across IFCT 2017, USDA FoodData Central, Open Food Facts,
 * with LLM fallback for unmatched items.
 */

export { searchFoods, getFoodById } from './services/foodSearch';
export type { FoodSearchResult } from './services/foodSearch';

export { lookupFoodViaAI } from './services/aiLookup';
