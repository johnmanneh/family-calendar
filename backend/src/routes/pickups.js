const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const { respondToPickup } = require('../controllers/events/respondToPickup');

// In-app pickup person responses — auth required
router.post('/:id/respond', verifyToken, respondToPickup);

module.exports = router;
