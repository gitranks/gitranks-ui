import { formatDistanceToNow } from 'date-fns';
import { Clock, Package, Split, Star } from 'lucide-react';
import Link from 'next/link';
import { FC, ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { Repository } from '@/types/generated/graphql';

import { ProfileCard, ProfileCardContent, ProfileCardHeader } from '../../components/profile-card';

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

  const titleUrl = type === 'repository' ? url : `${url}/pulls?q=is%3Apr+author%3A${login}`;

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
    <ProfileCard className={className}>
      <ProfileCardHeader meta={getMeta()}>
        <Link href={titleUrl} target="_blank" rel="noopener noreferrer" className="whitespace-nowrap">
          {name}
        </Link>
      </ProfileCardHeader>
      <ProfileCardContent>
        {type === 'repository' && (
          <div className="flex gap-2">
            <Clock size={20} className="inline" />
            <span className="text-sm">
              updated {formatDistanceToNow(pushedAt, { addSuffix: true })} • age {formatDistanceToNow(createdAt)}
            </span>
          </div>
        )}
        <div className="flex gap-4">
          <span className="flex gap-2">
            <Star size={20} className="inline" />
            <span className="text-sm">{stargazerCount?.toLocaleString('en-US')}</span>
          </span>
          <span className="flex gap-2">
            <Split size={20} className="inline" />
            <span className="text-sm">{forkCount?.toLocaleString('en-US')}</span>
          </span>
          {!!releasesCount && (
            <span className="flex gap-2">
              <Package size={20} className="inline" />
              <span className="text-sm">{releasesCount?.toLocaleString('en-US')}</span>
            </span>
          )}
        </div>
      </ProfileCardContent>
    </ProfileCard>
  );
};
