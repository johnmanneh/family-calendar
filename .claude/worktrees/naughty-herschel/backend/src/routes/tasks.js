const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const createStandaloneTask = require('../controllers/tasks/createStandaloneTask');

router.post('/standalone', verifyToken, createStandaloneTask);

module.exports = router;