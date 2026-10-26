const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const verifyToken = require('../middleware/auth');
const transcribeAndSave = require('../controllers/voice/transcribeAndSave');

// 10 voice notes per user per 15 minutes. Runs before verifyToken, so the
// user is read from a correctly signed token here; anything else counts per IP.
const voiceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: 'draft-6',
  legacyHeaders: false,
  keyGenerator: req => {
    try {
      const { id } = jwt.verify(req.headers.authorization?.split(' ')[1], process.env.JWT_SECRET);
      return `user:${id}`;
    } catch {
      return ipKeyGenerator(req.ip);
    }
  },
  message: { success: false, message: 'Too many voice notes — please try again later' },
});

// POST /api/voice  multipart { audio, tz?, language? } → saves one event
router.post('/', voiceLimiter, verifyToken, ...transcribeAndSave);

module.exports = router;
