/** Account + family scoped offline snapshots. Legacy unscoped data is never read. */
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'cache:home:';
// Serialize writes and logout deletion: a slow save must not finish after clear.
let writes = Promise.resolve();
const emptySnapshot = () => ({ events: [], tasks: [], savedAt: null });

/** Save a complete snapshot only for an authenticated, resolved scope. */
export async function saveCache(events, tasks, scope) {
  if (!scope) return;
  try {
    const snapshot = JSON.stringify({ events, tasks, savedAt: new Date().toISOString() });
    writes = writes.then(() => AsyncStorage.setItem(PREFIX + scope, snapshot)).catch(() => {});
    await writes;
  } catch { /* cache failure must never crash the app */ }
}

export async function loadCache(scope) {
  if (!scope) return emptySnapshot();
  try {
    await writes;
    const raw = await AsyncStorage.getItem(PREFIX + scope);
    const cached = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(cached?.events) || !Array.isArray(cached?.tasks)) return emptySnapshot();
    return { events: cached.events, tasks: cached.tasks, savedAt: cached.savedAt || null };
  } catch {
    return emptySnapshot();
  }
}

/** Human-readable last updated label. */
export function savedAtLabel(isoString) {
  if (!isoString) return null;
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return 'yesterday';
}

/** Logout removes every scoped snapshot, plus obsolete pre-scoping keys. */
export async function clearCache() {
  writes = writes.then(async () => {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove([
      ...keys.filter(key => key.startsWith(PREFIX)),
      'cache:events', 'cache:tasks', 'cache:savedAt',
    ]);
  }).catch(() => {});
  await writes;
}
