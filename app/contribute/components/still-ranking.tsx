'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { changesPollRunning, holdFastChanges } from '@/lib/contribute/changes-bus';

/** How often the wait looks again while the first picks are ranked, and for how long before it stops. */
export const RANKING_REFRESH_SECONDS = 5;
export const RANKING_REFRESH_FOR_SECONDS = 120;

/** One tick of the wait: read the page again, or stop once the round has run `forSeconds`. */
export const rankingTickOf = (startedAt: number, now: number, forSeconds = RANKING_REFRESH_FOR_SECONDS) =>
  now - startedAt >= forSeconds * 1000 ? 'stop' : 'refresh';

/**
 * The first picks are computed after the key is connected. While they are, Contribute's poll goes fast (5 then 10 s),
 * and the page reads itself again once the poll says the picks are in (`FEED`); where the poll does not run yet (the
 * tabs show once the user is onboarded), the page reads itself again every few seconds instead. About two minutes on,
 * it stops and offers a refresh.
 */
export function StillRanking({
  seconds = RANKING_REFRESH_SECONDS,
  forSeconds = RANKING_REFRESH_FOR_SECONDS,
}: {
  seconds?: number;
  forSeconds?: number;
}) {
  const router = useRouter();
  const [round, setRound] = useState(0);
  const [stopped, setStopped] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: a refresh by hand starts another round.
  useEffect(() => {
    setStopped(false);
    const startedAt = Date.now();
    const release = holdFastChanges();
    const timer = setInterval(() => {
      if (rankingTickOf(startedAt, Date.now(), forSeconds) === 'stop') {
        clearInterval(timer);
        release();
        setStopped(true);
        return;
      }
      if (!changesPollRunning() && document.visibilityState === 'visible') router.refresh();
    }, seconds * 1000);
    return () => {
      clearInterval(timer);
      release();
    };
  }, [router, seconds, forSeconds, round]);

  return (
    <div
      className="flex flex-col gap-1 rounded-xl border border-dashed px-5 py-8 text-center"
      data-ranking={stopped ? 'stopped' : 'waiting'}
    >
      <span className="font-semibold">Your first picks are still being ranked</span>
      <span className="text-sm text-muted-foreground">
        {stopped ? (
          <>
            This is taking longer than usual.{' '}
            <button
              type="button"
              onClick={() => {
                setRound((value) => value + 1);
                router.refresh();
              }}
              className="font-semibold text-link"
            >
              Refresh
            </button>{' '}
            to look again.
          </>
        ) : (
          'This takes a minute or two. They show up here by themselves.'
        )}
      </span>
    </div>
  );
}
