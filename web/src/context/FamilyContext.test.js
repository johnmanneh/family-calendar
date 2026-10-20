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
  test(`${platform}: independent consent saves do not cancel each other or an active-family switch`, async () => {
    let family;
    function Probe() { family = useFamily(); return null; }
    useAuth.mockReturnValue({ token: 'session' });
    API.get.mockImplementation(url => Promise.resolve({ data: url === '/family'
      ? { family: { id: 1 }, members: [] }
      : { families: [{ id: 1, share_availability: false }, { id: 2, share_availability: false }] } }));
    const pending = {};
    API.patch.mockImplementation((url, body) => new Promise(resolve => {
      pending[url === '/family/active' ? 'switch' : body.family_id] = resolve;
    }));
    render(<Provider><Probe /></Provider>);
    await act(async () => {});
    let switching, sharingA, sharingB;
    act(() => {
      switching = family.switchFamily(2);
      sharingA = family.setAvailabilitySharing(1, true);
      sharingB = family.setAvailabilitySharing(2, true);
    });
    await act(async () => {
      pending[2]({ data: { setting: { family_id: 2, share_availability: true } } });
      await sharingB;
      pending.switch({ data: { family: { id: 2 }, members: [{ id: 22 }] } });
      await switching;
      pending[1]({ data: { setting: { family_id: 1, share_availability: true } } });
      await sharingA;
    });
    expect(family.family.id).toBe(2);
    expect(family.members).toEqual([{ id: 22 }]);
    expect(family.families.map(f => f.share_availability)).toEqual([true, true]);
    expect(family.families.map(f => f.is_active)).toEqual([false, true]);
  });

  test.each(['refresh', 'switch'])(`${platform}: a stale %s response preserves newly confirmed consent, without masking later reads`, async read => {
    let family;
    function Probe() { family = useFamily(); return null; }
    useAuth.mockReturnValue({ token: 'session' });
    const snapshot = shared => ({ data: {
      family: { id: 1, share_availability: shared }, members: [],
      families: [{ id: 1, share_availability: shared }],
    } });
    API.get.mockResolvedValue(snapshot(false));
    render(<Provider><Probe /></Provider>);
    await act(async () => {});
    let finishRead, finishSave;
    API.get.mockImplementation(url => url === '/family'
      ? new Promise(resolve => { finishRead = resolve; }) : Promise.resolve(snapshot(false)));
    API.patch.mockImplementation(url => new Promise(resolve => {
      if (url === '/family/active') finishRead = resolve;
      else finishSave = resolve;
    }));
    let saving, reading;
    act(() => {
      saving = family.setAvailabilitySharing(1, true);
      reading = read === 'refresh' ? family.fetchFamily() : family.switchFamily(1);
    });
    await act(async () => {
      finishSave({ data: { setting: { family_id: 1, share_availability: true } } });
      await saving;
    });
    await act(async () => { finishRead(snapshot(false)); await reading; });
    expect(family.families[0].share_availability).toBe(true);
    expect(family.family.share_availability).toBe(true);
    API.get.mockResolvedValue(snapshot(false));
    await act(async () => family.fetchFamily());
    expect(family.families[0].share_availability).toBe(false);
    expect(family.family.share_availability).toBe(false);
  });

  test(`${platform}: a stale family refresh cannot undo confirmed revocation`, async () => {
    let family;
    function Probe() { family = useFamily(); return null; }
    useAuth.mockReturnValue({ token: 'session' });
    const snapshot = { data: { family: { id: 1, share_availability: true }, members: [],
      families: [{ id: 1, share_availability: true }] } };
    API.get.mockResolvedValue(snapshot);
    render(<Provider><Probe /></Provider>);
    await act(async () => {});
    let finish;
    API.get.mockImplementation(url => url === '/family'
      ? new Promise(resolve => { finish = resolve; }) : Promise.resolve(snapshot));
    API.patch.mockResolvedValue({ data: { setting: { family_id: 1, share_availability: false } } });
    let reading;
    act(() => { reading = family.fetchFamily(); });
    await act(async () => family.setAvailabilitySharing(1, false));
    await act(async () => { finish(snapshot); await reading; });
    expect(family.families[0].share_availability).toBe(false);
    expect(family.family.share_availability).toBe(false);
  });

  test.each([false, true])(`${platform}: same-family consent writes serialize and continue after failure=%s`, async firstFails => {
    let family;
    function Probe() { family = useFamily(); return null; }
    useAuth.mockReturnValue({ token: 'session' });
    API.get.mockResolvedValue({ data: { family: { id: 1 }, members: [],
      families: [{ id: 1, share_availability: false }] } });
    render(<Provider><Probe /></Provider>);
    await act(async () => {});
    const calls = [];
    API.patch.mockImplementation((url, body) => new Promise((resolve, reject) => calls.push({ body, resolve, reject })));
    let first, second;
    act(() => {
      first = family.setAvailabilitySharing(1, true).catch(error => error);
      second = family.setAvailabilitySharing('1', false);
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].body.share_availability).toBe(true);
    const failure = new Error('Could not save');
    await act(async () => {
      if (firstFails) calls[0].reject(failure);
      else calls[0].resolve({ data: { setting: { family_id: 1, share_availability: true } } });
      await first;
    });
    if (firstFails) expect(await first).toBe(failure);
    expect(calls).toHaveLength(2);
    expect(calls[1].body.share_availability).toBe(false);
    await act(async () => {
      calls[1].resolve({ data: { setting: { family_id: 1, share_availability: false } } });
      await second;
    });
    expect(family.families[0].share_availability).toBe(false);
    expect(family.family.share_availability).toBe(false);
  });

  test(`${platform}: queued consent writes never run after logout or leak into another account`, async () => {
    let family;
    function Probe() { family = useFamily(); return null; }
    useAuth.mockReturnValue({ token: 'session' });
    const snapshot = { data: { family: { id: 1 }, members: [],
      families: [{ id: 1, share_availability: false }] } };
    API.get.mockResolvedValue(snapshot);
    const view = render(<Provider><Probe /></Provider>);
    await act(async () => {});
    let finish;
    API.patch.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    API.patch.mockClear();
    let first, queued;
    act(() => {
      first = family.setAvailabilitySharing(1, true);
      queued = family.setAvailabilitySharing(1, false);
    });
    expect(API.patch).toHaveBeenCalledTimes(1);
    useAuth.mockReturnValue({ token: null });
    view.rerender(<Provider><Probe /></Provider>);
    useAuth.mockReturnValue({ token: 'another-account' });
    view.rerender(<Provider><Probe /></Provider>);
    await act(async () => {});
    await act(async () => {
      finish({ data: { setting: { family_id: 1, share_availability: true } } });
      await Promise.all([first, queued]);
    });
    expect(API.patch).toHaveBeenCalledTimes(1);
    expect(family.families[0].share_availability).toBe(false);
  });

  test.each([true, false])(`${platform}: failed consent=%s rejects without changing the confirmed preference`, async shared => {
    let family;
    function Probe() { family = useFamily(); return null; }
    useAuth.mockReturnValue({ token: 'session' });
    API.get.mockResolvedValue({ data: { family: { id: 1 }, members: [],
      families: [{ id: 1, share_availability: !shared }] } });
    render(<Provider><Probe /></Provider>);
    await act(async () => {});
    const failure = new Error('Sharing unavailable');
    API.patch.mockRejectedValue(failure);
    await act(async () => {
      await expect(family.setAvailabilitySharing(1, shared)).rejects.toBe(failure);
    });
    expect(family.families[0].share_availability).toBe(!shared);
  });

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

test('web: setAvailabilitySharing patches only own membership and updates that family', async () => {
  let family;
  function Probe() { family = useWebFamily(); return null; }
  useWebAuth.mockReturnValue({ token: 'session' });
  webAPI.get.mockImplementation(url => url === '/family'
    ? Promise.resolve({ data: { family: { id: 1 }, members: [] } })
    : Promise.resolve({ data: { families: [
      { id: 1, name: 'Manneh', share_availability: false },
      { id: 2, name: 'Grandparents', share_availability: false },
    ] } }));
  webAPI.patch.mockResolvedValue({ data: { setting: { family_id: 2, share_availability: true } } });
  render(<WebProvider><Probe /></WebProvider>);
  await act(async () => {});
  await act(async () => family.setAvailabilitySharing(2, true));
  expect(webAPI.patch).toHaveBeenCalledWith('/family/availability', { family_id: 2, share_availability: true });
  expect(family.families.find(f => f.id === 1).share_availability).toBe(false);
  expect(family.families.find(f => f.id === 2).share_availability).toBe(true);
});

test('web: late availability sharing reconciles after a family switch but not logout', async () => {
  let family;
  function Probe() { family = useWebFamily(); return null; }
  useWebAuth.mockReturnValue({ token: 'session' });
  webAPI.get.mockImplementation(url => url === '/family'
    ? Promise.resolve({ data: { family: { id: 1 }, members: [{ id: 11 }] } })
    : Promise.resolve({ data: { families: [
      { id: 1, name: 'Manneh', share_availability: false },
      { id: 2, name: 'Grandparents', share_availability: false },
    ] } }));
  let resolvePatch;
  webAPI.patch.mockImplementation(url => {
    if (url === '/family/availability') return new Promise(done => { resolvePatch = done; });
    return Promise.resolve({ data: { family: { id: 2 }, members: [{ id: 22 }] } });
  });
  const view = render(<WebProvider><Probe /></WebProvider>);
  await act(async () => {});
  let pendingShare;
  act(() => { pendingShare = family.setAvailabilitySharing(1, true); });
  await act(async () => family.switchFamily(2));
  expect(family.family.id).toBe(2);
  await act(async () => {
    resolvePatch({ data: { setting: { family_id: 1, share_availability: true } } });
    await pendingShare;
  });
  expect(family.families.find(f => f.id === 1).share_availability).toBe(true);

  let resolveAfterLogout;
  webAPI.patch.mockImplementation(() => new Promise(done => { resolveAfterLogout = done; }));
  let afterLogout;
  act(() => { afterLogout = family.setAvailabilitySharing(2, true); });
  useWebAuth.mockReturnValue({ token: null });
  view.rerender(<WebProvider><Probe /></WebProvider>);
  await act(async () => {
    resolveAfterLogout({ data: { setting: { family_id: 2, share_availability: true } } });
    await afterLogout;
  });
  expect(family.family).toBeNull();
  expect(family.families).toEqual([]);
});
