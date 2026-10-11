const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const pool = require('../config/db');

/**
 * Versioned migrations (fault audit F-12).
 *
 * - Files in db/migrations named V###__description.sql run once, in order.
 * - Each file runs in its own transaction and is recorded in schema_migrations
 *   (version, name, checksum) — a failed file rolls back completely and stops
 *   the run, so the database is never left half-changed.
 * - A Postgres advisory lock makes concurrent starts (two instances) safe.
 * - Editing an already-applied file is reported, never re-run silently.
 *
 * Run: automatically at server start (the server refuses to start if a
 * migration fails, so Railway keeps the previous deployment), or by hand with
 * `npm run migrate`. Always back up production before a migration that
 * changes existing data.
 */
const DIR = path.join(__dirname, 'migrations');
const LOCK_KEY = 728311;

async function migrate({ log = console.log } = {}) {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_KEY]);
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version    TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      checksum   TEXT NOT NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`);

    const applied = new Map(
      (await client.query('SELECT version, checksum FROM schema_migrations')).rows.map(r => [r.version, r.checksum])
    );

    const files = fs.readdirSync(DIR).filter(f => /^V\d{3}__.+\.sql$/.test(f)).sort();
    let ran = 0;
    for (const file of files) {
      const version = file.slice(0, 4);
      const sql = fs.readFileSync(path.join(DIR, file), 'utf8');
      const checksum = crypto.createHash('sha256').update(sql).digest('hex');

      if (applied.has(version)) {
        if (applied.get(version) !== checksum) {
          log(`migrate: WARNING ${file} changed after it was applied — not re-running. Add a new migration instead.`);
        }
        continue;
      }

      log(`migrate: applying ${file}`);
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (version, name, checksum) VALUES ($1, $2, $3)',
          [version, file, checksum]
        );
        await client.query('COMMIT');
        ran++;
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw new Error(`Migration ${file} failed and was rolled back: ${err.message}`);
      }
    }
    log(ran ? `migrate: ${ran} migration(s) applied` : 'migrate: database is up to date');
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [LOCK_KEY]).catch(() => {});
    client.release();
  }
}

module.exports = migrate;
