import { notFound } from 'next/navigation';

import { ContributeNotices } from './contribute-notices';
import { CycleSummary } from './cycle-summary';
import { ReviewsReady } from './reviews-ready';
import { loadAttempts, loadContribute } from '@/lib/contribute/contribute.data';
import type { ContributeAttempt, ContributeView } from '@/lib/contribute/contribute.types';
import { claudeKeyOf, contributeNoticesOf, isOwnAgentOnly } from '@/lib/contribute/contribute-state';

/** Where the user stands, above the pitch: nothing until they connected a key or their own agent. */
export async function OverviewStatus() {
  const [view, reviews] = await Promise.all([loadContribute(), loadAttempts('REVIEW', 5)]);
  if (!view) notFound();
  return <OverviewStatusView view={view} reviews={reviews} />;
}

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
  const ownAgentOnly = isOwnAgentOnly(view);
  if (!claudeKeyOf(view) && !ownAgentOnly) return null;

  return (
    <div className="flex flex-col gap-3">
      <ContributeNotices notices={contributeNoticesOf(view)} />
      <ReviewsReady attempts={reviews} />
      {/* The cycle is a key's spend: their own agent spends nothing through us. */}
      {ownAgentOnly ? null : <CycleSummary view={view} now={now} />}
    </div>
  );
}
