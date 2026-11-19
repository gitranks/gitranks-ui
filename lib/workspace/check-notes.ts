import type { ContributeCheckNote, ContributeCheckVerdict } from './contribute.types';
import { bracketed, clipped } from './needs-you';

/**
 * The pull request's failing checks that call nobody, one line each under its checks, and a run's verdicts on the
 * failing checks, in words. Names, reasons and logins are untrusted plain text, cut to a line. Pure.
 */

/** "run 3: it fails on the base branch too", "run 3", the reason alone, or nothing: what follows a note in brackets. */
function verdictOf({ round, why }: Pick<ContributeCheckNote, 'round' | 'why'>): string {
  const reason = why?.trim() ? bracketed(clipped(why, 200)) : null;
  const parts = [round ? `run ${round}` : null, reason].filter(Boolean);
  return parts.length ? ` (${parts.join(': ')})` : '';
}

/**
 * One failing check that calls nobody, in a line: "Fast checks fails: not from this pull request (run 3: it fails on
 * the base branch too)". A part the API leaves out is dropped; a kind this UI does not know yet names the check alone.
 */
export function checkNoteLineOf(note: ContributeCheckNote): string {
  const name = clipped(note.name, 80);
  const by = note.by?.trim();
  switch (note.kind) {
    case 'NOT_PR':
      return `${name} fails: not from this pull request${verdictOf(note)}`;
    case 'CONTRIBUTOR':
      return `${name}: yours to clear${verdictOf(note)}`;
    case 'BASE':
      return `${name} needs the base branch${verdictOf(note)}`;
    case 'SOMEONE_ELSE':
      return `${name} started failing on a commit by ${by ? clipped(by, 40) : 'someone else'}`;
    case 'SETTLING':
      return `${name}: checks still running`;
    default:
      return `${name}${verdictOf(note)}`;
  }
}

/** The notes to list: none on a list the API does not answer, or leaves null or empty; a note names its check. */
export const checkNotesOf = (notes: readonly ContributeCheckNote[] | null | undefined): ContributeCheckNote[] =>
  Array.isArray(notes) ? notes.filter((note) => !!note?.name?.trim()) : [];

/** Whose a failing check is, as a run judged it, in words. */
export const CHECK_VERDICT_WORDS: Record<ContributeCheckVerdict['whose'], string> = {
  PR: "this pull request's",
  NOT_PR: 'not from this pull request',
  CONTRIBUTOR: 'yours to clear',
  BASE: 'needs the base branch',
};

/** A run's verdict on one failing check: its name, whose it is in words, and the reason; null parts left out. */
export function checkVerdictOf(verdict: ContributeCheckVerdict): { name: string; whose: string | null; why: string } {
  return {
    name: clipped(verdict.name, 80),
    whose: CHECK_VERDICT_WORDS[verdict.whose] ?? null,
    why: verdict.why?.trim() ? clipped(verdict.why, 300) : '',
  };
}

/** The verdicts to list: none on a list the API does not answer, or leaves null or empty; each names its check. */
export const checkVerdictsOf = (
  verdicts: readonly ContributeCheckVerdict[] | null | undefined,
): ContributeCheckVerdict[] => (Array.isArray(verdicts) ? verdicts.filter((verdict) => !!verdict?.name?.trim()) : []);
