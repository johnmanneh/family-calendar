const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

const savePushToken = async (req, res) => {
  const userId = req.user.id;
  const { push_token, previous_push_token } = req.body;

  if (push_token !== null && (typeof push_token !== 'string' || !push_token.trim())) {
    return errorResponse(res, 400, 'push_token is required');
  }

  let client;
  try {
    if (push_token === null) {
      if (previous_push_token !== undefined) {
        await pool.query('UPDATE users SET push_token = $1 WHERE id = $2 AND push_token = $3', [null, userId, previous_push_token]);
      } else {
        await pool.query('UPDATE users SET push_token = $1 WHERE id = $2', [null, userId]);
      }
    } else {
      client = await pool.connect();
      await client.query('BEGIN');
      // Serialize claims of the same device. The UPDATE is a separate statement
      // so its READ COMMITTED snapshot includes the preceding claimant's commit.
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [push_token]);
      await client.query(
        `UPDATE users SET push_token = CASE WHEN id = $2 THEN $1 ELSE NULL END
         WHERE id = $2 OR push_token = $1`,
        [push_token, userId]
      );
      await client.query('COMMIT');
    }
    return successResponse(res, 200, 'Push token saved');
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    return errorResponse(res, 500, 'Server error');
  } finally {
    if (client) client.release();
  }
};

module.exports = savePushToken;
