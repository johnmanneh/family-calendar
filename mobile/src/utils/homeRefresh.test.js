const fs = require('fs');
const path = require('path');
const babel = require('../../../web/node_modules/@babel/core');

// Execute HomeScreen's actual async callback with local IO/state dependencies;
// no native modules, services, or source-text assertions are involved.
function refreshCallback(deps) {
  const source = fs.readFileSync(path.join(__dirname, '../screens/HomeScreen.js'), 'utf8');
  const ast = babel.parseSync(source, { configFile: false, babelrc: false, parserOpts: { plugins: ['jsx'] } });
  let callback;
  babel.traverse(ast, { VariableDeclarator(p) {
    if (p.node.id.name === 'fetchEvents') callback = p.node.init.arguments[0];
  } });
  const code = babel.transformFromAstSync({ type: 'File', program: { type: 'Program', sourceType: 'script', body: [{ type: 'ExpressionStatement', expression: callback }] } }, null, { configFile: false, babelrc: false }).code;
  return new Function(...Object.keys(deps), `return (${code.replace(/;\s*$/, '')});`)(...Object.values(deps));
}
function setup() {
  const state = { events: [{ id: 'old-event' }], tasks: [{ id: 'old-task' }], offline: false };
  const setter = key => jest.fn(value => { state[key] = typeof value === 'function' ? value(state[key]) : value; });
  const deps = {
    API: { get: jest.fn() },
    setEvents: setter('events'), setTasks: setter('tasks'), setIsOffline: setter('offline'),
    setMyGroups: jest.fn(), setScope: jest.fn(), setCacheLabel: jest.fn(),
    setSelectedMember: jest.fn(), setPendingCount: jest.fn(), setNotifUnread: jest.fn(), setChatUnread: jest.fn(),
    dataScope: { current: JSON.stringify([1, 10]) },
    setLoading: jest.fn(), setRefreshing: jest.fn(),
    saveCache: jest.fn(), loadCache: jest.fn().mockResolvedValue({ events: state.events, tasks: state.tasks, savedAt: 'old' }),
    savedAtLabel: value => value,
    requestId: { current: 0 }, familyIdRef: { current: JSON.stringify([1, 10]) },
  };
  return { state, deps, refresh: refreshCallback(deps) };
}

test('obsolete Home requests cannot write state/cache after family change', async () => {
  const { state, deps, refresh } = setup();
  // Resolve all three together after switching the active family.
  const pending = [];
  deps.API.get.mockImplementation(() => new Promise(done => pending.push(done)));
  const request = refresh();
  deps.familyIdRef.current = 2;
  pending.forEach(done => done({ data: { events: [{ id: 'stale' }], tasks: [], groups: [] } }));
  await request;
  expect(state.events).toEqual([{ id: 'old-event' }]);
  expect(deps.saveCache).not.toHaveBeenCalled();
  expect(deps.setLoading).not.toHaveBeenCalled();
});

test.each(['/events', '/tasks/family', '/groups', 'all'])('failed %s refresh keeps cached datasets and marks offline', async failed => {
  const { state, deps, refresh } = setup();
  deps.API.get.mockImplementation(url => failed === 'all' || url === failed
    ? Promise.reject(new Error('offline'))
    : Promise.resolve({ data: { events: [], tasks: [], groups: [] } }));
  await refresh();
  expect(state.events).toEqual(failed === 'all' || failed === '/events' ? [{ id: 'old-event' }] : []);
  expect(state.tasks).toEqual(failed === 'all' || failed === '/tasks/family' ? [{ id: 'old-task' }] : []);
  expect(state.offline).toBe(true);
  expect(deps.saveCache).not.toHaveBeenCalled();
});

test('successful empty refresh replaces old data and persists the empty snapshot', async () => {
  const { state, deps, refresh } = setup();
  deps.API.get.mockResolvedValue({ data: { events: [], tasks: [], groups: [] } });
  await refresh();
  expect(state.events).toEqual([]);
  expect(state.tasks).toEqual([]);
  expect(state.offline).toBe(false);
  expect(deps.saveCache).toHaveBeenCalledWith([], [], JSON.stringify([1, 10]));
});

test('partial allSettled failure preserves failed events and cache, updates tasks, and marks offline', async () => {
  const { state, deps, refresh } = setup();
  deps.API.get.mockImplementation(url => url === '/events' ? Promise.reject(new Error('offline')) : Promise.resolve({ data: { tasks: [{ id: 'new-task' }], groups: [] } }));
  await refresh();
  expect(state.events).toEqual([{ id: 'old-event' }]);
  expect(state.tasks).toEqual([{ id: 'new-task' }]);
  expect(state.offline).toBe(true);
  expect(deps.saveCache).not.toHaveBeenCalled();
});
