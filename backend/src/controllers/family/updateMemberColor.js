const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');
const { recolorEvents, currentColors } = require('../../utils/recolorEvents');

const updateMemberColor = async (req, res) => {
  const userId = req.user.id;
  const { color } = req.body;

  if (!color) {
    return errorResponse(res, 400, 'Color is required');
  }

  try {
    const before = await currentColors(userId);
    const result = await pool.query(
      `UPDATE family_members SET color = $1 
       WHERE user_id = $2 
       RETURNING *`,
      [color, userId]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 404, 'Family member not found');
    }

    await recolorEvents(userId, before, color);   // my events follow my new colour

    return successResponse(res, 200, 'Color updated successfully', {
      member: result.rows[0]
    });
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = updateMemberColor;