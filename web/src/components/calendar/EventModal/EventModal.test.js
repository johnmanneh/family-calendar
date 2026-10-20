import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import EventModal from './EventModal';
import { useEvents } from '../../../context/EventContext';
import { useFamily } from '../../../context/FamilyContext';
import { useUI } from '../../../context/UIContext';
import { useGroups } from '../../../context/GroupContext';
import API from '../../../api/axios';

jest.mock('../../../context/EventContext', () => ({ useEvents: jest.fn() }));
jest.mock('../../../context/FamilyContext', () => ({ useFamily: jest.fn() }));
jest.mock('../../../context/UIContext', () => ({ useUI: jest.fn() }));
jest.mock('../../../context/GroupContext', () => ({ useGroups: jest.fn() }));
jest.mock('../../../api/axios', () => ({ get: jest.fn(), post: jest.fn() }));

let ui;
let events;
let checkAvailability;
const members = [
  { id: 1, first_name: 'Ada', last_name: 'L', color: '#111' },
  { id: 2, first_name: 'Bob', last_name: 'M', color: '#222' },
  { id: 3, first_name: 'Cam', last_name: 'N', color: '#333' },
];

beforeEach(() => {
  jest.useFakeTimers();
  checkAvailability = jest.fn();
  events = {
    createEvent: jest.fn(),
    updateEvent: jest.fn(),
    attendees: [],
    selectedEvent: null,
    checkAvailability,
  };
  ui = {
    isEventModalOpen: true,
    isEditMode: false,
    selectedDate: '2026-10-21T10:00',
    closeEventModal: jest.fn(),
    selectedAttendees: [],
    setSelectedAttendees: jest.fn(),
    toggleAttendee: jest.fn(),
    modalTasks: [],
    setModalTasks: jest.fn(),
    selectedGroups: [],
    setSelectedGroups: jest.fn(),
    toggleGroup: jest.fn(),
  };
  useEvents.mockImplementation(() => events);
  useFamily.mockReturnValue({ members, family: { id: 10, name: 'Manneh' } });
  useUI.mockImplementation(() => ui);
  useGroups.mockReturnValue({ groups: [] });
  API.get.mockResolvedValue({ data: { targets: [], people: [] } });
  API.post.mockResolvedValue({ data: {} });
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

async function flushAvailability() {
  await act(async () => {
    jest.advanceTimersByTime(300);
  });
  await act(async () => {});
}

test('uses checkAvailability with receiving family_id and never calls availability API directly', async () => {
  checkAvailability.mockResolvedValue({
    busy: [1],
    not_shared: [3],
    availability: [
      { user_id: 1, status: 'busy' },
      { user_id: 2, status: 'no_known_conflict' },
      { user_id: 3, status: 'not_shared' },
    ],
  });
  render(<EventModal />);
  expect(screen.getByText('Checking availability')).toBeInTheDocument();
  await flushAvailability();
  expect(API.post).not.toHaveBeenCalled();
  expect(checkAvailability).toHaveBeenCalledWith(expect.objectContaining({
    user_ids: [1, 2, 3],
    family_id: 10,
    exclude_event_id: null,
  }));
  expect(screen.getByText('Busy')).toBeInTheDocument();
  expect(screen.getByText('No known conflict')).toBeInTheDocument();
  expect(screen.getByText('Availability not shared')).toBeInTheDocument();
});

test('edit mode sends event family_id and keeps busy people selectable', async () => {
  ui.isEditMode = true;
  events.selectedEvent = {
    id: '9',
    title: 'Practice',
    start: '2026-10-21T10:00:00',
    end: '2026-10-21T11:00:00',
    family_id: 77,
    extendedProps: { family_id: 77, hide_cross_family_availability: true },
  };
  checkAvailability.mockResolvedValue({
    busy: [1],
    not_shared: [],
    availability: [{ user_id: 1, status: 'busy' }, { user_id: 2, status: 'no_known_conflict' }, { user_id: 3, status: 'no_known_conflict' }],
  });
  render(<EventModal />);
  await flushAvailability();
  expect(checkAvailability).toHaveBeenCalledWith(expect.objectContaining({
    family_id: 77,
    exclude_event_id: 9,
  }));
  fireEvent.click(screen.getByText('Ada').closest('.modal-attendee'));
  expect(ui.toggleAttendee).toHaveBeenCalledWith(1);
  expect(screen.getByLabelText(/Hide from other families' availability/i)).toBeChecked();
});

test('errors and stale responses are never shown as free', async () => {
  let resolveFirst;
  checkAvailability
    .mockImplementationOnce(() => new Promise(done => { resolveFirst = done; }))
    .mockRejectedValueOnce(new Error('down'));
  render(<EventModal />);
  await act(async () => { jest.advanceTimersByTime(300); });
  fireEvent.change(screen.getByLabelText('Start'), { target: { name: 'start_date', value: '2026-10-21T12:00' } });
  expect(screen.getByText('Checking availability')).toBeInTheDocument();
  expect(screen.queryByText('No known conflict')).not.toBeInTheDocument();
  await act(async () => {
    resolveFirst({
      busy: [],
      not_shared: [],
      availability: [
        { user_id: 1, status: 'no_known_conflict' },
        { user_id: 2, status: 'no_known_conflict' },
        { user_id: 3, status: 'no_known_conflict' },
      ],
    });
  });
  expect(screen.queryByText('No known conflict')).not.toBeInTheDocument();
  await act(async () => { jest.advanceTimersByTime(300); });
  await act(async () => {});
  expect(screen.getByText('Availability unavailable')).toBeInTheDocument();
  expect(screen.queryByText('No known conflict')).not.toBeInTheDocument();
});

test('new events default hide_cross_family_availability off', async () => {
  checkAvailability.mockResolvedValue({ busy: [], not_shared: [], availability: [] });
  render(<EventModal />);
  await flushAvailability();
  expect(screen.getByLabelText(/Hide from other families' availability/i)).not.toBeChecked();
});
test('ready availability expires after 30 seconds and is checked again', async () => {
  checkAvailability.mockResolvedValueOnce({ availability: [{ user_id: 1, status: 'no_known_conflict' }] })
    .mockResolvedValueOnce({ availability: [{ user_id: 1, status: 'busy' }] });
  render(<EventModal />);
  await flushAvailability();
  expect(screen.getByText('No known conflict')).toBeInTheDocument();
  await act(async () => { jest.advanceTimersByTime(30000); });
  expect(screen.queryByText('No known conflict')).not.toBeInTheDocument();
  expect(screen.getByText('Checking availability')).toBeInTheDocument();
  await flushAvailability();
  expect(screen.getByText('Busy')).toBeInTheDocument();
});
test('window focus revalidates availability instead of retaining an old conflict-free snapshot', async () => {
  checkAvailability.mockResolvedValueOnce({ availability: [{ user_id: 1, status: 'no_known_conflict' }] })
    .mockResolvedValueOnce({ availability: [{ user_id: 1, status: 'busy' }] });
  render(<EventModal />);
  await flushAvailability();
  act(() => { window.dispatchEvent(new Event('focus')); });
  expect(screen.queryByText('No known conflict')).not.toBeInTheDocument();
  await flushAvailability();
  expect(screen.getByText('Busy')).toBeInTheDocument();
});
