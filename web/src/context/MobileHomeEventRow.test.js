import React from 'react';
import { render, screen } from '@testing-library/react';
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

// Render the mobile Home screen's real EventRow with an inline task. Regression
// for CRASH-001: the inline-task map callback shadowed the i18n `t` function,
// so any event with a pending/accepted/countered task crashed the whole app.
function loadEventRow() {
  const source = fs.readFileSync(path.join(__dirname, '../../../mobile/src/screens/HomeScreen.js'), 'utf8');
  const ast = babel.parseSync(source, { configFile: false, babelrc: false, parserOpts: { plugins: ['jsx'] } });
  const keep = new Set(['EventRow', 'STATUS_COLOR', 'STATUS_KEY']);
  const body = ast.program.body.filter(n =>
    (n.type === 'FunctionDeclaration' && keep.has(n.id.name)) ||
    (n.type === 'VariableDeclaration' && n.declarations.some(d => keep.has(d.id.name)))
  );
  const code = babel.transformFromAstSync(babel.types.file(babel.types.program(body)), null, {
    configFile: false, babelrc: false,
    presets: [[require.resolve('@babel/preset-react'), { runtime: 'classic' }]],
  }).code;
  const box = tag => ({ children }) => React.createElement(tag, null, children);
  const deps = {
    React,
    View: box('div'),
    Text: box('span'),
    TouchableOpacity: box('button'),
    Ionicons: () => null,
    Swipeable: box('div'),
    useStyles: () => ({}),
    useTranslation: () => ({ t: key => `tr:${key}` }),
    formatTime: () => '10:00',
  };
  return new Function(...Object.keys(deps), `${code}; return EventRow;`)(...Object.values(deps));
}

test('an event with an inline pending task renders its translated status instead of crashing', () => {
  const EventRow = loadEventRow();
  const event = { id: 7, title: 'Dentist', start_date: '2026-11-06T07:00:00.000Z', color: '#1a8fa8', is_busy: false };
  const eventTasks = [{ id: 3, title: 'Bring card', status: 'pending', assigned_first_name: 'Dean' }];
  render(<EventRow event={event} navigation={{ navigate: jest.fn() }} eventTasks={eventTasks} onDelete={jest.fn()} />);
  expect(screen.getByText('Bring card')).toBeTruthy();
  expect(screen.getByText('tr:common.pending')).toBeTruthy();
});

test('a task with an unknown status falls back to the raw status text', () => {
  const EventRow = loadEventRow();
  const event = { id: 8, title: 'Match', start_date: '2026-11-06T07:00:00.000Z', is_busy: false };
  render(<EventRow event={event} navigation={{ navigate: jest.fn() }} eventTasks={[{ id: 4, title: 'Boots', status: 'done' }]} onDelete={jest.fn()} />);
  expect(screen.getByText('done')).toBeTruthy();
});
