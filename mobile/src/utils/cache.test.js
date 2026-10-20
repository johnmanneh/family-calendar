const fs = require('fs');
const path = require('path');
const babel = require('../../../web/node_modules/@babel/core');

// Run the actual cache module with an in-memory AsyncStorage boundary only.
function cacheModule() {
  const data = new Map();
  const storage = {
    setItem: jest.fn(async (key, value) => data.set(key, value)),
    getItem: jest.fn(async key => data.get(key) ?? null),
    getAllKeys: jest.fn(async () => [...data.keys()]),
    multiSet: jest.fn(async pairs => pairs.forEach(([key, value]) => data.set(key, value))),
    multiGet: jest.fn(async keys => keys.map(key => [key, data.get(key) ?? null])),
    multiRemove: jest.fn(async keys => keys.forEach(key => data.delete(key))),
  };
  const code = babel.transformSync(fs.readFileSync(path.join(__dirname, 'cache.js'), 'utf8'), {
    configFile: false, babelrc: false,
    plugins: [require.resolve('../../../web/node_modules/@babel/plugin-transform-modules-commonjs')],
  }).code;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(() => storage, module, module.exports);
  return { ...module.exports, data, storage };
}

const scope = (accountId, familyId) => JSON.stringify([accountId, familyId]);
test('disk snapshots are isolated by both account and family, ignoring legacy unscoped data', async () => {
  const cache = cacheModule();
  cache.data.set('cache:events', JSON.stringify([{ id: 'legacy-secret' }]));
  await cache.saveCache([{ id: 'A' }], [{ id: 'task-A' }], scope(1, 10));
  expect(await cache.loadCache(scope(1, 20))).toEqual({ events: [], tasks: [], savedAt: null });
  expect(await cache.loadCache(scope(2, 10))).toEqual({ events: [], tasks: [], savedAt: null });
  expect(await cache.loadCache(scope(1, 10))).toEqual({ events: [{ id: 'A' }], tasks: [{ id: 'task-A' }], savedAt: expect.any(String) });
});

test('empty successes stay empty, unresolved scopes never access disk, and logout clears only calendar keys', async () => {
  const cache = cacheModule();
  cache.data.set('auth:unrelated', 'keep');
  cache.data.set('cache:events', 'legacy');
  await cache.saveCache([{ id: 'A' }], [], scope(1, 10));
  await cache.saveCache([{ id: 'B' }], [], scope(2, 10));
  await cache.saveCache([], [], scope(1, 10));
  expect(await cache.loadCache(scope(1, 10))).toEqual({ events: [], tasks: [], savedAt: expect.any(String) });
  expect((await cache.loadCache(scope(2, 10))).events).toEqual([{ id: 'B' }]);
  cache.storage.getItem.mockClear();
  await cache.saveCache([{ id: 'unscoped' }], []);
  expect(await cache.loadCache()).toEqual({ events: [], tasks: [], savedAt: null });
  expect(cache.storage.getItem).not.toHaveBeenCalled();
  await cache.clearCache();
  expect([...cache.data.entries()]).toEqual([['auth:unrelated', 'keep']]);
});

test('a fallback read observes the newest queued successful empty snapshot, not older private data', async () => {
  const cache = cacheModule();
  await cache.saveCache([{ id: 'obsolete' }], [], scope(1, 10));
  let finish;
  cache.storage.setItem.mockImplementationOnce((key, value) => new Promise(resolve => {
    finish = () => { cache.data.set(key, value); resolve(); };
  }));
  const saving = cache.saveCache([], [], scope(1, 10));
  await Promise.resolve();
  const reading = cache.loadCache(scope(1, 10));
  await Promise.resolve();
  finish();
  await saving;
  expect((await reading).events).toEqual([]);
});

test('logout clear waits for an already-started write so private data cannot reappear on disk', async () => {
  const cache = cacheModule();
  let finish;
  cache.storage.setItem.mockImplementationOnce((key, value) => new Promise(resolve => {
    finish = () => { cache.data.set(key, value); resolve(); };
  }));
  const saving = cache.saveCache([{ id: 'private' }], [], scope(1, 10));
  await Promise.resolve();
  const clearing = cache.clearCache();
  await Promise.resolve();
  finish();
  await Promise.all([saving, clearing]);
  expect(await cache.loadCache(scope(1, 10))).toEqual({ events: [], tasks: [], savedAt: null });
});
