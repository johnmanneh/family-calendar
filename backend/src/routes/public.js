const express = require('express');
const router = express.Router();
const getPublicEvent = require('../controllers/events/getPublicEvent');

// No verifyToken — these endpoints are open to the world
router.get('/events/:token', getPublicEvent);

module.exports = router;
