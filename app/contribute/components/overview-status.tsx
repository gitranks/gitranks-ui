import type { Route } from 'next';
import Link from 'next/link';

import { ContributeNotices } from './contribute-notices';
import { CycleSummary } from './cycle-summary';
import { FirstRunGuide } from './first-run-guide';
import { ReviewsReady } from './reviews-ready';
import type { ContributeAttempt, ContributeIssuePage, ContributeView } from '@/lib/contribute/contribute.types';
import { MAINTAINERS_PATH } from '@/lib/contribute/contribute-path';
import { claudeKeyOf, contributeNoticesOf } from '@/lib/contribute/contribute-state';
import { FIRST_RUN_NOTICES } from '@/lib/contribute/first-run';

/** The landing again, for a user who is onboarded. */
export const ABOUT_PATH = '/contribute?about=1' as Route;

/** Where the user stands: what needs them, the reviews waiting, and the cycle's spend when a key pays for it. */
export function OverviewStatusView({
  view,
  now,
  reviews,
}: {
  view: ContributeView;
  now?: Date;
  /** The attempts waiting for the user's review; `undefined` while the API does not answer them. */
  reviews?: ContributeAttempt[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <ContributeNotices notices={contributeNoticesOf(view)} />
      <ReviewsReady attempts={reviews} />
      {/* The cycle is a key's spend: their own agent spends nothing through us. */}
      {claudeKeyOf(view) ? <CycleSummary view={view} now={now} /> : null}
    </div>
  );
}

/**
 * The overview of an onboarded user: where they stand, then the maintainers' strip and the way back to the pitch.
 * Before their first attempt, what happens next takes the place of the status.
 */
export function OverviewScreen({
  view,
  now,
  reviews,
  firstRun,
}: {
  view: ContributeView;
  now?: Date;
  reviews?: ContributeAttempt[];
  /** No attempt yet, with the feed's first page (`undefined`: not answered). */
  firstRun?: { page: ContributeIssuePage | null | undefined };
}) {
  return (
    <main className="mx-auto flex w-full max-w-[1180px] flex-col gap-10 px-4 pt-8 pb-12">
      <h1 className="sr-only">Overview</h1>
      {firstRun ? (
        <div className="flex flex-col gap-3">
          <ContributeNotices notices={contributeNoticesOf(view).filter(({ kind }) => !FIRST_RUN_NOTICES.has(kind))} />
          <FirstRunGuide view={view} page={firstRun.page} now={now} />
        </div>
      ) : (
        <OverviewStatusView view={view} now={now} reviews={reviews} />
      )}
      <footer
        className="flex flex-wrap items-center justify-between gap-4 border-t pt-6 text-sm"
        data-overview="footer"
      >
        <p className="max-w-3xl text-muted-foreground">
          <span className="font-semibold text-foreground">Maintain a repo?</span> We open at most one PR in it at a
          time, never more than four a month, and pause after two are closed in a row. Every PR says it was made with
          AI.{' '}
          <Link href={MAINTAINERS_PATH} prefetch={false} className="font-semibold text-primary">
            Opt it out →
          </Link>
        </p>
        <Link href={ABOUT_PATH} prefetch={false} className="font-semibold text-primary">
          How Contribute works
        </Link>
      </footer>
    </main>
  );
}
