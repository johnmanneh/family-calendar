/**
 * Simple AsyncStorage cache for events and tasks.
 *
 * Keys:
 *   cache:events   — JSON array
 *   cache:tasks    — JSON array
 *   cache:savedAt  — ISO timestamp of last successful fetch
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  events:  'cache:events',
  tasks:   'cache:tasks',
  savedAt: 'cache:savedAt',
};

/**
 * Save events and tasks after a successful fetch.
 */
export async function saveCache(events, tasks) {
  try {
    await AsyncStorage.multiSet([
      [KEYS.events,  JSON.stringify(events)],
      [KEYS.tasks,   JSON.stringify(tasks)],
      [KEYS.savedAt, new Date().toISOString()],
    ]);
  } catch { /* silent — cache failure must never crash the app */ }
}

/**
 * Load cached events, tasks, and the timestamp of the last save.
 * Returns { events, tasks, savedAt } — arrays are empty if nothing cached yet.
 */
export async function loadCache() {
  try {
    const pairs = await AsyncStorage.multiGet([KEYS.events, KEYS.tasks, KEYS.savedAt]);
    const map = Object.fromEntries(pairs.map(([k, v]) => [k, v]));
    return {
      events:  map[KEYS.events]  ? JSON.parse(map[KEYS.events])  : [],
      tasks:   map[KEYS.tasks]   ? JSON.parse(map[KEYS.tasks])   : [],
      savedAt: map[KEYS.savedAt] || null,
    };
  } catch {
    return { events: [], tasks: [], savedAt: null };
  }
}

/**
 * Human-readable "last updated" label, e.g. "2 min ago" or "Yesterday".
 */
export function savedAtLabel(isoString) {
  if (!isoString) return null;
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return 'yesterday';
}


/**
 * Remove all cached events/tasks — called on logout so the next person who
 * signs in on this phone never sees the previous account's calendar.
 */
export async function clearCache() {
  try {
    await AsyncStorage.multiRemove([KEYS.events, KEYS.tasks, KEYS.savedAt]);
  } catch { /* silent */ }
}
