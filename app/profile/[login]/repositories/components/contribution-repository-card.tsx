import { type FC, useMemo } from 'react';

import { RepositoryCard } from './repository-card';
import { Badge } from '@/components/ui/badge';
import type { Repository } from '@/types/generated/graphql';
import { hasLinesChanged } from '@/utils/has-lines-changed';
import { pluralize } from '@/utils/pluralize';

type RepositoryCardProps = {
  repository?: Repository | null;
  prsCount?: number | null;
  mergedPrsCount?: number | null;
  linesAdded?: number | null;
  linesRemoved?: number | null;
  login: string;
};

const PR_FETCH_LIMIT = 3;

export const ContributionRepositoryCard: FC<RepositoryCardProps> = ({
  repository,
  prsCount,
  mergedPrsCount,
  linesAdded,
  linesRemoved,
  login,
}) => {
  const badgeLabel = useMemo(
    () =>
      (prsCount ?? 0) > PR_FETCH_LIMIT
        ? `${prsCount} PRs`
        : `${mergedPrsCount} ${pluralize('PR', mergedPrsCount ?? 0)}`,
    [prsCount, mergedPrsCount],
  );

  const showLinesChanged = useMemo(
    // The counts have to exist, not just be plausible: a row fetched without them renders `+ -` with
    // nothing between it, which is what this guard is for.
    () => hasLinesChanged(linesAdded, linesRemoved) && (prsCount ?? 0) <= PR_FETCH_LIMIT && (mergedPrsCount ?? 0) > 0,
    [linesAdded, linesRemoved, prsCount, mergedPrsCount],
  );

  if (!repository) {
    return null;
  }

  return (
    <RepositoryCard
      type="contribution"
      repository={repository}
      meta={
        <Badge variant="secondary">
          {badgeLabel}{' '}
          {showLinesChanged && (
            <>
              <span className="text-positive">+{linesAdded?.toLocaleString('en-US')}</span>
              <span className="text-negative">-{linesRemoved?.toLocaleString('en-US')}</span>
            </>
          )}
        </Badge>
      }
      login={login}
      className="border-0 p-4 pl-0 md:pl-0 rounded-none shadow-none bg-transparent"
    />
  );
};
