'use client';

import { useCallback, useState } from 'react';

import {
  isRunOver,
  nextOf,
  type PlayerResult,
  type PlayerRun,
  recordedOf,
  runStartOf,
  squaresOf,
} from '@/lib/workspace/player';

/**
 * The player's run of questions: which one is asked, how each answered one went, and going on. A lesson is a run of
 * one; the review and the check are runs of their set. The page draws the current question keyed by its id, so each
 * question starts a fresh answer.
 */
export function usePlayer(count: number, start?: { at: number; results: readonly PlayerResult[] }) {
  const [run, setRun] = useState<PlayerRun>(() => runStartOf(count, start));
  const record = useCallback((result: PlayerResult) => setRun((current) => recordedOf(current, result)), []);
  const next = useCallback(() => setRun((current) => nextOf(current)), []);
  return {
    run,
    squares: squaresOf(run),
    /** Past the last question: the page shows its end. */
    over: isRunOver(run) && run.at >= run.count,
    record,
    next,
  };
}
