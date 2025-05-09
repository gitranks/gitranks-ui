import { FC } from 'react';

import { Badge } from '@/components/ui/badge';
import { Repository } from '@/types/generated/graphql';

import { RepositoryCard } from './repository-card';

type RepositoryCardProps = {
  repository?: Repository | null;
  prsCount?: number | null;
  login: string;
};

export const ContributionRepositoryCard: FC<RepositoryCardProps> = ({ repository, prsCount, login }) => {
  if (!repository) {
    return null;
  }

  return (
    <RepositoryCard
      type="contribution"
      repository={repository}
      meta={<Badge variant="secondary">{`${prsCount} contributions`}</Badge>}
      login={login}
      className="md:border-0 md:border-b-1 last:md:border-b-0 rounded-none md:pl-0"
    />
  );
};
