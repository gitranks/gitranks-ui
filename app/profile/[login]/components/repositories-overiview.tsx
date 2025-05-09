import { FC } from 'react';

import { Link } from '@/components/link/link';
import { UserQuery } from '@/types/generated/graphql';

import { ProfileCard, ProfileCardActions, ProfileCardContent, ProfileCardHeader } from './profile-card';

type User = NonNullable<UserQuery['user']>;

type RepositoriesOverviewProps = {
  topRepoStars?: number;
  contributedRepoCount?: number | null;
  repositoriesCount?: number | null;
  ownedStars: User['ownedStars'];
  contributedStars: User['contributedStars'];
  login: string;
};

export const RepositoriesOverview: FC<RepositoriesOverviewProps> = ({
  topRepoStars,
  repositoriesCount,
  contributedRepoCount,
  ownedStars,
  contributedStars,
  login,
}) => {
  return (
    <ProfileCard>
      <ProfileCardHeader>Repositories</ProfileCardHeader>
      <ProfileCardContent>
        <p>
          📦&nbsp;&nbsp;Owns {repositoriesCount ?? 0} repos
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
      </ProfileCardContent>
      <ProfileCardActions>
        <Link href={`/profile/${login}/repositories`}>View Details</Link>
      </ProfileCardActions>
    </ProfileCard>
  );
};
