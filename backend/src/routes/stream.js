const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const streamConnect = require('../controllers/stream/streamConnect');

router.get('/', verifyToken, streamConnect);

module.exports = router;
