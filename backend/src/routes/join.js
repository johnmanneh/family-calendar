const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const joinByCode = require('../controllers/join/joinByCode');

// POST /api/join  { code }  → joins a family or a group, whichever the code belongs to
router.post('/', verifyToken, joinByCode);

module.exports = router;
