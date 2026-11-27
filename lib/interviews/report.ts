/* "This is wrong": the note a person sends with it, and the words of its short form. */

/** The longest note the API keeps. */
export const REPORT_NOTE_MAX_LENGTH = 500;

/** A note as it is sent: trimmed, not empty and no longer than the API keeps; null otherwise. */
export function reportNoteOf(note: unknown): string | null {
  if (typeof note !== 'string') return null;
  const trimmed = note.trim();
  return trimmed.length >= 1 && trimmed.length <= REPORT_NOTE_MAX_LENGTH ? trimmed : null;
}

/** The short form's words, in each of its states. */
export const REPORT_WORDS = {
  /** Under the buttons while the person writes. */
  hint: 'We read every report before the next check. A link to a source helps.',
  /** In place of the form once the report is taken. */
  sent: 'Thank you. We read every report before the next check.',
  /** For a visitor: a report needs a sign-in. */
  signIn: 'Sign in with GitHub to tell us what is wrong.',
  /** Past the day's limit. */
  limited: 'You sent as many reports today as one day takes. You can send more tomorrow.',
  /** Anything else. */
  failed: 'It was not sent. Try again in a moment.',
} as const;
