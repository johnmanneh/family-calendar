/**
 * avatarStore — TDD (RED → GREEN)
 *
 * All Cloudinary SDK calls are mocked so this test never hits the network.
 * Tests are written to FAIL against the old avatarStore.js, then PASS once
 * the HMAC + authenticated-upload rewrite lands.
 */

const crypto = require('crypto');

// ── Set required env before any require() ────────────────────────────────────
process.env.AVATAR_HMAC_KEY      = 'test-hmac-key-32bytes-padding!!';
process.env.CLOUDINARY_API_KEY   = 'test-api-key';
process.env.CLOUDINARY_API_SECRET = 'test-api-secret';
process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';

// ── Mock the cloudinary v2 SDK ────────────────────────────────────────────────
const mockUploadStream  = jest.fn();
const mockDestroy       = jest.fn();
const mockSignedUrl     = jest.fn();

jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload_stream: mockUploadStream,
      destroy: mockDestroy,
    },
    utils: {
      url: mockSignedUrl,
    },
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────
function expectedPublicId(personId) {
  return crypto
    .createHmac('sha256', process.env.AVATAR_HMAC_KEY)
    .update(String(personId))
    .digest('hex');
}

// Simulate a successful upload_stream call
function simulateUpload(opts, callback) {
  // Return a fake writable stream whose .end() triggers the callback
  const writable = {
    end: () => callback(null, { public_id: opts.public_id }),
  };
  return writable;
}

// ═══════════════════════════════════════════════════════════════════════════════
describe('avatarStore — HMAC public_id', () => {
  let avatarStore;

  beforeAll(() => {
    // Import fresh module each suite so env changes take effect
    jest.resetModules();
    process.env.AVATAR_HMAC_KEY = 'test-hmac-key-32bytes-padding!!';
    avatarStore = require('../src/utils/avatarStore');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── 1. HMAC public_id is deterministic ────────────────────────────────────
  test('storeAvatar uses HMAC-SHA256 of personId as public_id (not avatar-N)', async () => {
    const personId = 42;
    const expected = expectedPublicId(personId);

    mockUploadStream.mockImplementation((opts, cb) => simulateUpload(opts, cb));
    mockSignedUrl.mockReturnValue('https://signed-url');

    await avatarStore.storeAvatar(personId, Buffer.from('fake-image'));

    expect(mockUploadStream).toHaveBeenCalledTimes(1);
    const [opts] = mockUploadStream.mock.calls[0];
    expect(opts.public_id).toBe(expected);
    // Must NOT use the old legacy naming
    expect(opts.public_id).not.toContain(`avatar-${personId}`);
  });

  // ── 2. Upload must be type = 'authenticated' ──────────────────────────────
  test('storeAvatar passes type: authenticated to upload_stream', async () => {
    mockUploadStream.mockImplementation((opts, cb) => simulateUpload(opts, cb));
    mockSignedUrl.mockReturnValue('https://signed-url');

    await avatarStore.storeAvatar(7, Buffer.from('img'));

    const [opts] = mockUploadStream.mock.calls[0];
    expect(opts.type).toBe('authenticated');
  });

  // ── 3. Upload sets overwrite + invalidate ─────────────────────────────────
  test('storeAvatar sets overwrite=true and invalidate=true', async () => {
    mockUploadStream.mockImplementation((opts, cb) => simulateUpload(opts, cb));
    mockSignedUrl.mockReturnValue('https://signed-url');

    await avatarStore.storeAvatar(7, Buffer.from('img'));

    const [opts] = mockUploadStream.mock.calls[0];
    expect(opts.overwrite).toBe(true);
    expect(opts.invalidate).toBe(true);
  });

  // ── 4. Face crop is applied on upload ─────────────────────────────────────
  test('storeAvatar requests 400×400 face crop on upload', async () => {
    mockUploadStream.mockImplementation((opts, cb) => simulateUpload(opts, cb));
    mockSignedUrl.mockReturnValue('https://signed-url');

    await avatarStore.storeAvatar(7, Buffer.from('img'));

    const [opts] = mockUploadStream.mock.calls[0];
    const tf = opts.transformation?.[0] ?? opts.transformation;
    expect(tf).toMatchObject({ width: 400, height: 400, crop: 'fill', gravity: 'face' });
  });

  // ── 5. Return value is a signed delivery URL (not the API download URL) ──
  test('storeAvatar returns a signed delivery URL iOS Image can load', async () => {
    mockUploadStream.mockImplementation((opts, cb) => simulateUpload(opts, cb));
    const expectedUrl = 'https://res.cloudinary.com/test-cloud/image/authenticated/s--sig--/avatars/hash.jpg';
    mockSignedUrl.mockReturnValue(expectedUrl);

    const result = await avatarStore.storeAvatar(7, Buffer.from('img'));
    expect(result).toBe(expectedUrl);
    expect(mockSignedUrl).toHaveBeenCalledTimes(1);
    const [publicId, urlOpts] = mockSignedUrl.mock.calls[0];
    expect(publicId).toBe(`avatars/${expectedPublicId(7)}`);
    expect(urlOpts).toMatchObject({
      type: 'authenticated',
      sign_url: true,
      secure: true,
      format: 'jpg',
    });
    expect(urlOpts.expires_at).toBeUndefined();
  });

  // ── 6. getAvatarUrl signs the same delivery URL for a new upload ─────────
  test('getAvatarUrl signs the HMAC delivery URL, not private_download_url', () => {
    const expectedUrl = 'https://res.cloudinary.com/test-cloud/image/authenticated/s--sig--/avatars/hash.jpg';
    mockSignedUrl.mockReturnValue(expectedUrl);

    const result = avatarStore.getAvatarUrl(7);

    expect(result).toBe(expectedUrl);
    expect(mockSignedUrl).toHaveBeenCalledTimes(1);
    const [publicId, urlOpts] = mockSignedUrl.mock.calls[0];
    expect(publicId).toBe(`avatars/${expectedPublicId(7)}`);
    expect(urlOpts.type).toBe('authenticated');
    expect(urlOpts.sign_url).toBe(true);
    expect(urlOpts.secure).toBe(true);
  });

  // ── 6b. old public uploads still resolve ─────────────────────────────────
  test('getAvatarUrl falls back to the legacy public id when asked', () => {
    mockSignedUrl.mockReturnValue('https://legacy');

    avatarStore.getAvatarUrl(42, { legacy: true });

    const [publicId, urlOpts] = mockSignedUrl.mock.calls[0];
    expect(publicId).toBe('avatars/avatar-42');
    expect(urlOpts.type).toBe('upload');
    expect(urlOpts.sign_url).toBe(false);
  });

  // ── 7. deleteAvatar destroys both HMAC id and legacy id ──────────────────
  test('deleteAvatar destroys HMAC public_id AND legacy avatar-N', async () => {
    mockDestroy.mockResolvedValue({ result: 'ok' });

    await avatarStore.deleteAvatar(42);

    const destroyedIds = mockDestroy.mock.calls.map(c => c[0]);
    const hmacId = expectedPublicId(42);

    // Must include the HMAC-based path
    expect(destroyedIds.some(id => id.includes(hmacId))).toBe(true);
    // Must also include the legacy path
    expect(destroyedIds.some(id => id.includes(`avatar-42`))).toBe(true);
  });

  test('withFreshAvatar replaces a stored download URL with a signed HMAC delivery URL', () => {
    mockSignedUrl.mockReturnValue('https://fresh');
    const { withFreshAvatar } = avatarStore;
    const row = withFreshAvatar({
      id: 7,
      avatar_url: 'https://api.cloudinary.com/v1_1/test/image/download?timestamp=1',
    });
    expect(row.avatar_url).toBe('https://fresh');
    const [publicId, urlOpts] = mockSignedUrl.mock.calls[0];
    expect(publicId).toBe(`avatars/${expectedPublicId(7)}`);
    expect(urlOpts.type).toBe('authenticated');
    expect(urlOpts.sign_url).toBe(true);
  });

  test('withFreshAvatar keeps a legacy public upload on the old public id', () => {
    mockSignedUrl.mockReturnValue('https://legacy');
    const row = avatarStore.withFreshAvatar({
      id: 42,
      avatar_url: 'https://res.cloudinary.com/test/image/upload/avatars/avatar-42.jpg',
    });
    expect(row.avatar_url).toBe('https://legacy');
    const [publicId, urlOpts] = mockSignedUrl.mock.calls[0];
    expect(publicId).toBe('avatars/avatar-42');
    expect(urlOpts.type).toBe('upload');
  });

  test('withFreshAvatar leaves a member with no photo empty', () => {
    const row = avatarStore.withFreshAvatar({ id: 3, avatar_url: null });
    expect(row.avatar_url).toBeNull();
    expect(mockSignedUrl).not.toHaveBeenCalled();
  });

  // ── 8. Throws when neither HMAC key nor API secret is set ─────────────────
  test('storeAvatar throws if AVATAR_HMAC_KEY and CLOUDINARY_API_SECRET are absent', async () => {
    jest.resetModules();
    const savedHmac   = process.env.AVATAR_HMAC_KEY;
    const savedSecret = process.env.CLOUDINARY_API_SECRET;
    delete process.env.AVATAR_HMAC_KEY;
    delete process.env.CLOUDINARY_API_SECRET;

    const store = require('../src/utils/avatarStore');
    await expect(store.storeAvatar(1, Buffer.from('x'))).rejects.toThrow();

    process.env.AVATAR_HMAC_KEY       = savedHmac;
    process.env.CLOUDINARY_API_SECRET  = savedSecret;
  });
});
