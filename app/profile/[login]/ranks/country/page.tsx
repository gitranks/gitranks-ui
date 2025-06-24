'use cache';

import { unstable_cacheLife as cacheLife, unstable_cacheTag as cacheTag } from 'next/cache';
import { notFound } from 'next/navigation';

import { Link } from '@/components/link/link';
import { fetchCountrySummaries } from '@/graphql/helpers/fetch-country-summaries';
import { fetchProfileData } from '@/graphql/helpers/fetch-profile-data';

import { LayoutLeftColumn } from '../../components/layout-left-column';
import { ProfileCardsGrid } from '../../components/profile-card';
import { ProfileRankingSwitcher } from '../components/profile-ranking-switcher';
import { RankCard } from '../components/rank-card';

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

  const countrySummaries = await fetchCountrySummaries();
  const usersCount = countrySummaries.find((summary) => summary.country === user.country)?.usersCount;

  const { s, c, cM, f, sProvisional, cProvisional, fProvisional, sM, fM } = user.rankCountry ?? {};

  return (
    <LayoutLeftColumn user={user}>
      <>
        <ProfileRankingSwitcher login={login} ranking="country" />
        <ProfileCardsGrid>
          <RankCard
            rank={s}
            rankM={sM}
            rankProvisional={sProvisional}
            title="Stars rank"
            entityValue={user.s}
            entityName="stars"
            description="Rank is based on the total number of stars across repositories owned by the user."
            usersCount={usersCount}
          />
          <RankCard
            rank={f}
            rankM={fM}
            rankProvisional={fProvisional}
            showDelta={false}
            title="Followers rank"
            entityValue={user.f}
            entityName="followers"
            description="Rank is based on the number of followers the user has on GitHub."
            usersCount={usersCount}
          />
          <RankCard
            rank={c}
            rankM={cM}
            rankProvisional={cProvisional}
            title="Contributor rank"
            entityValue={user.c}
            entityName="stars"
            description="Rank is based on the total number of stars across repositories where the user has merged pull requests —
              excluding their own repositories."
            usersCount={usersCount}
          />
        </ProfileCardsGrid>
      </>
    </LayoutLeftColumn>
  );
}
