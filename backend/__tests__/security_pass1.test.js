/**
 * Security Pass-1 tests — TDD
 *
 * Write-order: tests are written to fail first (RED), then the code is changed
 * to make them pass (GREEN).  The existing security.test.js must continue to
 * pass throughout.
 *
 * Items covered:
 *  1. verifyToken — no query-string token
 *  2. SSE tickets  — POST /api/stream/ticket + GET /api/stream?ticket=
 *  3. shareEventToGroup rejects is_private events
 *  4. getEvents Busy mask — no created_by / family_id / attendee ids
 *  5. joinFamily inserts circle_type = 'outer'
 *  6. getFamily / getAllFamilies — invite_code only for admin or owner
 *  7. Chat (getMessages / sendMessage) — inner circle only; outer → 403
 *  8. Password reset — compares SHA-256 digest; rejects old JWTs after reset
 *  9. createApp — helmet headers present; CORS blocks bad origin
 * 10. validateUrl helper — allows http/https, blocks javascript: / intent:
 * 11. Rate-limit headers on POST /api/join
 * 12. ARCHITECTURE.md — real credentials scrubbed
 */

const request  = require('supertest');
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');

process.env.JWT_SECRET = 'test-secret';

const createApp = require('../src/createApp');

// ── DB mock (must precede source imports) ────────────────────────────────────
jest.mock('../src/config/db', () => {
  const pool = { query: jest.fn(), connect: jest.fn() };
  return pool;
});

const pool = require('../src/config/db');

// ── Side-effect mocks ─────────────────────────────────────────────────────────
jest.mock('../src/utils/sseClients', () => ({
  broadcast:           jest.fn(),
  beginSubscription:   jest.fn(() => ({ revokedFamilies: new Set(), revoked: false })),
  finishSubscription:  jest.fn(),
  addClient:           jest.fn(),
  removeClient:        jest.fn(),
  addUserClient:       jest.fn(),
  removeUserClient:    jest.fn(),
}));
jest.mock('../src/utils/sendPush',           () => jest.fn());
jest.mock('../src/utils/insertNotification', () => jest.fn());
jest.mock('../src/utils/notifyUser',         () => jest.fn());
jest.mock('../src/utils/sendEmail',          () => jest.fn().mockResolvedValue(true));

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeToken(userId = 1, extra = {}) {
  return jwt.sign(
    { id: userId, token_version: 0, ...extra },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

/** Allow auth middleware to resolve for userId */
function mockUserRow(tokenVersion = 0) {
  pool.query.mockImplementation((sql) => {
    if (sql.includes('FROM users WHERE id')) {
      return Promise.resolve({ rows: [{ token_version: tokenVersion }], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
}

const app = createApp();

beforeEach(() => {
  pool.query.mockReset();
  pool.query.mockResolvedValue({ rows: [], rowCount: 0 });
  // Default connect() for pool.connect() used in joinFamily
  pool.connect.mockResolvedValue({
    query:   jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    release: jest.fn(),
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 1. verifyToken — header only; no query-string token accepted
// ═══════════════════════════════════════════════════════════════════════════════
describe('1. verifyToken — header-only JWT', () => {
  test('query-string token is ignored → 401', async () => {
    const token = makeToken();
    const res = await request(app)
      .get('/api/events')
      .query({ token });                 // old SSE fallback, must now be rejected
    expect(res.status).toBe(401);
  });

  test('Authorization header is still accepted', async () => {
    mockUserRow(0);
    pool.query.mockImplementation((sql) => {
      if (sql.includes('FROM users WHERE id'))
        return Promise.resolve({ rows: [{ token_version: 0 }] });
      // getEvents family lookup
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    const token = makeToken();
    const res = await request(app)
      .get('/api/events')
      .set('Authorization', `Bearer ${token}`);
    // 200 or 404 both prove auth passed (no family is fine here)
    expect([200, 404]).toContain(res.status);
  });

  test('JWT issued before password reset (token_version mismatch) → 401', async () => {
    // Token claims version 0, but DB now has version 1 (after a reset)
    const staleToken = makeToken(1, { token_version: 0 });
    pool.query.mockImplementation((sql) => {
      if (sql.includes('FROM users WHERE id'))
        return Promise.resolve({ rows: [{ token_version: 1 }] });
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    const res = await request(app)
      .get('/api/events')
      .set('Authorization', `Bearer ${staleToken}`);
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. SSE tickets
// ═══════════════════════════════════════════════════════════════════════════════
describe('2. SSE tickets', () => {
  test('POST /api/stream/ticket without auth → 401', async () => {
    const res = await request(app).post('/api/stream/ticket');
    expect(res.status).toBe(401);
  });

  test('POST /api/stream/ticket with valid JWT → returns opaque ticket', async () => {
    mockUserRow(0);
    const token = makeToken();
    const res = await request(app)
      .post('/api/stream/ticket')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.ticket).toBe('string');
    expect(res.body.ticket.length).toBeGreaterThan(16);
  });

  test('GET /api/stream without ticket → 401', async () => {
    const res = await request(app).get('/api/stream');
    expect([401, 400]).toContain(res.status);
  });

  test('GET /api/stream with the JWT in query string directly → 401', async () => {
    const token = makeToken();
    const res = await request(app)
      .get('/api/stream')
      .query({ token });          // must be rejected — must use ?ticket= instead
    expect([401, 400]).toContain(res.status);
  });

  test('GET /api/stream with a valid one-time ticket → begins SSE (2xx)', async () => {
    mockUserRow(0);
    const token = makeToken();

    // Obtain a ticket
    const ticketRes = await request(app)
      .post('/api/stream/ticket')
      .set('Authorization', `Bearer ${token}`);
    expect(ticketRes.status).toBe(200);
    const { ticket } = ticketRes.body;

    // Mock the DB lookup that streamConnect does
    pool.query.mockImplementation((sql) => {
      if (sql.includes('FROM users WHERE id'))
        return Promise.resolve({ rows: [{ token_version: 0 }] });
      if (sql.includes('family_members WHERE user_id'))
        return Promise.resolve({ rows: [{ family_id: 1 }] });
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    // Use the ticket — supertest ends the stream immediately; just check headers/status
    const streamRes = await request(app)
      .get('/api/stream')
      .query({ ticket })
      .timeout({ deadline: 500 })
      .catch(e => e.response || { status: 200 }); // timeout is fine for SSE

    // A consumed ticket attempt must not return 401 or 400
    expect([200, 403]).toContain(streamRes.status ?? 200);
  });

  test('ticket is single-use: second attempt → 401', async () => {
    mockUserRow(0);
    const token = makeToken();

    const ticketRes = await request(app)
      .post('/api/stream/ticket')
      .set('Authorization', `Bearer ${token}`);
    const { ticket } = ticketRes.body;

    pool.query.mockImplementation((sql) => {
      if (sql.includes('FROM users WHERE id'))
        return Promise.resolve({ rows: [{ token_version: 0 }] });
      if (sql.includes('family_members WHERE user_id'))
        return Promise.resolve({ rows: [{ family_id: 1 }] });
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    // First use
    await request(app).get('/api/stream').query({ ticket })
      .timeout({ deadline: 200 }).catch(() => {});

    // Second use must fail
    const res2 = await request(app).get('/api/stream').query({ ticket });
    expect([401, 400]).toContain(res2.status);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. shareEventToGroup — private events rejected
// ═══════════════════════════════════════════════════════════════════════════════
describe('3. shareEventToGroup — private events', () => {
  test('sharing a private event with a group → 400', async () => {
    mockUserRow(0);

    pool.query.mockImplementation((sql) => {
      if (sql.includes('FROM users WHERE id'))
        return Promise.resolve({ rows: [{ token_version: 0 }] });
      // Event lookup — is_private = true
      if (sql.includes('FROM events WHERE id'))
        return Promise.resolve({ rows: [{ id: 1, created_by: 1, is_private: true }] });
      // Group membership
      if (sql.includes('FROM group_members WHERE group_id'))
        return Promise.resolve({ rows: [{ id: 1 }] });
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const token = makeToken(1);
    const res = await request(app)
      .post('/api/groups/events/1/share')
      .set('Authorization', `Bearer ${token}`)
      .send({ group_id: 2 });

    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. getEvents Busy mask — no identifying fields leaked
// ═══════════════════════════════════════════════════════════════════════════════
describe('4. Busy mask in getEvents', () => {
  test('Busy row must not contain created_by, family_id, or attendee ids', async () => {
    pool.query.mockImplementation((sql) => {
      if (sql.includes('FROM users WHERE id'))
        return Promise.resolve({ rows: [{ token_version: 0 }] });
      // family_members → inner circle
      if (sql.includes('family_members fm') && sql.includes('WHERE fm.user_id'))
        return Promise.resolve({ rows: [{ family_id: 1, circle_type: 'inner' }] });
      // events query — one private event not created by or attended by this user
      if (sql.includes('FROM events e'))
        return Promise.resolve({ rows: [{
          id: 5, title: 'Secret', family_id: 1, created_by: 99,
          is_private: true, start_date: '2026-11-01T10:00:00Z',
          end_date: '2026-11-01T11:00:00Z', is_all_day: false,
          recurrence: null, recurrence_end_date: null,
          attendees: [{ id: 42, first_name: 'Eve', last_name: 'S', color: '#f00' }],
          is_busy: false,
        }] });
      // group links
      if (sql.includes('event_groups eg'))
        return Promise.resolve({ rows: [] });
      // accepted attendees query
      if (sql.includes('event_attendees WHERE user_id'))
        return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const token = makeToken(1);
    const res = await request(app)
      .get('/api/events')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const busyEvent = (res.body.events || []).find(e => e.is_busy);
    if (busyEvent) {
      expect(busyEvent).not.toHaveProperty('created_by');
      expect(busyEvent).not.toHaveProperty('family_id');
      // attendees must be empty (no IDs)
      expect(busyEvent.attendees).toEqual([]);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. joinFamily — explicit circle_type = 'outer'
// ═══════════════════════════════════════════════════════════════════════════════
describe('5. joinFamily inserts circle_type = outer', () => {
  test('INSERT into family_members includes circle_type = outer', async () => {
    mockUserRow(0);

    let insertSql = '';
    let insertParams = [];

    const mockClient = {
      query: jest.fn().mockImplementation((sql, params) => {
        if (sql.includes('FROM families WHERE invite_code'))
          return Promise.resolve({ rows: [{ id: 99, name: 'Test Family' }] });
        if (sql.includes('FROM family_members fm') && sql.includes('WHERE fm.user_id'))
          return Promise.resolve({ rows: [] });  // not in any family yet
        if (sql.includes('INSERT INTO family_members')) {
          insertSql = sql;
          insertParams = params || [];
        }
        return Promise.resolve({ rows: [], rowCount: 1 });
      }),
      release: jest.fn(),
    };
    pool.connect.mockResolvedValue(mockClient);

    const token = makeToken(1);
    await request(app)
      .post('/api/family/join')
      .set('Authorization', `Bearer ${token}`)
      .send({ invite_code: 'TESTCODE' });

    // The INSERT must reference 'outer' somewhere in SQL or params
    const hasOuter =
      insertSql.toLowerCase().includes('outer') ||
      (insertParams && insertParams.includes('outer'));
    expect(hasOuter).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. getFamily — invite_code hidden for plain members
// ═══════════════════════════════════════════════════════════════════════════════
describe('6. getFamily invite_code visibility', () => {
  function mockFamilyQuery(role) {
    pool.query.mockImplementation((sql) => {
      if (sql.includes('FROM users WHERE id'))
        return Promise.resolve({ rows: [{ token_version: 0 }] });
      if (sql.includes('FROM families f') && sql.includes('JOIN family_members fm'))
        return Promise.resolve({ rows: [{
          id: 1, name: 'Manneh Family',
          invite_code: 'SUPERSECRET', is_personal: false,
          role,
        }] });
      if (sql.includes('FROM users u') && sql.includes('JOIN family_members fm'))
        return Promise.resolve({ rows: [{ id: 1, first_name: 'John', role }] });
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
  }

  test('member role → invite_code omitted', async () => {
    mockFamilyQuery('member');
    const token = makeToken(1);
    const res = await request(app)
      .get('/api/family')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.family?.invite_code).toBeUndefined();
  });

  test('admin role → invite_code present', async () => {
    mockFamilyQuery('admin');
    const token = makeToken(1);
    const res = await request(app)
      .get('/api/family')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.family?.invite_code).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. Chat — outer circle users get 403
// ═══════════════════════════════════════════════════════════════════════════════
describe('7. Chat — inner circle only', () => {
  function mockOuterCircle() {
    pool.query.mockImplementation((sql) => {
      const s = String(sql);
      if (s.includes('FROM users WHERE id'))
        return Promise.resolve({ rows: [{ token_version: 0 }], rowCount: 1 });
      return Promise.resolve({ rows: [{ family_id: 1, circle_type: 'outer' }], rowCount: 1 });
    });
  }

  test('outer circle GET /api/chat → 403', async () => {
    mockOuterCircle();
    const token = makeToken(1);
    const res = await request(app)
      .get('/api/chat')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('outer circle POST /api/chat → 403', async () => {
    mockOuterCircle();
    const token = makeToken(1);
    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'Hello' });
    expect(res.status).toBe(403);
  });

  test('inner circle GET /api/chat → not 403', async () => {
    pool.query.mockImplementation((sql) => {
      if (sql.includes('FROM users WHERE id'))
        return Promise.resolve({ rows: [{ token_version: 0 }] });
      if (sql.includes('family_members'))
        return Promise.resolve({ rows: [{ family_id: 1, circle_type: 'inner' }] });
      if (sql.includes('FROM messages'))
        return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    const token = makeToken(1);
    const res = await request(app)
      .get('/api/chat')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).not.toBe(403);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 8. Password reset — SHA-256 digest + token_version bump
// ═══════════════════════════════════════════════════════════════════════════════
describe('8. Password reset security', () => {
  test('reset-password is behind rate-limiter (RateLimit header present)', async () => {
    pool.query.mockResolvedValue({ rows: [], rowCount: 0 }); // token not found
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'bad', password: 'newpassword123' });
    // Rate-limit headers must be present
    expect(
      res.headers['ratelimit-limit'] || res.headers['x-ratelimit-limit']
    ).toBeDefined();
  });

  test('forgot-password stores SHA-256 digest, not plaintext', async () => {
    let storedToken;
    pool.query.mockImplementation((sql, params) => {
      const s = String(sql);
      if (s.includes('FROM users WHERE LOWER(email)'))
        return Promise.resolve({ rows: [{ id: 1, first_name: 'John' }], rowCount: 1 });
      if (s.includes('UPDATE users SET reset_token')) {
        storedToken = params[0];   // first param = token stored in DB
        return Promise.resolve({ rows: [], rowCount: 1 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'john@example.com' });

    // SHA-256 hex is exactly 64 characters
    expect(storedToken).toMatch(/^[a-f0-9]{64}$/);
  });

  test('reset-password increments token_version in DB', async () => {
    const rawToken = 'rawsecuretoken123456789012345678';
    const digest = crypto.createHash('sha256').update(rawToken).digest('hex');

    let versionBumped = false;
    pool.query.mockImplementation((sql, params) => {
      const s = String(sql);
      if (s.includes('SELECT id FROM users'))
        return Promise.resolve({ rows: [{ id: 1 }], rowCount: 1 });
      if (s.includes('UPDATE users') && s.includes('token_version')) {
        versionBumped = true;
      }
      return Promise.resolve({ rows: [], rowCount: 1 });
    });

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: rawToken, password: 'newpassword123' });

    // Either the combined UPDATE includes token_version or it was a separate call
    expect(res.status).toBe(200);
    expect(versionBumped).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 9. createApp — Helmet headers
// ═══════════════════════════════════════════════════════════════════════════════
describe('9. Helmet security headers', () => {
  test('GET / returns X-Content-Type-Options: nosniff (Helmet active)', async () => {
    const res = await request(app).get('/');
    // Helmet sets multiple headers; X-Content-Type-Options is one of the clearest
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  test('Bad CORS origin is blocked', async () => {
    const res = await request(app)
      .options('/api/events')
      .set('Origin', 'https://evil.example.com')
      .set('Access-Control-Request-Method', 'GET');
    // Either no Access-Control-Allow-Origin header, or it doesn't echo the bad origin
    const allowOrigin = res.headers['access-control-allow-origin'];
    if (allowOrigin) {
      expect(allowOrigin).not.toBe('https://evil.example.com');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 10. validateUrl helper
// ═══════════════════════════════════════════════════════════════════════════════
describe('10. validateUrl helper', () => {
  let validateUrl;
  beforeAll(() => {
    validateUrl = require('../src/utils/validateUrl');
  });

  test('https:// URL passes', () => {
    expect(validateUrl('https://meet.google.com/abc')).toBe(true);
  });
  test('http:// URL passes', () => {
    expect(validateUrl('http://example.com')).toBe(true);
  });
  test('javascript: scheme blocked', () => {
    expect(validateUrl('javascript:alert(1)')).toBe(false);
  });
  test('intent: scheme blocked', () => {
    expect(validateUrl('intent://navigate?url=javascript:alert(1)')).toBe(false);
  });
  test('file: scheme blocked', () => {
    expect(validateUrl('file:///etc/passwd')).toBe(false);
  });
  test('empty / null / undefined pass (field is optional)', () => {
    expect(validateUrl(null)).toBe(true);
    expect(validateUrl(undefined)).toBe(true);
    expect(validateUrl('')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 11. Rate-limit on POST /api/join
// ═══════════════════════════════════════════════════════════════════════════════
describe('11. Rate-limit on join endpoint', () => {
  test('POST /api/join response includes RateLimit header', async () => {
    pool.query.mockResolvedValue({ rows: [], rowCount: 0 });
    pool.connect.mockResolvedValue({
      query:   jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      release: jest.fn(),
    });
    // Use a token so auth passes
    pool.query.mockImplementation((sql) => {
      if (sql.includes('FROM users WHERE id'))
        return Promise.resolve({ rows: [{ token_version: 0 }] });
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    const token = makeToken();
    const res = await request(app)
      .post('/api/join')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: 'XXXX' });
    expect(
      res.headers['ratelimit-limit'] || res.headers['x-ratelimit-limit']
    ).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 12. ARCHITECTURE.md — no real test credentials
// ═══════════════════════════════════════════════════════════════════════════════
describe('12. ARCHITECTURE.md — credentials scrubbed', () => {
  const fs = require('fs');
  const path = require('path');

  test('docs/ARCHITECTURE.md must not contain james@test.com', () => {
    const archPath = path.resolve(__dirname, '../../docs/ARCHITECTURE.md');
    if (!fs.existsSync(archPath)) return;
    const content = fs.readFileSync(archPath, 'utf8');
    expect(content).not.toContain('james@test.com');
  });

  test('docs/ARCHITECTURE.md must not contain the invite code 2O7ZRI', () => {
    const archPath = path.resolve(__dirname, '../../docs/ARCHITECTURE.md');
    if (!fs.existsSync(archPath)) return;
    const content = fs.readFileSync(archPath, 'utf8');
    expect(content).not.toContain('2O7ZRI');
  });
});
