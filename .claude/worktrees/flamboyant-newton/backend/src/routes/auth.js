const express = require('express');
const router = express.Router();
const register = require('../controllers/auth/register');
const login = require('../controllers/auth/login');
const verifyToken = require('../middleware/auth');
const me = require('../controllers/auth/me');
const updateProfile = require('../controllers/auth/updateProfile');
const uploadAvatar = require('../controllers/auth/uploadAvatar');
const deleteAccount = require('../controllers/auth/deleteAccount');

router.post('/register', register);
router.post('/login', login);
router.get('/me', verifyToken, me);
router.put('/profile', verifyToken, updateProfile);
router.post('/avatar', verifyToken, uploadAvatar);
router.delete('/account', verifyToken, deleteAccount);


module.exports = router;