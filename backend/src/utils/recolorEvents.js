const pool = require('../config/db');
const { broadcast } = require('./sseClients');

const HEX = /^#[0-9a-fA-F]{6}$/;

/**
 * A person's colour changed → their events follow.
 * Only events on their calendar that still use one of the OLD colours are
 * recoloured, so an event someone deliberately gave its own colour keeps it.
 * Afterwards the families they're in get a refresh ping.
 */
async function recolorEvents(personId, oldColors, newColor) {
  if (!HEX.test(newColor || '')) return 0;
  const olds = [...new Set((oldColors || []).filter(c => HEX.test(c || '')).map(c => c.toLowerCase()))]
    .filter(c => c !== newColor.toLowerCase());
  if (!olds.length) return 0;
  const r = await pool.query(
    `UPDATE events SET color = $1
     WHERE COALESCE(owner_id, created_by) = $2 AND lower(color) = ANY($3::text[])`,
    [newColor, personId, olds]
  );
  if (r.rowCount) {
    const fams = await pool.query('SELECT family_id FROM family_members WHERE user_id = $1', [personId]);
    fams.rows.forEach(f => broadcast(f.family_id, 'event_update', {}));
  }
  return r.rowCount;
}

// Current colours of a person (profile colour + family colour), before a change
async function currentColors(personId) {
  const r = await pool.query(
    `SELECT u.color AS user_color, fm.color AS family_color
     FROM users u LEFT JOIN family_members fm ON fm.user_id = u.id WHERE u.id = $1`,
    [personId]
  );
  return r.rows.flatMap(x => [x.user_color, x.family_color]);
}

module.exports = { recolorEvents, currentColors };
