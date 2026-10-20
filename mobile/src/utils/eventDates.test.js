const fs = require('fs');
const path = require('path');
const babel = require('../../../web/node_modules/@babel/core');

// Resolve the actual shared date import used by each view without native UI.
function dateMatcher(file) {
  const filename = path.join(__dirname, '..', file);
  const ast = babel.parseSync(fs.readFileSync(filename, 'utf8'), { configFile: false, babelrc: false, parserOpts: { plugins: ['jsx'] } });
  const binding = ast.program.body.find(node => node.type === 'ImportDeclaration' && node.specifiers.some(item => item.local.name === 'onSameDay'));
  const specifier = binding.specifiers.find(item => item.local.name === 'onSameDay');
  return require(path.resolve(path.dirname(filename), binding.source.value))[specifier.imported.name];
}

for (const file of ['screens/HomeScreen.js', 'components/MonthCalendar.js', 'screens/DayViewScreen.js', 'components/WeekStrip.js']) {
  test(`${file}: timed UTC timestamps match the local calendar day`, () => {
    const onSameDay = dateMatcher(file);
    // Run under TZ=America/Los_Angeles: UTC Jan 2 is still Jan 1 locally.
    expect(onSameDay('2026-01-02T01:30:00Z', new Date(2026, 0, 1))).toBe(true);
    expect(onSameDay('2026-01-02T01:30:00Z', new Date(2026, 0, 2))).toBe(false);
    expect(onSameDay('2026-01-02', new Date(2026, 0, 2))).toBe(true);
    expect(onSameDay('2026-01-02T00:00:00Z', new Date(2026, 0, 2), true)).toBe(true);
    expect(onSameDay(new Date(2026, 0, 2), new Date(2026, 0, 2))).toBe(true);
    expect(onSameDay(null, new Date())).toBe(false);
  });
}
