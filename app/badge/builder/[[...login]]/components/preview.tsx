'use client';

import type { FC } from 'react';

import { useBadgeUrl } from '../hooks/useBadgeUrl';
import type { BadgeBuilderProfileProps } from './login-form.types';
import { MIN_RANK_SCORE, RANK_NAME } from '@/badge/badge.consts';
import { Link } from '@/components/link/link';
import { UserRankProp } from '@/types/ranking.types';

const RANKING_ENTRY: Record<UserRankProp, string> = {
  [UserRankProp.s]: `${MIN_RANK_SCORE}+ stars`,
  [UserRankProp.c]: `a contribution score of ${MIN_RANK_SCORE}+`,
  [UserRankProp.f]: `${MIN_RANK_SCORE}+ followers`,
};

export const Preview: FC<BadgeBuilderProfileProps> = (props) => {
  const { githubLogin, githubId } = props;
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
          {`${githubLogin} is not in the ${RANK_NAME[unrankedIn]}ing yet: it takes ${RANKING_ENTRY[unrankedIn]}. Choose another ranking.`}
        </div>
      )}
      {!githubId && <div className="italic text-muted-foreground text-sm">Choose a GitHub Profile</div>}
    </div>
  );
};
