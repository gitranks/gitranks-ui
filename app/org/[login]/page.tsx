'use cache';

import { TrendingDown, TrendingUp } from 'lucide-react';
import type { Metadata } from 'next';
import { cacheLife, cacheTag } from 'next/cache';
import { notFound } from 'next/navigation';

import { LayoutLeftColumn } from './components/layout-left-column';
import { OrgTopRepos } from './components/org-top-repos';
import { OrgPulseSections } from './components/pulse/org-pulse-sections';
import { buildOrgSEO } from './seo';
import { MIN_VALUE, RANK_DESCRIPTIONS } from '@/app/app.consts';
import {
  ProfileCard,
  ProfileCardContent,
  ProfileCardHeader,
  ProfileCardsGrid,
} from '@/app/profile/[login]/components/profile-card';
import { readBadgeFacts } from '@/badge/v3/card-facts';
import { loadBadgeOrgCard } from '@/badge/v3/load';
import { BadgesCard } from '@/components/badges-card/badges-card';
import { JsonLd } from '@/components/json-ld/json-ld';
import { RankCardItem, RankCardPosition, RankCardTotalValue } from '@/components/rank-card/rank-card-item';
import { RankDelta } from '@/components/rank-delta/rank-delta';
import { fetchOrg } from '@/graphql/helpers/fetch-org';
import { UserRankProp } from '@/types/ranking.types';

export async function generateMetadata({ params }: PageProps<'/org/[login]'>): Promise<Metadata> {
  const { login } = await params;
  const org = await fetchOrg(login);

  if (!org) {
    return {};
  }

  return buildOrgSEO(org).metadata;
}

export default async function OrgPage({ params }: PageProps<'/org/[login]'>) {
  const { login } = await params;
  cacheTag(`org:${login}`);

  // The card's read starts with the page's own, not after it.
  const [org, badges] = await Promise.all([fetchOrg(login), readBadgeFacts(loadBadgeOrgCard(login))]);

  // A page that rendered without its Badges card is kept briefly, so the card comes back soon.
  if (badges.ok) {
    cacheLife('hours');
  } else {
    cacheLife('minutes');
  }

  if (!org) {
    notFound();
  }

  const rank = org.rankOrg ?? {};
  const hasData = org.s ?? 0 >= MIN_VALUE;

  return (
    <LayoutLeftColumn org={org}>
      <JsonLd payloads={buildOrgSEO(org).jsonLd} />
      <ProfileCardsGrid>
        <ProfileCard className="gap-0">
          <div className="flex">
            <div className="grow">
              <ProfileCardHeader>{RANK_DESCRIPTIONS.s.title}</ProfileCardHeader>
            </div>
          </div>

          <ProfileCardContent className="mt-4">
            {!hasData && (
              <>
                <RankCardItem>{RANK_DESCRIPTIONS.s.notRankedMessage}</RankCardItem>
                <RankCardTotalValue score={org.s ?? 0} login={login} rankType={UserRankProp.s} />
              </>
            )}
            {hasData && (
              <>
                <RankCardPosition rank={rank.s} rankingLink="/orgs/1" rankedCount={800000} />
                {!!rank.sM && rank.s !== rank.sM && (
                  <RankCardItem Icon={(rank.s ?? 0) > (rank.sM ?? 0) ? TrendingDown : TrendingUp}>
                    <span>
                      This month change:{' '}
                      <RankDelta current={rank.s ?? 0} previous={rank.sM ?? 0} className="text-base" />
                    </span>
                  </RankCardItem>
                )}
                <RankCardTotalValue score={org.s ?? 0} login={login} rankType={UserRankProp.s} showLink={false} />
              </>
            )}
          </ProfileCardContent>
        </ProfileCard>
        <OrgTopRepos repos={org.topRepos} />
      </ProfileCardsGrid>
      {org.hasActivity && org.pulse && <OrgPulseSections login={login} avatarUrl={org.avatarUrl} pulse={org.pulse} />}
      <BadgesCard entity={badges.facts} />
    </LayoutLeftColumn>
  );
}
