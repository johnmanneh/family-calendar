const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

const updateProfile = async (req, res) => {
  const userId = req.user.id;
  const { first_name, last_name, age, address, occupation } = req.body;

  // Only update fields that were actually sent
  const fields = [];
  const values = [];
  let index = 1;

  if (first_name !== undefined) { fields.push(`first_name = $${index++}`); values.push(first_name); }
  if (last_name  !== undefined) { fields.push(`last_name = $${index++}`);  values.push(last_name); }
  if (age !== undefined)        { fields.push(`age = $${index++}`);        values.push(age); }
  if (address !== undefined)    { fields.push(`address = $${index++}`);    values.push(address); }
  if (occupation !== undefined) { fields.push(`occupation = $${index++}`); values.push(occupation); }

  if (fields.length === 0) {
    return errorResponse(res, 400, 'No fields to update');
  }

  values.push(userId);

  try {
    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${index} RETURNING id, first_name, last_name, email, age, address, occupation`,
      values
    );
    return successResponse(res, 200, 'Profile updated successfully', {
      user: result.rows[0]
    });
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = updateProfile;