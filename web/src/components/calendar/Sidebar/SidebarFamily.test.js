import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import SidebarFamily from './SidebarFamily';
import { useFamily } from '../../../context/FamilyContext';
import { useGroups } from '../../../context/GroupContext';
import { useAuth } from '../../../context/AuthContext';
import API from '../../../api/axios';

jest.mock('../../../context/FamilyContext', () => ({ useFamily: jest.fn() }));
jest.mock('../../../context/GroupContext', () => ({ useGroups: jest.fn() }));
jest.mock('../../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../../api/axios', () => ({ post: jest.fn(), put: jest.fn(), delete: jest.fn() }));

const setAvailabilitySharing = jest.fn();

beforeEach(() => {
  setAvailabilitySharing.mockReset();
  useAuth.mockReturnValue({ user: { id: 11, first_name: 'Ada', role: 'member' } });
  useGroups.mockReturnValue({ joinWithCode: jest.fn() });
  useFamily.mockReturnValue({
    family: { id: 1, name: 'Manneh', invite_code: 'ABCD', is_personal: false },
    families: [
      { id: 0, name: 'Personal', is_personal: true, share_availability: false },
      { id: 1, name: 'Manneh', is_personal: false, share_availability: false },
      { id: 2, name: 'Grandparents', is_personal: false, share_availability: true },
    ],
    members: [{ id: 11, first_name: 'Ada', role: 'member' }],
    fetchFamily: jest.fn(),
    switchFamily: jest.fn(),
    setAvailabilitySharing,
  });
});

test('shows an opt-in sharing control for each receiving family using own settings only', async () => {
  render(<SidebarFamily />);
  expect(screen.getByLabelText(/Share my busy times with Manneh/i)).not.toBeChecked();
  expect(screen.getByLabelText(/Share my busy times with Grandparents/i)).toBeChecked();
  expect(screen.queryByLabelText(/Personal/i)).not.toBeInTheDocument();
  expect(screen.getByText(/busy only/i)).toBeInTheDocument();
  expect(screen.getByText(/never see event details/i)).toBeInTheDocument();
  expect(screen.getByText(/current and future members/i)).toBeInTheDocument();
  expect(screen.getByText(/cannot change it for another adult/i)).toBeInTheDocument();
  expect(screen.getByText(/cross-family busy checks/i)).toBeInTheDocument();
  expect(screen.getByText(/future commitments/i)).toBeInTheDocument();
  expect(screen.getByText(/ordinary event visibility is unchanged/i)).toBeInTheDocument();
  await act(async () => { fireEvent.click(screen.getByLabelText(/Share my busy times with Manneh/i)); });
  expect(setAvailabilitySharing).toHaveBeenCalledWith(1, true);
  expect(API.post).not.toHaveBeenCalled();
  expect(API.put).not.toHaveBeenCalled();
});

test.each([
  ['Manneh', 1, false],
  ['Grandparents', 2, true],
])('failed sharing change for %s stays confirmed, reports failure, and clears it on retry', async (name, id, originallyShared) => {
  let rejectSave;
  setAvailabilitySharing.mockImplementationOnce(() => new Promise((resolve, reject) => { rejectSave = reject; }));
  const view = render(<SidebarFamily />);
  const checkbox = screen.getByLabelText(`Share my busy times with ${name}`);
  const otherCheckbox = screen.getByLabelText(`Share my busy times with ${name === 'Manneh' ? 'Grandparents' : 'Manneh'}`);
  fireEvent.click(checkbox);
  expect(setAvailabilitySharing).toHaveBeenCalledWith(id, !originallyShared);
  expect(checkbox).toBeDisabled();
  expect(otherCheckbox).toBeEnabled();
  expect(checkbox.checked).toBe(originallyShared);
  fireEvent.click(checkbox);
  expect(setAvailabilitySharing).toHaveBeenCalledTimes(1);
  await act(async () => {
    rejectSave({ response: { data: { message: 'Sharing could not be saved' } } });
  });
  expect(screen.getByRole('alert')).toHaveTextContent('Sharing could not be saved');
  expect(checkbox).toBeEnabled();
  expect(checkbox.checked).toBe(originallyShared);

  let resolveRetry;
  setAvailabilitySharing.mockImplementationOnce(() => new Promise(resolve => { resolveRetry = resolve; }));
  fireEvent.click(checkbox);
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(checkbox).toBeDisabled();
  await act(async () => {
    useFamily.mockReturnValue({ ...useFamily(), families: useFamily().families.map(f =>
      f.id === id ? { ...f, share_availability: !originallyShared } : f) });
    resolveRetry({ family_id: id, share_availability: !originallyShared });
  });
  view.rerender(<SidebarFamily />);
  expect(checkbox).toBeEnabled();
  expect(checkbox.checked).toBe(!originallyShared);
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('sharing failures without a server message show a retryable fallback', async () => {
  let rejectSave;
  setAvailabilitySharing.mockImplementationOnce(() => new Promise((resolve, reject) => { rejectSave = reject; }));
  render(<SidebarFamily />);
  fireEvent.click(screen.getByLabelText('Share my busy times with Manneh'));
  expect(screen.getByLabelText('Share my busy times with Manneh')).toBeDisabled();
  await act(async () => { rejectSave(new Error('Network offline')); });
  expect(screen.getByRole('alert')).toHaveTextContent(/could not update availability sharing/i);
  expect(screen.getByLabelText('Share my busy times with Manneh')).toBeEnabled();
});
