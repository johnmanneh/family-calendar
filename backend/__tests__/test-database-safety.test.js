const fs = require('fs');
const path = require('path');
const vm = require('vm');

const configureTestDatabase = require('../tests/testDatabase');

test.each([
  undefined,
  'not-a-url',
  'https://localhost/when_test',
  'postgres://localhost/family_production',
  'postgres://localhost/contest',
])('rejects unsafe or missing TEST_DATABASE_URL without changing connection configuration (%s)', (url) => {
  const env = { TEST_DATABASE_URL: url, DATABASE_PUBLIC_URL: 'original-public', DATABASE_URL: 'original-private' };
  expect(() => configureTestDatabase(env)).toThrow();
  expect(env.DATABASE_PUBLIC_URL).toBe('original-public');
  expect(env.DATABASE_URL).toBe('original-private');
});

test('pins both variables even if dotenv would otherwise supply a public URL', () => {
  const env = { TEST_DATABASE_URL: 'postgresql://localhost/when_test' };
  configureTestDatabase(env);
  // dotenv does not replace variables that already exist.
  if (env.DATABASE_PUBLIC_URL === undefined) env.DATABASE_PUBLIC_URL = 'wrong-database';
  expect(env.DATABASE_PUBLIC_URL).toBe(env.TEST_DATABASE_URL);
});

const suites = ['delegation', 'multifamily', 'pickup', 'scan', 'security', 'sharing'];
const stopped = new Error('Stopped before opening a database connection');

function bootstrap(suite, env) {
  let selectedUrl;
  const mockedRequire = (id) => {
    if (id === './testDatabase') return require('../tests/testDatabase');
    if (id === '../src/config/db') {
      selectedUrl = env.DATABASE_PUBLIC_URL || env.DATABASE_URL;
      throw stopped;
    }
    throw new Error(`Unexpected dependency before database isolation: ${id}`);
  };
  mockedRequire.resolve = (id) => id;
  mockedRequire.cache = {};
  const sandbox = {
    process: { env, exit: () => { throw new Error('Unsafe test configuration rejected'); } },
    require: mockedRequire, console: { error: jest.fn() },
  };
  try {
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../tests', `${suite}.test.js`), 'utf8'), sandbox);
  } catch (err) {
    if (err !== stopped) throw err;
  }
  return selectedUrl;
}

test.each(suites)('%s suite pins both database URLs before loading the connection module', (suite) => {
  const env = {
    TEST_DATABASE_URL: 'postgres://tester@localhost/when_test',
    DATABASE_PUBLIC_URL: 'postgres://example.invalid/live_database',
    DATABASE_URL: 'postgres://example.invalid/other_database',
  };
  expect(bootstrap(suite, env)).toBe(env.TEST_DATABASE_URL);
  expect(env.DATABASE_PUBLIC_URL).toBe(env.TEST_DATABASE_URL);
  expect(env.DATABASE_URL).toBe(env.TEST_DATABASE_URL);
});
