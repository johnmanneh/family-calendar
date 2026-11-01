// Task reminders: who gets them, the wording, and that due rows are claimed once.
jest.mock('../src/config/db', () => ({ query: jest.fn() }));
jest.mock('../src/utils/notifyUser', () => jest.fn());
const pool = require('../src/config/db');
const notifyUser = require('../src/utils/notifyUser');
const { runTaskReminders, dueText } = require('../src/jobs/taskReminders');

beforeEach(() => jest.clearAllMocks());

test('wording', () => {
  expect(dueText(0)).toBe('is due now');
  expect(dueText(30)).toBe('is due in 30 min');
  expect(dueText(60)).toBe('is due in 1 h');
  expect(dueText(1440)).toBe('is due tomorrow');
});

test('claims due open tasks once (UPDATE ... RETURNING), compared in UTC', async () => {
  pool.query.mockResolvedValueOnce({ rows: [] });
  await runTaskReminders();
  const sql = pool.query.mock.calls[0][0];
  expect(sql).toMatch(/UPDATE tasks t SET reminder_sent_at = NOW\(\)/);
  expect(sql).toMatch(/reminder_sent_at IS NULL/);
  expect(sql).toMatch(/completed = false/);
  expect(sql).toMatch(/status IN \('pending', 'accepted', 'countered'\)/);
  expect(sql).toMatch(/AT TIME ZONE 'UTC'/);
  expect(sql).toMatch(/RETURNING/);
  expect(notifyUser).not.toHaveBeenCalled();
});

test('reminds the assignee and says who sent the task', async () => {
  pool.query
    .mockResolvedValueOnce({ rows: [{ id: 9, title: 'Buy bread', assigned_to: 2, created_by: 1, remind_minutes: 30 }] })
    .mockResolvedValueOnce({ rows: [{ first_name: 'John' }] });
  const n = await runTaskReminders();
  expect(n).toBe(1);
  expect(notifyUser).toHaveBeenCalledWith(2, 'task_reminder', 'Reminder', 'Buy bread is due in 30 min (from John)', { taskId: 9 });
});

test('own task: no "from"', async () => {
  pool.query.mockResolvedValueOnce({ rows: [{ id: 3, title: 'Gym', assigned_to: 1, created_by: 1, remind_minutes: 0 }] });
  await runTaskReminders();
  expect(notifyUser).toHaveBeenCalledWith(1, 'task_reminder', 'Reminder', 'Gym is due now', { taskId: 3 });
});
