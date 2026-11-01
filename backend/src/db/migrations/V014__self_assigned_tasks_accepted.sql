-- Tasks you gave yourself never needed accepting. Fix the ones already stuck on "pending".
UPDATE tasks SET status = 'accepted'
WHERE status = 'pending' AND assigned_to IS NOT NULL AND assigned_to = created_by;
