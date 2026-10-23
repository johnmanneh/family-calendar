const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const getPublicEvent = require('../controllers/events/getPublicEvent');
const { getPublicPickup, respondToPublicPickup } = require('../controllers/events/publicPickup');
const previewJoin = require('../controllers/join/previewJoin');

const previewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: 'draft-6',
  legacyHeaders: false,
  message: { error: 'Too many invite lookups, please try again later' },
});

// No verifyToken — these endpoints are open to the world
router.get('/join/:token', previewLimiter, previewJoin);
router.get('/events/:token', getPublicEvent);
router.get('/pickups/:token', getPublicPickup);
router.post('/pickups/:token', respondToPublicPickup);

module.exports = router;
