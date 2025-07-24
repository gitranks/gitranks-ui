'use cache';

import { unstable_cacheLife as cacheLife, unstable_cacheTag as cacheTag } from 'next/cache';
import { notFound } from 'next/navigation';

import { fetchProfileData } from '@/graphql/helpers/fetch-profile-data';
import { fetchRankTiers } from '@/graphql/helpers/fetch-rank-tiers';

import { LayoutLeftColumn } from './components/layout-left-column';
import { MessengerIntegration } from './components/messenger-integration';
import { ProfileCardsGrid } from './components/profile-card';
import { ProfileCharts } from './components/profile-charts';
import { ProfileRankingSwitcher } from './components/profile-ranking-switcher';
import { RankBreakdownTooltip } from './components/rank-breakdown-tooltip';
import { NotFound } from './not-found';
import { calculateTiers } from './utils/calculate-tiers/calculate-tiers';
import { RankCard } from '../../../components/rank-card/rank-card';

// badges - tiers
// messenger bots - tiers
export default async function ProfileRanks({ params }: { params: Promise<{ login: string }> }) {
  const { login } = await params;
  cacheLife('hours');
  cacheTag(`profile:${login}`);

  const { user } = await fetchProfileData(login);

  if (!user) {
    notFound();
  }

  if (user.fetchingStatus === 'FETCHING' && !user.rankGlobal) {
    // user is being fetched for the first time
    return <NotFound fetchingStatus={user.fetchingStatus} fetchingUpdatedAt={user.fetchingUpdatedAt} />;
  }

  const { rankTiers } = await fetchRankTiers('global');
  const { s, c, f, sM, cM, fM, sProvisional, cProvisional, fProvisional } = user.rankGlobal ?? {};

  const { sTier, cTier, fTier, bestTier } = calculateTiers(user.rankGlobal, rankTiers);

  return (
    <LayoutLeftColumn user={user}>
      <>
        <ProfileRankingSwitcher login={login} ranking="global" />
        <ProfileCharts
          rankChartTitle="Global Rank"
          sTier={sTier.data}
          cTier={cTier.data}
          fTier={fTier.data}
          bestTier={bestTier}
        />

        <MessengerIntegration login={login} />
        <h2 className="text-xl mt-4 flex items-center gap-2">
          Rank breakdown <RankBreakdownTooltip />
        </h2>
        <ProfileCardsGrid>
          <RankCard
            tiers={rankTiers?.sTiers}
            tierData={sTier}
            rankType="s"
            rank={s}
            rankM={sM}
            rankProvisional={sProvisional}
            score={user.s}
            login={login}
          />
          <RankCard
            tiers={rankTiers?.cTiers}
            tierData={cTier}
            rankType="c"
            rank={c}
            rankM={cM}
            rankProvisional={cProvisional}
            score={user.c}
            login={login}
          />
          <RankCard
            tiers={rankTiers?.fTiers}
            tierData={fTier}
            rankType="f"
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
