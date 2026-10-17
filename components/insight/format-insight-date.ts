// Post dates render in one fixed zone wherever they render (server or browser), so a list never
// mixes zones and the server HTML matches what the browser hydrates.
const day = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const dayWithYear = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});
const dateTime = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'UTC',
});

/** `Oct 16` */
export const formatPostDay = (date: Date) => day.format(date);

/** `Oct 16, 2026` */
export const formatPostDate = (date: Date) => dayWithYear.format(date);

// Newer Intl data puts a narrow no-break space before AM/PM; plain spaces keep the text the
// same on every runtime.
const plainSpaces = (text: string) => text.replace(/[\u00a0\u202f]/g, ' ');

/** `Oct 16, 12:00 PM UTC` */
export const formatPostDateTime = (date: Date) => `${plainSpaces(dateTime.format(date))} UTC`;
