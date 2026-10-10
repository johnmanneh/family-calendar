
// Formats: "Monday, 5 Mar"
export const formatDate = (date) =>
  date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });

// Formats: "18:00"
export const formatTime = (date) =>
  date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

// What the user picked in a datetime-local input ("2026-05-13T22:42", their
// own clock) → an exact moment in UTC ("2026-05-13T20:42:00.000Z").
// The server stores UTC, so everyone sees it at the right time in their zone.
// Date-only values ("2026-05-13", all-day) are passed through unchanged.
export const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  if (dateStr.length === 10) return dateStr;
  const d = new Date(dateStr); // no offset in the string → read as local time
  return isNaN(d) ? dateStr : d.toISOString();
};

// Formats: "2026-05-13" for date inputs
export const formatDateInput = (date) =>
  new Date(date).toISOString().split('T')[0];