'use cache';

import { Metadata } from 'next';
import { unstable_cacheLife as cacheLife, unstable_cacheTag as cacheTag } from 'next/cache';
import { notFound } from 'next/navigation';

import { JsonLd } from '@/components/json-ld/json-ld';
import { fetchProfileOverview } from '@/graphql/helpers/fetch-profile-overview';
import { UserRankProp } from '@/types/ranking.types';
import { calculateTiers } from '@/utils/calculate-tiers/calculate-tiers';

import { LayoutLeftColumn } from './components/layout-left-column';
import { MessengerIntegration } from './components/messenger-integration';
import { OverviewCardsContainer } from './components/overview-cards/overview-cards';
import { ProfileLanguageCard } from './components/overview-cards/overview-language-card';
import { ProfileRankCard } from './components/overview-cards/overview-rank-card';
import { RankCardSwitcher } from './components/overview-cards/rank-card-switcher';
import { ProfileCardsGrid } from './components/profile-card';
import { RankBreakdownTooltip } from './components/rank-breakdown-tooltip';
import { NotFound } from './not-found';
import { buildProfileTabSEO } from './seo';
import { RankCard } from '../../../components/rank-card/rank-card';

export async function generateMetadata({ params }: { params: Promise<{ login: string }> }): Promise<Metadata> {
  const { login } = await params;
  const user = await fetchProfileOverview(login);

  if (!user) {
    return {};
  }

  return buildProfileTabSEO('overview', user);
}

export default async function ProfileOverviewPage({ params }: Readonly<{ params: Promise<{ login: string }> }>) {
  const { login } = await params;
  cacheLife('hours');
  cacheTag(`profile:${login}`);

  const user = await fetchProfileOverview(login);

  if (!user) {
    notFound();
  }

  if (user.fetchingStatus === 'FETCHING' && !user.rankGlobal) {
    // user is being fetched for the first time
    return <NotFound fetchingStatus={user.fetchingStatus} fetchingUpdatedAt={user.fetchingUpdatedAt} />;
  }

  const { jsonLd } = buildProfileTabSEO('overview', user);

  const { rankGlobal, globalTiers, languages } = user;
  const { s, c, f, sM, cM, fM, sProvisional, cProvisional, fProvisional } = rankGlobal ?? {};
  const { sTier, cTier, fTier, bestTier } = calculateTiers(rankGlobal, globalTiers);

  return (
    <LayoutLeftColumn user={user}>
      <JsonLd payloads={jsonLd} />
      <>
        <h2 className="text-xl mt-4 flex items-center justify-between">
          Ranks overview <RankCardSwitcher />
        </h2>

        <OverviewCardsContainer>
          <ProfileRankCard login={login} bestTier={bestTier} />
          <ProfileLanguageCard login={login} languages={languages} />
        </OverviewCardsContainer>

        <MessengerIntegration login={login} />
        <h2 className="text-xl mt-4 flex items-center gap-2">
          Rank breakdown <RankBreakdownTooltip />
        </h2>
        <ProfileCardsGrid>
          <RankCard
            tiers={globalTiers?.sTiers}
            tierData={sTier}
            rankType={UserRankProp.s}
            rank={s}
            rankM={sM}
            rankProvisional={sProvisional}
            score={user.s}
            login={login}
          />
          <RankCard
            tiers={globalTiers?.cTiers}
            tierData={cTier}
            rankType={UserRankProp.c}
            rank={c}
            rankM={cM}
            rankProvisional={cProvisional}
            score={user.c}
            login={login}
          />
          <RankCard
            tiers={globalTiers?.fTiers}
            tierData={fTier}
            rankType={UserRankProp.f}
            rank={f}
            rankM={fM}
            rankProvisional={fProvisional}
            score={user.f}
            login={login}
          />

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
        </ProfileCardsGrid>
      </>
    </LayoutLeftColumn>
  );
}
