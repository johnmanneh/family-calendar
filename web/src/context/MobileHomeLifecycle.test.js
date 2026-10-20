import React from 'react';
import { act, render } from '@testing-library/react';
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

// Execute the screen's real state, refresh callback and scope/cache effects as
// React hooks. Only presentation/native IO is excluded from this lifecycle seam.
function homeLifecycle(deps, observe) {
  const source = fs.readFileSync(path.join(__dirname, '../../../mobile/src/screens/HomeScreen.js'), 'utf8');
  const ast = babel.parseSync(source, { configFile: false, babelrc: false, parserOpts: { plugins: ['jsx'] } });
  const fn = ast.program.body.find(n => n.type === 'ExportDefaultDeclaration').declaration;
  const names = new Set(['user', 'family', 'familyIdRef', 'requestId', 'events', 'tasks', 'loading', 'refreshing', 'selectedMember', 'myGroups', 'scope', 'pendingCount', 'notifUnread', 'chatUnread', 'isOffline', 'cacheLabel', 'fetchEvents', 'fetchPendingCount', 'fetchNotifUnread', 'lastFamilyId', 'activeScope', 'scopeRef', 'dataScope']);
  const bindings = node => Object.keys(babel.types.getBindingIdentifiers(node));
  fn.body.body = fn.body.body.filter(n => {
    if (n.type === 'VariableDeclaration') return bindings(n).some(name => names.has(name));
    if (n.type === 'ExpressionStatement' && n.expression.type === 'AssignmentExpression') return n.expression.left.object?.name === 'familyIdRef';
    if (n.type !== 'ExpressionStatement' || n.expression.callee?.name !== 'useEffect') return false;
    let relevant = false;
    babel.traverse(babel.types.file(babel.types.program([n])), { Identifier(p) {
      if (['loadCache', 'fetchEvents', 'fetchPendingCount', 'fetchNotifUnread', 'lastFamilyId', 'requestId'].includes(p.node.name)) relevant = true;
    } });
    return relevant;
  });
  fn.body.body.push(babel.template.statement.ast('observe({ events, tasks, loading, refreshing, myGroups, scope, selectedMember, isOffline, cacheLabel, pendingCount, notifUnread, chatUnread });'));
  fn.body.body.push(babel.types.returnStatement(babel.types.nullLiteral()));
  const code = babel.transformFromAstSync(babel.types.file(babel.types.program([fn])), null, { configFile: false, babelrc: false }).code;
  return new Function('useState', 'useEffect', 'useCallback', 'useRef', 'observe', ...Object.keys(deps), `${code}; return HomeScreen;`)(React.useState, React.useEffect, React.useCallback, React.useRef, observe, ...Object.values(deps));
}
function setup({ family = null, user = { id: 1 } } = {}) {
  const context = { family, user };
  const pending = [];
  const deps = {
    useAuth: () => ({ user: context.user }),
    useFamily: () => ({ family: context.family }),
    API: { get: jest.fn(url => new Promise((resolve, reject) => pending.push({ url, resolve, reject }))) },
    saveCache: jest.fn(), loadCache: jest.fn().mockResolvedValue({ events: [], tasks: [], savedAt: null }),
    savedAtLabel: value => value, fetchPendingCount: jest.fn(), fetchNotifUnread: jest.fn(),
    eventTick: 0, taskTick: 0, notifTick: 0,
  };
  let state;
  const Home = homeLifecycle(deps, value => { state = value; });
  const navigation = { addListener: () => () => {} };
  const view = render(<Home navigation={navigation} />);
  return { deps, pending, context, state: () => state, change: async values => {
    Object.assign(context, values);
    await act(async () => view.rerender(<Home navigation={navigation} />));
  }, settle: async (requests, data = { events: [], tasks: [], groups: [] }) => {
    await act(async () => requests.forEach(request => request.resolve({ data })));
  } };
}

test('family switch clears old in-memory data before failed replacement reads only the new scope cache', async () => {
  const home = setup({ family: { id: 10 } });
  await home.settle(home.pending.splice(0), { events: [{ id: 'A' }], tasks: [{ id: 'task-A' }], groups: [{ id: 5 }] });
  expect(home.state().events).toEqual([{ id: 'A' }]);
  home.deps.loadCache.mockImplementation(async scope => scope === JSON.stringify([1, 20])
    ? { events: [{ id: 'B-offline' }], tasks: [], savedAt: 'B-time' }
    : { events: [{ id: 'A-secret' }], tasks: [{ id: 'A-secret-task' }], savedAt: 'A-time' });
  await home.change({ family: { id: 20 } });
  expect(home.state().events).toEqual([{ id: 'B-offline' }]);
  expect(home.state().tasks).toEqual([]);
  expect(home.state().myGroups).toEqual([]);
  expect(home.state().loading).toBe(false);
  await act(async () => home.pending.splice(0).forEach(request => request.reject(new Error('offline'))));
  expect(home.state().events).toEqual([{ id: 'B-offline' }]);
  expect(home.state().tasks).toEqual([]);
  expect(home.state().loading).toBe(false);
  expect(home.deps.loadCache).toHaveBeenLastCalledWith(JSON.stringify([1, 20]));
});

test('account changes and logout cannot retain or resurrect another account snapshot', async () => {
  const home = setup({ family: { id: 10 } });
  await home.settle(home.pending.splice(0), { events: [{ id: 'account-A' }], tasks: [{ id: 'task-A' }], groups: [] });
  await home.change({ user: { id: 2 } });
  expect(home.state().events).toEqual([]);
  const accountBRequests = home.pending.splice(0);
  let resolveCache;
  home.deps.loadCache.mockImplementation(() => new Promise(resolve => { resolveCache = resolve; }));
  await act(async () => accountBRequests.forEach(request => request.reject(new Error('offline'))));
  expect(home.deps.loadCache).toHaveBeenLastCalledWith(JSON.stringify([2, 10]));
  await home.change({ user: null });
  await act(async () => resolveCache({ events: [{ id: 'account-B-cache' }], tasks: [], savedAt: 'old' }));
  expect(home.state().events).toEqual([]);
  expect(home.state().tasks).toEqual([]);
  expect(home.state().loading).toBe(false);
  expect(home.state().isOffline).toBe(false);
  expect(home.state().cacheLabel).toBeNull();
});

test('a late failed-family fallback cannot overwrite the replacement successful empty response', async () => {
  const home = setup({ family: { id: 10 } });
  let resolveCache;
  home.deps.loadCache.mockImplementation(() => new Promise(resolve => { resolveCache = resolve; }));
  await act(async () => home.pending.splice(0).forEach(request => request.reject(new Error('offline'))));
  await home.change({ family: { id: 20 } });
  await home.settle(home.pending.splice(0));
  await act(async () => resolveCache({ events: [{ id: 'A-secret' }], tasks: [{ id: 'A-task' }], savedAt: 'old' }));
  expect(home.state().events).toEqual([]);
  expect(home.state().tasks).toEqual([]);
  expect(home.state().isOffline).toBe(false);
  expect(home.deps.saveCache).toHaveBeenLastCalledWith([], [], JSON.stringify([1, 20]));
});

test('late badge responses from the prior account cannot repopulate logout state', async () => {
  const home = setup({ family: { id: 10 } });
  const oldRequests = home.pending.splice(0);
  await home.change({ user: null });
  await home.settle(oldRequests, { events: [], tasks: [{ id: 'private-task' }], notifications: [{ id: 'private-notif' }], invitations: [], unread_count: 9 });
  expect(home.state().pendingCount).toBe(0);
  expect(home.state().notifUnread).toBe(0);
});

test('initial null family resolving during mount requests starts replacement refresh and finishes loading', async () => {
  const home = setup();
  const initial = home.pending.splice(0);
  await home.change({ family: { id: 10 } });
  const replacement = home.pending.splice(0);
  expect(replacement.map(request => request.url).filter(url => ['/events', '/tasks/family', '/groups'].includes(url))).toEqual(['/events', '/tasks/family', '/groups']);
  await home.settle(initial, { events: [{ id: 'obsolete' }], tasks: [], groups: [] });
  expect(home.state().events).toEqual([]);
  await home.settle(replacement, { events: [{ id: 'current' }], tasks: [], groups: [] });
  expect(home.state().events).toEqual([{ id: 'current' }]);
  expect(home.state().loading).toBe(false);
});
