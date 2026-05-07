import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

const QUEUE_KEY = "@nutrifyr/offline_queue";

export type QueuedAction = {
  id: string;
  type: "log_meal" | "log_weight" | "log_water";
  payload: Record<string, unknown>;
  createdAt: string;
};

/**
 * Add an action to the offline queue.
 */
export async function enqueue(
  action: Omit<QueuedAction, "id" | "createdAt">,
): Promise<void> {
  const queue = await getQueue();
  queue.push({
    ...action,
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  });
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/**
 * Get all pending actions in the queue.
 */
export async function getQueue(): Promise<QueuedAction[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as QueuedAction[];
  } catch {
    return [];
  }
}

/**
 * Remove an action from the queue (after successful sync).
 */
export async function dequeue(id: string): Promise<void> {
  const queue = await getQueue();
  const filtered = queue.filter((a) => a.id !== id);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
}

/**
 * Clear the entire queue.
 */
export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

/**
 * Check if the device is currently online.
 */
export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected === true;
}

/**
 * Process queued actions — call this when connectivity is restored.
 * Takes a processor function that handles each action type.
 */
export async function processQueue(
  processor: (action: QueuedAction) => Promise<void>,
): Promise<{ processed: number; failed: number }> {
  const queue = await getQueue();
  let processed = 0;
  let failed = 0;

  for (const action of queue) {
    try {
      await processor(action);
      await dequeue(action.id);
      processed++;
    } catch {
      failed++;
    }
  }

  return { processed, failed };
}
