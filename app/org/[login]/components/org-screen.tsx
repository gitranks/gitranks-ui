import { TrendingDown, TrendingUp } from 'lucide-react';
import type { FC } from 'react';

import { buildOrgSEO } from '../seo';
import { LayoutLeftColumn } from './layout-left-column';
import { OrgTopRepos } from './org-top-repos';
import { OrgPulseSections } from './pulse/org-pulse-sections';
import { MIN_VALUE, ORG_NOT_RANKED_MESSAGE, RANK_DESCRIPTIONS } from '@/app/app.consts';
import {
  ProfileCard,
  ProfileCardContent,
  ProfileCardHeader,
  ProfileCardsGrid,
} from '@/app/profile/[login]/components/profile-card';
import type { OrgFacts } from '@/badge/v3/facts';
import { BadgesCard } from '@/components/badges-card/badges-card';
import { JsonLd } from '@/components/json-ld/json-ld';
import { LearnEntityCard } from '@/components/learn/entity/learn-entity-card';
import { RankCardItem, RankCardPosition, RankCardTotalValue } from '@/components/rank-card/rank-card-item';
import { RankDelta } from '@/components/rank-delta/rank-delta';
import type { LearnEntityCard as LearnEntityCardData } from '@/lib/learn/entity-card';
import type { PageOrgQuery } from '@/types/generated/graphql';
import { UserRankProp } from '@/types/ranking.types';

type OrgScreenProps = {
  /** The login as the URL spells it. */
  login: string;
  org: NonNullable<PageOrgQuery['organization']>;
  /** The organization's badge data, for its Badges card. */
  badgeFacts: OrgFacts | null;
  /** What Learn has about the organization's projects; `null` when it has nothing, or the card could not be read. */
  learnCard: LearnEntityCardData | null;
  /** The time the page is drawn at, which decides the badges it offers. */
  now: Date;
};

/**
 * The organization page from its data: its stars rank, top repositories, analytics, the Learn card when Learn has
 * something about its projects, and badges.
 */
export const OrgScreen: FC<OrgScreenProps> = ({ login, org, badgeFacts, learnCard, now }) => {
  const rank = org.rankOrg ?? {};
  const hasData = (org.s ?? 0) >= MIN_VALUE;

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
                <RankCardItem>{ORG_NOT_RANKED_MESSAGE}</RankCardItem>
                <RankCardTotalValue
                  score={org.s ?? 0}
                  starsNotCounted={org.starsNotCounted}
                  login={login}
                  rankType={UserRankProp.s}
                  showLink={false}
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
      <LearnEntityCard
        card={learnCard}
        entity={{ kind: 'org', login: org.login || login, name: org.name || org.login || login }}
      />
      <BadgesCard entity={badgeFacts} now={now} />
    </LayoutLeftColumn>
  );
};
