const express = require('express');
const router = express.Router();
const getPublicEvent = require('../controllers/events/getPublicEvent');
const { getPublicPickup, respondToPublicPickup } = require('../controllers/events/publicPickup');

// No verifyToken — these endpoints are open to the world
router.get('/events/:token', getPublicEvent);
router.get('/pickups/:token', getPublicPickup);
router.post('/pickups/:token', respondToPublicPickup);

module.exports = router;
