const pool = require('../../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validateRegister = require('../../utils/validation/registerValidation');
const {errorResponse,successResponse} = require('../../utils/response/responseHandlers');

const register = async (req, res) => {
  const { first_name, last_name, age, address, occupation, email, password } = req.body;

  try {

    // Validate user input
    const {isValid, message} = validateRegister(req.body);
    if (!isValid) {
      return errorResponse(res, 400, message);
    }
    // 
    // Check if user already exists
    const userExists = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (userExists.rows.length > 0) {
      return errorResponse(res, 400, 'User already exists');
    }
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Save user to database
    const newUser = await pool.query(
      `INSERT INTO users (first_name, last_name, age, address, occupation, email, password) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, first_name, last_name, email`,
      [first_name, last_name, age, address, occupation, email, hashedPassword]
    );

    
    const token = jwt.sign(
    { id: newUser.rows[0].id },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
    );
  
    // Send response
    return successResponse(res, 201, 'User registered successfully', {
      token,
      user: newUser.rows[0],
    });

  } catch (error) {
    console.error('Register error:', error);
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = register;