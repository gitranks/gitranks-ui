import type { FC } from 'react';

import { formatFull } from './landing-ui';
import type { RankCardEntry, RankingKey } from './rank-card.types';
import { RankDelta } from '@/components/rank-delta/rank-delta';
import { StarTotalCount } from '@/components/star-count/star-count';
import { TierChip } from '@/components/tier-chip/tier-chip';
import { getPercentileRank } from '@/utils/get-percentile-rank';

export const RANKING_LABELS: Record<RankingKey, { tab: string; title: string; unit: string }> = {
  s: { tab: 'Stars', title: 'Stars rank', unit: 'stars' },
  c: { tab: 'Contributions', title: 'Contributor rank', unit: 'contribution stars' },
  f: { tab: 'Followers', title: 'Followers rank', unit: 'followers' },
};

/** One ranking's facts as both hero cards show them: the position, its change, the tier, the percentile, the total. */
export const RankFacts: FC<{ entry: RankCardEntry; ranking: RankingKey }> = ({ entry, ranking }) => {
  const percentile = getPercentileRank(entry.position, entry.rankedCount ?? undefined);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono text-4xl font-semibold tracking-tight tabular-nums">
          #{formatFull(entry.position)}
        </span>
        {entry.rankedCount && <span className="opacity-80">of {formatFull(entry.rankedCount)}</span>}
        <RankDelta current={entry.position} previous={entry.previous} className="font-mono" />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        {entry.tier && <TierChip tier={entry.tier} />}
        {percentile !== null && <span>Top {percentile}%</span>}
        <span className="font-mono tabular-nums">
          {ranking === 's' && typeof entry.value === 'number' && entry.notCounted ? (
            <StarTotalCount stars={entry.value} notCounted={entry.notCounted} />
          ) : (
            formatFull(entry.value)
          )}{' '}
          {RANKING_LABELS[ranking].unit}
        </span>
      </div>
    </div>
  );
};
