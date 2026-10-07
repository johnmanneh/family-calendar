const express = require('express');
const router  = express.Router();
const verifyToken = require('../middleware/auth');
const getNotifications     = require('../controllers/notifications/getNotifications');
const { markAllRead, markOneRead } = require('../controllers/notifications/markRead');

router.get('/',              verifyToken, getNotifications);
router.patch('/read-all',    verifyToken, markAllRead);
router.patch('/:id/read',    verifyToken, markOneRead);

module.exports = router;
