import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { AppProviders } from './context/AppProviders';
import { useAuth } from './context/AuthContext';
import { useFamily } from './context/FamilyContext';
import { useEvents } from './context/EventContext';
import API from './api/axios';

jest.mock('./api/axios', () => ({
  __esModule: true,
  default: { get: jest.fn() },
  setOnUnauthorized: jest.fn(),
}));

test('real app provider tree renders signed out, connects after login, and cleans up on logout', async () => {
  localStorage.clear();
  let auth;
  function Probe() {
    auth = useAuth();
    const { family } = useFamily();
    const { events } = useEvents();
    return <div>{auth.token ? 'signed in' : 'signed out'}: {family?.id ?? 'no family'}: {events.length} events</div>;
  }
  const stream = { close: jest.fn(), addEventListener: jest.fn() };
  global.EventSource = jest.fn(() => stream);
  API.get.mockResolvedValue({ data: { family: { id: 1 }, members: [], families: [{ id: 1 }], groups: [], invitations: [], events: [], tasks: [] } });
  const view = render(<AppProviders><Probe /></AppProviders>);
  expect(screen.getByText('signed out: no family: 0 events')).toBeInTheDocument();
  expect(EventSource).not.toHaveBeenCalled();
  await act(async () => auth.login({ id: 1 }, 'local-test-session'));
  expect(screen.getByText('signed in: 1: 0 events')).toBeInTheDocument();
  expect(EventSource).toHaveBeenCalledTimes(1);
  act(() => auth.logout());
  expect(screen.getByText('signed out: no family: 0 events')).toBeInTheDocument();
  expect(stream.close).toHaveBeenCalledTimes(1);
  expect(localStorage.getItem('token')).toBeNull();
  view.unmount();
});
