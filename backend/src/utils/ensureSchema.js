const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

// Small, idempotent schema changes the code depends on, applied at startup so
// a deploy never runs new code against an old database. Each file is safe to
// run any number of times.
const FILES = ['029_add_user_color.sql', '031_personal_family.sql'];

async function ensureSchema() {
  for (const f of FILES) {
    try {
      const sql = fs.readFileSync(path.join(__dirname, '../config/migrations', f), 'utf8')
        // the GRANT in 029 targets a local role that may not exist on the server
        .replace(/^GRANT .*$/gm, '');
      await pool.query(sql);
      console.log(`ensureSchema: ${f} ok`);
    } catch (err) {
      console.error(`ensureSchema: ${f} failed:`, err.message);
    }
  }
}

module.exports = ensureSchema;
