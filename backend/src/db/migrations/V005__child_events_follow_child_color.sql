-- Child profiles start with the default orange (#f48c06). Events on a child's
-- calendar that still use that default follow the child's current colour
-- (e.g. after the colour was changed before events followed automatically).
UPDATE events e
SET color = COALESCE(fm.color, u.color)
FROM users u, family_members fm
WHERE fm.user_id = u.id
  AND fm.family_id = e.family_id
  AND u.id = e.owner_id
  AND u.is_managed
  AND lower(e.color) = '#f48c06'
  AND COALESCE(fm.color, u.color) ~ '^#[0-9a-fA-F]{6}$'
  AND lower(COALESCE(fm.color, u.color)) <> '#f48c06';
