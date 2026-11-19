import Link from 'next/link';

import { HEADING } from './primitives';
import { attemptTitleOf, repoOf } from '@/lib/workspace/attempt-format';
import type { ContributeAttempt } from '@/lib/workspace/contribute.types';
import { pullRequestByAttemptPath } from '@/lib/workspace/paths';

/** The attempts waiting for the user's review, above Issues for you; nothing when none waits. */
export function ReviewsReady({ attempts }: { attempts: ContributeAttempt[] | undefined }) {
  const ready = (attempts ?? []).filter(({ state }) => state === 'REVIEW');
  if (!ready.length) return null;

  return (
    <section
      aria-labelledby="reviews-ready"
      data-reviews-ready={ready.length}
      className="flex flex-col gap-2 rounded-xl border border-primary/20 bg-brand-soft px-4 py-3"
    >
      <h2 id="reviews-ready" className={HEADING.card}>
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
            <Link
              href={pullRequestByAttemptPath(attempt.attemptId)}
              prefetch={false}
              className="text-sm font-semibold text-link"
            >
              Review →
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
