const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const createFamily = require('../controllers/family/createFamily');
const joinFamily = require('../controllers/family/joinFamily');
const getFamily = require('../controllers/family/getFamily');
const updateMemberColor = require('../controllers/family/updateMemberColor');
const updateMemberCircle = require('../controllers/family/updateMemberCircle');

const getMemberEvents = require('../controllers/family/getMemberEvents');
const getMemberTasks = require('../controllers/family/getMemberTasks');

router.post('/create', verifyToken, createFamily);
router.post('/join', verifyToken, joinFamily);
router.get('/', verifyToken, getFamily);
router.put('/member/color', verifyToken, updateMemberColor);
router.put('/member/circle', verifyToken, updateMemberCircle);

router.get('/members/:userId/events', verifyToken, getMemberEvents);
router.get('/members/:userId/tasks', verifyToken, getMemberTasks);

module.exports = router;