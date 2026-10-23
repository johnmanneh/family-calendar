const { errorResponse } = require("../utils/response/responseHandlers");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

// verifyToken — Security pass-1 hardening
//
// • Header Authorization only: req.query.token is NO LONGER accepted.
//   SSE connections must use the short-lived ticket system
//   (POST /api/stream/ticket → GET /api/stream?ticket=).
//
// • token_version check: on every successful password reset the user's
//   token_version is incremented (migration V011).  JWTs embed the version
//   at issue time; any token whose version is lower than the stored value is
//   rejected so that old sessions are invalidated instantly.
//   Tokens that pre-date V011 (no token_version claim) are treated as version 0.

const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(' ')[1];

  if (!token) {
    return errorResponse(res, 401, "No token provided, access denied");
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return errorResponse(res, 401, "Invalid token");
  }

  pool.query('SELECT token_version FROM users WHERE id = $1', [decoded.id])
    .then(result => {
      if (result.rows.length === 0) {
        return errorResponse(res, 401, "Account no longer exists");
      }

      const dbVersion    = result.rows[0].token_version ?? 0;
      const tokenVersion = decoded.token_version       ?? 0;

      if (tokenVersion < dbVersion) {
        return errorResponse(res, 401, "Session expired, please log in again");
      }

      req.user = decoded;
      next();
    })
    .catch(() => errorResponse(res, 500, "Server error"));
};

module.exports = verifyToken;
