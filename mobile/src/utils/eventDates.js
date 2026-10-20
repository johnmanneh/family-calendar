/** Timed timestamps use the device timezone; date-only/all-day values are civil dates. */
export function onSameDay(value, day, isAllDay = false) {
  if (!value) return false;
  if (typeof value === 'string' && (isAllDay || /^\d{4}-\d{2}-\d{2}$/.test(value))) {
    const [year, month, date] = value.slice(0, 10).split('-').map(Number);
    return year === day.getFullYear() && month - 1 === day.getMonth() && date === day.getDate();
  }
  const date = new Date(value);
  return date.getFullYear() === day.getFullYear() && date.getMonth() === day.getMonth() && date.getDate() === day.getDate();
}
