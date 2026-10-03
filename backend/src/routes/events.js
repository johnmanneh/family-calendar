const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const createEvent = require("../controllers/events/createEvent");
const getEvents = require("../controllers/events/getEvents");
const getEvent = require("../controllers/events/getEvent");
const updateEvent = require("../controllers/events/updateEvent");
const deleteEvent = require("../controllers/events/deleteEvent");
const addAttendee = require("../controllers/events/eventAttendee/addAttendee");
const removeAttendee = require("../controllers/events/eventAttendee/removeAttendee");
const getAttendees = require("../controllers/events/eventAttendee/getAttendees");
const addTask = require('../controllers/tasks/addTask');
const getTasks = require('../controllers/tasks/getTasks');
const deleteTask = require('../controllers/tasks/deleteTask');
const addSubTask = require('../controllers/tasks/subtasks/addSubTask');
const getSubTasks = require('../controllers/tasks/subtasks/getSubTasks');
const deleteSubTask = require('../controllers/tasks/subtasks/deleteSubTask');
const getMyTasks = require('../controllers/tasks/getMyTasks');
const getPendingEventInvitations = require('../controllers/events/getPendingEventInvitations');
const respondToEventInvitation = require('../controllers/events/respondToEventInvitation');

//Events
router.get("/", verifyToken, getEvents);
router.get('/my-tasks', verifyToken, getMyTasks);
router.get('/invitations', verifyToken, getPendingEventInvitations);
router.put('/invitations/:id', verifyToken, respondToEventInvitation);
router.get("/:id", verifyToken, getEvent);
router.post("/create", verifyToken, createEvent);
router.put("/:id", verifyToken, updateEvent);
router.delete("/:id", verifyToken, deleteEvent);

//Attendee
router.post("/:id/attendees", verifyToken, addAttendee);
router.delete("/:id/attendees/:userId", verifyToken, removeAttendee);
router.get("/:id/attendees", verifyToken, getAttendees);

//Task

router.post('/:id/tasks', verifyToken, addTask);
router.get('/:id/tasks', verifyToken, getTasks);
router.delete('/:id/tasks/:taskId', verifyToken, deleteTask);


//SubTask
router.post('/:id/tasks/:taskId/subtasks', verifyToken, addSubTask);
router.get('/:id/tasks/:taskId/subtasks', verifyToken, getSubTasks);
router.delete('/:id/tasks/:taskId/subtasks/:subTaskId', verifyToken, deleteSubTask);


module.exports = router;
