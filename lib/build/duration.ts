/*
 * How long a project takes, in words. One rule for every place that says it: the cards, the project's page and the
 * first step's plan.
 */

const HOUR_WORDS = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

/**
 * How long a project takes, as a person reads it: to the nearest half hour, "about half an hour", "about an hour and a
 * half", "about two hours"; under a quarter of an hour, in minutes to the nearest five. Nothing for no time.
 */
export function durationWordsOf(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '';
  const halves = Math.round(minutes / 30);
  if (halves === 0) return `about ${Math.max(5, Math.round(minutes / 5) * 5)} minutes`;
  if (halves === 1) return 'about half an hour';
  if (halves === 2) return 'about an hour';
  if (halves === 3) return 'about an hour and a half';
  const hours = Math.floor(halves / 2);
  const word = HOUR_WORDS[hours] || hours.toLocaleString('en-US');
  return `about ${word}${halves % 2 ? ' and a half' : ''} hours`;
}
