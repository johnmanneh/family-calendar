import React from 'react';
import { act, render } from '@testing-library/react';
import { EventProvider, useEvents } from './EventContext';
import { useAuth } from './AuthContext';
import { useUI } from './UIContext';
import API from '../api/axios';
import { useFamily } from './FamilyContext';

jest.mock('./AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('./UIContext', () => ({ useUI: jest.fn() }));
jest.mock('./FamilyContext', () => ({ useFamily: jest.fn() }));
jest.mock('../api/axios', () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn() }));

let auth;
let ui;
let context;
let streams;
function Probe() { context = useEvents(); return null; }
beforeEach(() => {
  jest.clearAllMocks();
  auth = { token: null, user: null, logout: jest.fn() };
  ui = Object.fromEntries(['setLoading', 'setError', 'setEvents', 'setSelectedEvent', 'resetModal', 'setPendingInvitations', 'setTasks', 'setMyTasks'].map(key => [key, jest.fn()]));
  Object.assign(ui, { attendees: [], selectedAttendees: [], modalTasks: [], selectedGroups: [] });
  useAuth.mockImplementation(() => auth);
  useUI.mockImplementation(() => ui);
  useFamily.mockReturnValue({ family: { id: 1 } });
  streams = [];
  global.EventSource = jest.fn().mockImplementation(url => {
    const stream = { url, close: jest.fn(), addEventListener: jest.fn(), onerror: null };
    streams.push(stream);
    return stream;
  });
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ ticket: 'ticket-1' }),
  });
  localStorage.clear();
});
afterEach(() => { jest.useRealTimers(); });

test.each(['createEvent', 'updateEvent'])('%s rejects failed saves so the caller keeps the form open', async method => {
  render(<EventProvider><Probe /></EventProvider>);
  const failure = new Error('save rejected');
  API.post.mockRejectedValue(failure);
  API.put.mockRejectedValue(failure);
  await expect(method === 'createEvent' ? context.createEvent({ title: 'test' }) : context.updateEvent(1, { title: 'test' })).rejects.toBe(failure);
  expect(ui.setError).toHaveBeenCalled();
  expect(ui.resetModal).not.toHaveBeenCalled();
  expect(ui.setSelectedEvent).not.toHaveBeenCalled();
});

test('obsolete family event/task responses cannot overwrite a newer family', async () => {
  const view = render(<EventProvider><Probe /></EventProvider>);
  const pending = [];
  API.get.mockImplementation(() => new Promise(resolve => pending.push(resolve)));
  let oldEvents;
  let oldTasks;
  act(() => { oldEvents = context.fetchEvents(); oldTasks = context.fetchMyTasks(); });
  API.get.mockResolvedValue({ data: { events: [{ id: 'new' }], tasks: [{ id: 'new-task' }], invitations: [] } });
  useFamily.mockReturnValue({ family: { id: 2 } });
  view.rerender(<EventProvider><Probe /></EventProvider>);
  await act(async () => {
    pending.forEach(resolve => resolve({ data: { events: [{ id: 'old' }], tasks: [{ id: 'old-task' }] } }));
    await Promise.all([oldEvents, oldTasks]);
  });
  expect(ui.setEvents).toHaveBeenLastCalledWith([{ id: 'new' }]);
  expect(ui.setMyTasks).toHaveBeenLastCalledWith([{ id: 'new-task' }]);
});

test('SSE retries errors and cancels retry on logout or unmount', async () => {
  jest.useFakeTimers();
  auth = { token: 'active', user: { id: 1 }, logout: jest.fn() };
  localStorage.setItem('token', 'active');
  const view = render(<EventProvider><Probe /></EventProvider>);
  await act(async () => { await Promise.resolve(); });
  expect(streams).toHaveLength(1);
  expect(streams[0].url).toContain('ticket=');
  expect(streams[0].url).not.toContain('token=');
  act(() => streams[0].onerror());
  expect(streams[0].close).toHaveBeenCalledTimes(1);
  await act(async () => { jest.advanceTimersByTime(3000); await Promise.resolve(); });
  expect(streams).toHaveLength(2);
  act(() => streams[0].onerror());
  await act(async () => { jest.advanceTimersByTime(3000); await Promise.resolve(); });
  expect(streams).toHaveLength(2);
  act(() => streams[1].onerror());
  auth = { token: null, user: null, logout: jest.fn() };
  localStorage.removeItem('token');
  view.rerender(<EventProvider><Probe /></EventProvider>);
  await act(async () => { jest.advanceTimersByTime(10000); await Promise.resolve(); });
  expect(streams).toHaveLength(2);
  auth = { token: 'new', user: { id: 2 }, logout: jest.fn() };
  view.rerender(<EventProvider><Probe /></EventProvider>);
  await act(async () => { await Promise.resolve(); });
  act(() => streams[2].onerror());
  view.unmount();
  await act(async () => { jest.advanceTimersByTime(10000); await Promise.resolve(); });
  expect(streams).toHaveLength(3);
});

test('SSE follows login, token replacement, and logout without provider remount', async () => {
  const view = render(<EventProvider><Probe /></EventProvider>);
  expect(streams).toHaveLength(0);
  auth = { token: 'first', user: { id: 1 }, logout: jest.fn() };
  localStorage.setItem('token', 'first');
  view.rerender(<EventProvider><Probe /></EventProvider>);
  await act(async () => { await Promise.resolve(); });
  expect(streams).toHaveLength(1);
  expect(streams[0].url).toContain('ticket=');
  expect(streams[0].url).not.toContain('token=first');
  auth = { token: 'replacement', user: { id: 1 }, logout: jest.fn() };
  localStorage.setItem('token', 'replacement');
  view.rerender(<EventProvider><Probe /></EventProvider>);
  await act(async () => { await Promise.resolve(); });
  expect(streams[0].close).toHaveBeenCalledTimes(1);
  expect(streams).toHaveLength(2);
  auth = { token: null, user: null, logout: jest.fn() };
  localStorage.removeItem('token');
  view.rerender(<EventProvider><Probe /></EventProvider>);
  expect(streams[1].close).toHaveBeenCalledTimes(1);
  view.unmount();
});

test('null→resolved family triggers a replacement fetch after mount responses are discarded', async () => {
  // Start with family=null, simulating FamilyProvider not yet resolved at mount time
  useFamily.mockReturnValue({ family: null });
  const view = render(<EventProvider><Probe /></EventProvider>);

  // Capture in-flight mount fetches (scope: token:, no family id)
  const pending = [];
  API.get.mockImplementation(() => new Promise(resolve => pending.push(resolve)));
  let mountEvents, mountTasks;
  act(() => {
    mountEvents = context.fetchEvents();
    mountTasks = context.fetchMyTasks();
  });

  // Family resolves → scope changes to token:1; replacement fetches should be triggered
  API.get.mockResolvedValue({ data: { events: [{ id: 'new' }], tasks: [{ id: 'new-task' }], invitations: [] } });
  useFamily.mockReturnValue({ family: { id: 1 } });
  view.rerender(<EventProvider><Probe /></EventProvider>);

  // Resolve the obsolete in-flight responses; isCurrent() guard discards them (scope changed)
  await act(async () => {
    pending.forEach(r => r({ data: { events: [{ id: 'old' }], tasks: [{ id: 'old-task' }] } }));
    await Promise.all([mountEvents, mountTasks]);
  });

  // A replacement fetch must have run and delivered the new family's data
  expect(ui.setEvents).toHaveBeenCalledWith([{ id: 'new' }]);
  expect(ui.setMyTasks).toHaveBeenCalledWith([{ id: 'new-task' }]);
});

test('checkAvailability posts the contract payload and returns statuses without event metadata', async () => {
  render(<EventProvider><Probe /></EventProvider>);
  const payload = {
    start: '2026-10-21T08:00:00.000Z',
    end: '2026-10-21T09:00:00.000Z',
    user_ids: [1, 2, 3],
    exclude_event_id: 9,
    tz: 'Europe/Oslo',
    family_id: 4,
  };
  API.post.mockResolvedValue({
    data: {
      busy: [1],
      not_shared: [3],
      availability: [
        { user_id: 1, status: 'busy' },
        { user_id: 2, status: 'no_known_conflict' },
        { user_id: 3, status: 'not_shared' },
      ],
    },
  });
  let result;
  await act(async () => { result = await context.checkAvailability(payload); });
  expect(API.post).toHaveBeenCalledWith('/events/availability', payload);
  expect(result).toEqual({
    busy: [1],
    not_shared: [3],
    availability: [
      { user_id: 1, status: 'busy' },
      { user_id: 2, status: 'no_known_conflict' },
      { user_id: 3, status: 'not_shared' },
    ],
  });
  expect(JSON.stringify(result)).not.toMatch(/title|description|location/);
});

test('obsolete checkAvailability responses after family switch or unmount are ignored', async () => {
  const view = render(<EventProvider><Probe /></EventProvider>);
  const pending = [];
  API.post.mockImplementation(() => new Promise(resolve => pending.push(resolve)));
  let stale;
  act(() => { stale = context.checkAvailability({ start: 's', end: 'e', user_ids: [1], family_id: 1 }); });
  useFamily.mockReturnValue({ family: { id: 2 } });
  view.rerender(<EventProvider><Probe /></EventProvider>);
  let current;
  act(() => { current = context.checkAvailability({ start: 's', end: 'e', user_ids: [1], family_id: 2 }); });
  let staleResult;
  await act(async () => {
    pending[0]({ data: { busy: [1], not_shared: [], availability: [{ user_id: 1, status: 'busy' }] } });
    staleResult = await stale;
  });
  expect(staleResult).toBeNull();
  let currentResult;
  await act(async () => {
    pending[1]({ data: { busy: [], not_shared: [], availability: [{ user_id: 1, status: 'no_known_conflict' }] } });
    currentResult = await current;
  });
  expect(currentResult.availability[0].status).toBe('no_known_conflict');
  let unmounted;
  act(() => { unmounted = context.checkAvailability({ start: 's', end: 'e', user_ids: [1], family_id: 2 }); });
  view.unmount();
  await act(async () => {
    pending[2]({ data: { busy: [1], availability: [{ user_id: 1, status: 'busy' }] } });
    expect(await unmounted).toBeNull();
  });
});

test('checkAvailability errors are thrown rather than returned as free', async () => {
  render(<EventProvider><Probe /></EventProvider>);
  const failure = Object.assign(new Error('unavailable'), { response: { data: { message: 'down' } } });
  API.post.mockRejectedValue(failure);
  await expect(context.checkAvailability({ start: 's', end: 'e', user_ids: [1], family_id: 1 })).rejects.toBe(failure);
});
