import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import EventFormScreen from '../screens/EventFormScreen';
import FamilyScreen from '../screens/FamilyScreen';
import { useFamily } from '../context/FamilyContext';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import useAvailability from '../hooks/useAvailability';
jest.mock('../context/FamilyContext', () => ({ useFamily: jest.fn() }));
jest.mock('../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../hooks/useAvailability', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../api/axios', () => ({ __esModule: true, SERVER_URL: '', default: { get: jest.fn(), post: jest.fn(), put: jest.fn() } }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, values) => values?.defaultValue || key }) }));
jest.mock('react-native', () => {
  const R = require('react');
  const box = tag => ({ children }) => R.createElement(tag, null, children);
  return { View: box('div'), Text: box('span'), ScrollView: box('div'), Image: () => null,
    TouchableOpacity: ({ children, onPress, disabled, accessibilityLabel }) => R.createElement('button', { onClick: onPress, disabled, 'aria-label': accessibilityLabel }, children),
    TextInput: ({ value, onChangeText, placeholder }) => R.createElement('input', { value, placeholder, onChange: e => onChangeText?.(e.target.value) }),
    Switch: ({ value, onValueChange, disabled, accessibilityLabel }) => R.createElement('input', { type: 'checkbox', role: 'switch', checked: value, disabled, 'aria-label': accessibilityLabel, onChange: e => onValueChange(e.target.checked) }),
    ActivityIndicator: () => null, Alert: { alert: jest.fn() }, Clipboard: { setString: jest.fn() }, Platform: { OS: 'ios' } };
});
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }) => <div>{children}</div> }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: ({ name }) => <span data-icon={name} /> }));
jest.mock('@react-native-community/datetimepicker', () => ({ __esModule: true, default: () => null, DateTimePickerAndroid: { open: jest.fn() } }));
jest.mock('../styles/EventFormScreen.styles', () => ({ useStyles: () => ({}) }));
jest.mock('../styles/FamilyScreen.styles', () => ({ useStyles: () => ({}) }));
jest.mock('../components/ui/TopCard', () => ({ __esModule: true, default: ({ children }) => <div>{children}</div> }));
jest.mock('../components/RollIn', () => ({ RollInGroup: ({ children }) => <div>{children}</div> }));
jest.mock('../components/family/AddChildSection', () => ({ __esModule: true, default: () => null }));
const navigation = { navigate: jest.fn(), goBack: jest.fn() };
const route = { params: { prefill: { title: 'Bros plan', date: '2026-11-21', time: '10:00' } } };
let setSharing;
beforeEach(() => {
  jest.clearAllMocks();
  setSharing = jest.fn().mockResolvedValue({});
  useAuth.mockReturnValue({ user: { id: 1 }, logout: jest.fn() });
  useFamily.mockReturnValue({ family: { id: 2, name: 'Bros' }, families: [{ id: 2, name: 'Bros', share_availability: false }],
    members: [{ id: 2, first_name: 'Dean' }], setAvailabilitySharing: setSharing, fetchFamily: jest.fn(), switchFamily: jest.fn() });
  useAvailability.mockReturnValue({ busyIds: [2], statusFor: () => 'busy' });
  API.get.mockResolvedValue({ data: { groups: [], people: [], targets: [] } });
});
afterEach(() => jest.useRealTimers());
test('mobile can invite Dean despite a conflict; busy is a warning, not a disabled button', async () => {
  jest.useFakeTimers();
  API.post.mockResolvedValue({ data: { busy: [2] } });
  await act(async () => { render(<EventFormScreen route={route} navigation={navigation} />); });
  await act(async () => { jest.advanceTimersByTime(300); });
  const dean = screen.getByText('Dean').closest('button');
  fireEvent.click(dean);
  expect(dean.querySelector('[data-icon="checkmark"]')).not.toBeNull();
});
test('event-level exclusion can be selected and is included in the saved payload', async () => {
  API.post.mockResolvedValue({ data: { event: { id: 20 } } });
  await act(async () => { render(<EventFormScreen route={route} navigation={navigation} />); });
  const toggle = screen.getByRole('switch', { name: 'Exclude this event from cross-family availability' });
  expect(toggle.checked).toBe(false);
  fireEvent.click(toggle);
  await act(async () => { fireEvent.click(screen.getByText('events.save_event')); });
  expect(API.post).toHaveBeenCalledWith('/events/create', expect.objectContaining({ hide_cross_family_availability: true }));
});
test('family settings start off and change only the current user\'s preference', async () => {
  await act(async () => { render(<FamilyScreen navigation={navigation} />); });
  const toggle = screen.getByRole('switch', { name: 'Share my busy times with Bros' });
  expect(toggle.checked).toBe(false);
  await act(async () => { fireEvent.click(toggle); });
  expect(setSharing).toHaveBeenCalledWith(2, true);
});
