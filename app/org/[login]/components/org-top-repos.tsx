import { Medal, Star } from 'lucide-react';
import type { FC } from 'react';

import { ProfileCard, ProfileCardContent, ProfileCardHeader } from '@/app/profile/[login]/components/profile-card';
import { Link } from '@/components/link/link';
import type { PageOrgQuery } from '@/types/generated/graphql';
import { formatNumberShort } from '@/utils/format-number-short';
import { getRepoPath } from '@/utils/repo-paths';

type OrgTopReposProps = {
  repos: NonNullable<PageOrgQuery['organization']>['topRepos'];
};

export const OrgTopRepos: FC<OrgTopReposProps> = ({ repos }) => {
  if (!repos.length) {
    return null;
  }

  return (
    <ProfileCard>
      <ProfileCardHeader>Top repositories</ProfileCardHeader>
      <ProfileCardContent>
        <ul className="flex flex-col gap-3">
          {repos.map((repo) => (
            <li key={repo.githubId} className="flex items-start justify-between gap-3 text-sm">
              <div className="flex min-w-0 flex-col gap-0.5">
                <Link
                  href={getRepoPath(repo.nameWithOwner)}
                  className="font-semibold [overflow-wrap:anywhere]"
                  translate="no"
                >
                  {repo.name}
                </Link>
                {!!repo.description && <p className="line-clamp-1 text-muted-foreground">{repo.description}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {!!repo.rank?.s && (
                  <span className="flex items-center gap-1" title="Global repository rank">
                    <Medal className="size-4 text-muted-foreground" aria-hidden />
                    <span className="sr-only">Global repository rank:</span>
                    <span className="font-mono tabular-nums">#{repo.rank.s.toLocaleString('en-US')}</span>
                  </span>
                )}
                <span className="flex items-center gap-1" title="Stars">
                  <Star className="size-4 text-muted-foreground" aria-hidden />
                  <span className="sr-only">Stars:</span>
                  <span className="font-mono tabular-nums">{formatNumberShort(repo.stars)}</span>
                </span>
              </div>
            </li>
          ))}
        </ul>
      </ProfileCardContent>
    </ProfileCard>
  );
};
