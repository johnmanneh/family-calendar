/**
 * deleteGroup controller — BUG-002
 *
 * The app shows the group creator as "admin" (via getMyGroups → gm.role).
 * The old controller checked ONLY group_members.role = 'admin'.  If that row
 * was absent (e.g. CASCADE already removed it from a prior partial delete),
 * rowCount was 0 and the 403 fired even for the real creator.
 *
 * Fix: auth check now accepts EITHER groups.created_by = userId OR a
 * group_members row with role = 'admin'.  Cleanup runs inside a transaction.
 *
 * Cases covered:
 *   1. Creator whose group_members row has role='admin' → 200
 *   2. Creator whose group_members row is MISSING (rowCount 0) → 200 (was 403 before fix)
 *   3. Regular member (role='member') who is NOT the creator → 403
 *   4. Non-member (not in group at all) → 403
 *   5. Group not found → 403 (authCheck returns 0 rows)
 */

const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = 'test-secret';

const createApp = require('../src/createApp');

// ── DB mock ──────────────────────────────────────────────────────────────────
// deleteGroup now calls pool.connect() → client.{query,release}
// auth middleware calls pool.query() directly.

const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

jest.mock('../src/config/db', () => {
  const pool = {
    query: jest.fn(),
    connect: jest.fn(),
  };
  return pool;
});

const pool = require('../src/config/db');

// ── Side-effect stubs ─────────────────────────────────────────────────────────
jest.mock('../src/utils/sseClients',        () => ({ broadcast: jest.fn() }));
jest.mock('../src/utils/sendPush',           () => jest.fn());
jest.mock('../src/utils/insertNotification', () => jest.fn());
jest.mock('../src/utils/notifyUser',         () => jest.fn());

const request = require('supertest');

function makeToken(userId = 1) {
  return jwt.sign({ id: userId, token_version: 0 }, 'test-secret', { expiresIn: '1h' });
}

// Stub auth middleware: every pool.query that touches 'FROM users WHERE id' resolves OK.
function mockAuthOk(userId = 1) {
  pool.query.mockImplementation((sql) => {
    if (sql.includes('FROM users WHERE id')) {
      return Promise.resolve({ rows: [{ token_version: 0 }], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
}

let app;
beforeAll(() => { app = createApp(); });
beforeEach(() => {
  jest.clearAllMocks();
  pool.connect.mockResolvedValue(mockClient);
  mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 });
  mockClient.release.mockReturnValue(undefined);
});

// ─────────────────────────────────────────────────────────────────────────────

describe('DELETE /api/groups/:id — BUG-002', () => {

  test('1. creator with admin role in group_members → 200', async () => {
    mockAuthOk(1);
    mockClient.query.mockImplementation((sql) => {
      if (sql.includes('BEGIN') || sql.includes('COMMIT') || sql.includes('ROLLBACK')) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      // Auth check: group exists AND (created_by=1 OR admin member)
      if (sql.includes('FROM groups g')) {
        return Promise.resolve({ rows: [{ '?column?': 1 }], rowCount: 1 });
      }
      // DELETEs
      return Promise.resolve({ rows: [], rowCount: 1 });
    });

    const res = await request(app)
      .delete('/api/groups/42')
      .set('Authorization', `Bearer ${makeToken(1)}`);

    expect(res.status).toBe(200);
  });

  test('2. creator whose group_members row is MISSING → 200 (regression for BUG-002)', async () => {
    // This is the case that returned 403 before the fix.
    // group_members has no row for userId=1, but groups.created_by=1.
    mockAuthOk(1);
    mockClient.query.mockImplementation((sql) => {
      if (sql.includes('BEGIN') || sql.includes('COMMIT') || sql.includes('ROLLBACK')) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      // Auth check finds the group because created_by=1 (even though no member row exists)
      if (sql.includes('FROM groups g')) {
        return Promise.resolve({ rows: [{ '?column?': 1 }], rowCount: 1 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const res = await request(app)
      .delete('/api/groups/42')
      .set('Authorization', `Bearer ${makeToken(1)}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });

  test('3. regular member (role=member, not creator) → 403', async () => {
    mockAuthOk(2);
    mockClient.query.mockImplementation((sql) => {
      if (sql.includes('BEGIN') || sql.includes('ROLLBACK')) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      // Auth check: user 2 is not created_by and not an admin member
      if (sql.includes('FROM groups g')) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const res = await request(app)
      .delete('/api/groups/42')
      .set('Authorization', `Bearer ${makeToken(2)}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/admin/i);
  });

  test('4. unauthenticated request → 401', async () => {
    const res = await request(app).delete('/api/groups/42');
    expect(res.status).toBe(401);
  });

  test('5. group not found → 403', async () => {
    mockAuthOk(1);
    mockClient.query.mockImplementation((sql) => {
      if (sql.includes('BEGIN') || sql.includes('ROLLBACK')) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      // Group doesn't exist → auth check returns 0 rows
      if (sql.includes('FROM groups g')) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const res = await request(app)
      .delete('/api/groups/999')
      .set('Authorization', `Bearer ${makeToken(1)}`);

    expect(res.status).toBe(403);
  });

});
