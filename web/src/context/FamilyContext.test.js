import React from 'react';
import { act, render } from '@testing-library/react';
import { FamilyProvider as WebProvider, useFamily as useWebFamily } from './FamilyContext';
import { FamilyProvider as MobileProvider, useFamily as useMobileFamily } from '../../../mobile/src/context/FamilyContext';
import webAPI from '../api/axios';
import mobileAPI from '../../../mobile/src/api/axios';
import { useAuth as useWebAuth } from './AuthContext';
import { useAuth as useMobileAuth } from '../../../mobile/src/context/AuthContext';

jest.mock('./AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../../mobile/src/context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../api/axios', () => ({ get: jest.fn(), patch: jest.fn() }));
jest.mock('../../../mobile/src/api/axios', () => ({ get: jest.fn(), patch: jest.fn() }));

for (const [platform, Provider, useFamily, API, useAuth] of [
  ['web', WebProvider, useWebFamily, webAPI, useWebAuth],
  ['mobile', MobileProvider, useMobileFamily, mobileAPI, useMobileAuth],
]) {
  test(`${platform}: late family data cannot repopulate a logged-out provider`, async () => {
    let family;
    function Probe() { family = useFamily(); return null; }
    let resolve;
    useAuth.mockReturnValue({ token: 'session' });
    API.get.mockImplementation(url => url === '/family' ? new Promise(done => { resolve = done; }) : Promise.resolve({ data: { families: [{ id: 1 }] } }));
    const view = render(<Provider><Probe /></Provider>);
    useAuth.mockReturnValue({ token: null });
    view.rerender(<Provider><Probe /></Provider>);
    await act(async () => resolve({ data: { family: { id: 1 }, members: [{ id: 11 }] } }));
    expect(family.family).toBeNull();
    expect(family.members).toEqual([]);
    expect(family.families).toEqual([]);
  });

  test(`${platform}: late family fetch cannot replace a newer switched family`, async () => {
    let family;
    function Probe() { family = useFamily(); return null; }
    let resolve;
    useAuth.mockReturnValue({ token: 'session' });
    API.get.mockImplementation(url => url === '/family' ? new Promise(done => { resolve = done; }) : Promise.resolve({ data: { families: [{ id: 1 }] } }));
    API.patch.mockResolvedValue({ data: { family: { id: 2 }, members: [{ id: 22 }] } });
    render(<Provider><Probe /></Provider>);
    await act(async () => family.switchFamily(2));
    expect(family.family.id).toBe(2);
    await act(async () => resolve({ data: { family: { id: 1 }, members: [{ id: 11 }] } }));
    expect(family.family.id).toBe(2);
    expect(family.members).toEqual([{ id: 22 }]);
  });
}
