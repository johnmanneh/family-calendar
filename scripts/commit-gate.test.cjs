const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const hook = path.join(root, '.githooks/pre-commit');

test('pre-commit forwards a failing test runner exit code instead of allowing the commit', () => {
  assert.ok(fs.existsSync(hook), 'A versioned pre-commit gate must exist');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'family-calendar-hook-test-'));
  // Test the actual shell hook without making a commit or running app services.
  fs.writeFileSync(path.join(dir, 'git'), '#!/bin/sh\nprintf "%s\\n" "$HOOK_TEST_ROOT"\n', { mode: 0o755 });
  fs.writeFileSync(path.join(dir, 'node'), '#!/bin/sh\nprintf "unit-test-runner-invoked %s\\n" "$*"\nexit 42\n', { mode: 0o755 });
  const result = spawnSync('/bin/sh', [hook], {
    cwd: root, encoding: 'utf8',
    env: { ...process.env, PATH: `${dir}:/usr/bin:/bin`, HOOK_TEST_ROOT: root },
  });
  assert.equal(result.status, 42);
  assert.match(result.stdout, /unit-test-runner-invoked/);
  assert.match(result.stdout, /--staged/);
});

function runner() {
  const filename = path.join(__dirname, 'run-unit-tests.cjs');
  assert.ok(fs.existsSync(filename), 'The commit workflow must provide a unit-test runner');
  return require(filename);
}

test('the unit-test gate runs workflow, backend, web and mobile suites without watch mode', () => {
  const calls = [];
  const result = runner().runUnitTests({ root, spawn: (command, args, options) => {
    calls.push({ command, args, options });
    return { status: 0 };
  }, log: () => {} });
  assert.equal(result, 0);
  assert.equal(calls.length, 4);
  assert.ok(calls[0].args.includes('--test'));
  assert.ok(calls[1].args[0].endsWith('backend/node_modules/jest/bin/jest.js'));
  assert.ok(calls[2].args[0].endsWith('web/node_modules/react-scripts/bin/react-scripts.js'));
  assert.ok(calls[3].args.includes('--config'));
  assert.equal(JSON.parse(calls[3].args.at(-1)).rootDir, root);
  assert.equal(calls[2].options.env.CI, 'true');
  assert.equal(calls[3].options.env.TZ, 'America/Los_Angeles');
});

for (const failure of [{ status: 7 }, { status: null, signal: 'SIGTERM' }, { error: new Error('missing tool') }]) {
  test(`test gate blocks a commit after a failed or interrupted child (${failure.status ?? failure.signal ?? 'error'})`, () => {
    let calls = 0;
    const code = runner().runUnitTests({ root, spawn: () => { calls += 1; return failure; }, log: () => {} });
    assert.notEqual(code, 0);
    assert.equal(calls, 1, 'Do not mask a failed suite by running later suites');
  });
}

for (const scenario of [
  { name: 'unstaged source changes', diff: { status: 1 }, others: { status: 0, stdout: '' }, allowed: false },
  { name: 'untracked source/test files', diff: { status: 0 }, others: { status: 0, stdout: 'backend/new-test.js\0' }, allowed: false },
  { name: 'failed Git inspection', diff: { status: null, error: new Error('git unavailable') }, others: { status: 0, stdout: '' }, allowed: false },
  { name: 'a fully staged tree', diff: { status: 0 }, others: { status: 0, stdout: '' }, allowed: true },
]) {
  test(`commit gate validates the actual tested tree: ${scenario.name}`, () => {
    const check = runner().checkStagedTree;
    assert.equal(typeof check, 'function', 'Tested files must match the commit index');
    const allowed = check({ root, log: () => {}, spawn: (_command, args) => args[0] === 'diff' ? scenario.diff : scenario.others });
    assert.equal(allowed, scenario.allowed);
  });
}


