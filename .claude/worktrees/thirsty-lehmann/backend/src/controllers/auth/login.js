const pool = require('../../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validateLogin = require('../../utils/validation/loginValidation');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

const login = async (req, res) => {
  const { email, password } = req.body;

    // Validate input
    const { isValid, message } = validateLogin(req.body);
    if (!isValid) {
      return errorResponse(res, 400, message);
    }

  try {
    // Check if user exists
    const user = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    //    
    if (user.rows.length === 0) {
      return errorResponse(res, 400, 'Invalid credentials');
    }
    //
    // Check password
    const isMatch = await bcrypt.compare(password, user.rows[0].password);
    //
    if (!isMatch) {
      return errorResponse(res, 400, 'Invalid credentials');
    }
    // Generate JWT token
    const token = jwt.sign(
    { id: user.rows[0].id },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
    );
    //
    // Send response
    return successResponse(res, 200, 'Login successful', {
    token,
    user: {
      id: user.rows[0].id,
      first_name: user.rows[0].first_name,
      last_name: user.rows[0].last_name,
      email: user.rows[0].email,
     },
    });

  } catch (error) {
    return errorResponse(res, 500, 'Login Server error');
  }
};

module.exports = login;