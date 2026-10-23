/**
 * INV-001 family invite — TDD
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret';

jest.mock('../src/config/db', () => {
  const pool = { query: jest.fn(), connect: jest.fn() };
  return pool;
});

const pool = require('../src/config/db');

jest.mock('../src/utils/sseClients', () => ({
  broadcast: jest.fn(),
  beginSubscription: jest.fn(() => ({ revokedFamilies: new Set(), revoked: false })),
  finishSubscription: jest.fn(),
  addClient: jest.fn(),
  removeClient: jest.fn(),
  addUserClient: jest.fn(),
  removeUserClient: jest.fn(),
}));
jest.mock('../src/utils/sendPush', () => jest.fn());
jest.mock('../src/utils/insertNotification', () => jest.fn());
jest.mock('../src/utils/notifyUser', () => jest.fn());
jest.mock('../src/utils/sendEmail', () => jest.fn().mockResolvedValue(true));

const createApp = require('../src/createApp');

function makeToken(userId = 1, extra = {}) {
  return jwt.sign(
    { id: userId, token_version: 0, ...extra },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

const app = createApp();

beforeEach(() => {
  pool.query.mockReset();
  pool.query.mockResolvedValue({ rows: [], rowCount: 0 });
  pool.connect.mockResolvedValue({
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    release: jest.fn(),
  });
});

function authUser(sqlImpl) {
  pool.query.mockImplementation((sql, params) => {
    const s = String(sql);
    if (s.includes('token_version') && s.includes('FROM users WHERE id')) {
      return Promise.resolve({ rows: [{ token_version: 0 }], rowCount: 1 });
    }
    return sqlImpl(s, params);
  });
}

describe('getAllFamilies invite_code visibility', () => {
  test('member role → invite_code omitted', async () => {
    authUser((sql) => {
      if (sql.includes('FROM families f') && sql.includes('fm.user_id')) {
        return Promise.resolve({
          rows: [{
            id: 1, name: 'Manneh Family', invite_code: 'SUPERSECRET',
            is_personal: false, role: 'member', is_active: true, member_count: 2,
          }],
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    const res = await request(app)
      .get('/api/family/all')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.families[0].invite_code).toBeUndefined();
    expect(res.body.families[0].short_invite_code).toBeUndefined();
  });
});

describe('GET /api/family/invite', () => {
  test('admin receives long code, grouped short code, and join_url', async () => {
    authUser((sql) => {
      if (sql.includes('FROM families f') && sql.includes('JOIN family_members fm')) {
        return Promise.resolve({
          rows: [{
            id: 7, name: 'Manneh Family',
            invite_code: 'LongTokenAa-_xyz',
            short_invite_code: 'K7QM4XPR9TWD',
            role: 'admin',
          }],
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    const res = await request(app)
      .get('/api/family/invite')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.invite_code).toBe('LongTokenAa-_xyz');
    expect(res.body.short_code).toBe('K7QM-4XPR-9TWD');
    expect(res.body.join_url).toBe('https://its4us.app/join/LongTokenAa-_xyz');
  });

  test('member is forbidden', async () => {
    authUser((sql) => {
      if (sql.includes('FROM families f') && sql.includes('JOIN family_members fm')) {
        return Promise.resolve({
          rows: [{
            id: 7, name: 'Manneh Family',
            invite_code: 'LongTokenAa-_xyz',
            short_invite_code: 'K7QM4XPR9TWD',
            role: 'member',
          }],
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    const res = await request(app)
      .get('/api/family/invite')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(403);
    expect(res.body.invite_code).toBeUndefined();
  });
});

describe('GET /api/public/join/:token', () => {
  test('returns family name only', async () => {
    pool.query.mockImplementation((sql) => {
      if (String(sql).includes('FROM families')) {
        return Promise.resolve({ rows: [{ name: 'Family Manneh' }] });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    const res = await request(app).get('/api/public/join/LongTokenAa-_xyz');
    expect(res.status).toBe(200);
    expect(res.body.family).toEqual({ name: 'Family Manneh' });
    expect(res.body.type).toBe('family');
    expect(res.body.family.invite_code).toBeUndefined();
    expect(res.body.members).toBeUndefined();
  });
});

describe('join preserves long-token case and accepts short codes', () => {
  function mockJoinClient({ family, memberships = [], isManaged = false }) {
    const client = {
      query: jest.fn().mockImplementation((sql) => {
        const s = String(sql);
        if (s.includes('is_managed')) {
          return Promise.resolve({ rows: [{ is_managed: isManaged }] });
        }
        if (s.includes('FROM families') && s.includes('invite_code')) {
          return Promise.resolve({ rows: family ? [family] : [] });
        }
        if (s.includes('FROM family_members fm')) {
          return Promise.resolve({ rows: memberships });
        }
        return Promise.resolve({ rows: [], rowCount: 1 });
      }),
      release: jest.fn(),
    };
    pool.connect.mockResolvedValue(client);
    return client;
  }

  test('mixed-case long token joins without uppercasing', async () => {
    authUser((sql, params) => {
      if (sql.includes('WHERE invite_code =')) {
        return Promise.resolve({
          rows: params && params[0] === 'Aa-_Token' ? [{ id: 2 }] : [],
        });
      }
      if (sql.includes('FROM groups')) return Promise.resolve({ rows: [] });
      if (sql.includes('is_managed')) return Promise.resolve({ rows: [{ is_managed: false }] });
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    mockJoinClient({ family: { id: 2, name: 'Shared' } });
    const res = await request(app)
      .post('/api/join')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ code: 'Aa-_Token' });
    expect(res.status).toBe(200);
    expect(res.body.family.name).toBe('Shared');
  });

  test('grouped short code joins the family and does not look up groups first', async () => {
    const groupLookups = [];
    authUser((sql, params) => {
      if (sql.includes('FROM groups')) {
        groupLookups.push(params);
        return Promise.resolve({ rows: [{ id: 9 }] });
      }
      if (sql.includes('short_invite_code')) {
        return Promise.resolve({
          rows: params && params.includes('K7QM4XPR9TWD') ? [{ id: 2 }] : [],
        });
      }
      if (sql.includes('FROM families WHERE invite_code')) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes('is_managed')) return Promise.resolve({ rows: [{ is_managed: false }] });
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    mockJoinClient({ family: { id: 2, name: 'Shared' } });
    const res = await request(app)
      .post('/api/join')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ code: 'k7qm-4xpr-9twd' });
    expect(res.status).toBe(200);
    expect(res.body.type).toBe('family');
    expect(groupLookups).toHaveLength(0);
  });

  test('managed user cannot join', async () => {
    authUser((sql) => {
      if (sql.includes('FROM families')) {
        return Promise.resolve({ rows: [{ id: 2 }] });
      }
      if (sql.includes('is_managed')) return Promise.resolve({ rows: [{ is_managed: true }] });
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    mockJoinClient({ family: { id: 2, name: 'Shared' }, isManaged: true });
    const res = await request(app)
      .post('/api/join')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ code: 'Aa-_Token' });
    expect(res.status).toBe(403);
  });
});

describe('POST /api/family/invite/rotate', () => {
  test('admin rotate returns new codes; old token no longer previews', async () => {
    let stored = { invite_code: 'OldLong', short_invite_code: 'AAAAAAAAAAAA' };
    authUser((sql, params) => {
      const s = sql;
      if (s.includes('FROM families f') && s.includes('JOIN family_members fm')) {
        return Promise.resolve({
          rows: [{ id: 7, name: 'Manneh Family', role: 'admin', ...stored }],
        });
      }
      if (s.includes('UPDATE families') && s.includes('invite_code')) {
        stored = { invite_code: params[0], short_invite_code: params[1] };
        return Promise.resolve({ rows: [{ id: 7, ...stored }], rowCount: 1 });
      }
      if (s.includes('FROM families') && s.includes('invite_code')) {
        const token = params && params[0];
        if (token === stored.invite_code || token === stored.short_invite_code) {
          return Promise.resolve({ rows: [{ name: 'Manneh Family' }] });
        }
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const rotate = await request(app)
      .post('/api/family/invite/rotate')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(rotate.status).toBe(200);
    expect(rotate.body.invite_code).not.toBe('OldLong');
    expect(rotate.body.short_code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);

    const oldPreview = await request(app).get('/api/public/join/OldLong');
    expect(oldPreview.status).toBe(404);
  });
});

describe('rate limit POST /api/family/join', () => {
  test('includes RateLimit header', async () => {
    authUser(() => Promise.resolve({ rows: [], rowCount: 0 }));
    const res = await request(app)
      .post('/api/family/join')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ invite_code: 'XXXX' });
    expect(
      res.headers['ratelimit-limit'] || res.headers['x-ratelimit-limit']
    ).toBeDefined();
  });
});
