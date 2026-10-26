/**
 * POST /api/voice — VOICE-001 (hold + to talk, saved directly)
 *
 * Groq (Whisper + chat) is mocked via global fetch; the DB via pool/client mocks.
 *
 * Cases covered:
 *   1. No token → 401
 *   2. No audio file → 400
 *   3. GROQ_API_KEY missing → 503
 *   4. Happy path → 201 with the saved event
 *   5. Groq 429 twice (after one retry) → 429
 *   6. Empty transcript → 422
 *   7. Same title + start already saved → 200, nothing inserted
 */

const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = 'test-secret';

const createApp = require('../src/createApp');

const mockClient = { query: jest.fn(), release: jest.fn() };

jest.mock('../src/config/db', () => ({ query: jest.fn(), connect: jest.fn() }));
const pool = require('../src/config/db');

jest.mock('../src/utils/sseClients',        () => ({ broadcast: jest.fn() }));
jest.mock('../src/utils/sendPush',           () => jest.fn());
jest.mock('../src/utils/insertNotification', () => jest.fn());
jest.mock('../src/utils/notifyUser',         () => jest.fn());
const { broadcast } = require('../src/utils/sseClients');

const request = require('supertest');

function makeToken(userId = 1) {
  return jwt.sign({ id: userId, token_version: 0 }, 'test-secret', { expiresIn: '1h' });
}

// Auth lookup, active family, family first names
function mockPoolOk() {
  pool.query.mockImplementation((sql) => {
    if (sql.includes('FROM users WHERE id')) return Promise.resolve({ rows: [{ token_version: 0 }] });
    if (sql.includes('SELECT fm.family_id')) return Promise.resolve({ rows: [{ family_id: 7 }] });
    if (sql.includes('SELECT u.first_name')) return Promise.resolve({ rows: [{ first_name: 'Hannah' }] });
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
}

function mockClientDb({ duplicate = false } = {}) {
  mockClient.query.mockImplementation((sql) => {
    if (sql.includes('AS color')) return Promise.resolve({ rows: [{ color: '#123456' }] });
    if (sql.includes('SELECT 1 FROM events')) return Promise.resolve({ rows: duplicate ? [{}] : [] });
    if (sql.includes('INSERT INTO events')) return Promise.resolve({ rows: [{ id: 99 }] });
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
}

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

const whisper = text => json({ text });
const chat = event => json({ choices: [{ message: { content: JSON.stringify(event) } }] });

const sendAudio = (app, token = makeToken(1)) => request(app)
  .post('/api/voice')
  .set('Authorization', `Bearer ${token}`)
  .field('tz', 'Europe/Zurich')
  .attach('audio', Buffer.from('fake audio'), { filename: 'note.m4a', contentType: 'audio/m4a' });

let app;
let fetchSpy;
beforeAll(() => { app = createApp(); });
beforeEach(() => {
  jest.clearAllMocks();
  process.env.GROQ_API_KEY = 'test-key';
  pool.connect.mockResolvedValue(mockClient);
  mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 });
  fetchSpy = jest.spyOn(global, 'fetch');
});
afterEach(() => { fetchSpy.mockRestore(); });

describe('POST /api/voice — VOICE-001', () => {

  test('1. no token → 401', async () => {
    const res = await request(app).post('/api/voice');
    expect(res.status).toBe(401);
  });

  test('2. no audio file → 400', async () => {
    mockPoolOk();
    const res = await request(app)
      .post('/api/voice')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .field('tz', 'Europe/Zurich');
    expect(res.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('3. GROQ_API_KEY missing → 503', async () => {
    delete process.env.GROQ_API_KEY;
    mockPoolOk();
    const res = await sendAudio(app);
    expect(res.status).toBe(503);
    expect(res.body.message).toBe('Voice transcription is not set up yet');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('4. transcribed, extracted and saved → 201', async () => {
    mockPoolOk();
    mockClientDb();
    fetchSpy
      .mockResolvedValueOnce(whisper('Dentist appointment tomorrow at 3pm'))
      .mockResolvedValueOnce(chat({
        title: 'Dentist', date: '2026-10-27', start_time: '15:00', end_time: null,
        all_day: false, notes: null, location: 'Vaduz',
      }));

    const res = await sendAudio(app);

    expect(res.status).toBe(201);
    expect(res.body.event).toEqual({
      id: 99,
      title: 'Dentist',
      start_date: '2026-10-27T14:00:00.000Z',   // 15:00 Zurich (CET) → 14:00 UTC
      end_date: '2026-10-27T15:00:00.000Z',     // no end time → one hour
      is_all_day: false,
    });

    const [whisperUrl, whisperInit] = fetchSpy.mock.calls[0];
    expect(whisperUrl).toBe('https://api.groq.com/openai/v1/audio/transcriptions');
    expect(whisperInit.body.get('model')).toBe('whisper-large-v3-turbo');
    expect(whisperInit.body.get('prompt')).toBe('Hannah');
    expect(fetchSpy.mock.calls[1][0]).toBe('https://api.groq.com/openai/v1/chat/completions');

    const insert = mockClient.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO events'));
    expect(insert[1]).toEqual(['Dentist', null, 'Vaduz', '2026-10-27T14:00:00.000Z', '2026-10-27T15:00:00.000Z', false, 7, 1, '#123456']);
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    expect(mockClient.release).toHaveBeenCalled();
    expect(broadcast).toHaveBeenCalledWith(7, 'event_update', {});
  });

  test('5. Groq 429 again after the retry → 429', async () => {
    mockPoolOk();
    fetchSpy.mockImplementation(() => Promise.resolve(json({}, 429, { 'retry-after': '1' })));

    const res = await sendAudio(app);

    expect(res.status).toBe(429);
    expect(res.body.message).toBe('Too many requests — please try again');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  }, 10000);

  test('6. empty transcript → 422', async () => {
    mockPoolOk();
    fetchSpy.mockResolvedValueOnce(whisper('   '));

    const res = await sendAudio(app);

    expect(res.status).toBe(422);
    expect(res.body.message).toBe('Nothing was said');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test('7. same title + start already saved → 200, no insert', async () => {
    mockPoolOk();
    mockClientDb({ duplicate: true });
    fetchSpy
      .mockResolvedValueOnce(whisper('Dentist appointment tomorrow at 3pm'))
      .mockResolvedValueOnce(chat({
        title: 'Dentist', date: '2026-10-27', start_time: '15:00', end_time: null,
        all_day: false, notes: null, location: null,
      }));

    const res = await sendAudio(app);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Event already exists');
    expect(mockClient.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO events'))).toBe(false);
    expect(mockClient.release).toHaveBeenCalled();
  });

});
