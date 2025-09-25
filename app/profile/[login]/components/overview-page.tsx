import { notFound } from 'next/navigation';
import type { FC } from 'react';

import { JsonLd } from '@/components/json-ld/json-ld';
import { Link } from '@/components/link/link';
import type { PageProfileOverviewQuery } from '@/types/generated/graphql';

import NotFound from '../not-found';
import { UserContributionsList } from '../repositories/components/user-contriutions-list';
import { UserRepositoriesList } from '../repositories/components/user-repositories-list';
import { buildProfileTabSEO } from '../seo';
import { ProfileTimeline } from '../timeline/components/profile-timeline';
import { LayoutLeftColumn } from './layout-left-column';
import { MessengerIntegration } from './messenger-integration';
import { OverviewCardsContainer } from './overview-cards/overview-cards';
import { ProfileLanguageCard } from './overview-cards/overview-language-card';
import { ProfileRankCard } from './overview-cards/overview-rank-card';
import { ProfileRankingSwitcher } from './profile-ranking-switcher';

type OverviewPageProps = {
  user: PageProfileOverviewQuery['user'];
  isGlobalContext?: boolean;
};

export const OverviewPage: FC<OverviewPageProps> = ({ user, isGlobalContext }) => {
  if (!user) {
    notFound();
  }

  if (user.fetchingStatus === 'FETCHING' && !user.avatarUrl) {
    // user is being fetched for the first time
    return <NotFound fetchingStatus={user.fetchingStatus} fetchingUpdatedAt={user.fetchingUpdatedAt} />;
  }

  const { languages, country, login, repositories, contributions, timeline, repositoriesCount, firstSeenAt } = user;

  const ranks = isGlobalContext ? user.rankGlobal : user.rankCountry;
  const tiers = isGlobalContext ? user.tiersGlobal : user.tiersCountry;

  return (
    <LayoutLeftColumn user={user} className="gap-10">
      <JsonLd payloads={buildProfileTabSEO('overview', user).jsonLd} />

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Profile Overview</h2>
          <ProfileRankingSwitcher countryName={country} />
        </div>

        <OverviewCardsContainer>
          <ProfileRankCard login={login} ranks={ranks} tiers={tiers} country={isGlobalContext ? null : country} />
          <ProfileLanguageCard login={login} languages={languages} />
        </OverviewCardsContainer>
      </div>

      {!!repositoriesCount && (
        <div className="flex flex-col gap-3">
          <h3 className="text-xl font-semibold">{repositoriesCount > 5 ? 'Top 5 Repositories' : 'Repositories'}</h3>
          <UserRepositoriesList repositories={repositories} login={login} loadMore={false} />
          {repositoriesCount > 5 && (
            <Link href={`/profile/${login}/repositories`}>{`View all ${repositoriesCount} repositories`}</Link>
          )}
        </div>
      )}

      {!!contributions?.length && (
        <div className="flex flex-col gap-3">
          <h3 className="text-xl font-semibold">Last Contributions</h3>
          <UserContributionsList contributions={contributions} login={login} contributionCount={false} />
          <Link href={`/profile/${login}/repositories`}>View all contributions</Link>
        </div>
      )}

      {!!timeline?.length && <ProfileTimeline timeline={timeline} firstSeenAt={firstSeenAt} />}

      <MessengerIntegration login={login} />

      {/* <div className="flex p-0 md:p-4 min-w-xs flex-grow basis-0 shrink-0 items-center justify-center">
            <div className="flex flex-col gap-2 items-start">
              <div className="font-semibold">Put Your Rank on Display</div> */}
      {}
      {/* <img
                src={`/api/badge/${login}?rankingType=${bestRankType}&template=small&theme=light`}
                alt="github badge"
              />
              <Button asChild className="mt-2">
                <Link href={`/badge/${login}?rankingType=${bestRankType}&template=small`}>
                  Get a Badge
                  <ChevronRight />
                </Link>
              </Button>
            </div>
          </div> */}
      {/* </ProfileCardsGrid> */}
    </LayoutLeftColumn>
  );
};
