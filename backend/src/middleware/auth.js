const { errorResponse } = require("../utils/response/responseHandlers");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const verifyToken = (req, res, next) => {
  // EventSource cannot set headers — accept token via query param as fallback
  const token = req.headers["authorization"]?.split(' ')[1] || req.query.token;

  if (!token) {
    return errorResponse(res, 401, "No token provided, access denied");
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return errorResponse(res, 401, "Invalid token");
  }

  // A token stays cryptographically valid for 7 days, even after the account is
  // deleted. Check the user still exists so a deleted account is locked out at once.
  pool.query('SELECT 1 FROM users WHERE id = $1', [decoded.id])
    .then(result => {
      if (result.rows.length === 0) {
        return errorResponse(res, 401, "Account no longer exists");
      }
      req.user = decoded;
      //Without next()
      //If you removed next(), even with a valid token the request would just hang forever and never reach the controller!
      next();
    })
    .catch(() => errorResponse(res, 500, "Server error"));
};

module.exports = verifyToken;
