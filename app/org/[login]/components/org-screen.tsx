import { TrendingDown, TrendingUp } from 'lucide-react';
import type { FC } from 'react';

import { buildOrgSEO } from '../seo';
import { LayoutLeftColumn } from './layout-left-column';
import { OrgTopRepos } from './org-top-repos';
import { OrgPulseSections } from './pulse/org-pulse-sections';
import { MIN_VALUE, RANK_DESCRIPTIONS } from '@/app/app.consts';
import {
  ProfileCard,
  ProfileCardContent,
  ProfileCardHeader,
  ProfileCardsGrid,
} from '@/app/profile/[login]/components/profile-card';
import type { OrgFacts } from '@/badge/v3/facts';
import { BadgesCard } from '@/components/badges-card/badges-card';
import { JsonLd } from '@/components/json-ld/json-ld';
import { RankCardItem, RankCardPosition, RankCardTotalValue } from '@/components/rank-card/rank-card-item';
import { RankDelta } from '@/components/rank-delta/rank-delta';
import type { PageOrgQuery } from '@/types/generated/graphql';
import { UserRankProp } from '@/types/ranking.types';

type OrgScreenProps = {
  /** The login as the URL spells it. */
  login: string;
  org: NonNullable<PageOrgQuery['organization']>;
  /** The organization's badge data, for its Badges card. */
  badgeFacts: OrgFacts | null;
};

/** The organization page from its data: its stars rank, top repositories, analytics and badges. */
export const OrgScreen: FC<OrgScreenProps> = ({ login, org, badgeFacts }) => {
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
                <RankCardTotalValue
                  score={org.s ?? 0}
                  starsNotCounted={org.starsNotCounted}
                  login={login}
                  rankType={UserRankProp.s}
                />
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
                <RankCardTotalValue
                  score={org.s ?? 0}
                  starsNotCounted={org.starsNotCounted}
                  login={login}
                  rankType={UserRankProp.s}
                  showLink={false}
                />
              </>
            )}
          </ProfileCardContent>
        </ProfileCard>
        <OrgTopRepos repos={org.topRepos} />
      </ProfileCardsGrid>
      {org.hasActivity && org.pulse && <OrgPulseSections login={login} avatarUrl={org.avatarUrl} pulse={org.pulse} />}
      <BadgesCard entity={badgeFacts} />
    </LayoutLeftColumn>
  );
};
