/**
 * dateLocale.js
 *
 * Pass `undefined` as the locale to all Intl / toLocale* calls so the
 * device's own locale is used automatically. This file provides thin
 * wrappers so every screen gets consistent formatting without hardcoding
 * a locale string like 'en-GB' or 'en-US'.
 */

/**
 * Format a date string or Date object as a localised date.
 * @param {string|Date} date
 * @param {Intl.DateTimeFormatOptions} [options]
 */
export function formatDate(date, options = { year: 'numeric', month: 'long', day: 'numeric' }) {
  return new Date(date).toLocaleDateString(undefined, options);
}

/**
 * Format a date string or Date object as a localised time.
 * @param {string|Date} date
 * @param {Intl.DateTimeFormatOptions} [options]
 */
export function formatTime(date, options = { hour: 'numeric', minute: '2-digit' }) {
  return new Date(date).toLocaleTimeString(undefined, options);
}

/**
 * Format a date string or Date object as both localised date and time.
 * @param {string|Date} date
 * @param {Intl.DateTimeFormatOptions} [options]
 */
export function formatDateTime(date, options = {
  year: 'numeric', month: 'short', day: 'numeric',
  hour: 'numeric', minute: '2-digit',
}) {
  return new Date(date).toLocaleString(undefined, options);
}
