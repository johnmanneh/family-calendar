import { act, renderHook } from '@testing-library/react';
import useAvailability from '../hooks/useAvailability';
import API from '../api/axios';
let mockAppStateListener;
jest.mock('react-native', () => ({ AppState: {
  currentState: 'active',
  addEventListener: jest.fn((type, listener) => { mockAppStateListener = listener; return { remove: jest.fn() }; }),
} }));
jest.mock('../api/axios', () => ({ __esModule: true, default: { post: jest.fn() } }));
const options = { startDate: new Date('2026-11-21T10:00:00Z'), endDate: new Date('2026-11-21T11:00:00Z'),
  isAllDay: false, userIds: [2,3], familyId: 2, excludeEventId: null };
beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); });
afterEach(() => { jest.useRealTimers(); });
test('busy, known conflict-free and unshared are distinct; unknown never becomes free', async () => {
  API.post.mockResolvedValue({ data: { availability: [{ user_id: 2, status: 'busy' }, { user_id: 3, status: 'not_shared' }] } });
  const { result } = renderHook(() => useAvailability(options));
  expect(result.current.statusFor(2)).toBe('checking');
  await act(async () => { jest.advanceTimersByTime(300); });
  expect(API.post).toHaveBeenCalledWith('/events/availability', expect.objectContaining({ family_id: 2, user_ids: [2,3] }));
  expect(result.current.statusFor(2)).toBe('busy');
  expect(result.current.statusFor(3)).toBe('not_shared');
  expect(result.current.statusFor(99)).toBe('not_shared');
  expect(result.current.busyIds).toEqual([2]);
});
test('request failure is unavailable, not a free result', async () => {
  API.post.mockRejectedValue(new Error('offline'));
  const { result } = renderHook(() => useAvailability(options));
  await act(async () => { jest.advanceTimersByTime(300); });
  expect(result.current.statusFor(2)).toBe('unavailable');
  expect(result.current.busyIds).toEqual([]);
});
test('changing the family clears the old status immediately and ignores late responses', async () => {
  let resolveOld;
  API.post.mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve; }))
    .mockResolvedValueOnce({ data: { availability: [{ user_id: 2, status: 'no_known_conflict' }] } });
  const { result, rerender } = renderHook(props => useAvailability(props), { initialProps: options });
  await act(async () => { jest.advanceTimersByTime(300); });
  rerender({ ...options, familyId: 1 });
  expect(result.current.statusFor(2)).toBe('checking');
  await act(async () => { jest.advanceTimersByTime(300); });
  expect(result.current.statusFor(2)).toBe('no_known_conflict');
  await act(async () => { resolveOld({ data: { availability: [{ user_id: 2, status: 'busy' }] } }); });
  expect(result.current.statusFor(2)).toBe('no_known_conflict');
});
test('availability expires after 30 seconds and is rechecked rather than remaining apparently free', async () => {
  API.post.mockResolvedValueOnce({ data: { availability: [{ user_id: 2, status: 'no_known_conflict' }] } })
    .mockResolvedValueOnce({ data: { availability: [{ user_id: 2, status: 'busy' }] } });
  const { result } = renderHook(() => useAvailability(options));
  await act(async () => { jest.advanceTimersByTime(300); });
  expect(result.current.statusFor(2)).toBe('no_known_conflict');
  await act(async () => { jest.advanceTimersByTime(30000); });
  expect(result.current.statusFor(2)).toBe('checking');
  await act(async () => { jest.advanceTimersByTime(300); });
  expect(result.current.statusFor(2)).toBe('busy');
  expect(API.post).toHaveBeenCalledTimes(2);
});
test('returning to the foreground invalidates the previous snapshot and revalidates', async () => {
  API.post.mockResolvedValueOnce({ data: { availability: [{ user_id: 2, status: 'no_known_conflict' }] } })
    .mockResolvedValueOnce({ data: { availability: [{ user_id: 2, status: 'busy' }] } });
  const { result } = renderHook(() => useAvailability(options));
  await act(async () => { jest.advanceTimersByTime(300); });
  expect(mockAppStateListener).toEqual(expect.any(Function));
  act(() => mockAppStateListener('background'));
  expect(result.current.statusFor(2)).toBe('unavailable');
  await act(async () => { jest.advanceTimersByTime(30000); });
  expect(API.post).toHaveBeenCalledTimes(1);
  act(() => mockAppStateListener('active'));
  expect(result.current.statusFor(2)).toBe('checking');
  await act(async () => { jest.advanceTimersByTime(300); });
  expect(result.current.statusFor(2)).toBe('busy');
});
