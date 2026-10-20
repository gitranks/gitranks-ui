'use client';

import type { FC } from 'react';

import { useBadgeUrl } from '../hooks/useBadgeUrl';
import type { BadgeBuilderProfileProps } from './login-form.types';
import { MIN_RANK_SCORE, RANK_NAME } from '@/badge/badge.consts';
import { Link } from '@/components/link/link';
import { BadgeContext } from '@/types/badge.types';
import { UserRankProp } from '@/types/ranking.types';
import { shortenCountryName } from '@/utils/country-name-shortener';

// Same wording as the profile's rank card.
const RANKING_ENTRY: Record<UserRankProp, string> = {
  [UserRankProp.s]: `${MIN_RANK_SCORE} stars`,
  [UserRankProp.c]: `${MIN_RANK_SCORE} stars on repos it contributed to`,
  [UserRankProp.f]: `${MIN_RANK_SCORE} followers`,
};

const ANY_RANKING_ENTRY = `${RANKING_ENTRY.s}, ${RANKING_ENTRY.f}, or ${RANKING_ENTRY.c}`;

/** Why the profile has no badge for the chosen ranking and context, and what to choose instead. */
const explainUnranked = (
  { githubLogin, rankedIn, country }: BadgeBuilderProfileProps,
  ranking: UserRankProp,
  context: BadgeContext,
): string => {
  const global = rankedIn?.[BadgeContext.Global] ?? [];
  // Another ranking works in this context; else only the other context has badges.
  const hasOtherRanking = !!rankedIn?.[context].length;

  if (!global.length && !rankedIn?.[BadgeContext.Country].length) {
    return `${githubLogin} is not in any ranking yet: it takes ${ANY_RANKING_ENTRY}.`;
  }

  if (context === BadgeContext.Country && !country) {
    return `${githubLogin} has no country rank: GitRanks could not detect a country from the profile location. Choose Global.`;
  }

  if (!global.includes(ranking)) {
    const otherContext = context === BadgeContext.Global ? 'Country' : 'Global';
    const next = hasOtherRanking ? 'Choose another ranking.' : `Choose ${otherContext}.`;
    return `${githubLogin} is not in the ${RANK_NAME[ranking]}ing yet: it takes ${RANKING_ENTRY[ranking]}. ${next}`;
  }

  const next = hasOtherRanking ? 'Choose Global or another ranking.' : 'Choose Global.';
  return `${githubLogin} has no ${RANK_NAME[ranking]} in ${shortenCountryName(country)} yet. ${next}`;
};

export const Preview: FC<BadgeBuilderProfileProps> = (props) => {
  const { githubLogin, githubId } = props;
  const { url, unranked } = useBadgeUrl(props);

  return (
    <div className="flex flex-col gap-3 items-center justify-center bg-background border-t-2 lg:rounded-sm lg:border-2 lg:sticky lg:top-4 h-[120px] fixed w-full bottom-0 lg:max-w-lg lg:bottom-auto">
      <div>
        Badge Preview
        {githubId && (
          <>
            {' '}
            for <Link href={`/profile/${githubLogin}`}>{githubLogin}</Link>
          </>
        )}
      </div>
      {url && <img src={url} alt="badge" />}
      {unranked && (
        <div className="italic text-muted-foreground text-sm text-center px-4">
          {explainUnranked(props, unranked.ranking, unranked.context)}
        </div>
      )}
      {!githubId && <div className="italic text-muted-foreground text-sm">Choose a GitHub Profile</div>}
    </div>
  );
};
