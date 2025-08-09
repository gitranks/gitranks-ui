'use cache';

import { unstable_cacheLife as cacheLife, unstable_cacheTag as cacheTag } from 'next/cache';
import { notFound } from 'next/navigation';

import { Link } from '@/components/link/link';
import { fetchProfileData } from '@/graphql/helpers/fetch-profile-data';
import { fetchRankTiers } from '@/graphql/helpers/fetch-rank-tiers';
import { calculateTiers } from '@/utils/calculate-tiers/calculate-tiers';

import { RankCard } from '../../../../components/rank-card/rank-card';
import { LayoutLeftColumn } from '../components/layout-left-column';
import { MessengerIntegration } from '../components/messenger-integration';
import { ProfileCardsGrid } from '../components/profile-card';
import { ProfileCharts } from '../components/profile-charts';
import { ProfileRankingSwitcher } from '../components/profile-ranking-switcher';
import { RankBreakdownTooltip } from '../components/rank-breakdown-tooltip';

export default async function ProfileRanks({ params }: { params: Promise<{ login: string }> }) {
  const { login } = await params;
  cacheLife('hours');
  cacheTag(`profile:${login}`);

  const { user } = await fetchProfileData(login);

  if (!user) {
    notFound();
  }

  if (!user.country) {
    return (
      <LayoutLeftColumn user={user}>
        <>
          <ProfileRankingSwitcher login={login} ranking="country" />
          <div className="text-muted-foreground">
            No country data found. To show up in country rankings, add a{' '}
            <Link href="/countries/stars/1">country name</Link> to your GitHub profile’s location and hit Refresh.
          </div>
        </>
      </LayoutLeftColumn>
    );
  }

  const { rankTiers } = await fetchRankTiers(user.country);
  const { s, c, cM, f, sProvisional, cProvisional, fProvisional, sM, fM } = user.rankCountry ?? {};
  const { sTier, cTier, fTier, bestTier } = calculateTiers(user.rankCountry, rankTiers);

  return (
    <LayoutLeftColumn user={user}>
      <>
        <ProfileRankingSwitcher login={login} ranking="country" />
        <ProfileCharts
          rankChartTitle={`Rank in ${user.country}`}
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
        </ProfileCardsGrid>
      </>
    </LayoutLeftColumn>
  );
}
