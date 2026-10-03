const { errorResponse } = require("../utils/response/responseHandlers");
const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  // EventSource cannot set headers — accept token via query param as fallback
  const token = req.headers["authorization"]?.split(' ')[1] || req.query.token;

  if (!token) {
    return errorResponse(res, 401, "No token provided, access denied");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    //Without next()
    //If you removed next(), even with a valid token the request would just hang forever and never reach the controller!
    next();
  } catch (error) {
    return errorResponse(res, 401, "Invalid token");
  }
};

module.exports = verifyToken;
