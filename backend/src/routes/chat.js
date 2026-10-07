const express    = require('express');
const router     = express.Router();
const verifyToken  = require('../middleware/auth');
const getMessages  = require('../controllers/chat/getMessages');
const sendMessage  = require('../controllers/chat/sendMessage');

router.get('/',  verifyToken, getMessages);
router.post('/', verifyToken, sendMessage);

module.exports = router;
