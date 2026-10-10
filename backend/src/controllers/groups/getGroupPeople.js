const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

/**
 * GET /api/groups/people — everyone you share a group with who isn't in your
 * family (your family is already listed separately). Used by "Who's
 * attending?" so you can invite e.g. grandma from the Big Family group.
 */
const getGroupPeople = async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.avatar_url, u.color,
              array_agg(DISTINCT g.name ORDER BY g.name) AS group_names
       FROM group_members mine
       JOIN group_members other ON other.group_id = mine.group_id AND other.user_id != $1
       JOIN groups g ON g.id = mine.group_id
       JOIN users u ON u.id = other.user_id
       WHERE mine.user_id = $1
         AND NOT EXISTS (
           SELECT 1 FROM family_members a
           JOIN family_members b ON b.family_id = a.family_id
           WHERE a.user_id = $1 AND b.user_id = u.id
         )
       GROUP BY u.id
       ORDER BY u.first_name`,
      [userId]
    );
    return successResponse(res, 200, 'Group people retrieved', { people: result.rows });
  } catch (error) {
    console.error('getGroupPeople error:', error.message);
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = getGroupPeople;
