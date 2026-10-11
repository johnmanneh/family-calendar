const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const { extract, importEvents } = require('../controllers/scan/scan');

router.post('/', verifyToken, extract);
router.post('/import', verifyToken, importEvents);

module.exports = router;
