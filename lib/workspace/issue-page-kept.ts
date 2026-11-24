import { clockOf } from './masked-issue';

/*
 * An issue kept for learners, on the page of one issue: Learn lets the person take it, Contribute does not (always, or
 * for now). It is read in a request of its own, so the page draws what it drew without it when that read fails or the
 * API does not answer it yet.
 */

/** Kept for learners from the viewer now. */
export type IssueKeptForLearners = {
  /** When Contribute lets them take it (ISO); null: never, it is kept for learners for good. */
  until: string | null;
};

/** The answer's `keptForLearners` as the page uses it, or null when it is none or not one it can draw. */
export function issueKeptOf(answer: unknown): IssueKeptForLearners | null {
  if (!answer || typeof answer !== 'object') return null;
  const kept = (answer as Record<string, unknown>).keptForLearners;
  if (!kept || typeof kept !== 'object') return null;
  const { until } = kept as Record<string, unknown>;
  if (until === null || until === undefined) return { until: null };
  return typeof until === 'string' && Number.isFinite(Date.parse(until)) ? { until } : null;
}

/** The line of an issue kept for learners, said in place of the press on Contribute. */
export const KEPT_LINE = 'This issue is kept for learners.';
/** The line of an issue Contribute lets the person take later. */
export const KEPT_FOR_NOW_LINE = 'This issue is kept for learners for now.';

/** "This issue is kept for learners." or, with an end, "This issue is kept for learners for now." */
export const keptLineOf = (kept: IssueKeptForLearners): string => (kept.until ? KEPT_FOR_NOW_LINE : KEPT_LINE);

/** The day of a time in a zone, to tell whether two times fall on the same day there. */
const dayOf = (at: Date, timeZone?: string) =>
  new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone }).format(at);

/**
 * When Contribute lets the person take it: "It opens to Contribute at 14:30." the same day, else "It opens to
 * Contribute on 26 Nov at 09:00.", in the viewer's zone (or the one given). Null once that time is past, or for a time
 * that is not one.
 */
export function keptOpensLineOf(until: string, now: Date, timeZone?: string): string | null {
  const at = Date.parse(until);
  if (!Number.isFinite(at) || at <= now.getTime()) return null;
  const when = new Date(at);
  const clock = clockOf(when, timeZone);
  if (dayOf(when, timeZone) === dayOf(now, timeZone)) return `It opens to Contribute at ${clock}.`;
  const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone }).format(when);
  return `It opens to Contribute on ${day} at ${clock}.`;
}
