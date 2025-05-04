import { FC } from 'react';

import { UserQuery } from '@/types/generated/graphql';

import { ProfileCard } from './profile-card';

type RepositoriesOverviewProps = {
  repositories: UserQuery['user']['repositories'];
  contributions: UserQuery['user']['contributions'];
  ownedStars: UserQuery['user']['ownedStars'];
  contributedStars: UserQuery['user']['contributedStars'];
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
