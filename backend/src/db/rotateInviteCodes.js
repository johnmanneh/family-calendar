#!/usr/bin/env node
/**
 * rotateInviteCodes — standalone admin script
 *
 * Generates a fresh crypto-random invite code for every family.
 * Must NEVER be imported by app.js — run from a maintenance window only.
 *
 * Usage:
 *   CONFIRM_ROTATE_INVITES=1 DATABASE_URL=postgres://... node src/db/rotateInviteCodes.js
 */

'use strict';

if (process.env.CONFIRM_ROTATE_INVITES !== '1') {
  console.error(
    'Safety check failed.\n' +
    'Set CONFIRM_ROTATE_INVITES=1 to proceed.\n' +
    'Example: CONFIRM_ROTATE_INVITES=1 node src/db/rotateInviteCodes.js'
  );
  process.exit(1);
}

const { Pool } = require('pg');
const { generateLongCode, generateShortCode, storedShortCode } = require('../utils/inviteCodes');

let connectionString = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;
if (/railway\.internal/.test(connectionString || '') && process.env.DATABASE_PUBLIC_URL) {
  connectionString = process.env.DATABASE_PUBLIC_URL;
}
const local = /localhost|127\.0\.0\.1/.test(connectionString || '');
const pool = new Pool({
  connectionString,
  ssl: local ? false : { rejectUnauthorized: false },
});

async function main() {
  const { rows } = await pool.query('SELECT id FROM families');

  if (rows.length === 0) {
    console.log('No families found — nothing to rotate.');
    await pool.end();
    return;
  }

  let count = 0;
  for (const { id } of rows) {
    const code = generateLongCode();
    const short = storedShortCode(generateShortCode());
    await pool.query(
      'UPDATE families SET invite_code = $1, short_invite_code = $2 WHERE id = $3',
      [code, short, id]
    );
    count++;
  }

  const groups = await pool.query('SELECT id FROM groups');
  let gcount = 0;
  for (const { id } of groups.rows) {
    const code = generateLongCode();
    await pool.query('UPDATE groups SET invite_code = $1 WHERE id = $2', [code, id]);
    gcount++;
  }

  console.log(`Rotated invite codes for ${count} family(ies) and ${gcount} group(s).`);
  await pool.end();
}

main().catch(err => {
  console.error('rotateInviteCodes error:', err.message);
  process.exit(1);
});
