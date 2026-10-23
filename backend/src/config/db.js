const { Pool } = require('pg');
require('dotenv').config();
const { sslConfig } = require('./dbSsl');

// Prefer the Railway private DATABASE_URL over the public TCP proxy URL.
// Neither URL is logged here or anywhere in this file.
const connectionString = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;

const pool = new Pool({
  connectionString,
  ssl: sslConfig(connectionString),
});

pool.connect((err, client) => {
  if (err) {
    console.error('Database connection failed:', err.message);
  } else {
    client.release();
    console.log('Database connected successfully');
  }
});

module.exports = pool;
