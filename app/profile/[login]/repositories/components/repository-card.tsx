import { formatDistanceToNow } from 'date-fns';
import { Clock, Package, Split, Star } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import type { FC, ReactNode } from 'react';

import { ProfileCard, ProfileCardContent, ProfileCardHeader } from '../../components/profile-card';
import { RepositoryDetail } from './repository-detail';
import { RepositoryLanguages } from './repository-languages';
import { RepositoryTopLanguage } from './repository-top-language';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Repository } from '@/types/generated/graphql';

type RepositoryCardProps = {
  repository?: Repository | null;
  meta?: ReactNode;
  className?: string;
  type?: 'contribution' | 'repository';
  login: string;
};

export const RepositoryCard: FC<RepositoryCardProps> = ({
  login,
  repository,
  meta,
  className,
  type = 'repository',
}) => {
  if (!repository) {
    return null;
  }

  const { name, url, pushedAt, createdAt, stargazerCount, forkCount, releasesCount, isArchived } = repository;

  const titleUrl = type === 'repository' ? url : `${url}/pulls?q=is%3Apr+is%3Amerged+author%3A${login}`;

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
    <ProfileCard className={cn(className, 'flex-col md:flex-row gap-x-2 justify-between flex-wrap')}>
      <div className="flex flex-col gap-2">
        <ProfileCardHeader meta={getMeta()}>
          <Link
            href={titleUrl as Route}
            target="_blank"
            rel="noopener noreferrer"
            className="whitespace-nowrap font-semibold"
          >
            {name}
          </Link>
        </ProfileCardHeader>

        <ProfileCardContent>
          <div className="flex gap-x-4 gap-y-2 flex-wrap">
            <div className="flex gap-4">
              {type === 'contribution' && <RepositoryTopLanguage languages={repository.languages} />}
              <RepositoryDetail Icon={Star} value={stargazerCount} />
              <RepositoryDetail Icon={Split} value={forkCount ?? 0} />
              {!!releasesCount && <RepositoryDetail Icon={Package} value={releasesCount} />}
            </div>

            {type === 'repository' && (
              <div className="flex gap-1 items-center text-muted-foreground">
                <Clock size={16} className="inline" />
                <span className="text-sm">
                  updated {formatDistanceToNow(pushedAt, { addSuffix: true })} • age {formatDistanceToNow(createdAt)}
                </span>
              </div>
            )}
          </div>
        </ProfileCardContent>
      </div>
      {type === 'repository' && <RepositoryLanguages languages={repository.languages} />}
    </ProfileCard>
  );
};
