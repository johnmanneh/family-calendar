const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
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

// 10 attempts per IP per 15 minutes on sensitive auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: 'draft-6',
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later' },
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/forgot-password', authLimiter, forgotPassword);
router.get('/me', verifyToken, me);
router.put('/profile', verifyToken, updateProfile);
router.post('/avatar', verifyToken, uploadAvatar);
router.delete('/account', verifyToken, deleteAccount);
router.put('/push-token', verifyToken, savePushToken);
router.post('/reset-password', authLimiter, resetPassword);


module.exports = router;