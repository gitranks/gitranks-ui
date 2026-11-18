import type { FC } from 'react';

import { repoTabPath } from '../../../utils/repo-tabs';
import { usedByCardLine } from '../../../utils/used-by-summary';
import { MoreLink, ProfileCard, ProfileCardHeader } from '@/app/profile/[login]/components/profile-card';
import { OVERVIEW_DEPENDENTS } from '@/components/dependents/dependents.consts';
import { DependentsTable } from '@/components/dependents/dependents-table';
import type { RepoPackages, RepoUsedByItem } from '@/graphql/repo-packages';

type UsedByCardProps = {
  nameWithOwner: string;
  packages: RepoPackages;
  /** Its most-starred dependents. */
  rows: readonly RepoUsedByItem[];
};

/** The Overview's "Used by": how many repositories with 100+ stars use its packages, and the five most-starred. */
export const UsedByCard: FC<UsedByCardProps> = ({ nameWithOwner, packages, rows }) => {
  const line = usedByCardLine(packages);

  return (
    <ProfileCard className="gap-3">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="flex min-w-0 flex-col gap-1">
          <ProfileCardHeader>
            <h2>Used by</h2>
          </ProfileCardHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-mono tabular-nums text-foreground">{line.dependents}</span> {line.what}
            <span className="font-mono tabular-nums text-foreground">{line.downloads}</span> downloads a week.
          </p>
        </div>
        <MoreLink href={repoTabPath(nameWithOwner, 'used-by')} className="shrink-0">
          All {line.dependents}
        </MoreLink>
      </div>
      <DependentsTable rows={rows.slice(0, OVERVIEW_DEPENDENTS)} />
    </ProfileCard>
  );
};
