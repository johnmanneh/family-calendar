// One definition of "is this person part of this event" for every Home filter.
// getEvents returns attendees as { id, first_name, last_name, color } — there is
// no user_id — while other payloads carry user_id, so both keys are accepted.
export function eventInvolvesPerson(event, personId) {
  if (personId == null || !event) return false;
  const id = Number(personId);
  if (Number.isNaN(id)) return false;
  if (event.owner_id != null && Number(event.owner_id) === id) return true;
  if (event.created_by != null && Number(event.created_by) === id) return true;
  return (event.attendees || []).some((a) => {
    const attendeeId = a?.user_id ?? a?.id;
    return attendeeId != null && Number(attendeeId) === id;
  });
}
