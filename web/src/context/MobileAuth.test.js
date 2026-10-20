import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../../mobile/src/context/AuthContext';
import API, { setOnUnauthorized } from '../../../mobile/src/api/axios';
import storage from '../../../mobile/src/utils/storage';
import { clearCache } from '../../../mobile/src/utils/cache';
import { registerPushToken } from '../../../mobile/src/utils/registerPushToken';

jest.mock('../../../mobile/src/api/axios', () => ({ __esModule: true, default: { get: jest.fn(), put: jest.fn() }, setOnUnauthorized: jest.fn() }));
jest.mock('../../../mobile/src/utils/storage', () => ({ __esModule: true, default: { getItem: jest.fn(), setItem: jest.fn(), deleteItem: jest.fn() } }));
jest.mock('../../../mobile/src/utils/cache', () => ({ clearCache: jest.fn() }));
jest.mock('../../../mobile/src/utils/registerPushToken', () => ({ registerPushToken: jest.fn() }));
let auth, saved;
function Probe() { auth = useAuth(); return null; }
beforeEach(() => {
  jest.resetAllMocks();
  saved = new Map();
  storage.getItem.mockImplementation(async key => saved.get(key) || null);
  storage.setItem.mockImplementation(async (key, value) => { saved.set(key, value); });
  storage.deleteItem.mockImplementation(async key => { saved.delete(key); });
  API.put.mockResolvedValue({});
  registerPushToken.mockImplementation(async ({ onToken } = {}) => { if (onToken) await onToken('device-A'); });
});
async function mount() {
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(auth.authLoading).toBe(false));
}

test.each([null, { userId: 2, token: 'other-account-device' }])('unknown own token never clears another device (record %p)', async binding => {
  if (binding) saved.set('devicePushBinding', JSON.stringify(binding));
  registerPushToken.mockResolvedValue(undefined);
  await mount();
  await act(async () => auth.login({ id: 1 }, 'session'));
  await act(async () => auth.logout());
  expect(API.put).not.toHaveBeenCalled();
  expect(clearCache).toHaveBeenCalledTimes(1);
  expect(saved.has('token')).toBe(false);
});

test('app restore uses secure device bookkeeping even when native registration is unavailable', async () => {
  saved.set('token', 'restored-session');
  saved.set('devicePushBinding', JSON.stringify({ userId: 1, token: 'device-A' }));
  API.get.mockResolvedValue({ data: { user: { id: 1 } } });
  registerPushToken.mockResolvedValue(undefined);
  await mount();
  await act(async () => auth.logout());
  expect(API.put).toHaveBeenCalledWith('/auth/push-token', { push_token: null, previous_push_token: 'device-A' });
  expect(saved.has('devicePushBinding')).toBe(false);
});

test('account switch drains a late server binding and conditionally clears it using the old credential', async () => {
  let finish;
  registerPushToken.mockImplementationOnce(async ({ onToken }) => {
    await onToken('device-A');
    await new Promise(resolve => { finish = resolve; });
  }).mockResolvedValue(undefined);
  await mount();
  await act(async () => auth.login({ id: 1 }, 'old-session'));
  await waitFor(() => expect(finish).toBeDefined());
  API.put.mockImplementation(async (url, payload) => {
    expect(saved.get('token')).toBe('old-session');
    expect(payload).toEqual({ push_token: null, previous_push_token: 'device-A' });
  });
  let change;
  act(() => { change = auth.login({ id: 2 }, 'new-session'); });
  expect(saved.get('token')).toBe('old-session');
  expect(registerPushToken).toHaveBeenCalledTimes(1);
  await act(async () => { finish(); await change; });
  expect(API.put).toHaveBeenCalledTimes(1);
  expect(saved.get('token')).toBe('new-session');
  expect(auth.user.id).toBe(2);
  expect(registerPushToken).toHaveBeenCalledTimes(2);
});

test('failed unregister retains this account bookkeeping across another account login for a later retry', async () => {
  await mount();
  await act(async () => auth.login({ id: 1 }, 'first-session'));
  API.put.mockRejectedValueOnce(new Error('offline'));
  await act(async () => auth.logout());
  expect(saved.get('devicePushBinding')).toContain('device-A');
  registerPushToken.mockImplementationOnce(async ({ onToken }) => { await onToken('device-B'); });
  await act(async () => auth.login({ id: 2 }, 'other-session'));
  await act(async () => auth.logout());
  expect(saved.get('devicePushBinding')).toContain('device-A');
  registerPushToken.mockResolvedValue(undefined);
  await act(async () => auth.login({ id: 1 }, 'retry-session'));
  API.put.mockClear();
  await act(async () => auth.logout());
  expect(API.put).toHaveBeenCalledWith('/auth/push-token', { push_token: null, previous_push_token: 'device-A' });
  expect(saved.has('devicePushBinding')).toBe(false);
});

test('failed rotated registration retains both possible own bindings for conditional cleanup', async () => {
  saved.set('devicePushBinding', JSON.stringify({ userId: 1, token: 'device-old' }));
  registerPushToken.mockImplementation(async ({ onToken }) => { await onToken('device-new'); throw new Error('lost response'); });
  await mount();
  await act(async () => auth.login({ id: 1 }, 'session'));
  await act(async () => auth.logout());
  expect(API.put).toHaveBeenCalledWith('/auth/push-token', { push_token: null, previous_push_token: 'device-old' });
  expect(API.put).toHaveBeenCalledWith('/auth/push-token', { push_token: null, previous_push_token: 'device-new' });
});

test('logout drains pending credential persistence before clearing it and never starts late registration', async () => {
  await mount();
  let finish;
  storage.setItem.mockImplementation((key, value) => new Promise(resolve => {
    finish = () => { saved.set(key, value); resolve(); };
  }));
  let login, logout;
  act(() => { login = auth.login({ id: 1 }, 'session'); });
  act(() => { logout = auth.logout(); });
  await act(async () => { finish(); await login; await logout; });
  expect(registerPushToken).not.toHaveBeenCalled();
  expect(saved.has('token')).toBe(false);
  expect(API.put).not.toHaveBeenCalled();
});

test('late app restore cannot rebind or restore an account after logout', async () => {
  saved.set('token', 'restored-session');
  let finish;
  API.get.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(API.get).toHaveBeenCalled());
  await act(async () => auth.logout());
  await act(async () => finish({ data: { user: { id: 1 } } }));
  expect(auth.user).toBeNull();
  expect(auth.token).toBeNull();
  expect(registerPushToken).not.toHaveBeenCalled();
});

test('logout conditionally unregisters only this device even when unregister fails or recursively returns 401', async () => {
  await mount();
  await act(async () => auth.login({ id: 1 }, 'session'));
  let reject;
  API.put.mockImplementation(() => new Promise((_, fail) => { reject = fail; }));
  let logout;
  await act(async () => { logout = auth.logout(); });
  expect(API.put).toHaveBeenCalledWith('/auth/push-token', { push_token: null, previous_push_token: 'device-A' });
  expect(storage.deleteItem).not.toHaveBeenCalledWith('token');
  act(() => setOnUnauthorized.mock.calls[0][0]());
  expect(API.put).toHaveBeenCalledTimes(1);
  await act(async () => { reject(new Error('offline')); await logout; });
  expect(storage.deleteItem).toHaveBeenCalledWith('token');
  expect(clearCache).toHaveBeenCalledTimes(1);
  expect(auth.token).toBeNull();
  expect(auth.user).toBeNull();
});
