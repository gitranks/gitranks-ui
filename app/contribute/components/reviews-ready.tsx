import type { Route } from 'next';
import Link from 'next/link';

import { attemptTitleOf, repoOf } from '@/lib/contribute/attempt-format';
import type { ContributeAttempt } from '@/lib/contribute/contribute.types';

/** The review screen of one attempt. */
export const attemptHref = (attemptId: string) => `/contribute/attempts/${encodeURIComponent(attemptId)}` as Route;

/** The attempts waiting for the user's review, above Issues for you and the overview; nothing when none waits. */
export function ReviewsReady({ attempts }: { attempts: ContributeAttempt[] | undefined }) {
  const ready = (attempts ?? []).filter(({ state }) => state === 'REVIEW');
  if (!ready.length) return null;

  return (
    <section
      aria-labelledby="reviews-ready"
      data-reviews-ready={ready.length}
      className="flex flex-col gap-2 rounded-xl border border-primary/20 bg-brand-soft px-4 py-3"
    >
      <h2 id="reviews-ready" className="font-semibold">
        {ready.length === 1 ? 'A change is ready for your review' : `${ready.length} changes are ready for your review`}
      </h2>
      <ul className="flex flex-col gap-1.5">
        {ready.map((attempt) => (
          <li key={attempt.attemptId} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <span className="min-w-0 text-sm">
              <span className="font-mono text-muted-foreground">
                {repoOf(attempt)} · #{attempt.number}
              </span>{' '}
              {attemptTitleOf(attempt)}
            </span>
            <Link href={attemptHref(attempt.attemptId)} prefetch={false} className="text-sm font-semibold text-primary">
              Review →
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
