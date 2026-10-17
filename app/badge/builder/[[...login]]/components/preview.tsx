'use client';

import type { FC } from 'react';

import { useBadgeUrl } from '../hooks/useBadgeUrl';
import type { BadgeBuilderProfileProps } from './login-form.types';
import { MIN_RANK_SCORE, RANK_NAME } from '@/badge/badge.consts';
import { Link } from '@/components/link/link';
import { UserRankProp } from '@/types/ranking.types';

// Same wording as the profile's rank card.
const RANKING_ENTRY: Record<UserRankProp, string> = {
  [UserRankProp.s]: `${MIN_RANK_SCORE} stars`,
  [UserRankProp.c]: `a merged PR in a ${MIN_RANK_SCORE}★ repo`,
  [UserRankProp.f]: `${MIN_RANK_SCORE} followers`,
};

const ANY_RANKING_ENTRY = `${RANKING_ENTRY.s}, ${RANKING_ENTRY.f}, or ${RANKING_ENTRY.c}`;

export const Preview: FC<BadgeBuilderProfileProps> = (props) => {
  const { githubLogin, githubId, rankedIn } = props;
  const { url, unrankedIn } = useBadgeUrl(props);

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
      {unrankedIn && (
        <div className="italic text-muted-foreground text-sm text-center px-4">
          {rankedIn?.length
            ? `${githubLogin} is not in the ${RANK_NAME[unrankedIn]}ing yet: it takes ${RANKING_ENTRY[unrankedIn]}. Choose another ranking.`
            : `${githubLogin} is not in any ranking yet: it takes ${ANY_RANKING_ENTRY}.`}
        </div>
      )}
      {!githubId && <div className="italic text-muted-foreground text-sm">Choose a GitHub Profile</div>}
    </div>
  );
};
