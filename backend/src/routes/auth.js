const express = require('express');
const router = express.Router();
const register = require('../controllers/auth/register');
const login = require('../controllers/auth/login');
const verifyToken = require('../middleware/auth');
const me = require('../controllers/auth/me');
const updateProfile = require('../controllers/auth/updateProfile');
const uploadAvatar = require('../controllers/auth/uploadAvatar');
const deleteAccount = require('../controllers/auth/deleteAccount');
const savePushToken = require('../controllers/auth/savePushToken');
const forgotPassword = require('../controllers/auth/forgotPassword');
const resetPassword  = require('../controllers/auth/resetPassword');

router.post('/register', register);
router.post('/login', login);
router.get('/me', verifyToken, me);
router.put('/profile', verifyToken, updateProfile);
router.post('/avatar', verifyToken, uploadAvatar);
router.delete('/account', verifyToken, deleteAccount);
router.put('/push-token', verifyToken, savePushToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password',  resetPassword);


module.exports = router;