'use cache';

import { cacheLife } from 'next/cache';

import { RANK_NAME } from '@/badge/badge.consts';
import { BadgeContext, BadgeCornerStyle, BadgeMeta, BadgeType } from '@/types/badge.types';
import { UserRankProp } from '@/types/ranking.types';

import BadgeExample from './components/badge-example';
import { BadgeContainer, BadgeDescription, BadgeExamplesWrapper, BadgeTitle } from './components/badge-helpers';

export default async function BadgeGallery() {
  cacheLife('hours');

  return (
    <div className="flex flex-col gap-12">
      <BadgeContainer>
        <BadgeTitle>GitHub Rank</BadgeTitle>
        <BadgeDescription>
          Shows your position among all GitHub profiles worldwide - <strong>GitHub Rank</strong> includes developers
          with at least one repository having 5+ stars, <strong>Contributors Rank</strong> features those who&apos;ve
          merged pull requests into such repositories, and <strong>Followers Rank</strong> highlights profiles with 5+
          followers.
        </BadgeDescription>

        <BadgeExamplesWrapper>
          <BadgeExample label={RANK_NAME.s} />
          <BadgeExample label={RANK_NAME.c} ranking={UserRankProp.c} />
          <BadgeExample label={RANK_NAME.f} ranking={UserRankProp.f} />
        </BadgeExamplesWrapper>
      </BadgeContainer>

      <BadgeContainer>
        <BadgeTitle>GitHub Score</BadgeTitle>
        <BadgeDescription>
          Shows your total GitHub score - <strong>Total Stars</strong> counts stars on repositories you own,{' '}
          <strong>Contributors Score</strong> sums stars on repositories where you’ve merged pull requests, and{' '}
          <strong>Total Followers</strong> is the total number of people following your profile.
        </BadgeDescription>
        <BadgeExamplesWrapper>
          <BadgeExample label="Total Stars" type={BadgeType.Score} valueBgColor="#1e3a8a" />
          <BadgeExample
            label="Contribution Score"
            ranking={UserRankProp.c}
            type={BadgeType.Score}
            valueBgColor="#1e3a8a"
          />
          <BadgeExample
            label="Total Followers"
            ranking={UserRankProp.f}
            type={BadgeType.Score}
            valueBgColor="#1e3a8a"
          />
        </BadgeExamplesWrapper>
      </BadgeContainer>

      <BadgeContainer>
        <BadgeTitle>GitRank Tiers</BadgeTitle>
        <BadgeDescription>
          Shows your GitRank tier - tiers range from <strong>Beginner</strong> to <strong>Legend</strong>, placing you
          among the top GitHub profiles based on your rank. Each tier is split into levels for finer placement, with
          Legend giving extra recognition to the very best. You can find a detailed tier description by clicking the
          tier name on your profile page.
        </BadgeDescription>
        <BadgeExamplesWrapper>
          <BadgeExample label={RANK_NAME.s} type={BadgeType.Tier} valueBgColor="#7c3aed" />
          <BadgeExample label={RANK_NAME.c} ranking={UserRankProp.c} type={BadgeType.Tier} valueBgColor="#7c3aed" />
          <BadgeExample label={RANK_NAME.f} ranking={UserRankProp.f} type={BadgeType.Tier} valueBgColor="#7c3aed" />
        </BadgeExamplesWrapper>
      </BadgeContainer>

      <BadgeContainer>
        <BadgeTitle>GitHub Percentile</BadgeTitle>
        <BadgeDescription>
          Shows your position in the GitHub community as a percentile - only profiles meeting the ranking criteria are
          included, such as having 5+ stars on owned repositories, merging PRs into repositories with 5+ stars, or
          having 5+ followers.
        </BadgeDescription>
        <BadgeExamplesWrapper>
          <BadgeExample label={RANK_NAME.s} type={BadgeType.Percentile} valueBgColor="#7f5539" />
          <BadgeExample
            label={RANK_NAME.c}
            ranking={UserRankProp.c}
            type={BadgeType.Percentile}
            valueBgColor="#7f5539"
          />
          <BadgeExample
            label={RANK_NAME.f}
            ranking={UserRankProp.f}
            type={BadgeType.Percentile}
            valueBgColor="#7f5539"
          />
        </BadgeExamplesWrapper>
      </BadgeContainer>

      <BadgeContainer>
        <BadgeTitle>Country Ranks</BadgeTitle>
        <BadgeDescription>
          Shows your position among GitHub profiles in your country - available for all badge types when GitRanks can
          detect your country from your profile location, ranking you only against developers from that country.
        </BadgeDescription>
        <BadgeExamplesWrapper>
          <BadgeExample label={`USA ${RANK_NAME.s}`} context={BadgeContext.Country} />
          <BadgeExample
            label={`Ukraine ${RANK_NAME.f}`}
            context={BadgeContext.Country}
            ranking={UserRankProp.f}
            type={BadgeType.Tier}
            valueBgColor="#7c3aed"
          />
          <BadgeExample
            label={`India ${RANK_NAME.s}`}
            context={BadgeContext.Country}
            ranking={UserRankProp.s}
            type={BadgeType.Percentile}
            valueBgColor="#7f5539"
          />
        </BadgeExamplesWrapper>
      </BadgeContainer>

      <BadgeContainer>
        <BadgeTitle>Badge Metadata</BadgeTitle>
        <BadgeDescription>
          Shows extra details about your performance - can be added to any badge type to display insights like monthly
          rank change, monthly score change, or how much more you need to reach the next tier or top percentile.
        </BadgeDescription>
        <BadgeExamplesWrapper>
          <BadgeExample label={RANK_NAME.s} meta={BadgeMeta.MonthlyChange} />
          <BadgeExample
            label="Total Followers"
            ranking={UserRankProp.f}
            meta={BadgeMeta.Percentile}
            valueBgColor="#1e3a8a"
          />
          <BadgeExample label={RANK_NAME.s} ranking={UserRankProp.s} meta={BadgeMeta.GoalTop10} />
        </BadgeExamplesWrapper>
      </BadgeContainer>

      <BadgeContainer>
        <BadgeTitle>Badge Variants</BadgeTitle>
        <BadgeExamplesWrapper>
          <BadgeExample label={RANK_NAME.s} />
          <BadgeExample label={RANK_NAME.s} cornerStyle={BadgeCornerStyle.Squared} />
        </BadgeExamplesWrapper>
      </BadgeContainer>
    </div>
  );
}
