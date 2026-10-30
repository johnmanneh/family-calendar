// Uses existing web test tooling; no additional mobile dependency is installed.
const path = require('path');
const web = name => require.resolve(path.join(__dirname, '../web/node_modules', name));
module.exports = {
  rootDir: __dirname,
  testEnvironment: web('jest-environment-jsdom'),
  testMatch: ['<rootDir>/src/__tests__/availability*.test.js', '<rootDir>/src/__tests__/ui-*.test.js'],
  moduleDirectories: ['node_modules', path.join(__dirname, '../web/node_modules')],
  moduleNameMapper: {
    '^react$': web('react'),
    '^react/jsx-runtime$': web('react/jsx-runtime'),
    '^react/jsx-dev-runtime$': web('react/jsx-dev-runtime'),
    '^react-dom$': web('react-dom'),
    '^react-dom/(.*)$': path.join(__dirname, '../web/node_modules/react-dom/$1'),
  },
  transform: {
    '^.+\\.jsx?$': [web('babel-jest'), {
      babelrc: false, configFile: false,
      presets: [[web('@babel/preset-env'), { targets: { node: 'current' } }],
        [web('@babel/preset-react'), { runtime: 'automatic' }]],
    }],
  },
};
