-- 028: One family per person — clean up users who ended up in two families.
--
-- Before this fix, joining a family left the user's sign-up family ("<Name>'s Family")
-- in place, so they belonged to two. For every such user, their SOLO family
-- (only them in it) is merged into their largest other family:
--   events + groups move over, solo chat messages are dropped, the solo family is removed.
--
-- Users in two families that BOTH have other people are left untouched (reported below).
-- Safe to run more than once. Take a database backup first.

DO $$
DECLARE
  r       RECORD;
  target  INTEGER;
  merged  INTEGER := 0;
BEGIN
  FOR r IN
    SELECT fm.user_id, fm.family_id
    FROM family_members fm
    WHERE (SELECT COUNT(*) FROM family_members x WHERE x.family_id = fm.family_id) = 1
      AND (SELECT COUNT(*) FROM family_members y WHERE y.user_id   = fm.user_id)   > 1
  LOOP
    SELECT fm2.family_id INTO target
    FROM family_members fm2
    WHERE fm2.user_id = r.user_id AND fm2.family_id <> r.family_id
    ORDER BY (SELECT COUNT(*) FROM family_members z WHERE z.family_id = fm2.family_id) DESC,
             fm2.family_id
    LIMIT 1;

    IF target IS NULL THEN
      CONTINUE;
    END IF;

    UPDATE events SET family_id = target WHERE family_id = r.family_id;
    UPDATE groups SET family_id = target WHERE family_id = r.family_id;
    DELETE FROM messages       WHERE family_id = r.family_id;
    DELETE FROM family_members WHERE family_id = r.family_id;
    DELETE FROM families       WHERE id        = r.family_id;
    merged := merged + 1;
  END LOOP;

  RAISE NOTICE 'Merged % solo families', merged;
END $$;

-- Anyone still in more than one family (needs a manual decision):
SELECT u.id AS user_id, u.email, COUNT(*) AS families
FROM family_members fm JOIN users u ON u.id = fm.user_id
GROUP BY u.id, u.email
HAVING COUNT(*) > 1;
