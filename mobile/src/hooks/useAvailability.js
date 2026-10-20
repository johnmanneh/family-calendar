import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { checkAvailability } from '../api/availability';

const SERVER_STATES = new Set(['busy', 'no_known_conflict', 'not_shared']);

// Availability is advisory, not permission to invite someone or open an event.
export default function useAvailability({ startDate, endDate, isAllDay, userIds, familyId, excludeEventId }) {
  const [refreshTick, setRefreshTick] = useState(0);
  const [foreground, setForeground] = useState(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => setForeground(state === 'active'));
    return () => subscription.remove();
  }, []);
  const idsKey = [...new Set(userIds.map(Number))].sort((a, b) => a - b).join(',');
  const startMs = startDate?.getTime();
  const endMs = endDate?.getTime();
  const queryKey = JSON.stringify([startMs, endMs, !!isAllDay, idsKey, familyId, excludeEventId, refreshTick, foreground]);
  const [result, setResult] = useState({ key: null, phase: 'checking', byId: {} });

  useEffect(() => {
    let ignore = false;
    let expiryTimer;
    setResult({ key: queryKey, phase: 'checking', byId: {} });
    const start = new Date(startMs);
    let end = new Date(endMs);
    if (isAllDay) {
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      // Calendar-day arithmetic is important when a day is not 24 hours.
      end.setDate(end.getDate() + 1);
    } else if (end <= start) end = new Date(start.getTime() + 3600000);
    if (!foreground || !familyId || isNaN(start) || isNaN(end)) {
      setResult({ key: queryKey, phase: 'unavailable', byId: {} });
      return () => { ignore = true; };
    }
    const ids = idsKey ? idsKey.split(',').map(Number) : [];
    const timer = setTimeout(() => {
      checkAvailability({ start: start.toISOString(), end: end.toISOString(), user_ids: ids,
        family_id: Number(familyId), exclude_event_id: excludeEventId ? Number(excludeEventId) : null,
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }).then(data => {
        if (ignore) return;
        const byId = Object.fromEntries(ids.map(id => [id, 'not_shared']));
        for (const item of data.availability || []) {
          if (ids.includes(Number(item.user_id)) && SERVER_STATES.has(item.status)) byId[Number(item.user_id)] = item.status;
        }
        // A legacy/incomplete response may confirm busy, but never confirms free.
        for (const id of data.busy || []) if (ids.includes(Number(id))) byId[Number(id)] = 'busy';
        setResult({ key: queryKey, phase: 'ready', byId });
        // A snapshot is not a promise of future availability. Expire and
        // revalidate while the form stays mounted, even with unchanged inputs.
        expiryTimer = setTimeout(() => setRefreshTick(tick => tick + 1), 30000);
      }).catch(() => {
        if (!ignore) {
          setResult({ key: queryKey, phase: 'unavailable', byId: {} });
          expiryTimer = setTimeout(() => setRefreshTick(tick => tick + 1), 30000);
        }
      });
    }, 300);
    return () => { ignore = true; clearTimeout(timer); clearTimeout(expiryTimer); };
    // queryKey captures all request inputs as scalar values, not unstable arrays.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  const current = result.key === queryKey ? result : { phase: 'checking', byId: {} };
  return {
    statusFor: id => current.phase === 'ready' ? current.byId[Number(id)] || 'not_shared' : current.phase,
    busyIds: current.phase === 'ready'
      ? Object.keys(current.byId).filter(id => current.byId[id] === 'busy').map(Number) : [],
  };
}
