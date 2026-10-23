const { Pool } = require('pg');
require('dotenv').config();

// Prefer the Railway private DATABASE_URL over the public TCP proxy URL.
// DATABASE_PUBLIC_URL is only needed for off-Railway access (local dev, CI).
// Neither URL is logged here or anywhere in this file.
const connectionString = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;

// Determine whether we need SSL.  Railway private/public hosts both serve
// TLS; localhost / 127.0.0.1 typically does not.
function sslConfig(cs) {
  if (!cs) return false;
  try {
    const url = new URL(cs);
    const host = url.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
      return false;
    }
  } catch { /* malformed URL — keep SSL on as the safer default */ }
  return { rejectUnauthorized: true };
}

const pool = new Pool({
  connectionString,
  ssl: sslConfig(connectionString),
});

pool.connect((err, client) => {
  if (err) {
    // Log a redacted message — do NOT log err.stack which may contain credentials
    console.error('Database connection failed:', err.message);
  } else {
    client.release();
    console.log('Database connected successfully');
  }
});

module.exports = pool;
