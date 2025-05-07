import { FC } from 'react';

import { UserQuery } from '@/types/generated/graphql';

import { ProfileCard } from './profile-card';

type User = NonNullable<UserQuery['user']>;

type RepositoriesOverviewProps = {
  repositories: User['repositories'];
  contributions: User['contributions'];
  ownedStars: User['ownedStars'];
  contributedStars: User['contributedStars'];
};

export const RepositoriesOverview: FC<RepositoriesOverviewProps> = ({
  repositories,
  contributions,
  ownedStars,
  contributedStars,
}) => {
  const topRepoStars = repositories?.reduce((topStars, repo) => {
    if (repo.stargazerCount > topStars) {
      return repo.stargazerCount;
    }
    return topStars;
  }, 0);

  const contributedRepoCount = [...new Set(contributions?.map((contribution) => contribution?.repository?.githubId))]
    .length;

  return (
    <ProfileCard title="Repositories">
      <p>
        📦&nbsp;&nbsp;Owns {repositories?.length} repos
        {!!ownedStars && ` • ⭐ ${ownedStars?.toLocaleString('en-US')} total`}
      </p>
      <p>
        🏆&nbsp;&nbsp;Top repository
        {topRepoStars ? ` • ⭐ ${topRepoStars?.toLocaleString('en-US')}` : ' not found ( •_•) 🔍'}
      </p>
      <p>
        🤝&nbsp;&nbsp;Contributed to {contributedRepoCount} repos
        {!!contributedRepoCount && ` • ⭐ ${contributedStars?.toLocaleString('en-US')} total`}
      </p>
    </ProfileCard>
  );
};
