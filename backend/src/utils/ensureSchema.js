// Superseded by versioned migrations (db/migrate.js). Kept so existing imports keep working.
module.exports = () => require('../db/migrate')();
