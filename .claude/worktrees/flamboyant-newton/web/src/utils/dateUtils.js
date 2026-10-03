
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

// Formats: "2026-05-13T22:42" → "2026-05-13T22:42:00"
export const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  return dateStr.length === 16 ? dateStr + ':00' : dateStr;
};

// Formats: "2026-05-13" for date inputs
export const formatDateInput = (date) =>
  new Date(date).toISOString().split('T')[0];