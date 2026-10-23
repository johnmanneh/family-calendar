const rateLimit = require('express-rate-limit');
const { issueTicket } = require('../../utils/sseTickets');
const { successResponse } = require('../../utils/response/responseHandlers');

// 10 ticket requests per IP per minute — prevents ticket-farming DoS
const ticketLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many ticket requests, please try again shortly' },
});

const issueTicketHandler = (req, res) => {
  const ticket = issueTicket(req.user.id);
  return successResponse(res, 200, 'Ticket issued', { ticket });
};

module.exports = { issueTicketHandler, ticketLimiter };
