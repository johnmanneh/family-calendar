const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');


const createFamily = async (req, res) => {
  const { name } = req.body;
  const userId = req.user.id;

  if (!name) {
    return errorResponse(res, 400, 'Family name is required');
  }

  try {
    // Generate a random invite code
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Create the family
    const newFamily = await pool.query(
      `INSERT INTO families (name, invite_code, created_by) 
       VALUES ($1, $2, $3) 
       RETURNING id, name, invite_code`,
      [name, inviteCode, userId]
    );

    // Add creator as admin member
    await pool.query(
      `INSERT INTO family_members (family_id, user_id, role) 
       VALUES ($1, $2, $3)`,
      [newFamily.rows[0].id, userId, 'admin']
    );

    return successResponse(res, 201, 'Family created successfully', {
      family: newFamily.rows[0],
    });

  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = createFamily;