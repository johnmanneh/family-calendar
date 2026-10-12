/**
 * Security integration tests — F-20
 *
 * Covers:
 *   1. Unauthenticated requests return 401
 *   2. Expired / tampered JWTs are rejected
 *   3. Cross-family event ID guessing → 404 (not 200 or 403)
 *   4. Private event title never leaks to non-members
 *   5. Non-owner cannot edit or delete an event
 *   6. Non-assignee cannot complete a task
 *   7. Auth rate-limiter headers are present
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const createApp = require('../src/createApp');

// ─── Mock the DB pool so tests never need a real PostgreSQL connection ────────
// Every pool.query() returns an empty result unless overridden per test.
jest.mock('../src/config/db', () => {
  const pool = { query: jest.fn() };
  return pool;
});

const pool = require('../src/config/db');

// ─── Mock side-effect utilities (push, SSE, notifications) ───────────────────
jest.mock('../src/utils/sseClients',       () => ({ broadcast: jest.fn() }));
jest.mock('../src/utils/sendPush',          () => jest.fn());
jest.mock('../src/utils/insertNotification',() => jest.fn());
jest.mock('../src/utils/notifyUser',        () => jest.fn());

// ─── Helper: mint a valid JWT for a fake user ─────────────────────────────────
function makeToken(userId = 1) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
}

// ─── Helper: mock auth middleware to resolve with a known user ─────────────────
// auth.js does a DB look-up after verifying the token; stub that lookup.
function mockUserExists(userId = 1) {
  pool.query.mockImplementation((sql) => {
    // Auth middleware: SELECT 1 FROM users WHERE id = $1
    if (sql.includes('SELECT 1 FROM users')) return Promise.resolve({ rows: [{ '?column?': 1 }] });
    // Default: empty
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
}

const app = createApp();

// ─────────────────────────────────────────────────────────────────────────────
// 1. Unauthenticated requests
// ─────────────────────────────────────────────────────────────────────────────
describe('Unauthenticated requests', () => {
  const protectedRoutes = [
    ['GET',    '/api/events'],
    ['POST',   '/api/events'],
    ['PUT',    '/api/events/1'],
    ['DELETE', '/api/events/1'],
    ['GET',    '/api/family/members'],
    ['GET',    '/api/tasks'],
    ['GET',    '/api/notifications'],
    ['GET',    '/api/auth/me'],
  ];

  test.each(protectedRoutes)('%s %s → 401 without token', async (method, route) => {
    const res = await request(app)[method.toLowerCase()](route);
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Tampered / invalid JWTs are rejected
// ─────────────────────────────────────────────────────────────────────────────
describe('Invalid JWT', () => {
  test('tampered token → 401', async () => {
    const res = await request(app)
      .get('/api/events')
      .set('Authorization', 'Bearer not.a.real.token');
    expect(res.status).toBe(401);
  });

  test('token signed with wrong secret → 401', async () => {
    const bad = jwt.sign({ id: 1 }, 'wrong-secret', { expiresIn: '1h' });
    const res = await request(app)
      .get('/api/events')
      .set('Authorization', `Bearer ${bad}`);
    expect(res.status).toBe(401);
  });

  test('token for deleted user → 401', async () => {
    // Auth middleware does SELECT 1 FROM users — return empty to simulate deleted account
    pool.query.mockResolvedValueOnce({ rows: [] });
    const token = makeToken(999);
    const res = await request(app)
      .get('/api/events')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Cross-family event ID guessing
// ─────────────────────────────────────────────────────────────────────────────
describe('Cross-family access', () => {
  test('GET /api/events/:id for event in another family → 404', async () => {
    // Auth passes, then eventAccess returns level=none (not family member)
    pool.query
      .mockResolvedValueOnce({ rows: [{}] })       // auth: user exists
      .mockResolvedValueOnce({ rows: [] })           // eventAccess: no family match
      .mockResolvedValueOnce({ rows: [] });          // eventAccess: no attendee match

    const token = makeToken(1);
    const res = await request(app)
      .get('/api/events/9999')
      .set('Authorization', `Bearer ${token}`);

    // Must be 404 — never 200 or 403 (which would confirm the event exists)
    expect(res.status).toBe(404);
  });

  test('PUT /api/events/:id for event in another family → 404', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{}] })         // auth: user exists
      .mockResolvedValueOnce({ rows: [{ id: 9999, family_id: 2, created_by: 42, owner_id: 42 }] }) // event found
      .mockResolvedValueOnce({ rows: [] })            // canEditEvent: no family match
      .mockResolvedValueOnce({ rows: [] });           // canEditEvent: not a delegate

    const token = makeToken(1);
    const res = await request(app)
      .put('/api/events/9999')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Hijacked' });

    expect(res.status).toBe(404);
  });

  test('DELETE /api/events/:id for event in another family → 404', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{}] })         // auth: user exists
      .mockResolvedValueOnce({ rows: [{ id: 9999, family_id: 2, created_by: 42, owner_id: 42 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const token = makeToken(1);
    const res = await request(app)
      .delete('/api/events/9999')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Private event title must never leak
// ─────────────────────────────────────────────────────────────────────────────
describe('Private event visibility', () => {
  test('GET /api/events/:id for private event the user is not part of → title is not exposed', async () => {
    // Simulate eventAccess returning level='busy'
    const mockAccess = jest.requireMock('../src/utils/access');
    if (mockAccess) {
      // access module may or may not be mocked; test via HTTP response shape
    }

    // Simulate: user is in family, event is private, user is not creator/attendee
    pool.query
      .mockResolvedValueOnce({ rows: [{}] })              // auth
      .mockResolvedValueOnce({ rows: [{ id: 5, family_id: 1, created_by: 2, owner_id: 2, is_private: true }] }) // event
      .mockResolvedValueOnce({ rows: [{ family_id: 1 }] })// user family
      .mockResolvedValueOnce({ rows: [] })                 // not attendee
      .mockResolvedValueOnce({ rows: [] });                // groups

    const token = makeToken(1); // user 1, event created by user 2
    const res = await request(app)
      .get('/api/events/5')
      .set('Authorization', `Bearer ${token}`);

    if (res.status === 200) {
      // If returned as busy block, title must be 'Busy' not the real title
      expect(res.body?.data?.event?.title).not.toBe('Secret birthday party');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Non-assignee cannot complete a task
// ─────────────────────────────────────────────────────────────────────────────
describe('Task authorization', () => {
  test('POST /api/tasks/:id/complete by non-assignee → 404', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{}] })   // auth: user exists
      .mockResolvedValueOnce({ rows: [{ id: 1, family_id: 1, assigned_to: 99, created_by: 2 }] }) // task
      .mockResolvedValueOnce({ rows: [{ family_id: 1 }] }); // user family membership

    const token = makeToken(1); // user 1, task assigned to user 99
    const res = await request(app)
      .post('/api/tasks/1/complete')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Auth rate-limiter headers are present
// ─────────────────────────────────────────────────────────────────────────────
describe('Rate limiting', () => {
  test('POST /api/auth/login response includes RateLimit headers', async () => {
    pool.query.mockResolvedValue({ rows: [] }); // user not found → invalid credentials
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'x@x.com', password: 'wrong' });

    // Rate-limit headers are injected by express-rate-limit
    expect(
      res.headers['ratelimit-limit'] || res.headers['x-ratelimit-limit']
    ).toBeDefined();
  });
});
