#!/usr/bin/env node
'use strict';

const path = require('node:path');
const { spawnSync } = require('node:child_process');

function runUnitTests({ root = path.resolve(__dirname, '..'), spawn = spawnSync, log = console.log } = {}) {
  const env = { ...process.env, CI: 'true', NODE_ENV: 'test', BABEL_ENV: 'test', TZ: 'America/Los_Angeles' };
  const mobileConfig = {
    rootDir: root,
    roots: ['<rootDir>/mobile/src'],
    testEnvironment: 'node',
    // These DOM-rendered UI tests run below with their dedicated configuration.
    // Keep the existing Node-only mobile suites unchanged, and require BOTH.
    testPathIgnorePatterns: ['/node_modules/', '/mobile/src/__tests__/availability[^/]*\\.test\\.js$'],
    transform: {
      '^.+\\.js$': [path.join(root, 'web/node_modules/babel-jest'), {
        presets: [path.join(root, 'web/node_modules/babel-preset-react-app')],
      }],
    },
  };
  const recipes = [
    { name: 'Commit-workflow tests', cwd: root, args: ['--test', path.join(root, 'scripts/commit-gate.test.cjs')] },
    { name: 'Backend unit tests', cwd: path.join(root, 'backend'), args: [
      path.join(root, 'backend/node_modules/jest/bin/jest.js'), '--runInBand', '--no-cache', '--watch=false', '--forceExit',
    ] },
    { name: 'Web and mobile lifecycle tests', cwd: path.join(root, 'web'), args: [
      path.join(root, 'web/node_modules/react-scripts/bin/react-scripts.js'), 'test', '--watchAll=false', '--runInBand', '--no-cache',
    ] },
    { name: 'Mobile unit tests', cwd: root, args: [
      path.join(root, 'web/node_modules/jest/bin/jest.js'), '--runInBand', '--no-cache', '--config', JSON.stringify(mobileConfig),
    ] },
    { name: 'Mobile availability UI tests', cwd: root, args: [
      path.join(root, 'web/node_modules/jest/bin/jest.js'), '--runInBand', '--no-cache', '--config',
      path.join(root, 'mobile/jest.availability.config.cjs'),
    ] },
  ];
  for (const recipe of recipes) {
    log(`\n${recipe.name}`);
    const result = spawn(process.execPath, recipe.args, { cwd: recipe.cwd, env, stdio: 'inherit' });
    if (result.error || result.signal || result.status !== 0) {
      log(`Commit blocked: ${recipe.name} did not pass.`);
      return Number.isInteger(result.status) && result.status > 0 ? result.status : 1;
    }
  }
  log('\nAll unit-test suites passed.');
  return 0;
}

function checkStagedTree({ root = path.resolve(__dirname, '..'), spawn = spawnSync, log = console.error } = {}) {
  // Tests execute the working tree, so reject partial staging rather than
  // allowing uncommitted code/tests to make a different staged version pass.
  const paths = ['backend', 'web', 'mobile', 'scripts', '.githooks'];
  const options = { cwd: root, encoding: 'utf8' };
  const diff = spawn('git', ['diff', '--quiet', '--', ...paths], options);
  if (diff.error || diff.signal || diff.status !== 0) {
    log('Commit blocked: stage the intended project changes first; tested files must match the index.');
    return false;
  }
  const others = spawn('git', ['ls-files', '--others', '--exclude-standard', '-z', '--', ...paths], options);
  if (others.error || others.signal || others.status !== 0 || others.stdout) {
    log('Commit blocked: untracked project files must be staged or explicitly ignored before testing a commit.');
    return false;
  }
  return true;
}

if (require.main === module) {
  const staged = process.argv.includes('--staged');
  if (staged && !checkStagedTree()) process.exitCode = 1;
  else {
    const status = runUnitTests();
    process.exitCode = status || (staged && !checkStagedTree() ? 1 : 0);
  }
}
module.exports = { runUnitTests, checkStagedTree };
