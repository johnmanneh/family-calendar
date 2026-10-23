const express    = require('express');
const router     = express.Router();
const rateLimit  = require('express-rate-limit');
const verifyToken = require('../middleware/auth');
const joinByCode  = require('../controllers/join/joinByCode');

// 20 join attempts per IP per 15 minutes — prevents code-scanning attacks
const joinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: 'draft-6',
  legacyHeaders: false,
  message: { error: 'Too many join attempts, please try again later' },
});

// POST /api/join  { code }  → joins a family or a group, whichever the code belongs to
router.post('/', joinLimiter, verifyToken, joinByCode);

module.exports = router;
