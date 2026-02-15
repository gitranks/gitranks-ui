'use cache';

import { TrendingDown, TrendingUp } from 'lucide-react';
import type { Metadata } from 'next';
import { cacheLife, cacheTag } from 'next/cache';
import { notFound } from 'next/navigation';

import { LayoutLeftColumn } from './components/layout-left-column';
import { buildOrgSEO } from './seo';
import { MIN_VALUE, RANK_DESCRIPTIONS } from '@/app/app.consts';
import {
  ProfileCard,
  ProfileCardContent,
  ProfileCardHeader,
  ProfileCardsGrid,
} from '@/app/profile/[login]/components/profile-card';
import { JsonLd } from '@/components/json-ld/json-ld';
import { RankCardItem, RankCardPosition, RankCardTotalValue } from '@/components/rank-card/rank-card-item';
import { RankDelta } from '@/components/rank-delta/rank-delta';
import { fetchOrg } from '@/graphql/helpers/fetch-org';
import { UserRankProp } from '@/types/ranking.types';

export async function generateMetadata({ params }: { params: Promise<{ login: string }> }): Promise<Metadata> {
  const { login } = await params;
  const org = await fetchOrg(login);

  if (!org) {
    return {};
  }

  return buildOrgSEO(org);
}

export default async function OrgPage({ params }: PageProps<'/org/[login]'>) {
  const { login } = await params;
  cacheLife('hours');
  cacheTag(`org:${login}`);

  const org = await fetchOrg(login);

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
                <RankCardPosition rank={rank.s} rankingLink="orgs/1" />
                {rank.s !== rank.sM && (
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
      </ProfileCardsGrid>
    </LayoutLeftColumn>
  );
}
