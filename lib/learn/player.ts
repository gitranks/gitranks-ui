/**
 * The player: one engine for the places that ask (a lesson, the review, the check). What it shows, in which order,
 * and what its strip says. Pure, so the pages, the specs and the catalogue read the same rules.
 */

/** How a question went: right, wrong (or forgotten), or answered where no verdict shows (the check). */
export type PlayerResult = 'right' | 'wrong' | 'answered';

/** A square of the strip: one for each question, as the review's and the check's boards draw them. */
export type PlayerSquare = PlayerResult | 'current' | 'waiting';

/** Where a run of questions stands: the one asked now (from 0), how many there are, and how each answered one went. */
export type PlayerRun = { at: number; count: number; results: readonly PlayerResult[] };

/**
 * Where a run starts: at its first question, or where a saved one stood. The results are cut to the run's length, and
 * the current question is the one after the last answered (or the last answered one, not yet gone on from), so the
 * run can always go on.
 */
export function runStartOf(count: number, start?: { at: number; results: readonly PlayerResult[] }): PlayerRun {
  const results = (start?.results ?? []).slice(0, Math.max(0, count));
  const at = Number.isInteger(start?.at) ? (start?.at as number) : results.length;
  return { at: Math.min(Math.max(at, Math.max(0, results.length - 1)), results.length), count, results };
}

/** One square per question: each answered one by how it went, the current one, then those still to come. */
export function squaresOf({ at, count, results }: PlayerRun): PlayerSquare[] {
  return Array.from({ length: count }, (_, index) => {
    if (index < results.length) return results[index];
    return index === at ? 'current' : 'waiting';
  });
}

/** Whether every question of the run is answered. */
export const isRunOver = ({ count, results }: PlayerRun) => count > 0 && results.length >= count;

/** The run after an answer to the current question: recorded once, never twice for the same one. */
export function recordedOf(run: PlayerRun, result: PlayerResult): PlayerRun {
  if (run.results.length !== run.at || run.at >= run.count) return run;
  return { ...run, results: [...run.results, result] };
}

/** The run once the person goes on: the next question, or past the last (the end). Only after the current is answered. */
export function nextOf(run: PlayerRun): PlayerRun {
  if (run.results.length <= run.at) return run;
  return { ...run, at: Math.min(run.at + 1, run.count) };
}

/** The strip's words for where the run stands: "Lesson 3 of 6", "Question 4 of 9", "6 of 6 repeated". */
export function runWordsOf(
  noun: 'Lesson' | 'Question',
  run: PlayerRun,
): { lead: string; number: number; tail: string } {
  if (isRunOver(run) && run.at >= run.count) {
    return {
      lead: '',
      number: run.count,
      tail: noun === 'Lesson' ? ` of ${run.count} repeated` : ` of ${run.count} answered`,
    };
  }
  return { lead: `${noun} `, number: Math.min(run.at + 1, run.count), tail: ` of ${run.count}` };
}
