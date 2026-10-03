const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const createStandaloneTask = require('../controllers/tasks/createStandaloneTask');
const completeTask = require('../controllers/tasks/completeTask');

router.post('/standalone', verifyToken, createStandaloneTask);
router.patch('/:taskId/complete', verifyToken, completeTask);

module.exports = router;