'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

/** How often the page reads itself again while the first picks are ranked, and for how long before it stops. */
export const RANKING_REFRESH_SECONDS = 5;
export const RANKING_REFRESH_FOR_SECONDS = 120;

/** One tick of the wait: read the page again, or stop once the round has run `forSeconds`. */
export const rankingTickOf = (startedAt: number, now: number, forSeconds = RANKING_REFRESH_FOR_SECONDS) =>
  now - startedAt >= forSeconds * 1000 ? 'stop' : 'refresh';

/**
 * The first picks are computed after the key is connected: the page reads itself again every few seconds until they
 * are in, for about two minutes. Past that it stops, since each read is the whole page's, and offers a refresh.
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
    const timer = setInterval(() => {
      if (rankingTickOf(startedAt, Date.now(), forSeconds) === 'stop') {
        clearInterval(timer);
        setStopped(true);
        return;
      }
      if (document.visibilityState === 'visible') router.refresh();
    }, seconds * 1000);
    return () => clearInterval(timer);
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
