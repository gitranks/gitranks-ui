import { formatDistanceToNow } from 'date-fns';
import { Clock, Medal, Package, Split, Star } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import type { FC, ReactNode } from 'react';

import { RepositoryDetail } from './repository-detail';
import { RepositoryLanguages } from './repository-languages';
import { RepositoryTopLanguage } from './repository-top-language';
import { REPO_PAGE_MIN_STARS } from '@/app/app.consts';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Repository } from '@/types/generated/graphql';
import { getRankingPageOf, getRepoPath, getRepoRankingPath } from '@/utils/repo-paths';
import { getRepoName } from '@/utils/repositories';

type RepositoryCardProps = {
  repository?: Repository | null;
  meta?: ReactNode;
  className?: string;
  type?: 'contribution' | 'repository';
  /** Where the title links to for a contribution; a repository links to itself. */
  contributionUrl?: string;
};

export const RepositoryCard: FC<RepositoryCardProps> = ({
  contributionUrl,
  repository,
  meta,
  className,
  type = 'repository',
}) => {
  if (!repository) {
    return null;
  }

  const { name, url, pushedAt, createdAt, stargazerCount, forkCount, releasesCount, isArchived, rank } = repository;

  const title = type === 'repository' ? name : getRepoName({ name: name ?? '', url });
  // An own repository opens its page here once it has one; below that, and for a contribution, GitHub.
  const repoPath = stargazerCount >= REPO_PAGE_MIN_STARS ? getRepoPath(getRepoName({ name: name ?? '', url })) : null;
  const titleUrl = type === 'repository' ? (repoPath ?? url) : (contributionUrl ?? url);
  const isExternal = titleUrl !== repoPath;

  const getMeta = () => {
    if (meta) {
      return meta;
    }

    if (isArchived) {
      return <Badge variant="secondary">Archived</Badge>;
    }

    return null;
  };

  return (
    <article className={cn('flex flex-col md:flex-row gap-x-4 gap-y-3 justify-between p-4', className)}>
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="min-w-0 font-semibold [overflow-wrap:anywhere]">
            <Link
              href={titleUrl as Route}
              {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : { prefetch: false })}
              className="hover:underline"
            >
              {title}
            </Link>
          </div>
          {getMeta()}
        </div>

        <div className="flex gap-x-4 gap-y-1 flex-wrap text-sm">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {type === 'contribution' && <RepositoryTopLanguage languages={repository.languages} />}
            {!!rank?.s && (
              <Link
                href={getRepoRankingPath(getRankingPageOf(rank.s))}
                prefetch={false}
                className="flex gap-1 items-center hover:underline"
                title="Global repository rank"
              >
                <Medal className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="sr-only">Global repository rank:</span>
                <span className="font-mono tabular-nums">#{rank.s.toLocaleString('en-US')}</span>
              </Link>
            )}
            <RepositoryDetail Icon={Star} value={stargazerCount} label="Stars" />
            <RepositoryDetail Icon={Split} value={forkCount ?? 0} label="Forks" />
            {!!releasesCount && <RepositoryDetail Icon={Package} value={releasesCount} label="Releases" />}
          </div>

          {type === 'repository' && (
            <div className="flex gap-1 items-center text-muted-foreground">
              <Clock className="size-4 shrink-0" aria-hidden />
              <span>
                updated {formatDistanceToNow(pushedAt, { addSuffix: true })} · age {formatDistanceToNow(createdAt)}
              </span>
            </div>
          )}
        </div>
      </div>
      {type === 'repository' && <RepositoryLanguages languages={repository.languages} />}
    </article>
  );
};
