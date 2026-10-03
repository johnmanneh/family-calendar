const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const createGroup = require('../controllers/groups/createGroup');
const joinGroup = require('../controllers/groups/joinGroup');
const getMyGroups = require('../controllers/groups/getMyGroups');
const getGroupEvents = require('../controllers/groups/getGroupEvents');
const shareEventToGroup = require('../controllers/groups/shareEventToGroup');
const unshareEventFromGroup = require('../controllers/groups/unshareEventFromGroup');
const getPendingInvitations = require('../controllers/groups/getPendingInvitations');
const respondToInvitation = require('../controllers/groups/respondToInvitation');
const deleteGroup = require('../controllers/groups/deleteGroup');

router.post('/create', verifyToken, createGroup);
router.post('/join', verifyToken, joinGroup);
router.get('/', verifyToken, getMyGroups);
router.get('/invitations', verifyToken, getPendingInvitations);
router.put('/invitations/:id', verifyToken, respondToInvitation);
router.delete('/:id', verifyToken, deleteGroup);
router.get('/:id/events', verifyToken, getGroupEvents);
router.post('/events/:id/share', verifyToken, shareEventToGroup);
router.delete('/events/:id/share/:groupId', verifyToken, unshareEventFromGroup);

module.exports = router;
