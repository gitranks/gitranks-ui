import { format } from 'date-fns';
import { CalendarDays, Code, Star, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import type { FC } from 'react';

import { ProfileListItem } from '@/app/profile/[login]/components/profile-list-item';
import { Badge } from '@/components/ui/badge';
import type { PageRepoQuery } from '@/types/generated/graphql';

type RepoHeaderProps = {
  repo: NonNullable<PageRepoQuery['repo']>;
  /** Where the language links to: its repository ranking, when the repository is ranked. */
  languageUrl?: string;
};

const AVATAR_SIZE = 48;

export const RepoHeader: FC<RepoHeaderProps> = ({ repo, languageUrl }) => {
  const { nameWithOwner, owner, ownerAvatarUrl, description, language, stars, gainedThisMonth, createdAt } = repo;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {!!ownerAvatarUrl && (
          <Image
            src={`${ownerAvatarUrl}&s=${AVATAR_SIZE * 2}`}
            alt={`${owner} avatar`}
            className="rounded-full shrink-0"
            width={AVATAR_SIZE}
            height={AVATAR_SIZE}
            loading="eager"
            fetchPriority="high"
          />
        )}
        <h1 className="min-w-0 text-2xl font-semibold [overflow-wrap:anywhere]" translate="no">
          <a
            href={`https://github.com/${nameWithOwner}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            {nameWithOwner}
          </a>
        </h1>
        {repo.isArchived && <Badge variant="secondary">Archived</Badge>}
      </div>
      {!!description && <p className="text-muted-foreground [overflow-wrap:anywhere]">{description}</p>}
      <div className="flex flex-wrap gap-x-6 gap-y-1.5">
        <ProfileListItem value={language} url={languageUrl} Icon={Code} />
        <ProfileListItem value={`${stars.toLocaleString('en-US')} stars`} Icon={Star} />
        {!!gainedThisMonth && (
          <ProfileListItem
            value={`${gainedThisMonth > 0 ? '+' : ''}${gainedThisMonth.toLocaleString('en-US')} this month`}
            Icon={TrendingUp}
          />
        )}
        {!!createdAt && <ProfileListItem value={`Created ${format(createdAt, 'MMM d, yyyy')}`} Icon={CalendarDays} />}
      </div>
    </div>
  );
};
