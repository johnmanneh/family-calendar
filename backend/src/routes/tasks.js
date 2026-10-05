const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const createStandaloneTask = require('../controllers/tasks/createStandaloneTask');
const completeTask = require('../controllers/tasks/completeTask');
const getPendingTasks = require('../controllers/tasks/getPendingTasks');
const respondToTask = require('../controllers/tasks/respondToTask');
const getTaskNotifications = require('../controllers/tasks/getTaskNotifications');
const acknowledgeTaskResponse = require('../controllers/tasks/acknowledgeTaskResponse');
const getAssigneeNotifications = require('../controllers/tasks/getAssigneeNotifications');
const acknowledgeAssigneeNotification = require('../controllers/tasks/acknowledgeAssigneeNotification');
const updateTaskDueDate = require('../controllers/tasks/updateTaskDueDate');
const getFamilyTasks = require('../controllers/tasks/getFamilyTasks');
const deleteTask = require('../controllers/tasks/deleteTask');

router.post('/standalone', verifyToken, createStandaloneTask);
router.get('/family', verifyToken, getFamilyTasks);
router.get('/pending', verifyToken, getPendingTasks);
router.get('/notifications', verifyToken, getTaskNotifications);
router.get('/assignee-notifications', verifyToken, getAssigneeNotifications);
router.patch('/:taskId/complete', verifyToken, completeTask);
router.delete('/:taskId', verifyToken, deleteTask);
router.patch('/:taskId/respond', verifyToken, respondToTask);
router.patch('/:taskId/acknowledge', verifyToken, acknowledgeTaskResponse);
router.patch('/:taskId/assignee-acknowledge', verifyToken, acknowledgeAssigneeNotification);
router.patch('/:taskId/due-date', verifyToken, updateTaskDueDate);

module.exports = router;