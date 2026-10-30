import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';

// Mobile component rendered with the web test tooling (same approach as the
// mobile availability UI tests): react-native primitives become DOM nodes.
jest.mock('react-native', () => {
  const R = require('react');
  const box = tag => ({ children, testID }) => R.createElement(tag, { 'data-testid': testID }, children);
  return {
    View: box('div'), Text: box('span'),
    TouchableOpacity: ({ children, onPress }) => R.createElement('button', { onClick: onPress }, children),
    StyleSheet: { create: s => s },
  };
});
jest.mock('i18next', () => ({ t: (key, opts) => opts?.defaultValue || key }));

const { default: AppErrorBoundary, installGlobalErrorHandler } = require('../components/AppErrorBoundary');

function Bomb({ explode }) {
  if (explode) throw new TypeError('Object is not a function');
  return <span>Home is fine</span>;
}

beforeEach(() => { jest.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => { console.error.mockRestore(); delete global.ErrorUtils; });

test('a render error shows the recovery screen instead of propagating (closing the app)', () => {
  render(<AppErrorBoundary><Bomb explode /></AppErrorBoundary>);
  expect(screen.getByText('Something went wrong')).toBeTruthy();
  expect(screen.getByText('Object is not a function')).toBeTruthy();
  expect(screen.queryByText('Home is fine')).toBeNull();
});

test('Try again remounts the children', () => {
  let explode = true;
  function Flaky() { return <Bomb explode={explode} />; }
  render(<AppErrorBoundary><Flaky /></AppErrorBoundary>);
  expect(screen.getByText('Something went wrong')).toBeTruthy();
  explode = false;
  fireEvent.click(screen.getByText('Try again'));
  expect(screen.getByText('Home is fine')).toBeTruthy();
});

test('a fatal global error is routed to the boundary; non-fatal ones still reach the previous handler', () => {
  const previous = jest.fn();
  let handler;
  global.ErrorUtils = { getGlobalHandler: () => previous, setGlobalHandler: fn => { handler = fn; } };
  const restore = installGlobalErrorHandler();
  render(<AppErrorBoundary><span>Home is fine</span></AppErrorBoundary>);

  act(() => handler(new Error('minor'), false));
  expect(previous).toHaveBeenCalledWith(expect.any(Error), false);
  expect(screen.getByText('Home is fine')).toBeTruthy();

  act(() => handler(new Error('boom in a timer'), true));
  expect(screen.getByText('boom in a timer')).toBeTruthy();
  restore();
});
