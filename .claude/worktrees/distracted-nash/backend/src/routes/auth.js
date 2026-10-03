const express = require('express');
const router = express.Router();
const register = require('../controllers/auth/register');
const login = require('../controllers/auth/login');
const verifyToken = require('../middleware/auth');
const me = require('../controllers/auth/me');
const updateProfile = require('../controllers/auth/updateProfile');



router.post('/register', register);
router.post('/login',login);
router.get('/me', verifyToken, me);
router.put('/profile', verifyToken, updateProfile);


module.exports = router;