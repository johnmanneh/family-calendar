-- Scanned events used a fixed scan colour (pink, later green). They now take the
-- colour of the calendar they belong to (e.g. the child's colour). Recolour the
-- ones already saved. These hex values are only ever used by the scan import.
UPDATE events e
SET color = COALESCE(fm.color, u.color)
FROM users u
LEFT JOIN family_members fm ON fm.user_id = u.id
WHERE u.id = COALESCE(e.owner_id, e.created_by)
  AND (fm.family_id IS NULL OR fm.family_id = e.family_id)
  AND lower(e.color) IN ('#e8618c', '#66bb55', '#166534')
  AND COALESCE(fm.color, u.color) ~ '^#[0-9a-fA-F]{6}$';
