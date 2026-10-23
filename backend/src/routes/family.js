const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const verifyToken = require('../middleware/auth');
const createFamily = require('../controllers/family/createFamily');
const joinFamily = require('../controllers/family/joinFamily');
const getInvite = require('../controllers/family/getInvite');
const rotateInvite = require('../controllers/family/rotateInvite');
const leaveFamily = require('../controllers/family/leaveFamily');
const renameFamily = require('../controllers/family/renameFamily');
const { createChild, updateChild, removeChild, uploadChildAvatar } = require('../controllers/family/children');
const { getPermissions, setPermission } = require('../controllers/family/permissions');
const { listPickupPeople, addPickupPerson, updatePickupPerson, removePickupPerson } = require('../controllers/family/pickupPeople');
const getFamily = require('../controllers/family/getFamily');
const getAllFamilies = require('../controllers/family/getAllFamilies');
const setActiveFamily = require('../controllers/family/setActiveFamily');
const setAvailabilitySharing = require('../controllers/family/setAvailabilitySharing');
const updateMemberColor = require('../controllers/family/updateMemberColor');
const updateMemberCircle = require('../controllers/family/updateMemberCircle');
const updateMemberRelationship = require('../controllers/family/updateMemberRelationship');

const getMemberEvents = require('../controllers/family/getMemberEvents');
const getMemberTasks = require('../controllers/family/getMemberTasks');

const joinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: 'draft-6',
  legacyHeaders: false,
  message: { error: 'Too many join attempts, please try again later' },
});

router.post('/create', verifyToken, createFamily);
router.post('/join', joinLimiter, verifyToken, joinFamily);
router.get('/invite', verifyToken, getInvite);
router.post('/invite/rotate', verifyToken, rotateInvite);
router.delete('/leave', verifyToken, leaveFamily);
router.get('/', verifyToken, getFamily);
router.get('/all', verifyToken, getAllFamilies);
router.patch('/active', verifyToken, setActiveFamily);
router.patch('/availability', verifyToken, setAvailabilitySharing);
router.put('/name', verifyToken, renameFamily);
router.post('/children', verifyToken, createChild);
router.put('/children/:id', verifyToken, updateChild);
router.delete('/children/:id', verifyToken, removeChild);
router.post('/children/:id/avatar', verifyToken, uploadChildAvatar);
router.get('/permissions', verifyToken, getPermissions);
router.put('/permissions', verifyToken, setPermission);
router.put('/member/color', verifyToken, updateMemberColor);
router.put('/member/circle', verifyToken, updateMemberCircle);
router.put('/member/relationship', verifyToken, updateMemberRelationship);

router.get('/pickup-people', verifyToken, listPickupPeople);
router.post('/pickup-people', verifyToken, addPickupPerson);
router.patch('/pickup-people/:id', verifyToken, updatePickupPerson);
router.delete('/pickup-people/:id', verifyToken, removePickupPerson);

router.get('/members/:userId/events', verifyToken, getMemberEvents);
router.get('/members/:userId/tasks', verifyToken, getMemberTasks);

module.exports = router;