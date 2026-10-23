const express    = require('express');
const router     = express.Router();
const verifyToken = require('../middleware/auth');
const streamConnect = require('../controllers/stream/streamConnect');
const { issueTicketHandler, ticketLimiter } = require('../controllers/stream/issueTicket');

// POST /api/stream/ticket
// Authenticated endpoint (header JWT).  Returns a 60-second single-use opaque
// ticket that the client passes as ?ticket= to the SSE endpoint below.
// This avoids putting the long-lived session JWT in the URL / server logs.
router.post('/ticket', ticketLimiter, verifyToken, issueTicketHandler);

// GET /api/stream?ticket=<opaque-ticket>
// Does NOT use verifyToken — the ticket is the credential here.
// streamConnect validates and consumes the ticket internally.
router.get('/', streamConnect);

module.exports = router;
