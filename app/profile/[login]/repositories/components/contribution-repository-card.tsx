import type { FC } from 'react';

import { Badge } from '@/components/ui/badge';
import type { Repository } from '@/types/generated/graphql';
import { pluralize } from '@/utils/pluralize';

import { RepositoryCard } from './repository-card';

type RepositoryCardProps = {
  repository?: Repository | null;
  prsCount?: number | null;
  mergedPrsCount?: number | null;
  linesAdded?: number | null;
  linesRemoved?: number | null;
  login: string;
};

const PR_FETCH_LIMIT = 5;

export const ContributionRepositoryCard: FC<RepositoryCardProps> = ({
  repository,
  prsCount,
  mergedPrsCount,
  linesAdded,
  linesRemoved,
  login,
}) => {
  if (!repository) {
    return null;
  }

  // total PRs count is greater than PR_FETCH_LIMIT
  // and merged PRs count is greater than half of PR_FETCH_LIMIT
  const badgeLabel =
    (prsCount ?? 0) > PR_FETCH_LIMIT && (mergedPrsCount ?? 0) >= PR_FETCH_LIMIT / 2
      ? `~${prsCount} PRs`
      : `${mergedPrsCount} ${pluralize('PR', mergedPrsCount ?? 0)}`;

  return (
    <RepositoryCard
      type="contribution"
      repository={repository}
      meta={
        <Badge variant="secondary">
          {badgeLabel} <span className="text-positive">+{linesAdded?.toLocaleString('en-US')}</span>
          <span className="text-negative">-{linesRemoved?.toLocaleString('en-US')}</span>
        </Badge>
      }
      login={login}
      className="border-0 border-b-1 last:border-b-0 p-4 pl-0 md:pl-0 rounded-none shadow-none"
    />
  );
};
