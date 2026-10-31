const crypto  = require('crypto');
const multer  = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { errorResponse } = require('./response/responseHandlers');

// Cloudinary reads credentials from environment variables:
// CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── HMAC helper ───────────────────────────────────────────────────────────────
// Derive an opaque, stable public_id from personId.  The secret is never
// exposed in URLs so avatar paths can't be enumerated by id-guessing.
function _hmacPublicId(personId) {
  const key = process.env.AVATAR_HMAC_KEY || process.env.CLOUDINARY_API_SECRET;
  if (!key) throw new Error('AVATAR_HMAC_KEY or CLOUDINARY_API_SECRET must be set');
  return crypto.createHmac('sha256', key).update(String(personId)).digest('hex');
}

// ── Multer upload middleware ───────────────────────────────────────────────────
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) =>
    ALLOWED.includes(file.mimetype) ? cb(null, true) : cb(new Error('Only image files are allowed'), false),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
});

// Express middleware: reads the `avatar` field, answers with JSON errors
const receiveAvatar = (req, res, next) => {
  upload.single('avatar')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return errorResponse(res, 400, 'Photo is too large (max 5 MB)');
    if (err.message === 'Only image files are allowed') return errorResponse(res, 400, 'Please choose a JPG, PNG, WEBP or GIF image');
    console.error('avatar multer error:', err.message);
    return errorResponse(res, 500, 'Could not process the photo');
  });
};

// ── Signed delivery URL ───────────────────────────────────────────────────────
// iOS Image cannot load private_download_url (Cloudinary API download, often a
// redirect). A signed res.cloudinary.com delivery URL is a normal image URL.
// Authenticated assets stay signed. Legacy public uploads (avatars/avatar-N)
// are unsigned type=upload so old photos still resolve.
// `version` (Cloudinary's upload version) makes every new upload a NEW URL.
// The public id never changes (HMAC of the person id), so without it the URL
// before and after "Change photo" was identical and phones kept showing the
// cached old photo.
function _deliveryUrl(publicId, { authenticated, version }) {
  const opts = {
    type: authenticated ? 'authenticated' : 'upload',
    sign_url: authenticated,
    secure: true,
    format: 'jpg',
  };
  if (version) opts.version = version;
  return cloudinary.utils.url(publicId, opts);
}

// What we store in users.avatar_url for a Cloudinary upload: "cloudinary:v<version>".
// (Plain "cloudinary" = uploaded before versions were kept.)
const MARKER_PREFIX = 'cloudinary';
function avatarMarker(version) {
  return version ? `${MARKER_PREFIX}:v${version}` : MARKER_PREFIX;
}
function _versionFromStored(stored) {
  const m = /^cloudinary:v(\d+)$/.exec(String(stored || ''));
  return m ? m[1] : undefined;
}

// Upload and return { url, marker }. Store `marker` in users.avatar_url.
function saveAvatar(personId, buffer) {
  return new Promise((resolve, reject) => {
    let publicId;
    try {
      publicId = _hmacPublicId(personId);
    } catch (err) {
      return reject(err);
    }
    const stream = cloudinary.uploader.upload_stream(
      {
        folder:      'avatars',
        public_id:   publicId,
        type:        'authenticated',
        overwrite:   true,
        invalidate:  true,
        transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
      },
      (error, result) => {
        if (error) return reject(error);
        const version = result && result.version ? String(result.version) : undefined;
        resolve({
          url: _deliveryUrl(`avatars/${publicId}`, { authenticated: true, version }),
          marker: avatarMarker(version),
        });
      }
    );
    stream.end(buffer);
  });
}

// Backwards compatible: resolves to the URL only.
function storeAvatar(personId, buffer) {
  return saveAvatar(personId, buffer).then(r => r.url);
}

// ── Signed URL on demand ──────────────────────────────────────────────────────
// Use this to refresh a URL without re-uploading. Pass { legacy: true } for
// photos uploaded before the HMAC change (public id avatars/avatar-<id>).
function getAvatarUrl(personId, { legacy = false, version } = {}) {
  if (legacy) {
    return _deliveryUrl(`avatars/avatar-${personId}`, { authenticated: false });
  }
  return _deliveryUrl(`avatars/${_hmacPublicId(personId)}`, { authenticated: true, version });
}

// ── Delete ────────────────────────────────────────────────────────────────────
// Destroys both the HMAC-keyed asset and the legacy "avatar-N" asset that
// older uploads may have created.  Errors are swallowed (best-effort cleanup).
async function deleteAvatar(personId) {
  const publicId = _hmacPublicId(personId);
  await Promise.allSettled([
    cloudinary.uploader.destroy(`avatars/${publicId}`,    { type: 'authenticated', invalidate: true }),
    cloudinary.uploader.destroy(`avatars/avatar-${personId}`, { invalidate: true }),
  ]);
}

// Replace a stored avatar_url with a URL the phone can load now.
// The column keeps a marker (or an old Cloudinary URL). The image URL is signed
// on each read so a 5-minute download link is never what iOS Image receives.
// A row with no photo stays empty so the app shows initials.
function withFreshAvatar(row, urlKey = 'avatar_url', idKey = 'id') {
  if (!row || !row[urlKey]) return row;
  const id = row[idKey] ?? row.user_id;
  if (id == null) return row;
  const stored = String(row[urlKey]);
  const legacy = stored.includes(`avatar-${id}`) && !stored.includes('/authenticated/');
  try {
    return { ...row, [urlKey]: getAvatarUrl(id, { legacy, version: _versionFromStored(stored) }) };
  } catch {
    return { ...row, [urlKey]: null };
  }
}

module.exports = { receiveAvatar, storeAvatar, saveAvatar, avatarMarker, getAvatarUrl, deleteAvatar, withFreshAvatar };
