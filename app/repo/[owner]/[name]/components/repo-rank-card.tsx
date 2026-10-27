import type { FC } from 'react';

import { Eyebrow, MoreLink, ProfileCard } from '@/app/profile/[login]/components/profile-card';
import { RankDelta } from '@/components/rank-delta/rank-delta';
import { formatNumberShort } from '@/utils/format-number-short';

type RepoRankCardProps = {
  title: string;
  rank: number;
  /** The rank at the start of the month. */
  rankM?: number | null;
  rankingLink: string;
  rankedCount?: number;
};

const topShareOf = (rank: number, rankedCount?: number) => {
  if (!rankedCount) {
    return null;
  }

  const percentage = Math.max((rank / rankedCount) * 100, 0.1);
  return percentage > 50 ? `Bottom ${formatNumberShort(100 - percentage)}%` : `Top ${formatNumberShort(percentage)}%`;
};

/** A rank as the profile shows its numbers: the label over the mono rank, its change this month and its share. */
export const RepoRankCard: FC<RepoRankCardProps> = ({ title, rank, rankM, rankingLink, rankedCount }) => {
  const topShare = topShareOf(rank, rankedCount);

  return (
    <ProfileCard className="gap-3">
      <div className="flex flex-col gap-1">
        <Eyebrow as="h2">{title}</Eyebrow>
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-mono text-3xl font-semibold tracking-tight tabular-nums">
            #{rank.toLocaleString('en-US')}
          </span>
          {!!rankM && rank !== rankM && (
            <span className="text-sm text-muted-foreground">
              <RankDelta current={rank} previous={rankM} className="font-mono text-sm" /> this month
            </span>
          )}
        </div>
        {!!topShare && (
          <p className="text-sm">
            {topShare} of {rankedCount!.toLocaleString('en-US')} ranked repositories
          </p>
        )}
      </div>
      <MoreLink href={rankingLink} className="mt-auto">
        View ranking
      </MoreLink>
    </ProfileCard>
  );
};
