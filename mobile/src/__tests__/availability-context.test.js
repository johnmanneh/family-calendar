import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { FamilyProvider, useFamily } from '../context/FamilyContext';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
jest.mock('../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../api/axios', () => ({ __esModule: true, default: { get: jest.fn(), patch: jest.fn(), post: jest.fn() } }));
const wrapper = ({ children }) => <FamilyProvider>{children}</FamilyProvider>;
beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({ token: 'test-login' });
  API.get.mockImplementation(url => Promise.resolve({ data: url === '/family/all'
    ? { families: [{ id: 2, name: 'Bros', share_availability: false }] }
    : { family: { id: 2 }, members: [] } }));
});
test('mobile saves only the signed-in user\'s own family preference through context', async () => {
  const { result } = renderHook(() => useFamily(), { wrapper });
  await waitFor(() => expect(result.current.families).toHaveLength(1));
  expect(result.current.setAvailabilitySharing).toEqual(expect.any(Function));
  API.patch.mockResolvedValue({ data: { setting: { family_id: 2, share_availability: true } } });
  await act(async () => result.current.setAvailabilitySharing(2, true));
  expect(API.patch).toHaveBeenCalledWith('/family/availability', { family_id: 2, share_availability: true });
  expect(result.current.families[0].share_availability).toBe(true);
});
test('a successful consent save reconciles after switching families', async () => {
  let finish;
  const { result } = renderHook(() => useFamily(), { wrapper });
  await waitFor(() => expect(result.current.families).toHaveLength(1));
  API.patch.mockImplementation(url => url === '/family/availability'
    ? new Promise(resolve => { finish = resolve; })
    : Promise.resolve({ data: { family: { id: 3 }, members: [{ id: 33 }] } }));
  let pending;
  act(() => { pending = result.current.setAvailabilitySharing(2, true); });
  await act(async () => result.current.switchFamily(3));
  await act(async () => {
    finish({ data: { setting: { family_id: 2, share_availability: true } } });
    await pending;
  });
  expect(result.current.family.id).toBe(3);
  expect(result.current.families[0].share_availability).toBe(true);
});

test.each([true, false])('overlapping refresh preserves confirmed sharing=%s but later fresh reads remain authoritative', async shared => {
  API.get.mockImplementation(url => Promise.resolve({ data: url === '/family/all'
    ? { families: [{ id: 2, share_availability: !shared }] }
    : { family: { id: 2, share_availability: !shared }, members: [] } }));
  const { result } = renderHook(() => useFamily(), { wrapper });
  await waitFor(() => expect(result.current.families).toHaveLength(1));
  let finishRead, finishSave;
  API.get.mockImplementation(url => url === '/family'
    ? new Promise(resolve => { finishRead = resolve; })
    : Promise.resolve({ data: { families: [{ id: 2, share_availability: !shared }] } }));
  API.patch.mockImplementation(() => new Promise(resolve => { finishSave = resolve; }));
  let reading, saving;
  act(() => { saving = result.current.setAvailabilitySharing(2, shared); reading = result.current.fetchFamily(); });
  await act(async () => {
    finishSave({ data: { setting: { family_id: 2, share_availability: shared } } });
    await saving;
  });
  await act(async () => {
    finishRead({ data: { family: { id: 2, share_availability: !shared }, members: [] } });
    await reading;
  });
  expect(result.current.families[0].share_availability).toBe(shared);
  expect(result.current.family.share_availability).toBe(shared);
  API.get.mockImplementation(url => Promise.resolve({ data: url === '/family/all'
    ? { families: [{ id: 2, share_availability: !shared }] }
    : { family: { id: 2, share_availability: !shared }, members: [] } }));
  await act(async () => result.current.fetchFamily());
  expect(result.current.families[0].share_availability).toBe(!shared);
});

test('same-family reversals wait for the prior write and recover after rejection', async () => {
  const { result } = renderHook(() => useFamily(), { wrapper });
  await waitFor(() => expect(result.current.families).toHaveLength(1));
  const requests = [];
  API.patch.mockImplementation((url, body) => new Promise((resolve, reject) => requests.push({ body, resolve, reject })));
  let saving, revoking;
  act(() => {
    saving = result.current.setAvailabilitySharing(2, true).catch(error => error);
    revoking = result.current.setAvailabilitySharing('2', false);
  });
  expect(requests).toHaveLength(1);
  const failure = new Error('Save failed');
  await act(async () => { requests[0].reject(failure); await saving; });
  expect(await saving).toBe(failure);
  expect(requests).toHaveLength(2);
  expect(requests[1].body.share_availability).toBe(false);
  await act(async () => {
    requests[1].resolve({ data: { setting: { family_id: 2, share_availability: false } } });
    await revoking;
  });
  expect(result.current.families[0].share_availability).toBe(false);
});

test('queued writes are discarded after changing accounts', async () => {
  const { result, rerender } = renderHook(() => useFamily(), { wrapper });
  await waitFor(() => expect(result.current.families).toHaveLength(1));
  let finish;
  API.patch.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  let saving, queued;
  act(() => {
    saving = result.current.setAvailabilitySharing(2, true);
    queued = result.current.setAvailabilitySharing(2, false);
  });
  expect(API.patch).toHaveBeenCalledTimes(1);
  useAuth.mockReturnValue({ token: 'another-account' });
  rerender();
  await act(async () => {});
  await act(async () => {
    finish({ data: { setting: { family_id: 2, share_availability: true } } });
    await Promise.all([saving, queued]);
  });
  expect(API.patch).toHaveBeenCalledTimes(1);
  expect(result.current.families[0].share_availability).toBe(false);
});

test('a late setting response cannot repopulate private state after logout', async () => {
  let finish;
  const { result, rerender } = renderHook(() => useFamily(), { wrapper });
  await waitFor(() => expect(result.current.families).toHaveLength(1));
  expect(result.current.setAvailabilitySharing).toEqual(expect.any(Function));
  API.patch.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  let pending;
  act(() => { pending = result.current.setAvailabilitySharing(2, true); });
  useAuth.mockReturnValue({ token: null });
  rerender();
  await act(async () => { finish({ data: { setting: { family_id: 2, share_availability: true } } }); await pending; });
  expect(result.current.families).toEqual([]);
});
