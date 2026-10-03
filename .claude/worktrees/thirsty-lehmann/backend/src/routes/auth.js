const express = require('express');
const router = express.Router();
const register = require('../controllers/auth/register');
const login = require('../controllers/auth/login');
const verifyToken = require('../middleware/auth');
const me = require('../controllers/auth/me');
const updateProfile = require('../controllers/auth/updateProfile');
const uploadAvatar = require('../controllers/auth/uploadAvatar');



router.post('/register', register);
router.post('/login',login);
router.get('/me', verifyToken, me);
router.put('/profile', verifyToken, updateProfile);
router.post('/avatar', verifyToken, uploadAvatar);


module.exports = router;